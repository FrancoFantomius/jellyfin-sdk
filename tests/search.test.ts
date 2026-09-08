import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('SearchModule', () => {
  it('should return empty result if query is empty or whitespace without calling fetch', async () => {
    const mockFetch = vi.fn();
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-search',
      userId: 'user-search-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    const emptyResult = await client.search.search('');
    expect(emptyResult).toEqual({ Items: [], TotalRecordCount: 0 });

    const whitespaceResult = await client.search.search('   ');
    expect(whitespaceResult).toEqual({ Items: [], TotalRecordCount: 0 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should query /Users/{userId}/Items with all search options including parentId', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          Items: [{ Id: 'm-1', Name: 'Inception', Type: 'Movie' }],
          TotalRecordCount: 1
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-search',
      userId: 'user-search-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    const res = await client.search.search('Inception', {
      parentId: 'folder-movies-1',
      includeItemTypes: ['Movie', 'Series'],
      mediaTypes: ['Video'],
      genres: ['Action', 'Sci-Fi'],
      years: [2010],
      isFavorite: true,
      sortBy: 'SortName',
      sortOrder: 'Ascending',
      limit: 15,
      startIndex: 5
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Users/user-search-1/Items');
    expect(parsed.searchParams.get('SearchTerm')).toBe('Inception');
    expect(parsed.searchParams.get('ParentId')).toBe('folder-movies-1');
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Movie,Series');
    expect(parsed.searchParams.get('MediaTypes')).toBe('Video');
    expect(parsed.searchParams.get('Genres')).toBe('Action|Sci-Fi');
    expect(parsed.searchParams.get('Years')).toBe('2010');
    expect(parsed.searchParams.get('Filters')).toBe('IsFavorite');
    expect(parsed.searchParams.get('SortBy')).toBe('SortName');
    expect(parsed.searchParams.get('SortOrder')).toBe('Ascending');
    expect(parsed.searchParams.get('Limit')).toBe('15');
    expect(parsed.searchParams.get('StartIndex')).toBe('5');
    expect(parsed.searchParams.get('Recursive')).toBe('true');

    expect(res.Items).toHaveLength(1);
    expect(res.Items[0].Name).toBe('Inception');
  });

  it('should support searchInLibrary convenience method', async () => {
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
      accessToken: 'token-search',
      userId: 'user-search-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.search.searchInLibrary('library-music-1', 'Coldplay');
    const parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('ParentId')).toBe('library-music-1');
    expect(parsed.searchParams.get('SearchTerm')).toBe('Coldplay');
  });

  it('should support specific media type convenience helpers', async () => {
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
      accessToken: 'token-search',
      userId: 'user-search-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.search.searchSongs('Yellow');
    let parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Audio');
    expect(parsed.searchParams.get('SearchTerm')).toBe('Yellow');

    await client.search.searchAlbums('Parachutes');
    parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('MusicAlbum');

    await client.search.searchArtists('Coldplay');
    parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('MusicArtist');

    await client.search.searchMovies('Interstellar');
    parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Movie');

    await client.search.searchSeries('Breaking Bad');
    parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Series');

    await client.search.searchEpisodes('Ozymandias');
    parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Episode');
  });

  it('should support parentId and item type filters in client.library.search', async () => {
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
      accessToken: 'token-search',
      userId: 'user-search-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.library.search('Queen', {
      parentId: 'music-library-view',
      includeItemTypes: ['Audio', 'MusicAlbum']
    });

    const parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('ParentId')).toBe('music-library-view');
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('Audio,MusicAlbum');
    expect(parsed.searchParams.get('SearchTerm')).toBe('Queen');
  });

  it('should throw if userId is missing and not provided in options', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-search'
    });

    await expect(client.search.search('test')).rejects.toThrow(/User ID is required/);
  });
});

