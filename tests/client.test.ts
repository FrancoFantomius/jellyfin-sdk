import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';
import { MemoryStorage } from '../src/storage.js';

describe('JellyfinClient', () => {
  it('should initialize with default parameters', () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'test-token',
      userId: 'user-123'
    });

    expect(client.serverUrl).toBe('https://jellyfin.example.com');
    expect(client.accessToken).toBe('test-token');
    expect(client.userId).toBe('user-123');
    expect(client.info.name).toBe('@francofantomius/jellyfin');
  });

  it('should sanitize server URL', () => {
    const client = new JellyfinClient({
      serverUrl: 'jellyfin.local:8096///'
    });

    expect(client.serverUrl).toBe('https://jellyfin.local:8096');
  });

  it('should accept custom clientInfo and storage', () => {
    const customStorage = new MemoryStorage();
    customStorage.setItem('key', 'val');

    const client = new JellyfinClient({
      serverUrl: 'https://demo.jellyfin.org',
      clientInfo: {
        name: 'MyCustomApp',
        version: '2.0.0',
        device: 'TestDevice',
        deviceId: 'custom-dev-id'
      },
      storage: customStorage
    });

    expect(client.info.name).toBe('MyCustomApp');
    expect(client.info.version).toBe('2.0.0');
    expect(client.info.deviceId).toBe('custom-dev-id');
    expect(client.getStorage().getItem('key')).toBe('val');
  });

  it('should emit unauthorized event on 401 response', async () => {
    const onUnauthorizedCallback = vi.fn();
    const eventListener = vi.fn();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ message: 'Unauthorized' })
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      userId: 'user-123',
      fetch: mockFetch as unknown as typeof fetch,
      onUnauthorized: onUnauthorizedCallback
    });

    client.on('unauthorized', eventListener);

    await expect(client.library.getAlbums()).rejects.toThrow();
    expect(onUnauthorizedCallback).toHaveBeenCalled();
    expect(eventListener).toHaveBeenCalled();
  });
});

