# Project Roadmap

This roadmap documents the current implementation status and planned features for `@francofantomius/jellyfin`.

---

## 🟢 Currently Implemented Features (v0.3.0)

### 1. Client Core & Infrastructure
- **Unified SDK Client (`JellyfinClient`)**: Main client coordinating all modules with configurable options.
- **Universal / Isomorphic Runtime**: Works in Node.js (scripts, backend, SSR) and modern Browsers.
- **Event Emitter**: Event subscription system supporting `'authenticated'`, `'unauthorized'`, and `'logout'`.
- **Pluggable Storage Adapters**: Built-in `MemoryStorage` and `LocalStorageAdapter` for credential/session persistence, with customizable interface.
- **Stale-While-Revalidate Caching**: `MemoryCacheAdapter`, `IndexedDBCacheAdapter`, and `fetchWithCache` helper.
- **Error Handling**: Custom error hierarchy (`JellyfinError`, `JellyfinApiError`, `JellyfinAuthError`).

### 2. Authentication & System Negotiation
- **Credential Authentication**: `client.auth.authenticateByName` with username and password.
- **Capabilities Reporting**: `client.auth.reportCapabilities` with dual support for Jellyfin 12+ (`/Sessions/Capabilities/Full`) and Jellyfin 10.x (`/Sessions/Capabilities`).
- **User Avatar URL**: `client.auth.getUserImageUrl` with tag caching and fallback.
- **Server Version Detection**: `client.system.getPublicInfo`, `client.system.getInfo`, and `client.system.detectVersion`.
- **SemVer Negotiation**: Version comparison utilities and target version compatibility modes (`'auto'`, `'10'`, `'12'`).

### 3. Media Library Browsing & Search
- **Library Views**: Music (`getMusicLibraries`) and Video (`getVideoLibraries`) view folders.
- **Music Catalog**: Albums (`getAlbums`), Artists (`getArtists`), Tracks (`getSongs`), and Favorites (`getFavoriteSongs`).
- **Video Catalog**: Movies (`getMovies`), TV Series (`getSeries`), Seasons (`getSeasons`), Episodes (`getEpisodes`), and general video items (`getVideos`).
- **Playback Negotiation**: `getPlaybackInfo` (`/Items/{itemId}/PlaybackInfo`) for negotiating audio/subtitle streams, device profiles, and source IDs.
- **Item Details & Search**: Item fetching (`getItem`) and universal search (`search`) across all media types.

### 4. Media Streaming, Subtitles & Artwork
- **Universal Audio Streaming**: Progressive stream URLs (`getAudioStreamUrl`) and HLS master playlist URLs (`getAudioHlsStreamUrl`).
- **Universal Video Streaming**: Direct play (`static=true`) and transcode URLs (`getVideoStreamUrl`) and adaptive HLS playlist URLs (`getVideoHlsStreamUrl`).
- **Streaming Auth Headers**: `getStreamHeaders` providing `Authorization` and `X-Emby-Authorization` headers for players (vital for Jellyfin 12+).
- **Subtitle Delivery**: Subtitle stream URLs (`getSubtitleUrl`), raw VTT/SRT text retrieval (`getSubtitles`), and metadata extraction (`getSubtitleTracks`).
- **Artwork Generation**: `getArtworkUrl` with dimension, quality, tag, and fallback customization for Primary, Backdrop, and Album art.
- **File Downloads**: Direct download URLs (`getDownloadUrl`) and stream-based `downloadFile` with real-time percentage progress callback.

### 5. Quality Presets & Bitrate Management
- **Video Quality Presets**: `4k`, `1080p-high`, `1080p`, `720p-high`, `720p`, `480p`, `360p`, `240p`, `direct`, `auto`.
- **Audio Quality Presets**: `320k`, `256k`, `192k`, `128k`, `64k`, `direct`.
- Bitrate and resolution resolution utilities (`resolveVideoQuality`, `resolveAudioQuality`, `formatBitrate`).

### 6. Playlists Management
- **Playlist CRUD**: Create playlist with Jellyfin 12+ JSON body and Jellyfin 10 query param fallback (`createPlaylist`), retrieve user playlists (`getPlaylists`), and delete playlist (`deletePlaylist`).
- **Item Management**: Inspect playlist tracks (`getPlaylistItems`), add tracks (`addTracks`), and remove entries (`removeTrack`, `removePlaylistItem`).
- **Custom Cover Art**: Upload base64 playlist cover images (`uploadPlaylistImage`).

### 7. Playback Reporting, Lyrics & Favorites
- **Scrobbling & Playback Sync**: Session progress reporting (`reportStart`, `reportProgress`, `reportStopped`) for resume timestamps and play counts.
- **Lyrics Retrieval**: Synced and unsynced song lyrics (`getLyrics`).
- **User Favorites**: Favorite toggling (`markFavorite`, `unmarkFavorite`).

### 8. Offline Storage Manager
- **IndexedDB Media Caching**: Complete browser IndexedDB offline store for media blobs, artwork, and metadata.
- **Item & Batch Downloads**: `downloadItem`, `downloadItems`, cancellation/removal (`removeDownload`), and cache warming (`warmOfflineCache`).

### 9. Real-time Communication & Remote Control (v0.3.0)
- **WebSocket Event Stream (`src/websocket.ts`)**: Isomorphic WebSocket client connecting to `/socket`, automatic keep-alive pinging, auto-reconnect backoff, and event dispatching (`libraryChanged`, `userDataChanged`, `sessions`, connection lifecycle).
- **Remote Control & Sessions (`src/sessions.ts`)**: Server session discovery, remote play command dispatching, playstate controls (`playPause`, `pause`, `unpause`, `stop`, `seek`, `nextTrack`, `previousTrack`), volume control, on-screen dialog messages, and navigation.
- **Quick Connect Flow (`src/quick-connect.ts`)**: Quick Connect client initiation, polling with abort support, and cross-device authorization for TV and console apps.

---

## 🚀 Planned Milestones & Next Steps

Each feature will follow the SDK rule of being placed in its own dedicated source file.

### Milestone 1: Dashboard, Continue Watching & Active Streams (v0.2.0) [Completed]
- [x] **Resume / Continue Watching** (`src/resume.ts`):
  - Support `/UserItems/Resume` to fetch items currently in-progress for the user.
- [x] **Next Up for TV Shows** (`src/next-up.ts`):
  - Support `/Shows/NextUp` to provide the next unplayed episode for followed series.
- [x] **Latest / Recently Added Media** (`src/latest.ts`):
  - Support `/Users/{userId}/Items/Latest` to query newly added movies, albums, and episodes per library view.
- [x] **Active Transcode Session Teardown** (`src/transcode.ts`):
  - Explicit session teardown via `/Videos/ActiveEncodings` on playback stop to avoid lingering server FFmpeg instances.

### Milestone 2: Real-time Communication & Remote Control (v0.3.0) [Completed]
- [x] **WebSocket Real-time Event Stream** (`src/websocket.ts`):
  - Persistent WebSocket connection to `/socket?api_key=...&deviceId=...`.
  - Automatic keep-alive pings (`KeepAlive`).
  - Server event dispatching (`LibraryChanged`, `UserDataChanged`, `Sessions`).
- [x] **Remote Control & Session Management** (`src/sessions.ts`):
  - Query active sessions across the server (`GET /Sessions`).
  - Send playback and volume commands to other sessions (`Play`, `Pause`, `Seek`, `SetVolume`, `Message`).
- [x] **Quick Connect Flow** (`src/quick-connect.ts`):
  - Client authentication flow for TV / secondary devices (`/QuickConnect/Initiate`, `/QuickConnect/Connect`, `/QuickConnect/Authorize`).

### Milestone 3: Rich Media Navigation & Metadata (v0.4.0)
- [ ] **Trickplay & Scrubbing Thumbnails** (`src/trickplay.ts`):
  - Support Jellyfin 10.9+ trickplay manifests and tile extraction (`/Videos/{itemId}/Trickplay/...`).
- [ ] **Chapters & Media Markers** (`src/chapters.ts`):
  - Chapter marker extraction and image URLs (`/Items/{id}/Images/Chapter/{index}`).
  - Support for intro and end credits skipping.
- [ ] **Collections & Genres Browsing** (`src/genres.ts`, `src/collections.ts`):
  - Endpoints for `/Genres`, `/MusicGenres`, `/Studios`, and BoxSets (`/Collections`).
- [ ] **User Display Preferences** (`src/display-preferences.ts`):
  - Get and set user UI view configurations via `/DisplayPreferences/{id}`.

### Milestone 4: Extended Ecosystem (v0.5.0+)
- [ ] **SyncPlay (Watch Together)** (`src/syncplay.ts`):
  - Synchronized multi-user playback rooms (`/SyncPlay/*`).
- [ ] **Live TV & EPG Guide** (`src/livetv.ts`):
  - Live TV tuner channels (`/LiveTv/Channels`), EPG programs, and DVR recordings.
- [ ] **Local Server Discovery** (`src/discovery.ts`):
  - UDP broadcast / SSDP discovery for automatically detecting Jellyfin servers on the local network in Node.js environments.

