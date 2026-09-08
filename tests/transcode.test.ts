import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('TranscodeModule', () => {
  it('should call DELETE /Videos/ActiveEncodings with deviceId and playSessionId', async () => {
    let requestedUrl = '';
    let requestedMethod = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      requestedUrl = url;
      requestedMethod = init?.method || 'GET';
      return {
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => null
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-trans',
      clientInfo: { deviceId: 'test-device-42' },
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.transcode.stopActiveEncoding('session-999');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(requestedMethod).toBe('DELETE');
    const parsed = new URL(requestedUrl);
    expect(parsed.pathname).toBe('/Videos/ActiveEncodings');
    expect(parsed.searchParams.get('DeviceId')).toBe('test-device-42');
    expect(parsed.searchParams.get('PlaySessionId')).toBe('session-999');
  });

  it('stop alias should support custom deviceId', async () => {
    let requestedUrl = '';
    let requestedMethod = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      requestedUrl = url;
      requestedMethod = init?.method || 'GET';
      return {
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => null
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-trans',
      clientInfo: { deviceId: 'test-device-default' },
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.transcode.stop('session-123', 'custom-device');

    expect(requestedMethod).toBe('DELETE');
    const parsed = new URL(requestedUrl);
    expect(parsed.searchParams.get('DeviceId')).toBe('custom-device');
    expect(parsed.searchParams.get('PlaySessionId')).toBe('session-123');
  });

  it('should throw if playSessionId is empty', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-trans'
    });

    await expect(client.transcode.stopActiveEncoding('')).rejects.toThrow(/playSessionId is required/);
  });

  it('PlaybackModule.reportStopped should also teardown active encoding when playSessionId provided', async () => {
    const requestedCalls: Array<{ url: string; method: string }> = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      requestedCalls.push({ url, method: init?.method || 'GET' });
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => null
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-trans',
      clientInfo: { deviceId: 'dev-teardown-1' },
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.playback.reportStopped('item-55', 50000000, { playSessionId: 'sess-abc' });

    expect(requestedCalls).toHaveLength(2);
    expect(requestedCalls[0].method).toBe('POST');
    expect(new URL(requestedCalls[0].url).pathname).toBe('/Sessions/Playing/Stopped');

    expect(requestedCalls[1].method).toBe('DELETE');
    const deleteUrl = new URL(requestedCalls[1].url);
    expect(deleteUrl.pathname).toBe('/Videos/ActiveEncodings');
    expect(deleteUrl.searchParams.get('DeviceId')).toBe('dev-teardown-1');
    expect(deleteUrl.searchParams.get('PlaySessionId')).toBe('sess-abc');
  });
});

