---
title: Media & Streaming
category: API Reference
order: 14
icon: movie
badge: "Media"
description: "Audio/video stream URLs, HLS playlists, subtitle extraction, artwork, and direct downloads."
---

# Media & Streaming API

`client.media` provides helpers to construct stream URLs, fetch and parse subtitles, generate artwork URLs, and download media files.

---

## Video Streaming

### `getVideoStreamUrl(itemId, options?)`
Builds progressive video stream URL (`/Videos/{itemId}/stream`).

```typescript
const url = client.media.getVideoStreamUrl('movie-id', {
  static: false,
  quality: '1080p',
  audioStreamIndex: 1,
  subtitleStreamIndex: 2,
  subtitleMethod: 'Encode'
});
```

### `getVideoHlsStreamUrl(itemId, options?)`
Builds adaptive HLS video master playlist URL (`/Videos/{itemId}/master.m3u8`).

```typescript
const hlsUrl = client.media.getVideoHlsStreamUrl('movie-id', {
  quality: '720p',
  segmentLength: 6
});
```

---

## Audio Streaming

### `getAudioStreamUrl(itemId, options?)`
Builds audio stream URL (`/Audio/{itemId}/stream`).

```typescript
const audioUrl = client.media.getAudioStreamUrl('song-id', {
  quality: '320k',
  container: 'opus,mp3'
});
```

### `getAudioHlsStreamUrl(itemId, options?)`
Builds audio HLS stream URL (`/Audio/{itemId}/master.m3u8`).

---

## Subtitles

### `getSubtitleTracks(item)`
Parses the `MediaStreams` of an item and returns normalized subtitle track objects:

```typescript
interface SubtitleTrackInfo {
  index: number;
  language?: string;
  displayTitle: string;
  codec: string;
  isDefault: boolean;
  isForced: boolean;
  isExternal: boolean;
  url: string;
}

const tracks = client.media.getSubtitleTracks(movie);
```

### `getSubtitleUrl(itemId, mediaSourceId, index, options?)`
Builds the subtitle stream URL (`/Videos/{itemId}/{mediaSourceId}/Subtitles/{index}/Stream.{format}`).

### `getSubtitles(itemId, mediaSourceId, index, options?)`
Fetches the subtitle file content as plain text (e.g. WebVTT or SRT).

```typescript
const vttText = await client.media.getSubtitles('movie-id', 'source-id', 2, { format: 'vtt' });
```

---

## Artwork & Images

### `getArtworkUrl(itemOrId, options?)`
Builds responsive image URLs with caching tags, dimensions, and fallbacks.

```typescript
const url = client.media.getArtworkUrl(item, {
  type: 'Primary',       // 'Primary' | 'Art' | 'Backdrop' | 'Banner' | 'Logo' | 'Thumb' | 'Disc'
  maxWidth: 500,
  maxHeight: 750,
  quality: 90,
  fallbackUrl: '/assets/placeholder.png'
});
```

---

## Downloads

### `getDownloadUrl(itemId, options?)`
Builds direct download URL for the original file (`/Items/{itemId}/Download`).

### `downloadFile(itemId, options?)`
Downloads the file content into a browser/runtime `Blob` with progress callbacks:

```typescript
const blob = await client.media.downloadFile('item-id', {
  onProgress: (fraction) => console.log(`${(fraction * 100).toFixed(0)}%`)
});
```

---

## Quality Presets & Helpers

Imported directly from `@francofantomius/jellyfin`:
- `VIDEO_QUALITY_PRESETS`: Dictionary of video presets (`4k`, `1080p`, `720p`, etc.).
- `AUDIO_QUALITY_PRESETS`: Dictionary of audio presets (`320k`, `256k`, `192k`, `128k`, `64k`).
- `resolveVideoQuality(presetOrOptions)`: Normalizes preset string or custom bitrate/resolution options.
- `resolveAudioQuality(presetOrOptions)`: Normalizes audio preset or bitrate options.
- `formatBitrate(bitrate)`: Human-readable bitrate formatter (`10_000_000` -> `"10 Mbps"`).

