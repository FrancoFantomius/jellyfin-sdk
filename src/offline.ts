import type { BaseItemDto, DownloadItemOptions } from './types.js';
import type { MediaModule } from './media.js';

export interface DownloadRecord {
  id: string;
  name: string;
  mediaType?: 'Audio' | 'Video' | string;
  type?: string;
  artists?: string;
  album?: string;
  albumId?: string;
  seriesName?: string;
  seriesId?: string;
  seasonName?: string;
  seasonId?: string;
  artworkUrl: string | null;
  size: number;
  savedAt: number;
  hasLyrics?: boolean;
  parentId?: string;
  parentName?: string;
  parentType?: string;
  parentArtworkUrl?: string;
  parentOwner?: string;
  parentCount?: number;
  index?: number;
  blob?: Blob;
  mimeType?: string;
}

export interface DownloadProgress {
  completed: number;
  total: number;
  item: BaseItemDto;
  track?: BaseItemDto; // For backward compatibility
  res: { ok: boolean; size?: number; removed?: boolean; error?: string };
}

export class OfflineStorageManager {
  private media: MediaModule;
  private dbName: string;
  private dbVersion: number;
  private storeName: string;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private objectUrlCache = new Map<string, string>();
  private downloadStatusCache = new Map<string, boolean>();

  constructor(media: MediaModule, dbName = 'JellyfinOfflineAudio', dbVersion = 1, storeName = 'tracks') {
    this.media = media;
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.storeName = storeName;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  async initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (!this.isSupported()) {
        resolve(null);
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.warn('[Jellyfin Offline] IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        resolve(null);
      };
    });

    return this.dbPromise;
  }

  private getItemKey(item: BaseItemDto | { id?: string; Id?: string }): string {
    return item ? String(item.Id || item.id || '') : '';
  }

  private dispatchDownloadChanged(itemId: string, downloaded: boolean): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('jellyfin-download-changed', {
        detail: { itemId, trackId: itemId, downloaded }
      })
    );
  }

  private revokeObjectUrl(id: string): void {
    const url = this.objectUrlCache.get(id);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      this.objectUrlCache.delete(id);
    }
  }

  async getDownloadedRecord(id: string): Promise<DownloadRecord | null> {
    if (!id) return null;
    try {
      const db = await this.initDB();
      if (!db) return null;

      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(String(id));

        request.onsuccess = () => resolve((request.result as DownloadRecord) || null);
        request.onerror = () => resolve(null);
      });
    } catch (err) {
      console.warn(`[Jellyfin Offline] getDownloadedRecord error for ${id}:`, err);
      return null;
    }
  }

  async isItemDownloaded(id: string): Promise<boolean> {
    if (!id) return false;
    const key = String(id);
    if (this.downloadStatusCache.has(key)) {
      return this.downloadStatusCache.get(key)!;
    }

    const record = await this.getDownloadedRecord(key);
    const exists = !!record;
    this.downloadStatusCache.set(key, exists);
    return exists;
  }

  isItemDownloadedSync(id: string): boolean {
    if (!id) return false;
    return this.downloadStatusCache.get(String(id)) === true;
  }

  // Backward compatibility aliases
  async isTrackDownloaded(id: string): Promise<boolean> {
    return this.isItemDownloaded(id);
  }

  isTrackDownloadedSync(id: string): boolean {
    return this.isItemDownloadedSync(id);
  }

  async getDownloadedBlobUrl(id: string): Promise<string | null> {
    if (!id) return null;
    const key = String(id);
    if (this.objectUrlCache.has(key)) return this.objectUrlCache.get(key)!;

    const record = await this.getDownloadedRecord(key);
    if (!record || !record.blob) return null;

    const url = URL.createObjectURL(record.blob);
    this.objectUrlCache.set(key, url);
    return url;
  }

  getDownloadedBlobUrlSync(id: string): string | null {
    if (!id) return null;
    return this.objectUrlCache.get(String(id)) || null;
  }

  async getAllDownloads(): Promise<DownloadRecord[]> {
    try {
      const db = await this.initDB();
      if (!db) return [];

      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const records = (request.result || []) as DownloadRecord[];
          resolve(records.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)));
        };
        request.onerror = () => resolve([]);
      });
    } catch (err) {
      console.warn('[Jellyfin Offline] getAllDownloads error:', err);
      return [];
    }
  }

  async warmOfflineCache(): Promise<void> {
    try {
      const downloads = await this.getAllDownloads();
      for (const item of downloads) {
        if (item && item.id) {
          const key = String(item.id);
          this.downloadStatusCache.set(key, true);
          if (item.blob && !this.objectUrlCache.has(key)) {
            try {
              this.objectUrlCache.set(key, URL.createObjectURL(item.blob));
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Jellyfin Offline] warmOfflineCache error:', err);
    }
  }

  async saveDownloadRecord(record: DownloadRecord, blob: Blob): Promise<boolean> {
    try {
      const db = await this.initDB();
      if (!db) return false;

      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const entry = { ...record, blob };
        const request = store.put(entry);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn('[Jellyfin Offline] saveDownloadRecord error:', err);
      return false;
    }
  }

  async removeDownload(id: string): Promise<boolean> {
    if (!id) return false;
    const key = String(id);
    try {
      const db = await this.initDB();
      if (!db) return false;

      const removed = await new Promise<boolean>((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });

      if (removed) {
        this.revokeObjectUrl(key);
        this.downloadStatusCache.set(key, false);
        this.dispatchDownloadChanged(key, false);
      }
      return removed;
    } catch (err) {
      console.warn('[Jellyfin Offline] removeDownload error:', err);
      return false;
    }
  }

  /**
   * Downloads an audio or video item to offline storage.
   * If already downloaded, toggles it off (removes it).
   */
  async downloadItem(
    item: BaseItemDto,
    onProgress?: (progressFraction: number) => void,
    group?: { id?: string; name?: string; type?: string; artworkUrl?: string; owner?: string; count?: number } | null,
    index?: number,
    options: DownloadItemOptions = {}
  ): Promise<{ ok: boolean; size?: number; removed?: boolean; error?: string }> {
    if (!item) return { ok: false, error: 'no-item' };

    const key = this.getItemKey(item);
    if (!key) return { ok: false, error: 'no-id' };

    // If already downloaded, toggle off (remove)
    if (await this.isItemDownloaded(key)) {
      await this.removeDownload(key);
      return { ok: true, removed: true };
    }

    const isVideo = item.MediaType === 'Video' || item.Type === 'Movie' || item.Type === 'Episode' || item.Type === 'Video';
    let sourceUrl = '';

    if (isVideo) {
      if (options.quality) {
        sourceUrl = this.media.getVideoStreamUrl(key, { quality: options.quality });
      } else {
        sourceUrl = this.media.getDownloadUrl(key);
      }
    } else {
      sourceUrl = this.media.getAudioStreamUrl(key, { maxStreamingBitrate: 'Direct' });
    }

    if (!sourceUrl) return { ok: false, error: 'no-url' };

    let response: Response;
    try {
      response = await fetch(sourceUrl);
    } catch (err) {
      console.warn('[Jellyfin Offline] Download fetch error:', err);
      return { ok: false, error: 'network' };
    }

    if (!response.ok) {
      return { ok: false, error: `http-${response.status}` };
    }

    const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10) || 0;

    try {
      const reader = response.body ? response.body.getReader() : null;
      let blob: Blob;

      const mimeType = response.headers.get('Content-Type') || (isVideo ? 'video/mp4' : 'audio/mpeg');

      if (reader) {
        const chunks: BlobPart[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (onProgress) {
              onProgress(contentLength > 0 ? received / contentLength : 0);
            }
          }
        }
        blob = new Blob(chunks, { type: mimeType });
      } else {
        blob = await response.blob();
        if (onProgress) onProgress(1);
      }

      const record: DownloadRecord = {
        id: key,
        name: item.Name || 'Unknown',
        mediaType: isVideo ? 'Video' : 'Audio',
        type: item.Type,
        artists: item.Artists ? item.Artists.join(', ') : (item.AlbumArtist || ''),
        album: item.Album || '',
        albumId: item.AlbumId || '',
        seriesName: (item.SeriesName as string) || undefined,
        seriesId: (item.SeriesId as string) || undefined,
        seasonName: (item.SeasonName as string) || undefined,
        seasonId: (item.SeasonId as string) || undefined,
        artworkUrl: this.media.getArtworkUrl(item, { maxWidth: 300 }),
        size: blob.size,
        savedAt: Date.now(),
        hasLyrics: !!item.HasLyrics,
        mimeType
      };

      if (group && group.id) {
        record.parentId = String(group.id);
        record.parentName = group.name || '';
        record.parentType = group.type || '';
        record.parentArtworkUrl = group.artworkUrl || '';
        record.parentOwner = group.owner || '';
        record.parentCount = group.count || 0;
      }

      if (typeof index === 'number' && !Number.isNaN(index)) {
        record.index = index;
      } else if (typeof item.IndexNumber === 'number') {
        record.index = item.IndexNumber;
      }

      const saved = await this.saveDownloadRecord(record, blob);
      if (!saved) return { ok: false, error: 'storage' };

      this.revokeObjectUrl(key);
      this.downloadStatusCache.set(key, true);
      this.dispatchDownloadChanged(key, true);
      return { ok: true, size: blob.size };
    } catch (err) {
      console.warn('[Jellyfin Offline] Download processing failed:', err);
      return { ok: false, error: 'unknown' };
    }
  }

  /**
   * Backward-compatible alias for downloadItem.
   */
  async downloadTrack(
    track: BaseItemDto,
    onProgress?: (progressFraction: number) => void,
    group?: { id?: string; name?: string; type?: string; artworkUrl?: string; owner?: string; count?: number } | null,
    index?: number
  ): Promise<{ ok: boolean; size?: number; removed?: boolean; error?: string }> {
    return this.downloadItem(track, onProgress, group, index);
  }

  /**
   * Downloads multiple items with aggregated progress callbacks.
   */
  async downloadItems(
    items: BaseItemDto[],
    onProgress?: (progress: DownloadProgress) => void,
    group?: { id?: string; name?: string; type?: string; artworkUrl?: string; owner?: string; count?: number } | null,
    options: DownloadItemOptions = {}
  ): Promise<{ ok: boolean; downloaded: number; failed: number; total: number }> {
    const targets: BaseItemDto[] = [];
    for (const item of items || []) {
      const key = item && (item.Id || (item as unknown as { id?: string }).id);
      if (key && !(await this.isItemDownloaded(key))) {
        targets.push(item);
      }
    }

    const total = targets.length;
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < targets.length; i++) {
      const res = await this.downloadItem(targets[i], undefined, group, i, options);
      completed++;
      if (!res.ok) failed++;
      if (onProgress) {
        onProgress({ completed, total, item: targets[i], track: targets[i], res });
      }
    }

    return { ok: failed === 0 && total > 0, downloaded: total - failed, failed, total };
  }

  /**
   * Backward-compatible alias for downloadItems.
   */
  async downloadTracks(
    tracks: BaseItemDto[],
    onProgress?: (progress: DownloadProgress) => void,
    group?: { id?: string; name?: string; type?: string; artworkUrl?: string; owner?: string; count?: number } | null
  ): Promise<{ ok: boolean; downloaded: number; failed: number; total: number }> {
    return this.downloadItems(tracks, onProgress, group);
  }

  async removeDownloads(items: BaseItemDto[]): Promise<{ ok: boolean; removed: number }> {
    let removed = 0;
    for (const item of items || []) {
      const key = item && (item.Id || (item as unknown as { id?: string }).id);
      if (key && (await this.removeDownload(key))) removed++;
    }
    return { ok: removed > 0, removed };
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
}
