# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-08

### Added
- **Resume & Continue Watching**:
  - `ResumeModule` (`src/resume.ts`) querying `GET /UserItems/Resume` via `client.resume.getResumeItems()` and `client.resume.getItems()`.
  - Support for media type filtering, pagination (`limit`, `startIndex`), parent library folders, and user data fields.
- **Next Up for TV Shows**:
  - `NextUpModule` (`src/next-up.ts`) querying `GET /Shows/NextUp` via `client.nextUp.getNextUp()` and `client.nextUp.getEpisodes()`.
  - Support for series-specific filtering (`seriesId`), library views, and total count metadata.
- **Latest / Recently Added Media**:
  - `LatestModule` (`src/latest.ts`) querying `GET /Users/{userId}/Items/Latest` via `client.latest.getLatest()`.
  - Specialized convenience helpers: `client.latest.getLatestMovies()`, `client.latest.getLatestEpisodes()`, and `client.latest.getLatestAlbums()`.
- **Active Transcode Session Teardown**:
  - `TranscodeModule` (`src/transcode.ts`) terminating active server transcoding sessions via `DELETE /Videos/ActiveEncodings`.
  - Methods: `client.transcode.stopActiveEncoding(playSessionId, deviceId)` and `client.transcode.stop(...)`.
  - Integrated into `client.playback.reportStopped(itemId, positionTicks, { playSessionId })` to terminate lingering server FFmpeg instances on playback stop.
- **Universal & Scoped Search**:
  - `SearchModule` (`src/search.ts`) providing modular search via `client.search.search()`.
  - Scoped library searching: `client.search.searchInLibrary(parentId, query, options)`.
  - Dedicated convenience methods: `searchSongs()`, `searchAlbums()`, `searchArtists()`, `searchMovies()`, `searchSeries()`, and `searchEpisodes()`.
  - Enhanced `client.library.search()` to support all advanced filtering options (`parentId`, `includeItemTypes`, `mediaTypes`, `genres`, `years`, `isFavorite`, `sortBy`, `sortOrder`, `fields`, `recursive`, `userId`).
- **Security Policy**:
  - Added `SECURITY.md` establishing version support (0.2.x supported) and vulnerability disclosure workflow.
- **Documentation & AI Context**:
  - Added comprehensive `llms.txt` documenting SDK architecture, client modules, options, and event lifecycles.
  - Updated `ROADMAP.md` marking Milestone 1 as completed.

## [0.1.0] - 2026-09-08

### Added
- **Core SDK Architecture**:
  - `JellyfinClient` coordinating authentication, media streaming, library browsing, and storage.
  - Universal / Isomorphic support across Node.js (SSR, scripts) and modern browsers.
  - Pluggable storage system with `MemoryStorage` and `LocalStorageAdapter`.
  - Stale-While-Revalidate caching with `MemoryCacheAdapter`, `IndexedDBCacheAdapter`, and `fetchWithCache`.
  - Event subscription system (`client.on` / `client.off`) supporting `authenticated`, `unauthorized`, and `logout`.
  - Custom error classes: `JellyfinError`, `JellyfinApiError`, and `JellyfinAuthError`.
- **Authentication & System Compatibility**:
  - `authenticateByName` endpoint for username/password login.
  - Dynamic client capabilities reporting with automatic fallback between Jellyfin 12+ (`/Sessions/Capabilities/Full`) and Jellyfin 10 (`/Sessions/Capabilities`).
  - Automatic and manual server version negotiation (`isV12`, `detectVersion`, SemVer comparison).
  - User avatar image generation with tag support (`getUserImageUrl`).
- **Media Library Browsing & Search**:
  - Music library views, albums, artists, songs, and favorite songs browsing.
  - Video library views, movies, series, seasons, and episodes browsing with genre, year, and text filters.
  - Playback negotiation endpoint (`getPlaybackInfo`) with stream index selection.
  - Global library search (`search`) and single item lookup (`getItem`).
- **Universal Media Streaming & Artwork**:
  - Progressive audio streaming (`getAudioStreamUrl`) and HLS master playlist generation (`getAudioHlsStreamUrl`).
  - Progressive video streaming with static direct-play vs. transcode negotiation (`getVideoStreamUrl`) and adaptive HLS streaming (`getVideoHlsStreamUrl`).
  - Subtitle streaming (`getSubtitleUrl`), metadata extraction (`getSubtitleTracks`), and raw text fetching (`getSubtitles`).
  - Direct file download URLs (`getDownloadUrl`) and streamed file downloads with progress monitoring (`downloadFile`).
  - Responsive artwork URL generator (`getArtworkUrl`) supporting Primary, Backdrop, and Album fallbacks.
  - Stream authentication header generation (`getStreamHeaders`) for Jellyfin 12+ compatibility.
- **Quality Presets**:
  - Built-in video quality presets (`4k`, `1080p-high`, `1080p`, `720p-high`, `720p`, `480p`, `360p`, `240p`, `direct`, `auto`).
  - Built-in audio quality presets (`320k`, `256k`, `192k`, `128k`, `64k`, `direct`).
  - Bitrate and resolution resolution utilities (`resolveVideoQuality`, `resolveAudioQuality`, `formatBitrate`).
- **Playlists & User Interactions**:
  - Playlist CRUD with Jellyfin 12 JSON payload and legacy query parameter fallback.
  - Base64 playlist cover art uploading (`uploadPlaylistImage`).
  - Track insertion and removal supporting item IDs and playlist entry IDs.
  - Playback start, progress, and stop reporting (`/Sessions/Playing/*`) for scrobbling and playback resume synchronization.
  - Synced and unsynced lyrics retrieval (`getLyrics`).
  - Item favorite toggling (`markFavorite`, `unmarkFavorite`).
- **Offline Storage**:
  - IndexedDB-backed offline storage manager (`OfflineStorageManager`) for audio and video media blobs and metadata in browsers.
  - Batch downloading with aggregated progress notifications (`downloadItems`, `downloadItem`, `removeDownload`).

