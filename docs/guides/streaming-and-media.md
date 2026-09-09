---
title: Streaming & Media
category: Guides
order: 2
icon: play_circle
badge: "Guide"
description: "Master audio and video streaming, HLS playlists, subtitles, quality presets, and artwork."
---

# Streaming, Media & Playback

The `@francofantomius/jellyfin` SDK provides tools for generating direct play URLs, adaptive HLS streams, subtitle extraction, responsive artwork URLs, and quality presets.

---

## 1. Video Streaming

### Direct Play vs. Transcoding

When a client supports the native audio/video codecs and container format of an item on the server, you can stream directly without server CPU overhead (`static=true`):

```typescript
// Direct Play Stream URL
const directUrl = client.media.getVideoStreamUrl('movie-item-id', {
  static: true,
  container: 'mp4'
});
```

When transcoding is required (e.g. incompatible audio track, container remuxing, or bitrate capping):

```typescript
const transcodeUrl = client.media.getVideoStreamUrl('movie-item-id', {
  quality: '1080p',       // Automatically sets 10 Mbps and 1920x1080 bounds
  audioStreamIndex: 1,    // Select secondary language track
  subtitleStreamIndex: 2, // Burn in or stream subtitles
  subtitleMethod: 'Encode'
});
```

### Adaptive HLS Playlists

For modern video players supporting HLS (such as Video.js, Shaka Player, Hls.js, or native Safari video):

```typescript
const hlsUrl = client.media.getVideoHlsStreamUrl('movie-item-id', {
  quality: '720p',
  segmentLength: 4 // Segment size in seconds
});

// Pass to HLS player:
// hls.loadSource(hlsUrl);
```

---

## 2. Video & Audio Quality Presets

The SDK includes standard quality presets so you don't need to hardcode arbitrary bitrates and resolutions:

```typescript
import { 
  VIDEO_QUALITY_PRESETS, 
  AUDIO_QUALITY_PRESETS, 
  resolveVideoQuality, 
  formatBitrate 
} from '@francofantomius/jellyfin';

// Inspect available video presets
console.log(VIDEO_QUALITY_PRESETS['1080p'].label);          // "1080p (10 Mbps)"
console.log(VIDEO_QUALITY_PRESETS['1080p'].maxBitrate);     // 10000000
console.log(VIDEO_QUALITY_PRESETS['1080p'].maxWidth);       // 1920
console.log(VIDEO_QUALITY_PRESETS['1080p'].maxHeight);      // 1080

// Inspect audio presets
console.log(AUDIO_QUALITY_PRESETS['320k'].maxBitrate);      // 320000

// Helper utility to format bitrates for display
console.log(formatBitrate(10_000_000)); // "10 Mbps"
console.log(formatBitrate(320_000));    // "320 kbps"
```

Available Video Presets:
- `4k` (40 Mbps, 3840x2160)
- `1080p-high` (20 Mbps, 1920x1080)
- `1080p` (10 Mbps, 1920x1080)
- `720p-high` (8 Mbps, 1280x720)
- `720p` (4 Mbps, 1280x720)
- `480p` (2 Mbps, 720x480)
- `360p` (1 Mbps, 640x360)
- `240p` (500 kbps, 426x240)
- `direct` (original quality, direct play)

---

## 3. Audio Streaming

Generate direct or transcoded universal audio stream URLs for audio players:

```typescript
const audioUrl = client.media.getAudioStreamUrl('song-item-id', {
  quality: '320k', // Preset or pass maxStreamingBitrate directly
  container: 'opus,mp3,aac',
  startTimeTicks: 0
});
```

---

## 4. Subtitles

### Extracting Tracks from Item Metadata

You can extract subtitle tracks directly from an item's `MediaStreams` metadata without extra requests:

```typescript
const movie = await client.library.getItem('movie-item-id');
const subtitleTracks = client.media.getSubtitleTracks(movie);

subtitleTracks.forEach((track) => {
  console.log(`[#${track.index}] ${track.displayTitle} (${track.codec})`);
  console.log(`URL: ${track.url}`);
  console.log(`Is Default: ${track.isDefault}, Forced: ${track.isForced}`);
});
```

### Direct Subtitle Stream & Raw Fetching

```typescript
const mediaSourceId = movie.MediaSources[0].Id;
const streamIndex = 2;

// Generate subtitle stream URL (WebVTT format)
const vttUrl = client.media.getSubtitleUrl('movie-item-id', mediaSourceId, streamIndex, {
  format: 'vtt'
});

// Fetch raw text content of subtitle file
const rawVttText = await client.media.getSubtitles('movie-item-id', mediaSourceId, streamIndex, {
  format: 'vtt'
});
```

---

## 5. Responsive Artwork Generation

Generate optimized image URLs for posters, backdrops, logos, and banners with dimensions and quality parameters:

```typescript
const artworkUrl = client.media.getArtworkUrl(movie, {
  type: 'Primary', // 'Primary' | 'Art' | 'Backdrop' | 'Banner' | 'Logo' | 'Thumb' | 'Disc'
  maxWidth: 600,
  maxHeight: 900,
  quality: 85,
  fallbackUrl: '/assets/placeholder-poster.png'
});
```

---

## 6. Playback Reporting & Scrobbling

Keep server play counts, resume times, and "Now Playing" dashboard state synchronized:

```typescript
const playSessionId = 'unique-session-id';
const itemId = movie.Id;

// 1. Report playback started
await client.playback.reportStart(itemId, 0, { playSessionId });

// 2. Report progress (e.g. every 10 seconds or on seek)
await client.playback.reportProgress(itemId, currentPositionTicks, false, { playSessionId });

// 3. Report playback stopped (automatically tears down active transcode session)
await client.playback.reportStopped(itemId, finalPositionTicks, { playSessionId });
```

> [!IMPORTANT]
> Always report playback stopped with `playSessionId` so that active server-side FFmpeg transcoding processes are cleanly terminated.

