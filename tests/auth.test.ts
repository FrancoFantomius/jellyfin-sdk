import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('AuthModule', () => {
  it('should authenticate by username and password successfully', async () => {
    const mockAuthResponse = {
      AccessToken: 'new-auth-token',
      ServerId: 'server-1',
      User: {
        Id: 'user-456',
        Name: 'DemoUser',
        PrimaryImageTag: 'tag-user'
      }
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/Users/AuthenticateByName')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => mockAuthResponse
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({})
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      fetch: mockFetch as unknown as typeof fetch
    });

    const authListener = vi.fn();
    client.on('authenticated', authListener);

    const result = await client.authenticate('demouser', 'secret');

    expect(result.AccessToken).toBe('new-auth-token');
    expect(client.accessToken).toBe('new-auth-token');
    expect(client.userId).toBe('user-456');
    // Jellyfin 12 normalized username check
    expect(client.auth.getUsername()).toBe('DemoUser');
    expect(authListener).toHaveBeenCalledWith(mockAuthResponse);

    const avatarUrl = client.auth.getUserImageUrl();
    expect(avatarUrl).toBe('https://jellyfin.example.com/Users/user-456/Images/Primary?tag=tag-user');
  });

  it('should handle invalid credentials', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ message: 'Invalid username or password' })
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      fetch: mockFetch as unknown as typeof fetch
    });

    await expect(client.authenticate('Wrong', 'Pass')).rejects.toThrow(/Unauthorized/);
  });

  it('should logout and clear tokens', () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token',
      userId: 'user-1'
    });

    const logoutListener = vi.fn();
    client.on('logout', logoutListener);

    client.logout();

    expect(client.accessToken).toBe('');
    expect(client.userId).toBe('');
    expect(logoutListener).toHaveBeenCalled();
  });
});

