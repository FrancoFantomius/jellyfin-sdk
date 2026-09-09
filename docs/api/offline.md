---
title: Offline Storage
category: API Reference
order: 18
icon: folder_special
badge: "Storage"
description: "Browser IndexedDB media caching and download manager for offline video and audio playback."
---

# Offline Storage API

`client.offline` is a complete browser IndexedDB media manager designed for storing audio and video blobs, artwork, and metadata for offline playback.

---

## Availability

### `isSupported()`
Checks whether IndexedDB is accessible in the current execution environment.

```typescript
const supported = client.offline.isSupported();
```

---

## Downloading Items

### `downloadItem(item, onProgress?, options?)`
Downloads an audio or video item, its artwork, and item metadata into IndexedDB.

```typescript
await client.offline.downloadItem(
  item,
  (progress) => console.log(`Progress: ${(progress * 100).toFixed(0)}%`),
  {
    quality: '1080p',
    includeArtwork: true
  }
);
```

### `downloadItems(items, onProgress?, options?)`
Batch downloads multiple items with aggregated progress tracking.

```typescript
await client.offline.downloadItems(
  itemsList,
  (overallFraction, currentIndex, totalItems) => {
    console.log(`Track ${currentIndex + 1}/${totalItems} (${(overallFraction * 100).toFixed(0)}%)`);
  }
);
```

---

## Accessing Downloaded Media

### `isItemDownloaded(itemId)`
Checks if an item exists in the local database.

```typescript
const downloaded = await client.offline.isItemDownloaded('item-id');
```

### `getDownloadedBlob(itemId)`
Retrieves the raw media `Blob` from local storage.

### `getDownloadedBlobUrl(itemId)`
Creates a temporary `blob:` object URL for `<audio>` or `<video>` elements.

```typescript
const blobUrl = await client.offline.getDownloadedBlobUrl('item-id');
videoPlayer.src = blobUrl;
```

---

## Managing Offline Records

### `getAllDownloads()`
Returns an array of all downloaded item records with metadata and size:

```typescript
const records = await client.offline.getAllDownloads();
records.forEach((rec) => {
  console.log(`${rec.name} - ${rec.size} bytes`);
});
```

### `removeDownload(itemId)`
Deletes the item blob and metadata from the local database.

### `clearAllDownloads()`
Empties the offline IndexedDB store completely.

