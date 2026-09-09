---
title: Offline & Downloads
category: Guides
order: 3
icon: download_for_offline
badge: "Guide"
description: "Implement offline media caching using IndexedDB and direct progress-tracked downloads."
---

# Offline Storage & Direct Downloads

`@francofantomius/jellyfin` provides built-in browser IndexedDB media storage for offline audio and video playback, as well as helpers for downloading original files with progress callbacks.

---

## 1. Browser Offline Storage Manager

The `client.offline` manager saves media files (blobs), thumbnails, and metadata directly to browser IndexedDB storage for offline playback.

### Checking Browser Support

```typescript
if (client.offline.isSupported()) {
  console.log('IndexedDB offline storage is available in this browser environment.');
} else {
  console.warn('Offline storage is not supported (e.g. headless Node.js or private browsing without IndexedDB).');
}
```

### Downloading Media for Offline Playback

Download a single movie, episode, or song item with real-time download progress:

```typescript
const movie = await client.library.getItem('movie-item-id');

await client.offline.downloadItem(
  movie,
  (fraction) => {
    const percent = (fraction * 100).toFixed(1);
    console.log(`Downloading item: ${percent}%`);
  },
  {
    quality: '720p', // Optional quality transcoding if saving space
    includeArtwork: true
  }
);

console.log('Item saved to offline storage!');
```

### Batch Downloading Items

Download multiple tracks or episodes with an aggregated progress callback:

```typescript
const albumSongs = await client.library.getSongs({ albumId: 'album-id' });

await client.offline.downloadItems(
  albumSongs.Items,
  (overallFraction, currentIndex, totalItems) => {
    console.log(`Downloading track ${currentIndex + 1} of ${totalItems} (${(overallFraction * 100).toFixed(0)}%)`);
  }
);
```

### Playing Offline Content

Check if an item is stored locally and generate an object URL for `<video>` or `<audio>` elements:

```typescript
const isDownloaded = await client.offline.isItemDownloaded('movie-item-id');

if (isDownloaded) {
  // Obtain local Blob URL
  const localMediaUrl = await client.offline.getDownloadedBlobUrl('movie-item-id');
  
  // Assign directly to HTML5 video/audio player
  videoElement.src = localMediaUrl;
  videoElement.play();
} else {
  // Stream from server as fallback
  videoElement.src = client.media.getVideoStreamUrl('movie-item-id');
}
```

### Managing Offline Storage Records

```typescript
// List all offline records
const downloads = await client.offline.getAllDownloads();
downloads.forEach((record) => {
  console.log(`${record.name} (${(record.size / 1024 / 1024).toFixed(1)} MB)`);
});

// Remove a specific download
await client.offline.removeDownload('movie-item-id');

// Clear all offline storage
await client.offline.clearAllDownloads();
```

---

## 2. Server Direct File Downloads

If you need to download original source files directly (for export or saving to disk in Node.js or desktop web browsers):

### Generating Direct Download URLs

```typescript
const downloadUrl = client.media.getDownloadUrl('movie-item-id', {
  filename: 'MyMovie (2024).mp4'
});

// Use in HTML anchor tag:
// <a href={downloadUrl} download="MyMovie.mp4">Download Original File</a>
```

### In-Memory Blob Download with Progress

```typescript
const blob = await client.media.downloadFile('movie-item-id', {
  onProgress: (fraction) => {
    console.log(`Download progress: ${(fraction * 100).toFixed(0)}%`);
  }
});

console.log(`Downloaded ${blob.size} bytes`);
```

