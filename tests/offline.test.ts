import { describe, it, expect } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('OfflineStorageManager', () => {
  const client = new JellyfinClient({
    serverUrl: 'https://jellyfin.example.com',
    accessToken: 'token-off',
    userId: 'user-off'
  });

  it('should format bytes cleanly', () => {
    expect(client.offline.formatBytes(0)).toBe('0 B');
    expect(client.offline.formatBytes(1024)).toBe('1.0 KB');
    expect(client.offline.formatBytes(1048576)).toBe('1.0 MB');
    expect(client.offline.formatBytes(1073741824)).toBe('1.0 GB');
  });

  it('should handle offline support check safely in node environment', () => {
    // In node test environment without browser indexedDB, isSupported returns false
    expect(typeof client.offline.isSupported()).toBe('boolean');
  });

  it('should return null/false gracefully when item is not downloaded', async () => {
    const isDownloaded = await client.offline.isItemDownloaded('non-existent');
    expect(isDownloaded).toBe(false);

    const isTrackDown = await client.offline.isTrackDownloaded('non-existent');
    expect(isTrackDown).toBe(false);

    const record = await client.offline.getDownloadedRecord('non-existent');
    expect(record).toBeNull();
  });
});

