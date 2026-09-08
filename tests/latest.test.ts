import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('LatestModule', () => {
  it('should query latest items from /Users/{userId}/Items/Latest', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => [
          { Id: 'latest-1', Name: 'Dune: Part Two', Type: 'Movie' },
          { Id: 'latest-2', Name: 'Interstellar', Type: 'Movie' }
        ]
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-latest',
      userId: 'user-latest-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    const items = await client.latest.getLatest({
      parentId: 'folder-movies',
      limit: 10,
      includeItemTypes: ['Movie'],
      isPlayed: false,
      enableImages: true
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Users/user-latest-1/Items/Latest');
    expect(parsed.searchParams.get('ParentId')).toBe('folder-movies');
    expect(parsed.searchParams.get('Limit')).toBe('10');
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Movie');
    expect(parsed.searchParams.get('IsPlayed')).toBe('false');
    expect(parsed.searchParams.get('EnableImages')).toBe('true');

    expect(items).toHaveLength(2);
    expect(items[0].Name).toBe('Dune: Part Two');
  });

  it('should support convenience helpers for movies, episodes, and albums', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => []
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-latest',
      userId: 'user-latest-2',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.latest.getLatestMovies({ limit: 5 });
    let parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Users/user-latest-2/Items/Latest');
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Movie');
    expect(parsed.searchParams.get('Limit')).toBe('5');

    await client.latest.getLatestEpisodes({ limit: 8 });
    parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Episode');
    expect(parsed.searchParams.get('Limit')).toBe('8');

    await client.latest.getLatestAlbums({ limit: 12 });
    parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('MusicAlbum');
    expect(parsed.searchParams.get('Limit')).toBe('12');
  });

  it('should throw if userId is missing', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-latest'
    });

    await expect(client.latest.getLatest()).rejects.toThrow(/User ID is required/);
  });
});

