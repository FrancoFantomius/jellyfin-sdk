import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('SessionsModule', () => {
  it('should query active sessions with query parameters', async () => {
    let capturedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => [
          { Id: 'sess-1', DeviceName: 'Living Room TV', UserName: 'Bob' },
          { Id: 'sess-2', DeviceName: 'Pixel Phone', UserName: 'Alice' }
        ]
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-sess',
      fetch: mockFetch as unknown as typeof fetch
    });

    const sessions = await client.sessions.getSessions({
      controllableByUserId: 'user-xyz',
      deviceId: 'dev-abc',
      activeWithinSeconds: 300
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].Id).toBe('sess-1');
    const parsed = new URL(capturedUrl);
    expect(parsed.pathname).toBe('/Sessions');
    expect(parsed.searchParams.get('ControllableByUserId')).toBe('user-xyz');
    expect(parsed.searchParams.get('DeviceId')).toBe('dev-abc');
    expect(parsed.searchParams.get('ActiveWithinSeconds')).toBe('300');
  });

  it('should send play command with options to a remote session', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedMethod = init?.method || 'GET';
      return {
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => null
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-sess',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.sessions.play('sess-tv-1', ['track-1', 'track-2'], {
      playCommand: 'PlayNow',
      startPositionTicks: 50000000,
      audioStreamIndex: 2
    });

    expect(capturedMethod).toBe('POST');
    const parsed = new URL(capturedUrl);
    expect(parsed.pathname).toBe('/Sessions/sess-tv-1/Playing');
    expect(parsed.searchParams.get('ItemIds')).toBe('track-1,track-2');
    expect(parsed.searchParams.get('PlayCommand')).toBe('PlayNow');
    expect(parsed.searchParams.get('StartPositionTicks')).toBe('50000000');
    expect(parsed.searchParams.get('AudioStreamIndex')).toBe('2');
  });

  it('should send playstate commands (playPause, pause, unpause, stop, seek, nextTrack, previousTrack)', async () => {
    const executedEndpoints: string[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      const parsed = new URL(url);
      executedEndpoints.push(`${parsed.pathname}${parsed.search}`);
      return {
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => null
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-sess',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.sessions.playPause('sess-100');
    await client.sessions.pause('sess-100');
    await client.sessions.unpause('sess-100');
    await client.sessions.stop('sess-100');
    await client.sessions.seek('sess-100', 123450000);
    await client.sessions.nextTrack('sess-100');
    await client.sessions.previousTrack('sess-100');

    expect(executedEndpoints).toContain('/Sessions/sess-100/Playing/PlayPause');
    expect(executedEndpoints).toContain('/Sessions/sess-100/Playing/Pause');
    expect(executedEndpoints).toContain('/Sessions/sess-100/Playing/Unpause');
    expect(executedEndpoints).toContain('/Sessions/sess-100/Playing/Stop');
    expect(executedEndpoints.some((ep) => ep.includes('/Sessions/sess-100/Playing/Seek?SeekPositionTicks=123450000'))).toBe(true);
    expect(executedEndpoints).toContain('/Sessions/sess-100/Playing/NextTrack');
    expect(executedEndpoints).toContain('/Sessions/sess-100/Playing/PreviousTrack');
  });

  it('should send general commands (setVolume, mute, unmute, toggleMute, setAudioStreamIndex)', async () => {
    const capturedBodies: any[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.body) {
        capturedBodies.push(JSON.parse(init.body as string));
      }
      return {
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => null
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-sess',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.sessions.setVolume('sess-vol', 85);
    await client.sessions.mute('sess-vol');
    await client.sessions.unmute('sess-vol');
    await client.sessions.toggleMute('sess-vol');
    await client.sessions.setAudioStreamIndex('sess-vol', 3);
    await client.sessions.setSubtitleStreamIndex('sess-vol', 1);

    expect(capturedBodies).toEqual([
      { Name: 'SetVolume', Arguments: { Volume: '85' } },
      { Name: 'Mute', Arguments: {} },
      { Name: 'Unmute', Arguments: {} },
      { Name: 'ToggleMute', Arguments: {} },
      { Name: 'SetAudioStreamIndex', Arguments: { Index: '3' } },
      { Name: 'SetSubtitleStreamIndex', Arguments: { Index: '1' } }
    ]);
  });

  it('should send message dialog and viewing commands', async () => {
    let messageBody: any = null;
    let viewingUrl = '';

    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/Message')) {
        messageBody = JSON.parse(init?.body as string);
      } else if (url.includes('/Viewing')) {
        viewingUrl = url;
      }
      return {
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => null
      };
    });

    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-sess',
      fetch: mockFetch as unknown as typeof fetch
    });

    await client.sessions.sendMessage('sess-msg', {
      header: 'Dinner Ready',
      text: 'Movie will pause in 5 minutes',
      timeoutMs: 10000
    });

    expect(messageBody).toEqual({
      Header: 'Dinner Ready',
      Text: 'Movie will pause in 5 minutes',
      TimeoutMs: 10000
    });

    await client.sessions.viewItem('sess-msg', 'Movie', 'movie-99', 'Inception');
    const parsed = new URL(viewingUrl);
    expect(parsed.pathname).toBe('/Sessions/sess-msg/Viewing');
    expect(parsed.searchParams.get('ItemType')).toBe('Movie');
    expect(parsed.searchParams.get('ItemId')).toBe('movie-99');
    expect(parsed.searchParams.get('ItemName')).toBe('Inception');
  });

  it('should throw error when required arguments are omitted', async () => {
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-sess'
    });

    await expect(client.sessions.play('', ['item-1'])).rejects.toThrow(/sessionId is required/);
    await expect(client.sessions.play('sess-1', [])).rejects.toThrow(/At least one itemId is required/);
    await expect(client.sessions.pause('')).rejects.toThrow(/sessionId is required/);
    await expect(client.sessions.sendMessage('', 'hello')).rejects.toThrow(/sessionId is required/);
    await expect(client.sessions.viewItem('', 'Movie', 'm-1', 'Title')).rejects.toThrow(/sessionId is required/);
  });
});

