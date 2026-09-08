import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('Video Library Methods in LibraryModule', () => {
  it('should query video libraries (filtering views for video types)', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          Items: [
            { Id: 'view-1', Name: 'Movies', CollectionType: 'movies' },
            { Id: 'view-2', Name: 'TV Shows', CollectionType: 'tvshows' },
            { Id: 'view-3', Name: 'Music', CollectionType: 'music' }
          ],
          TotalRecordCount: 3
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-123',
      userId: 'user-lib',
      fetch: mockFetch as unknown as typeof fetch
    });

    const videoViews = await client.library.getVideoLibraries();
    expect(new URL(requestedUrl).pathname).toBe('/Users/user-lib/Views');
    expect(videoViews).toHaveLength(2);
    expect(videoViews.map((v) => v.Name)).toEqual(['Movies', 'TV Shows']);
  });

  it('should query movies with filtering and pagination', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ Items: [{ Id: 'mov-1', Name: 'Inception' }], TotalRecordCount: 1 })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-123',
      userId: 'user-lib',
      fetch: mockFetch as unknown as typeof fetch
    });

    const res = await client.library.getMovies({
      limit: 20,
      startIndex: 0,
      genres: ['Action', 'Sci-Fi'],
      years: [2010],
      isFavorite: true
    });

    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Users/user-lib/Items');
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Movie');
    expect(parsed.searchParams.get('Genres')).toBe('Action|Sci-Fi');
    expect(parsed.searchParams.get('Years')).toBe('2010');
    expect(parsed.searchParams.get('Filters')).toBe('IsFavorite');
    expect(res.Items[0].Name).toBe('Inception');
  });

  it('should query TV series and episodes', async () => {
    const requestedUrls: string[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrls.push(url);
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ Items: [], TotalRecordCount: 0 })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-123',
      userId: 'user-lib',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.library.getSeries({ limit: 10 });
    await client.library.getSeasons('series-1');
    await client.library.getEpisodes('series-1', 'season-1', { seasonNumber: 1 });

    expect(new URL(requestedUrls[0]).searchParams.get('IncludeItemTypes')).toBe('Series');
    expect(new URL(requestedUrls[1]).pathname).toBe('/Shows/series-1/Seasons');
    expect(new URL(requestedUrls[2]).pathname).toBe('/Shows/series-1/Episodes');
    expect(new URL(requestedUrls[2]).searchParams.get('SeasonId')).toBe('season-1');
    expect(new URL(requestedUrls[2]).searchParams.get('Season')).toBe('1');
  });

  it('should request playback info for an item', async () => {
    let capturedBody: unknown = null;
    let capturedMethod = '';

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedMethod = init.method || 'GET';
      capturedBody = JSON.parse(init.body as string);
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          MediaSources: [{ Id: 'source-1', Protocol: 'File' }],
          PlaySessionId: 'session-xyz'
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-123',
      userId: 'user-lib',
      fetch: mockFetch as unknown as typeof fetch
    });

    const playbackInfo = await client.library.getPlaybackInfo('item-abc', {
      maxStreamingBitrate: 10_000_000,
      audioStreamIndex: 1,
      subtitleStreamIndex: 2
    });

    expect(capturedMethod).toBe('POST');
    expect((capturedBody as Record<string, unknown>).UserId).toBe('user-lib');
    expect((capturedBody as Record<string, unknown>).MaxStreamingBitrate).toBe(10_000_000);
    expect(playbackInfo.PlaySessionId).toBe('session-xyz');
    expect(playbackInfo.MediaSources).toHaveLength(1);
  });
});

