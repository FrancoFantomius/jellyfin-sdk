---
title: JellyfinClient
category: API Reference
order: 10
icon: settings
badge: "Core"
description: "Core client class, constructor options, events, storage adapters, and cache configuration."
---

# `JellyfinClient` API

`JellyfinClient` is the primary entry point for the SDK. It maintains server connection state, authentication tokens, user identity, event subscriptions, and coordinates all specialized sub-clients.

---

## Constructor

```typescript
new JellyfinClient(options: JellyfinClientOptions)
```

### `JellyfinClientOptions`

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `serverUrl` | `string` | *(Required)* | Jellyfin server URL (e.g., `https://jellyfin.local:8096`). Trailing slashes are auto-stripped. |
| `accessToken` | `string` | `undefined` | Pre-existing authentication token. |
| `userId` | `string` | `undefined` | Jellyfin User ID. |
| `clientInfo` | `ClientInfo` | Inferred | Device, client application name, and version identifiers. |
| `storage` | `StorageAdapter` | `getDefaultStorage()` | Storage backend for persistence (`LocalStorageAdapter` or `MemoryStorage`). |
| `cache` | `CacheAdapter` | `MemoryCacheAdapter` | Cache backend for Stale-While-Revalidate caching. |

---

## Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `serverUrl` | `string` | Current base server URL. |
| `accessToken` | `string \| null` | Active authentication token. |
| `userId` | `string \| null` | Authenticated user ID. |
| `auth` | `AuthClient` | Authentication & profile operations. |
| `system` | `SystemClient` | Public and authenticated server info, version detection. |
| `library` | `LibraryClient` | Media navigation (music, movies, series, episodes, playback info). |
| `media` | `MediaClient` | Streaming URLs, subtitles, artwork, downloads. |
| `search` | `SearchClient` | Granular media and library search. |
| `playlists` | `PlaylistsClient` | Playlist creation, updates, and cover images. |
| `playback` | `PlaybackClient` | Playback progress, start, and stop reporting. |
| `transcode` | `TranscodeClient` | Active transcoding session teardown. |
| `lyrics` | `LyricsClient` | Synced and unsynced song lyrics. |
| `favorites` | `FavoritesClient` | Toggle user favorite items. |
| `offline` | `OfflineStorageManager` | IndexedDB offline media and download storage. |
| `resume` | `ResumeClient` | Continue watching / in-progress media. |
| `nextUp` | `NextUpClient` | Next unplayed episodes for followed series. |
| `latest` | `LatestClient` | Recently added items. |
| `sessions` | `SessionsClient` | Remote session control and play commands. |
| `websocket` | `WebSocketClient` | Live WebSocket event stream and subscriptions. |
| `quickConnect` | `QuickConnectClient` | Quick Connect pairing flow. |
| `trickplay` | `TrickplayModule` | Trickplay HLS tile manifests and scrubbing thumbnails. |
| `chapters` | `ChaptersModule` | Chapter navigation, chapter images, and intro/credits skipping. |
| `genres` | `GenresModule` | Video/music genres and studios browsing. |
| `collections` | `CollectionsModule` | BoxSet collection browsing and item management. |
| `displayPreferences` | `DisplayPreferencesModule` | View layout and sorting persistence. |

---

## Top-Level Methods

### `authenticate(username, password)`
Logs in with username and password, stores credentials, and reports capabilities.

```typescript
const result = await client.authenticate('alice', 'password123');
```

### `logout()`
Clears the active access token and user ID, and emits `'logout'`.

```typescript
await client.logout();
```

### `on(event, listener)` / `off(event, listener)`
Registers or unregisters an event listener.

```typescript
client.on('unauthorized', () => { /* redirect to login */ });
```

---

## Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `'authenticated'` | `AuthenticationResult` | Emitted upon successful username/password or token authentication. |
| `'unauthorized'` | `void` | Emitted when any server request fails with HTTP 401 or 403. |
| `'logout'` | `void` | Emitted when `client.logout()` is called. |

---

## Storage & Cache Adapters

### `StorageAdapter`
Interface for persisting tokens and device IDs:

```typescript
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}
```

Built-in implementations:
- `LocalStorageAdapter`: Uses `window.localStorage` in web browsers.
- `MemoryStorage`: Uses in-memory Map for Node.js or ephemeral sessions.
- `getDefaultStorage()`: Automatically selects `LocalStorageAdapter` if `window` exists, else `MemoryStorage`.

### `CacheAdapter`
Interface for caching API responses:

```typescript
interface CacheAdapter {
  get<T>(key: string): Promise<T | null> | T | null;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}
```

Built-in implementations:
- `MemoryCacheAdapter`: Fast in-memory TTL cache.
- `IndexedDBCacheAdapter`: Persistent browser storage for long-lived offline query caches.

