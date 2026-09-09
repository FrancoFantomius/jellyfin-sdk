import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';
import type { DisplayPreferencesDto } from '../src/types.js';

describe('DisplayPreferencesModule', () => {
  it('should get and update display preferences', async () => {
    let lastUrl = '';
    let lastMethod = '';
    let lastBody: unknown = null;

    const mockPrefs: DisplayPreferencesDto = {
      Id: 'view-folder-1',
      ViewType: 'Poster',
      SortBy: 'SortName',
      SortOrder: 'Ascending',
      RememberSorting: true,
      CustomPrefs: { theme: 'dark' },
      Client: '@francofantomius/jellyfin'
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      lastUrl = url;
      lastMethod = init?.method || 'GET';
      if (init?.body) {
        lastBody = JSON.parse(init.body as string);
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockPrefs
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      userId: 'user-pref-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    // 1. Get display preferences
    const prefs = await client.displayPreferences.getDisplayPreferences('view-folder-1');
    expect(prefs.ViewType).toBe('Poster');
    const parsedGet = new URL(lastUrl);
    expect(parsedGet.pathname).toBe('/DisplayPreferences/view-folder-1');
    expect(parsedGet.searchParams.get('userId')).toBe('user-pref-1');

    // 2. Update display preferences
    await client.displayPreferences.updateDisplayPreferences('view-folder-1', {
      ViewType: 'Thumb',
      SortBy: 'DateCreated'
    });

    expect(lastMethod).toBe('POST');
    const parsedPost = new URL(lastUrl);
    expect(parsedPost.pathname).toBe('/DisplayPreferences/view-folder-1');
    expect((lastBody as DisplayPreferencesDto).ViewType).toBe('Thumb');
  });

  it('should support convenience helpers: setCustomPreference, setSortPreferences, setViewType', async () => {
    let currentPrefs: DisplayPreferencesDto = {
      Id: 'view-folder-2',
      ViewType: 'Poster',
      SortBy: 'SortName',
      SortOrder: 'Ascending',
      CustomPrefs: {}
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && init?.body) {
        currentPrefs = JSON.parse(init.body as string);
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => currentPrefs
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      userId: 'user-pref-2',
      fetch: mockFetch as unknown as typeof fetch
    });

    // 1. setCustomPreference
    const updatedCustom = await client.displayPreferences.setCustomPreference(
      'view-folder-2',
      'coverSize',
      'large'
    );
    expect(updatedCustom.CustomPrefs?.coverSize).toBe('large');

    // 2. setSortPreferences
    const updatedSort = await client.displayPreferences.setSortPreferences(
      'view-folder-2',
      'CommunityRating',
      'Descending'
    );
    expect(updatedSort.SortBy).toBe('CommunityRating');
    expect(updatedSort.SortOrder).toBe('Descending');
    expect(updatedSort.RememberSorting).toBe(true);

    // 3. setViewType
    const updatedView = await client.displayPreferences.setViewType('view-folder-2', 'Banner');
    expect(updatedView.ViewType).toBe('Banner');
  });

  it('should throw if userId is not available', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com'
    });

    await expect(
      client.displayPreferences.getDisplayPreferences('view-1')
    ).rejects.toThrow(/User ID is required/);
  });
});

