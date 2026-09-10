import { describe, it, expect } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('MediaModule', () => {
  const client = new JellyfinClient({
    serverUrl: 'https://jellyfin.example.com',
    accessToken: 'token-abc',
    userId: 'user-xyz',
    clientInfo: { deviceId: 'dev-123' }
  });

  it('should generate audio stream URL with appropriate params', () => {
    const urlStr = client.media.getAudioStreamUrl('track-1', {
      maxStreamingBitrate: '320000',
      startTimeTicks: 50000000
    });

    const url = new URL(urlStr);
    expect(url.origin).toBe('https://jellyfin.example.com');
    expect(url.pathname).toBe('/Audio/track-1/universal');
    expect(url.searchParams.get('ApiKey')).toBe('token-abc');
    expect(url.searchParams.get('api_key')).toBe('token-abc');
    expect(url.searchParams.get('X-Emby-Token')).toBe('token-abc');
    expect(url.searchParams.get('UserId')).toBe('user-xyz');
    expect(url.searchParams.get('DeviceId')).toBe('dev-123');
    expect(url.searchParams.get('MaxStreamingBitrate')).toBe('320000');
    expect(url.searchParams.get('StartTimeTicks')).toBe('50000000');
    expect(url.searchParams.get('TranscodingContainer')).toBe('mp3');
  });

  it('should omit MaxStreamingBitrate when set to Direct', () => {
    const urlStr = client.media.getAudioStreamUrl('track-2', {
      maxStreamingBitrate: 'Direct'
    });
    const url = new URL(urlStr);
    expect(url.searchParams.has('MaxStreamingBitrate')).toBe(false);
  });

  it('should generate artwork URL from item object with primary tag', () => {
    const item = {
      Id: 'item-10',
      Name: 'Great Album',
      PrimaryImageTag: 'tag-999'
    };

    const artworkUrl = client.media.getArtworkUrl(item, { maxWidth: 500 });
    expect(artworkUrl).toBe('https://jellyfin.example.com/Items/item-10/Images/Primary?maxWidth=500&quality=90&tag=tag-999');
  });

  it('should fallback to album image tag if item lacks primary tag', () => {
    const item = {
      Id: 'item-20',
      Name: 'Track 1',
      AlbumId: 'album-50',
      AlbumPrimaryImageTag: 'tag-album-50'
    };

    const artworkUrl = client.media.getArtworkUrl(item);
    expect(artworkUrl).toBe('https://jellyfin.example.com/Items/album-50/Images/Primary?maxWidth=400&quality=90&tag=tag-album-50');
  });

  it('should return null or fallbackUrl if item has no artwork', () => {
    const item = { Id: 'item-30', Name: 'Track without cover' };
    expect(client.media.getArtworkUrl(item)).toBeNull();
    expect(client.media.getArtworkUrl(item, { fallbackUrl: 'https://fallback.com/icon.png' })).toBe('https://fallback.com/icon.png');
  });

  it('should generate HLS audio stream URL without default MediaSourceId fallback', () => {
    const urlStr = client.media.getAudioHlsStreamUrl('track-10');
    const url = new URL(urlStr);
    expect(url.pathname).toBe('/Audio/track-10/master.m3u8');
    expect(url.searchParams.get('ApiKey')).toBe('token-abc');
    expect(url.searchParams.get('api_key')).toBe('token-abc');
    expect(url.searchParams.get('X-Emby-Token')).toBe('token-abc');
    expect(url.searchParams.has('MediaSourceId')).toBe(false);
    expect(url.searchParams.get('TranscodingProtocol')).toBe('hls');
  });

  it('should append MediaSourceId when explicitly provided to audio methods', () => {
    const hlsUrl = client.media.getAudioHlsStreamUrl('track-10', { mediaSourceId: 'source-999' });
    expect(new URL(hlsUrl).searchParams.get('MediaSourceId')).toBe('source-999');

    const streamUrl = client.media.getAudioStreamUrl('track-10', { mediaSourceId: 'source-999' });
    expect(new URL(streamUrl).searchParams.get('MediaSourceId')).toBe('source-999');
  });

  it('should omit token query params when useQueryToken is false (Jellyfin 12 header auth mode)', () => {
    const directUrl = client.media.getAudioStreamUrl('track-1', { useQueryToken: false });
    const directParsed = new URL(directUrl);
    expect(directParsed.searchParams.has('ApiKey')).toBe(false);
    expect(directParsed.searchParams.has('api_key')).toBe(false);
    expect(directParsed.searchParams.has('X-Emby-Token')).toBe(false);

    const hlsUrl = client.media.getAudioHlsStreamUrl('track-1', { useQueryToken: false });
    const hlsParsed = new URL(hlsUrl);
    expect(hlsParsed.searchParams.has('ApiKey')).toBe(false);
    expect(hlsParsed.searchParams.has('api_key')).toBe(false);
    expect(hlsParsed.searchParams.has('X-Emby-Token')).toBe(false);
  });

  it('should return valid streaming authorization headers with getStreamHeaders', () => {
    const headers = client.media.getStreamHeaders();
    expect(headers.Authorization).toContain('MediaBrowser');
    expect(headers.Authorization).toContain('Token="token-abc"');
    expect(headers['X-Emby-Authorization']).toBe(headers.Authorization);

    const modernHeaders = client.media.getStreamHeaders({ legacy: false });
    expect(modernHeaders.Authorization).toContain('MediaBrowser');
    expect(modernHeaders['X-Emby-Authorization']).toBeUndefined();
  });
});

