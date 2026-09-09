---
title: Genres, Studios & Collections
category: API Reference
order: 23
icon: category
badge: "Metadata"
description: "Browse video genres, music genres, studios, and manage BoxSet collections."
---

# Genres, Studios & Collections API

The SDK provides dedicated modules for exploring genres, production studios, and BoxSet collections via `client.genres` and `client.collections`.

---

## Genres & Studios (`client.genres`)

### Video & Movie Genres
- `getGenres(options?)`: Queries video genres via `GET /Genres`. Supports `searchTerm`, `sortBy`, `sortOrder`, `startIndex`, `limit`, and `parentId`.
- `getGenre(genreName, options?)`: Retrieves a single genre by name via `GET /Genres/{genreName}`.

```typescript
const movieGenres = await client.genres.getGenres({ limit: 50, sortBy: 'SortName' });
const sciFi = await client.genres.getGenre('Sci-Fi');
```

### Music Genres
- `getMusicGenres(options?)`: Queries music genres via `GET /MusicGenres`.
- `getMusicGenre(genreName, options?)`: Retrieves a single music genre via `GET /MusicGenres/{genreName}`.

```typescript
const musicGenres = await client.genres.getMusicGenres();
const jazz = await client.genres.getMusicGenre('Jazz');
```

### Studios & Production Companies
- `getStudios(options?)`: Queries production studios via `GET /Studios`.
- `getStudio(studioName, options?)`: Retrieves a single studio via `GET /Studios/{studioName}`.

```typescript
const studios = await client.genres.getStudios({ searchTerm: 'Warner' });
const warnerBros = await client.genres.getStudio('Warner Bros');
```

---

## BoxSet Collections (`client.collections`)

### Browsing Collections
- `getCollections(options?)`: Retrieves user BoxSets / Collections via `GET /Collections`.
- `getCollectionItems(collectionId, options?)`: Queries items inside a BoxSet collection.

```typescript
const collections = await client.collections.getCollections();
const mcuMovies = await client.collections.getCollectionItems('mcu-boxset-id', {
  sortBy: 'PremiereDate',
  sortOrder: 'Ascending'
});
```

### Collection Management
- `createCollection(options)`: Creates a new BoxSet via `POST /Collections`.
- `addToCollection(collectionId, itemIds)`: Adds items to an existing BoxSet via `POST /Collections/{collectionId}/Items`.
- `removeFromCollection(collectionId, itemIds)`: Removes items from a BoxSet via `DELETE /Collections/{collectionId}/Items`.

```typescript
// Create new collection
const newBoxSet = await client.collections.createCollection({
  name: 'Star Wars Saga',
  ids: ['movie-id-1', 'movie-id-2']
});

// Add more items
await client.collections.addToCollection(newBoxSet.Id, ['movie-id-3', 'movie-id-4']);

// Remove an item
await client.collections.removeFromCollection(newBoxSet.Id, 'movie-id-1');
```

