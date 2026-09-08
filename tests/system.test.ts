import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';
import { isV12OrHigher, isVersionAtLeast, parseSemVer, SystemModule } from '../src/system.js';
import { HttpTransport } from '../src/http.js';

describe('SystemModule and version utilities', () => {
  describe('semver helpers', () => {
    it('should parse semver versions properly', () => {
      expect(parseSemVer('10.9.11')).toEqual({ major: 10, minor: 9, patch: 11 });
      expect(parseSemVer('12.0.0')).toEqual({ major: 12, minor: 0, patch: 0 });
      expect(parseSemVer('12.0.0-alpha')).toEqual({ major: 12, minor: 0, patch: 0 });
      expect(parseSemVer('')).toBeNull();
      expect(parseSemVer('invalid')).toBeNull();
    });

    it('should correctly compare versions with isVersionAtLeast', () => {
      expect(isVersionAtLeast('12.0.0', '10.9.11')).toBe(true);
      expect(isVersionAtLeast('12.0.0', '12.0.0')).toBe(true);
      expect(isVersionAtLeast('12.1.0', '12.0.0')).toBe(true);
      expect(isVersionAtLeast('10.9.11', '12.0.0')).toBe(false);
      expect(isVersionAtLeast('10.8.0', '10.9.0')).toBe(false);
    });

    it('should correctly determine isV12OrHigher', () => {
      expect(isV12OrHigher('12.0.0')).toBe(true);
      expect(isV12OrHigher('12.1.4')).toBe(true);
      expect(isV12OrHigher('13.0.0')).toBe(true);
      expect(isV12OrHigher('10.9.11')).toBe(false);
      expect(isV12OrHigher('11.0.0')).toBe(false);
      expect(isV12OrHigher(undefined)).toBe(false);
    });
  });

  describe('SystemModule', () => {
    it('should fetch public system info and cache server version', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/System/Info/Public')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: async () => ({
              Version: '12.0.0',
              ServerName: 'My Jellyfin Server',
              Id: 'server-123'
            })
          };
        }
        return { ok: false, status: 404 };
      });

      const client = new JellyfinClient({
        serverUrl: 'https://jellyfin.example.com',
        fetch: mockFetch as unknown as typeof fetch
      });

      const info = await client.system.getPublicInfo();
      expect(info.Version).toBe('12.0.0');
      expect(client.serverVersion).toBe('12.0.0');
      expect(await client.isV12()).toBe(true);
    });

    it('should respect targetVersion override to force legacy mode', async () => {
      const client = new JellyfinClient({
        serverUrl: 'https://jellyfin.example.com',
        serverVersion: '12.0.0',
        targetVersion: '10'
      });

      expect(await client.isV12()).toBe(false);
    });

    it('should respect targetVersion override to force v12 mode', async () => {
      const client = new JellyfinClient({
        serverUrl: 'https://jellyfin.example.com',
        serverVersion: '10.9.11',
        targetVersion: '12'
      });

      expect(await client.isV12()).toBe(true);
    });
  });
});

