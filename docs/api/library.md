---
title: Library Browsing
category: API Reference
order: 12
icon: video_library
badge: "Library"
description: "Browse music, movies, TV series, seasons, episodes, and negotiate playback information."
---

# Media Library API

`client.library` provides methods for querying user media libraries, browsing collections, and retrieving playback stream negotiation details.

---

## Library Views

### `getVideoLibraries()`
Retrieves top-level video views/folders (Movies, Shows, Home Videos).

```typescript
const views = await client.library.getVideoLibraries();
```

### `getMusicLibraries()`
Retrieves top-level music views/folders.

```typescript
const musicViews = await client.library.getMusicLibraries();
```

---

## Movies & Series

### `getMovies(options?)`
Queries movies with pagination, genre, year, and sorting filters.

```typescript
const movies = await client.library.getMovies({
  limit: 20,
  startIndex: 0,
  genres: ['Action', 'Thriller'],
  years: [2023, 2024],
  sortBy: 'CommunityRating',
  sortOrder: 'Descending'
});
```

### `getSeries(options?)`
Queries TV series.

```typescript
const series = await client.library.getSeries({ limit: 25 });
```

### `getSeasons(seriesId, options?)`
Retrieves seasons for a TV series (`GET /Shows/{seriesId}/Seasons`).

```typescript
const seasons = await client.library.getSeasons('series-id');
```

### `getEpisodes(seriesId, seasonId?, options?)`
Retrieves episodes for a series, optionally scoped to a single season (`GET /Shows/{seriesId}/Episodes`).

```typescript
const episodes = await client.library.getEpisodes('series-id', 'season-id');
```

### `getVideos(options?)`
Queries generic video items (home videos, music videos, recordings).

---

## Music

### `getAlbums(options?)`
Queries music albums.

```typescript
const albums = await client.library.getAlbums({ limit: 50 });
```

### `getArtists(options?)`
Queries music artists.

```typescript
const artists = await client.library.getArtists({ limit: 50 });
```

### `getSongs(options?)`
Queries music tracks/songs.

```typescript
const songs = await client.library.getSongs({ albumId: 'album-id' });
```

### `getFavoriteSongs(options?)`
Queries songs marked as favorite by the user.

```typescript
const favs = await client.library.getFavoriteSongs();
```

---

## Item Details & Playback Info

### `getItem(itemId)`
Fetches complete metadata for a single item by ID.

```typescript
const item = await client.library.getItem('item-id');
```

### `getPlaybackInfo(itemId, options?)`
Posts to `/Items/{itemId}/PlaybackInfo` to negotiate direct play capability, audio stream selection, and transcode parameters with the server.

```typescript
const playbackInfo = await client.library.getPlaybackInfo('movie-id', {
  audioStreamIndex: 1,
  subtitleStreamIndex: 2,
  maxStreamingBitrate: 10_000_000
});
```

