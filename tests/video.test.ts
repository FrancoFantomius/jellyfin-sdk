import { describe, it, expect, vi } from 'vitest';
import { JellyfinClient } from '../src/client.js';

describe('Video, Subtitles, and Downloads in MediaModule', () => {
  const client = new JellyfinClient({
    serverUrl: 'https://jellyfin.example.com',
    accessToken: 'token-vid',
    userId: 'user-vid',
    clientInfo: { deviceId: 'dev-vid' }
  });

  it('should generate direct play video stream URL', () => {
    const urlStr = client.media.getVideoStreamUrl('movie-1', {
      static: true,
      container: 'mp4'
    });

    const url = new URL(urlStr);
    expect(url.origin).toBe('https://jellyfin.example.com');
    expect(url.pathname).toBe('/Videos/movie-1/stream.mp4');
    expect(url.searchParams.get('api_key')).toBe('token-vid');
    expect(url.searchParams.get('Static')).toBe('true');
    expect(url.searchParams.get('DeviceId')).toBe('dev-vid');
  });

  it('should generate transcoded video stream URL with quality preset and subtitle options', () => {
    const urlStr = client.media.getVideoStreamUrl('episode-1', {
      quality: '1080p',
      audioStreamIndex: 1,
      subtitleStreamIndex: 3,
      subtitleMethod: 'Encode',
      startTimeTicks: 600000000
    });

    const url = new URL(urlStr);
    expect(url.pathname).toBe('/Videos/episode-1/stream');
    expect(url.searchParams.get('MaxStreamingBitrate')).toBe('10000000');
    expect(url.searchParams.get('MaxWidth')).toBe('1920');
    expect(url.searchParams.get('MaxHeight')).toBe('1080');
    expect(url.searchParams.get('AudioStreamIndex')).toBe('1');
    expect(url.searchParams.get('SubtitleStreamIndex')).toBe('3');
    expect(url.searchParams.get('SubtitleMethod')).toBe('Encode');
    expect(url.searchParams.get('StartTimeTicks')).toBe('600000000');
  });

  it('should generate video HLS stream URL with quality preset', () => {
    const urlStr = client.media.getVideoHlsStreamUrl('movie-2', {
      quality: '720p',
      segmentLength: 4
    });

    const url = new URL(urlStr);
    expect(url.pathname).toBe('/Videos/movie-2/master.m3u8');
    expect(url.searchParams.get('MaxStreamingBitrate')).toBe('4000000');
    expect(url.searchParams.get('MaxWidth')).toBe('1280');
    expect(url.searchParams.get('MaxHeight')).toBe('720');
    expect(url.searchParams.get('SegmentLength')).toBe('4');
    expect(url.searchParams.get('TranscodingProtocol')).toBe('hls');
  });

  it('should generate subtitle stream URL with format and token', () => {
    const urlStr = client.media.getSubtitleUrl('movie-1', 'source-1', 2, { format: 'vtt' });
    const url = new URL(urlStr);
    expect(url.pathname).toBe('/Videos/movie-1/source-1/Subtitles/2/Stream.vtt');
    expect(url.searchParams.get('api_key')).toBe('token-vid');
  });

  it('should extract subtitle tracks from item metadata', () => {
    const item = {
      Id: 'item-100',
      Name: 'Sample Movie',
      MediaSources: [
        {
          Id: 'source-100',
          MediaStreams: [
            { Type: 'Video', Index: 0, Codec: 'h264' },
            { Type: 'Audio', Index: 1, Codec: 'aac' },
            { Type: 'Subtitle', Index: 2, Codec: 'subrip', Language: 'eng', DisplayTitle: 'English (SRT)', IsDefault: true, IsForced: false, IsExternal: true },
            { Type: 'Subtitle', Index: 3, Codec: 'vtt', Language: 'ita', DisplayTitle: 'Italian (VTT)', IsDefault: false, IsForced: false, IsExternal: true }
          ]
        }
      ]
    };

    const tracks = client.media.getSubtitleTracks(item);
    expect(tracks).toHaveLength(2);
    expect(tracks[0].language).toBe('eng');
    expect(tracks[0].displayTitle).toBe('English (SRT)');
    expect(tracks[0].isDefault).toBe(true);
    expect(tracks[0].url).toContain('/Videos/item-100/source-100/Subtitles/2/Stream.srt');
    expect(tracks[1].language).toBe('ita');
    expect(tracks[1].url).toContain('/Videos/item-100/source-100/Subtitles/3/Stream.vtt');
  });

  it('should fetch subtitle raw text via getSubtitles', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'text/vtt' }),
      text: async () => 'WEBVTT\n\n00:01.000 --> 00:04.000\nHello World'
    });

    const testClient = new JellyfinClient({
      serverUrl: 'https://jellyfin.example.com',
      accessToken: 'token-abc',
      fetch: mockFetch as unknown as typeof fetch
    });

    const subText = await testClient.media.getSubtitles('movie-1', 'source-1', 2, { format: 'vtt' });
    expect(subText).toContain('WEBVTT');
    expect(subText).toContain('Hello World');
  });

  it('should generate download URL for items', () => {
    const downloadUrl = client.media.getDownloadUrl('movie-file-1', { filename: 'mymovie.mp4' });
    const url = new URL(downloadUrl);
    expect(url.pathname).toBe('/Items/movie-file-1/Download');
    expect(url.searchParams.get('api_key')).toBe('token-vid');
    expect(url.searchParams.get('filename')).toBe('mymovie.mp4');
  });
});

