export interface CacheRecord<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
}

export interface CacheAdapter {
  get<T = unknown>(key: string): Promise<T | null> | T | null;
  set<T = unknown>(key: string, data: T): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, { data: unknown; timestamp: number }>();

  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : null;
  }

  set<T = unknown>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export class IndexedDBCacheAdapter implements CacheAdapter {
  private dbName: string;
  private dbVersion: number;
  private storeName: string;
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor(dbName = 'JellyfinSdkCache', dbVersion = 1, storeName = 'api_cache') {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.storeName = storeName;
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        resolve(null);
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => {
        console.warn('[Jellyfin Cache] IndexedDB open error:', e);
        resolve(null);
      };
    });

    return this.dbPromise;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      if (!db) return null;

      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(key);
        request.onsuccess = () => {
          const record = request.result;
          resolve(record ? (record.data as T) : null);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, data: T): Promise<void> {
    if (!data) return;
    try {
      const db = await this.getDB();
      if (!db) return;

      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const record = { key, data, timestamp: Date.now() };
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch {
      // ignore cache failure
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      if (!db) return;

      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      if (!db) return;

      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Executes a Stale-While-Revalidate pattern using a CacheAdapter.
 */
export async function fetchWithCache<T>(
  cache: CacheAdapter,
  cacheKey: string,
  fetchFn: () => Promise<T>,
  onFreshData?: (data: T) => void
): Promise<T> {
  const cached = await cache.get<T>(cacheKey);

  const backgroundFetch = fetchFn().then(async (freshData) => {
    if (freshData !== null && freshData !== undefined) {
      await cache.set(cacheKey, freshData);
      if (onFreshData) {
        try {
          onFreshData(freshData);
        } catch (e) {
          console.warn('[Jellyfin Cache] Error in onFreshData callback for %s:', cacheKey, e);
        }
      }
    }
    return freshData;
  }).catch((err) => {
    console.warn('[Jellyfin Cache] Background fetch failed for %s:', cacheKey, err);
    if (!cached) throw err;
    return cached;
  });

  if (cached !== null && cached !== undefined) {
    return cached;
  }

  return await backgroundFetch;
}

