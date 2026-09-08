import { describe, it, expect } from 'vitest';
import {
  VIDEO_QUALITY_PRESETS,
  AUDIO_QUALITY_PRESETS,
  getVideoQualityList,
  getAudioQualityList,
  resolveVideoQuality,
  resolveAudioQuality,
  formatBitrate
} from '../src/quality.js';

describe('Quality Module', () => {
  it('should list all video and audio quality presets', () => {
    const videoList = getVideoQualityList();
    expect(videoList.length).toBeGreaterThan(5);
    expect(videoList.some((p) => p.key === '1080p')).toBe(true);
    expect(videoList.some((p) => p.key === '4k')).toBe(true);

    const audioList = getAudioQualityList();
    expect(audioList.length).toBeGreaterThan(3);
    expect(audioList.some((p) => p.key === '320k')).toBe(true);
  });

  it('should resolve video quality by preset key string', () => {
    const res1080 = resolveVideoQuality('1080p');
    expect(res1080.maxStreamingBitrate).toBe(10_000_000);
    expect(res1080.maxWidth).toBe(1920);
    expect(res1080.maxHeight).toBe(1080);

    const res4k = resolveVideoQuality('4k');
    expect(res4k.maxStreamingBitrate).toBe(60_000_000);
    expect(res4k.maxWidth).toBe(3840);
    expect(res4k.maxHeight).toBe(2160);
  });

  it('should resolve video quality by raw numeric bitrate or custom object', () => {
    const fromNum = resolveVideoQuality(5_000_000);
    expect(fromNum.maxStreamingBitrate).toBe(5_000_000);
    expect(fromNum.maxWidth).toBeUndefined();

    const fromObj = resolveVideoQuality({
      key: '1080p',
      label: 'Custom 1080p',
      bitrate: 15_000_000,
      maxWidth: 1920,
      maxHeight: 1080
    });
    expect(fromObj.maxStreamingBitrate).toBe(15_000_000);
    expect(fromObj.maxWidth).toBe(1920);
    expect(fromObj.maxHeight).toBe(1080);
  });

  it('should resolve audio quality by preset key or numeric bitrate', () => {
    const res320 = resolveAudioQuality('320k');
    expect(res320.maxStreamingBitrate).toBe(320_000);

    const res128 = resolveAudioQuality('128k');
    expect(res128.maxStreamingBitrate).toBe(128_000);

    const resNum = resolveAudioQuality(256_000);
    expect(resNum.maxStreamingBitrate).toBe(256_000);
  });

  it('should format bitrates cleanly', () => {
    expect(formatBitrate(undefined)).toBe('Direct');
    expect(formatBitrate(0)).toBe('Direct');
    expect(formatBitrate(320_000)).toBe('320 kbps');
    expect(formatBitrate(10_000_000)).toBe('10 Mbps');
    expect(formatBitrate(1_500_000)).toBe('1.5 Mbps');
  });
});

