import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('CollectionsModule', () => {
  it('should retrieve collections and collection items', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          Items: [{ Id: 'col-1', Name: 'Marvel Cinematic Universe', Type: 'BoxSet' }],
          TotalRecordCount: 1
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      userId: 'user-col-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    const collections = await client.collections.getCollections({ limit: 10 });
    expect(collections.Items).toHaveLength(1);
    const parsedList = new URL(requestedUrl);
    expect(parsedList.pathname).toBe('/Collections');
    expect(parsedList.searchParams.get('Limit')).toBe('10');
    expect(parsedList.searchParams.get('UserId')).toBe('user-col-1');

    await client.collections.getCollectionItems('col-1', { limit: 25, sortBy: 'PremiereDate' });
    const parsedItems = new URL(requestedUrl);
    expect(parsedItems.pathname).toBe('/Users/user-col-1/Items');
    expect(parsedItems.searchParams.get('ParentId')).toBe('col-1');
    expect(parsedItems.searchParams.get('Limit')).toBe('25');
    expect(parsedItems.searchParams.get('SortBy')).toBe('PremiereDate');
  });

  it('should create, add items to, and remove items from collections', async () => {
    let lastUrl = '';
    let lastMethod = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      lastUrl = url;
      lastMethod = init?.method || 'GET';
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ Id: 'new-col-123' })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-col',
      fetch: mockFetch as unknown as typeof fetch
    });

    // 1. Create collection
    const created = await client.collections.createCollection({
      name: 'Star Wars Saga',
      ids: ['movie-1', 'movie-2'],
      isFolder: false
    });

    expect(created.Id).toBe('new-col-123');
    expect(lastMethod).toBe('POST');
    const parsedCreate = new URL(lastUrl);
    expect(parsedCreate.pathname).toBe('/Collections');
    expect(parsedCreate.searchParams.get('Name')).toBe('Star Wars Saga');
    expect(parsedCreate.searchParams.get('Ids')).toBe('movie-1,movie-2');
    expect(parsedCreate.searchParams.get('IsFolder')).toBe('false');

    // 2. Add to collection
    await client.collections.addToCollection('new-col-123', ['movie-3', 'movie-4']);
    expect(lastMethod).toBe('POST');
    const parsedAdd = new URL(lastUrl);
    expect(parsedAdd.pathname).toBe('/Collections/new-col-123/Items');
    expect(parsedAdd.searchParams.get('Ids')).toBe('movie-3,movie-4');

    // 3. Remove from collection
    await client.collections.removeFromCollection('new-col-123', 'movie-1');
    expect(lastMethod).toBe('DELETE');
    const parsedRemove = new URL(lastUrl);
    expect(parsedRemove.pathname).toBe('/Collections/new-col-123/Items');
    expect(parsedRemove.searchParams.get('Ids')).toBe('movie-1');
  });
});

