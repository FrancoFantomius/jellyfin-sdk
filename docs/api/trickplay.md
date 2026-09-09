---
title: Trickplay & Scrubbing Thumbnails
category: API Reference
order: 21
icon: preview
badge: "Trickplay"
description: "Jellyfin 10.9+ trickplay tile manifests, image tiles, resolution discovery, and scrubbing preview coordinates."
---

# Trickplay & Scrubbing Thumbnails API

`client.trickplay` provides access to Jellyfin 10.9+ Trickplay manifests and image tiles. Trickplay generates image sheets ("sprite sheets") containing thumbnails of the video at periodic intervals (e.g., every 10 seconds), enabling smooth seekbar visual scrub previews in player UIs.

---

## HLS Tiles Playlist & Images

### `getTilesHlsUrl(itemId, width, options?)`
Generates the HLS playlist URL for trickplay scrubbing image tiles (`/Videos/{itemId}/Trickplay/{width}/tiles.m3u8`).

```typescript
const hlsUrl = client.trickplay.getTilesHlsUrl('video-item-id', 320, {
  mediaSourceId: 'source-id',
  useQueryToken: true
});
```

### `getTileImageUrl(itemId, width, index, options?)`
Generates the URL for a specific trickplay thumbnail tile image sheet (`/Videos/{itemId}/Trickplay/{width}/{index}.jpg`).

```typescript
const sheetUrl = client.trickplay.getTileImageUrl('video-item-id', 320, 0);
```

---

## Trickplay Manifests & Parsing

### `getTrickplayManifest(itemId, width, options?)`
Fetches and parses the `tiles.m3u8` playlist for the specified media item and thumbnail width.

```typescript
const manifest = await client.trickplay.getTrickplayManifest('video-item-id', 320);

console.log(`Resolution: ${manifest.width}px, Tiles: ${manifest.tiles.length}`);
for (const tile of manifest.tiles) {
  console.log(`Sheet #${tile.index}, Duration: ${tile.durationMs}ms, URL: ${tile.url}`);
}
```

---

## Resolution & Metadata Discovery

### `getAvailableResolutions(item, mediaSourceId?)`
Inspects `item.Trickplay` metadata and returns an array of available thumbnail widths (sorted ascending, e.g. `[320, 640]`).

```typescript
const item = await client.library.getItem('video-item-id');
const resolutions = client.trickplay.getAvailableResolutions(item);
// [320, 640]
```

### `getTrickplayInfo(item, width?, mediaSourceId?)`
Retrieves the `TrickplayInfoDto` metadata for the given item and resolution.

```typescript
const info = client.trickplay.getTrickplayInfo(item, 320);
// { Width: 320, Height: 180, TileWidth: 10, TileHeight: 10, Interval: 10000, ThumbnailCount: 150, Bandwidth: 150000 }
```

---

## Timestamp to Sprite Coordinates

### `getThumbnailForTimestamp(options)`
Calculates the exact tile sheet index, image URL, and sprite coordinates `(x, y, width, height)` for any given playback timestamp. This makes implementing canvas rendering or CSS background-position sprite clipping straightforward.

```typescript
const thumb = client.trickplay.getThumbnailForTimestamp({
  item,
  timestampMs: 35000, // 35 seconds into the video
  width: 320
});

if (thumb) {
  console.log(`Displaying thumbnail from sheet ${thumb.tileIndex}`);
  console.log(`Image URL: ${thumb.imageUrl}`);
  console.log(`Sprite clipping offset: x=${thumb.x}px, y=${thumb.y}px, size=${thumb.width}x${thumb.height}px`);
}
```

