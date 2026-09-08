import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('ResumeModule', () => {
  it('should query resume items with default and custom options', async () => {
    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          Items: [
            { Id: 'resume-item-1', Name: 'Inception', Type: 'Movie' }
          ],
          TotalRecordCount: 1
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'test-token',
      userId: 'user-resume-1',
      fetch: mockFetch as unknown as typeof fetch
    });

    const res = await client.resume.getResumeItems({
      limit: 10,
      startIndex: 5,
      mediaTypes: ['Video'],
      parentId: 'parent-folder-1',
      enableImages: true
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/UserItems/Resume');
    expect(parsed.searchParams.get('UserId')).toBe('user-resume-1');
    expect(parsed.searchParams.get('Limit')).toBe('10');
    expect(parsed.searchParams.get('StartIndex')).toBe('5');
    expect(parsed.searchParams.get('MediaTypes')).toBe('Video');
    expect(parsed.searchParams.get('ParentId')).toBe('parent-folder-1');
    expect(parsed.searchParams.get('EnableImages')).toBe('true');
    expect(parsed.searchParams.get('Recursive')).toBe('true');

    expect(res.Items).toHaveLength(1);
    expect(res.Items[0].Name).toBe('Inception');
  });

  it('getItems alias should work identically', async () => {
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
      accessToken: 'test-token',
      userId: 'user-resume-2',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.resume.getItems();
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/UserItems/Resume');
    expect(parsed.searchParams.get('UserId')).toBe('user-resume-2');
    expect(parsed.searchParams.get('Limit')).toBe('20');
  });

  it('should throw if userId is not available', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'test-token'
    });

    await expect(client.resume.getResumeItems()).rejects.toThrow(/User ID is required/);
  });
});

