import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('QuickConnectModule', () => {
  it('should check if Quick Connect is enabled', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => true
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      fetch: mockFetch as unknown as typeof fetch
    });

    const enabled = await client.quickConnect.isEnabled();
    expect(enabled).toBe(true);
  });

  it('should initiate Quick Connect flow and return code + secret', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({
        Code: '123456',
        Secret: 'secret-xyz'
      })
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      fetch: mockFetch as unknown as typeof fetch
    });

    const res = await client.quickConnect.initiate();
    expect(res.Code).toBe('123456');
    expect(res.Secret).toBe('secret-xyz');
  });

  it('should check status of a secret', async () => {
    let checkedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      checkedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          Authenticated: false,
          Secret: 'sec-1'
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      fetch: mockFetch as unknown as typeof fetch
    });

    const state = await client.quickConnect.check('sec-1');
    expect(state.Authenticated).toBe(false);
    const parsed = new URL(checkedUrl);
    expect(parsed.pathname).toBe('/QuickConnect/Connect');
    expect(parsed.searchParams.get('secret')).toBe('sec-1');
  });

  it('should authorize code from authenticated session', async () => {
    let authUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      authUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => null
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-admin',
      fetch: mockFetch as unknown as typeof fetch
    });

    const success = await client.quickConnect.authorize('123 456', 'user-abc');
    expect(success).toBe(true);
    const parsed = new URL(authUrl);
    expect(parsed.pathname).toBe('/QuickConnect/Authorize');
    expect(parsed.searchParams.get('Code')).toBe('123456');
    expect(parsed.searchParams.get('UserId')).toBe('user-abc');
  });

  it('should poll until authenticated', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => ({ Authenticated: false, Secret: 'sec-poll' })
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          Authenticated: true,
          Secret: 'sec-poll',
          AuthenticationToken: 'token-received-from-qc',
          UserId: 'user-qc-1'
        })
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      fetch: mockFetch as unknown as typeof fetch
    });

    const result = await client.quickConnect.poll('sec-poll', {
      intervalMs: 10,
      timeoutMs: 5000
    });

    expect(result.Authenticated).toBe(true);
    expect(result.AuthenticationToken).toBe('token-received-from-qc');
    expect(callCount).toBe(3);
  });

  it('should timeout when polling exceeds timeoutMs', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ Authenticated: false, Secret: 'sec-timeout' })
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      fetch: mockFetch as unknown as typeof fetch
    });

    await expect(
      client.quickConnect.poll('sec-timeout', {
        intervalMs: 10,
        timeoutMs: 30
      })
    ).rejects.toThrow(/timed out/);
  });
});

