import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('LibraryModule', () => {
  it('should query albums with correct parameters', async () => {
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
      accessToken: 'token-123',
      userId: 'user-789',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.library.getAlbums({ limit: 25, startIndex: 10, artistId: 'art-1' });

    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Users/user-789/Items');
    expect(parsed.searchParams.get('IncludeItemTypes')).toBe('MusicAlbum');
    expect(parsed.searchParams.get('Limit')).toBe('25');
    expect(parsed.searchParams.get('StartIndex')).toBe('10');
    expect(parsed.searchParams.get('ArtistIds')).toBe('art-1');
  });

  it('should search jellyfin library', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ Items: [{ Id: '1', Name: 'Bohemian Rhapsody' }], TotalRecordCount: 1 })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-123',
      userId: 'user-789',
      fetch: mockFetch as unknown as typeof fetch
    });

    const result = await client.library.search('Bohemian');

    const parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('SearchTerm')).toBe('Bohemian');
    expect(result.Items).toHaveLength(1);
    expect(result.Items[0].Name).toBe('Bohemian Rhapsody');
  });
});

