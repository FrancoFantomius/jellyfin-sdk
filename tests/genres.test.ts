import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('GenresModule', () => {
  it('should query video genres and single genre by name', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          Items: [
            { Id: 'genre-1', Name: 'Sci-Fi' }
          ],
          TotalRecordCount: 1
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      userId: 'user-gen-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    const genres = await client.genres.getGenres({
      searchTerm: 'Sci',
      sortBy: 'SortName',
      sortOrder: 'Ascending',
      limit: 10
    });

    expect(genres.Items).toHaveLength(1);
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Genres');
    expect(parsed.searchParams.get('SearchTerm')).toBe('Sci');
    expect(parsed.searchParams.get('SortBy')).toBe('SortName');
    expect(parsed.searchParams.get('Limit')).toBe('10');
    expect(parsed.searchParams.get('UserId')).toBe('user-gen-1');

    await client.genres.getGenre('Sci-Fi');
    const parsedSingle = new URL(requestedUrl);
    expect(parsedSingle.pathname).toBe('/Genres/Sci-Fi');
    expect(parsedSingle.searchParams.get('UserId')).toBe('user-gen-1');
  });

  it('should query music genres and single music genre', async () => {
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
      userId: 'user-gen-2',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.genres.getMusicGenres({ limit: 5 });
    const parsedList = new URL(requestedUrl);
    expect(parsedList.pathname).toBe('/MusicGenres');
    expect(parsedList.searchParams.get('Limit')).toBe('5');

    await client.genres.getMusicGenre('Rock & Roll');
    const parsedSingle = new URL(requestedUrl);
    expect(parsedSingle.pathname).toBe('/MusicGenres/Rock%20%26%20Roll');
  });

  it('should query studios and single studio', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ Items: [{ Id: 'studio-1', Name: 'Warner Bros' }], TotalRecordCount: 1 })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      userId: 'user-gen-3',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.genres.getStudios({ limit: 20 });
    const parsedList = new URL(requestedUrl);
    expect(parsedList.pathname).toBe('/Studios');
    expect(parsedList.searchParams.get('Limit')).toBe('20');

    await client.genres.getStudio('Warner Bros');
    const parsedSingle = new URL(requestedUrl);
    expect(parsedSingle.pathname).toBe('/Studios/Warner%20Bros');
  });
});

