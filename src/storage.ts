import type { StorageAdapter } from './types.js';

export class MemoryStorage implements StorageAdapter {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }

  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}

export function getDefaultStorage(): StorageAdapter {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return new LocalStorageAdapter();
  }
  return new MemoryStorage();
}

export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return 'sdk-' + Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'sdk-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

