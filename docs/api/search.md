---
title: Search
category: API Reference
order: 13
icon: search
badge: "Search"
description: "Universal and scoped search across all items, libraries, genres, and media types."
---

# Search API

`client.search` provides dedicated universal search methods and media-specific shortcuts with fine-grained filtering by parent folder, genres, years, and favorites.

---

## Universal Search

### `search(query, options?)`
Searches across all items matching the search query.

```typescript
const results = await client.search.search('Dune', {
  includeItemTypes: ['Movie', 'Series'],
  limit: 20
});
```

### `searchInLibrary(parentId, query, options?)`
Restricts search scope to a specific library view or collection folder:

```typescript
const results = await client.search.searchInLibrary('music-library-id', 'Radiohead');
```

---

## Media-Specific Shortcuts

Each shortcut automatically pre-configures `includeItemTypes`:

| Method | Target Item Type |
| :--- | :--- |
| `searchMovies(query, options?)` | `'Movie'` |
| `searchSeries(query, options?)` | `'Series'` |
| `searchEpisodes(query, options?)` | `'Episode'` |
| `searchSongs(query, options?)` | `'Audio'` |
| `searchAlbums(query, options?)` | `'MusicAlbum'` |
| `searchArtists(query, options?)` | `'MusicArtist'` |

Example:
```typescript
const movies = await client.search.searchMovies('Matrix', {
  years: [1999, 2003, 2021],
  sortBy: 'ProductionYear',
  sortOrder: 'Ascending'
});
```

---

## `SearchOptions` Interface

| Field | Type | Description |
| :--- | :--- | :--- |
| `parentId` | `string` | Scopes search to child items of a folder or library view. |
| `includeItemTypes` | `string \| string[]` | Types to include (e.g. `'Movie'`, `['Audio', 'MusicAlbum']`). |
| `mediaTypes` | `string \| string[]` | Media type filter (`'Audio'`, `'Video'`). |
| `genres` | `string[]` | Array of genre names to filter by (pipe-separated in API call). |
| `years` | `number[]` | Array of production years (comma-separated). |
| `isFavorite` | `boolean` | If true, filters only items marked as favorite. |
| `sortBy` | `string` | Field to sort by (`'SortName'`, `'ProductionYear'`, `'DateCreated'`). |
| `sortOrder` | `'Ascending' \| 'Descending'` | Sort direction. |
| `limit` | `number` | Maximum number of results to return (default: `30`). |
| `startIndex` | `number` | Pagination offset (default: `0`). |
| `fields` | `string` | Comma-separated list of metadata fields to include. |
| `recursive` | `boolean` | Search recursively through sub-folders (default: `true`). |
| `userId` | `string` | Override the active user ID. |

