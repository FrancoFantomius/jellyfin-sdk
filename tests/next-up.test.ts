import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('NextUpModule', () => {
  it('should query next up items with options', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          Items: [
            { Id: 'ep-next-1', Name: 'Episode 2', Type: 'Episode', SeriesName: 'Breaking Bad' }
          ],
          TotalRecordCount: 1
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-nu',
      userId: 'user-nu-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    const res = await client.nextUp.getNextUp({
      seriesId: 'series-123',
      limit: 15,
      startIndex: 0,
      enableTotalRecordCount: true,
      disableFirstEpisode: false
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Shows/NextUp');
    expect(parsed.searchParams.get('UserId')).toBe('user-nu-1');
    expect(parsed.searchParams.get('SeriesId')).toBe('series-123');
    expect(parsed.searchParams.get('Limit')).toBe('15');
    expect(parsed.searchParams.get('EnableTotalRecordCount')).toBe('true');
    expect(parsed.searchParams.get('DisableFirstEpisode')).toBe('false');

    expect(res.Items).toHaveLength(1);
    expect(res.Items[0].Name).toBe('Episode 2');
  });

  it('getEpisodes alias should function as expected', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ Items: [], TotalRecordCount: 0 })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-nu',
      userId: 'user-nu-2',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.nextUp.getEpisodes({ limit: 12 });
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Shows/NextUp');
    expect(parsed.searchParams.get('UserId')).toBe('user-nu-2');
    expect(parsed.searchParams.get('Limit')).toBe('12');
  });

  it('should throw if userId is missing', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-nu'
    });

    await expect(client.nextUp.getNextUp()).rejects.toThrow(/User ID is required/);
  });
});

