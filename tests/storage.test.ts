import { describe, it, expect } from 'vitest';
import { MemoryStorage, generateDeviceId } from '../src/storage.js';

describe('Storage', () => {
  it('should store, retrieve, and delete items with MemoryStorage', () => {
    const storage = new MemoryStorage();
    expect(storage.getItem('test')).toBeNull();

    storage.setItem('test', 'value123');
    expect(storage.getItem('test')).toBe('value123');

    storage.removeItem('test');
    expect(storage.getItem('test')).toBeNull();
  });

  it('should generate unique device IDs', () => {
    const id1 = generateDeviceId();
    const id2 = generateDeviceId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});

