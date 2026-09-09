---
title: Playlists, Lyrics & Favorites
category: API Reference
order: 20
icon: queue_music
badge: "Playlists"
description: "Creating and managing playlists, custom cover art, synced lyrics, and user favorites."
---

# Playlists, Lyrics & Favorites API

Covers `client.playlists` for playlist operations and image uploads, `client.lyrics` for song lyrics, and `client.favorites` for user favorite items.

---

## `client.playlists`

### Creating Playlists
Supports Jellyfin 12 POST JSON body and Jellyfin 10 query parameters automatically:

```typescript
const playlistId = await client.playlists.createPlaylist({
  name: 'Roadtrip 2026',
  trackIds: ['song-1', 'song-2']
});
```

### Retrieving & Managing Playlists
- `getPlaylists()`: Returns all user playlists.
- `getPlaylistItems(playlistId, options?)`: Returns items in a playlist.
- `deletePlaylist(playlistId)`: Deletes a playlist.
- `addTracks(playlistId, trackIds)`: Adds items to the playlist.
- `removeTrack(playlistId, trackId)`: Removes an item by item ID.
- `removePlaylistItem(playlistId, playlistItemId)`: Removes an item by playlist entry ID.

### Uploading Playlist Artwork
Uploads custom cover artwork for a playlist:

```typescript
await client.playlists.uploadPlaylistImage(
  playlistId,
  base64EncodedJpegString,
  'image/jpeg'
);
```

---

## `client.lyrics`

### `getLyrics(itemId)`
Fetches synced or unsynced song lyrics (`GET /Audio/{itemId}/Lyrics`).

```typescript
const lyricsData = await client.lyrics.getLyrics('song-id');

if (lyricsData?.Lyrics) {
  lyricsData.Lyrics.forEach((line) => {
    console.log(`[${(line.Start / 10_000_000).toFixed(2)}s] ${line.Text}`);
  });
}
```

---

## `client.favorites`

### `markFavorite(itemId)`
Marks an item as a favorite (`POST /UserFavoriteItems/{itemId}`).

```typescript
await client.favorites.markFavorite('movie-id');
```

### `unmarkFavorite(itemId)`
Removes an item from favorites (`DELETE /UserFavoriteItems/{itemId}`).

```typescript
await client.favorites.unmarkFavorite('movie-id');
```

