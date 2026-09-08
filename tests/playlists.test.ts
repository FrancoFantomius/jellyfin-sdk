import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('PlaylistsModule', () => {
  it('should create playlist using Jellyfin 12 JSON request body (CreatePlaylistDto)', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = init?.body ? String(init.body) : '';
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ Id: 'playlist-456' })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-abc',
      userId: 'user-xyz',
      fetch: mockFetch as unknown as typeof fetch
    });

    const playlistId = await client.playlists.createPlaylist({
      name: 'Chill Vibes',
      trackIds: ['track-1', 'track-2']
    });

    expect(playlistId).toBe('playlist-456');
    const parsed = new URL(capturedUrl);
    expect(parsed.pathname).toBe('/Playlists');
    // In Jellyfin 12, query params are empty and body has JSON CreatePlaylistDto
    expect(parsed.searchParams.get('Name')).toBeNull();
    const parsedBody = JSON.parse(capturedBody);
    expect(parsedBody.Name).toBe('Chill Vibes');
    expect(parsedBody.Ids).toEqual(['track-1', 'track-2']);
    expect(parsedBody.UserId).toBe('user-xyz');
    expect(parsedBody.MediaType).toBe('Audio');
  });

  it('should gracefully fallback to query params if server responds with 400 Bad Request', async () => {
    const calls: Array<{ url: string; body?: string }> = [];
    let attempt = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? String(init.body) : undefined });
      attempt++;
      if (attempt === 1) {
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => ({})
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ Id: 'legacy-playlist-789' })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-abc',
      userId: 'user-xyz',
      fetch: mockFetch as unknown as typeof fetch
    });

    const playlistId = await client.playlists.createPlaylist({
      name: 'Old School',
      trackIds: ['track-1', 'track-2']
    });

    expect(playlistId).toBe('legacy-playlist-789');
    expect(calls.length).toBe(2);
    // First call attempted JSON body
    expect(calls[0].body).toBeDefined();
    // Second fallback call sent query params
    const fallbackUrl = new URL(calls[1].url);
    expect(fallbackUrl.searchParams.get('Name')).toBe('Old School');
    expect(fallbackUrl.searchParams.get('Ids')).toBe('track-1,track-2');
    expect(fallbackUrl.searchParams.get('UserId')).toBe('user-xyz');
  });

  it('should rename playlist using POST /Items/{playlistId}', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = init?.body ? String(init.body) : '';
      return {
        ok: true,
        status: 200,
        headers: new Headers({}),
        text: async () => ''
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-abc',
      userId: 'user-xyz',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.playlists.updatePlaylist('playlist-456', { name: 'New Name' });

    const parsed = new URL(capturedUrl);
    expect(parsed.pathname).toBe('/Items/playlist-456');
    const parsedBody = JSON.parse(capturedBody);
    expect(parsedBody.Id).toBe('playlist-456');
    expect(parsedBody.Name).toBe('New Name');
  });

  it('should remove track using EntryIds and fallback to ItemIds on failure', async () => {
    const urls: string[] = [];
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      urls.push(url);
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          headers: new Headers({}),
          text: async () => ''
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({}),
        text: async () => ''
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-abc',
      userId: 'user-xyz',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.playlists.removeTrack('playlist-456', 'entry-123');

    expect(urls.length).toBe(2);
    expect(new URL(urls[0]).searchParams.get('EntryIds')).toBe('entry-123');
    expect(new URL(urls[1]).searchParams.get('ItemIds')).toBe('entry-123');
  });

  it('should add tracks to playlist', async () => {
    let capturedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({}),
        text: async () => ''
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-abc',
      userId: 'user-xyz',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.playlists.addTracks('playlist-456', ['track-3', 'track-4']);

    const parsed = new URL(capturedUrl);
    expect(parsed.pathname).toBe('/Playlists/playlist-456/Items');
    expect(parsed.searchParams.get('Ids')).toBe('track-3,track-4');
    expect(parsed.searchParams.get('UserId')).toBe('user-xyz');
  });
});

