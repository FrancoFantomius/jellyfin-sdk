export type VideoQualityPresetKey =
  | 'auto'
  | 'direct'
  | '4k'
  | '1080p-high'
  | '1080p'
  | '720p-high'
  | '720p'
  | '480p'
  | '360p'
  | '240p';

export interface VideoQualityOption {
  key: VideoQualityPresetKey;
  label: string;
  bitrate?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export type AudioQualityPresetKey =
  | 'direct'
  | '320k'
  | '256k'
  | '192k'
  | '128k'
  | '64k';

export interface AudioQualityOption {
  key: AudioQualityPresetKey;
  label: string;
  bitrate?: number;
}

export const VIDEO_QUALITY_PRESETS: Record<VideoQualityPresetKey, VideoQualityOption> = {
  direct: { key: 'direct', label: 'Original (Direct)' },
  auto: { key: 'auto', label: 'Auto' },
  '4k': { key: '4k', label: '4K Ultra HD (60 Mbps)', bitrate: 60_000_000, maxWidth: 3840, maxHeight: 2160 },
  '1080p-high': { key: '1080p-high', label: '1080p High (20 Mbps)', bitrate: 20_000_000, maxWidth: 1920, maxHeight: 1080 },
  '1080p': { key: '1080p', label: '1080p (10 Mbps)', bitrate: 10_000_000, maxWidth: 1920, maxHeight: 1080 },
  '720p-high': { key: '720p-high', label: '720p High (6 Mbps)', bitrate: 6_000_000, maxWidth: 1280, maxHeight: 720 },
  '720p': { key: '720p', label: '720p (4 Mbps)', bitrate: 4_000_000, maxWidth: 1280, maxHeight: 720 },
  '480p': { key: '480p', label: '480p (2 Mbps)', bitrate: 2_000_000, maxWidth: 854, maxHeight: 480 },
  '360p': { key: '360p', label: '360p (1 Mbps)', bitrate: 1_000_000, maxWidth: 640, maxHeight: 360 },
  '240p': { key: '240p', label: '240p (420 kbps)', bitrate: 420_000, maxWidth: 426, maxHeight: 240 }
};

export const AUDIO_QUALITY_PRESETS: Record<AudioQualityPresetKey, AudioQualityOption> = {
  direct: { key: 'direct', label: 'Original (Direct)' },
  '320k': { key: '320k', label: '320 kbps', bitrate: 320_000 },
  '256k': { key: '256k', label: '256 kbps', bitrate: 256_000 },
  '192k': { key: '192k', label: '192 kbps', bitrate: 192_000 },
  '128k': { key: '128k', label: '128 kbps', bitrate: 128_000 },
  '64k': { key: '64k', label: '64 kbps', bitrate: 64_000 }
};

/**
 * Returns a list of all available video quality presets.
 */
export function getVideoQualityList(): VideoQualityOption[] {
  return Object.values(VIDEO_QUALITY_PRESETS);
}

/**
 * Returns a list of all available audio quality presets.
 */
export function getAudioQualityList(): AudioQualityOption[] {
  return Object.values(AUDIO_QUALITY_PRESETS);
}

/**
 * Resolves video quality option into bitrate, maxWidth, and maxHeight constraints.
 */
export function resolveVideoQuality(
  quality?: VideoQualityPresetKey | VideoQualityOption | number | string
): { maxStreamingBitrate?: number; maxWidth?: number; maxHeight?: number } {
  if (!quality) return {};

  if (typeof quality === 'number') {
    return { maxStreamingBitrate: quality };
  }

  if (typeof quality === 'string') {
    const key = quality.toLowerCase() as VideoQualityPresetKey;
    if (VIDEO_QUALITY_PRESETS[key]) {
      const preset = VIDEO_QUALITY_PRESETS[key];
      return {
        maxStreamingBitrate: preset.bitrate,
        maxWidth: preset.maxWidth,
        maxHeight: preset.maxHeight
      };
    }
    const parsed = parseInt(quality, 10);
    if (!Number.isNaN(parsed)) {
      return { maxStreamingBitrate: parsed };
    }
    return {};
  }

  if (typeof quality === 'object') {
    return {
      maxStreamingBitrate: quality.bitrate,
      maxWidth: quality.maxWidth,
      maxHeight: quality.maxHeight
    };
  }

  return {};
}

/**
 * Resolves audio quality option into bitrate constraint.
 */
export function resolveAudioQuality(
  quality?: AudioQualityPresetKey | AudioQualityOption | number | string
): { maxStreamingBitrate?: number } {
  if (!quality) return {};

  if (typeof quality === 'number') {
    return { maxStreamingBitrate: quality };
  }

  if (typeof quality === 'string') {
    const key = quality.toLowerCase() as AudioQualityPresetKey;
    if (AUDIO_QUALITY_PRESETS[key]) {
      return { maxStreamingBitrate: AUDIO_QUALITY_PRESETS[key].bitrate };
    }
    const parsed = parseInt(quality, 10);
    if (!Number.isNaN(parsed)) {
      return { maxStreamingBitrate: parsed };
    }
    return {};
  }

  if (typeof quality === 'object' && quality.bitrate) {
    return { maxStreamingBitrate: quality.bitrate };
  }

  return {};
}

/**
 * Formats a bitrate in bps into a human-readable string (e.g. "10 Mbps", "320 kbps").
 */
export function formatBitrate(bitrate?: number): string {
  if (!bitrate || bitrate <= 0) return 'Direct';
  if (bitrate >= 1_000_000) {
    const mbps = bitrate / 1_000_000;
    return `${Number.isInteger(mbps) ? mbps : mbps.toFixed(1)} Mbps`;
  }
  const kbps = Math.round(bitrate / 1000);
  return `${kbps} kbps`;
}

