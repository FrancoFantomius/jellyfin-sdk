---
title: User Display Preferences
category: API Reference
order: 24
icon: tune
badge: "Preferences"
description: "Get and set user UI view configurations, sort preferences, and layout styles via DisplayPreferences."
---

# User Display Preferences API

`client.displayPreferences` allows client applications to persist and retrieve UI settings for individual libraries, folders, and views on the Jellyfin server via `/DisplayPreferences/{id}`. This enables preserving user view preferences (e.g., posters vs. list, sort orders, and custom client keys) across devices and sessions.

---

## Getting & Updating Preferences

### `getDisplayPreferences(displayPreferencesId, options?)`
Retrieves display preferences for a specific folder or view (`GET /DisplayPreferences/{id}`).

```typescript
const prefs = await client.displayPreferences.getDisplayPreferences('library-folder-id');

console.log(`View type: ${prefs.ViewType}`);
console.log(`Sort by: ${prefs.SortBy}, Order: ${prefs.SortOrder}`);
```

### `updateDisplayPreferences(displayPreferencesId, preferences, options?)`
Updates the complete or partial display preferences object (`POST /DisplayPreferences/{id}`).

```typescript
await client.displayPreferences.updateDisplayPreferences('library-folder-id', {
  ViewType: 'Poster',
  SortBy: 'DateCreated',
  SortOrder: 'Descending',
  RememberSorting: true
});
```

---

## Convenience Helpers

### `setCustomPreference(displayPreferencesId, key, value, options?)`
Persists an arbitrary client-specific key-value preference into `CustomPrefs`.

```typescript
await client.displayPreferences.setCustomPreference(
  'library-folder-id',
  'compactCards',
  'true'
);
```

### `setSortPreferences(displayPreferencesId, sortBy, sortOrder, options?)`
Quickly updates the sorting order for a view.

```typescript
await client.displayPreferences.setSortPreferences(
  'library-folder-id',
  'CommunityRating',
  'Descending'
);
```

### `setViewType(displayPreferencesId, viewType, options?)`
Sets the visual presentation layout (e.g. `'Poster'`, `'Thumb'`, `'Banner'`, `'List'`).

```typescript
await client.displayPreferences.setViewType('library-folder-id', 'Banner');
```

