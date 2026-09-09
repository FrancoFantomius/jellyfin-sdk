# @francofantomius/jellyfin

A modern, lightweight, modular, and type-safe Jellyfin SDK for Node.js and the Browser.

[![npm version](https://img.shields.io/npm/v/@francofantomius/jellyfin.svg)](https://www.npmjs.com/package/@francofantomius/jellyfin)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Current Version: `v0.3.0`** (THE PROJECT IS BEING ACTIVELY DEVELOPED. WAIT FOR VERSION 0.5.0 TO USE IT)


---

## Features

- **TypeScript-first**: Full type definitions for Jellyfin items, audio and video metadata, subtitles, search parameters, and responses.
- **Universal / Isomorphic**: Runs seamlessly in Node.js (scripts, server-side apps, SSR) and the Browser (vanilla, React, Vue, Svelte, Electron).
- **Dual module exports**: Native ESM (`import`) and CommonJS (`require`).
- **Clean modular architecture**:
  - `client.auth` - Server authentication, user profiles, capabilities reporting.
  - `client.library` - Browse music and video libraries (movies, series, seasons, episodes, videos, search, playback info).
  - `client.search` - Dedicated universal search with granular item type, genre, year, and library view scoping.
  - `client.media` - Universal audio and video stream URLs, HLS playlists, subtitles, direct downloads, and responsive artwork.
  - `client.playlists` - Create, edit, delete playlists, manage tracks, and upload cover images.
  - `client.playback` - Report playback start, progress, and stop to Jellyfin for scrobbling and playback sync.
  - `client.lyrics` - Fetch synced or unsynced song lyrics.
  - `client.favorites` - Toggle favorite items.
  - `client.offline` - Browser IndexedDB media download manager for offline audio and video playback.
  - `client.resume` - Continue watching / resume items querying (`/UserItems/Resume`).
  - `client.nextUp` - Next unplayed TV show episodes (`/Shows/NextUp`).
  - `client.latest` - Recently added media (movies, episodes, albums) (`/Users/{userId}/Items/Latest`).
  - `client.transcode` - Teardown active transcoding sessions (`/Videos/ActiveEncodings`).
  - `client.websocket` - Real-time WebSocket event streaming, keep-alive heartbeat, and automated reconnection.
  - `client.sessions` - Remote control active sessions, playback commands, volume adjustment, and message modals.
  - `client.quickConnect` - Quick Connect pairing flow for TVs and secondary devices.
- **Quality Settings & Presets**: Standard video (4K, 1080p, 720p, 480p, 360p, direct) and audio (320k, 256k, 192k, 128k, direct) presets and resolution utilities.
- **Subtitles**: Direct VTT/SRT subtitle streaming URLs, raw text fetching, and automated track extraction from media metadata.
- **Direct Downloads**: Server file download URLs, progress-tracked file downloads, and offline caching.
- **Flexible storage & caching**: Built-in memory and local storage adapters with Stale-While-Revalidate caching support.
- **Event-driven**: Listen to events like `unauthorized`, `authenticated`, and `logout`.

---

## Installation

```bash
npm install @francofantomius/jellyfin
```

Or with yarn / pnpm:

```bash
pnpm add @francofantomius/jellyfin
yarn add @francofantomius/jellyfin
```

---

## Quick Start

### 1. Initialize Client & Authenticate

```typescript
import { JellyfinClient } from '@francofantomius/jellyfin';

const client = new JellyfinClient({
  serverUrl: 'https://jellyfin.example.com',
  clientInfo: {
    name: 'My Media App',
    version: '1.0.0',
    device: 'Web Browser'
  }
});

// Authenticate using username and password
const authResult = await client.authenticate('username', 'password');
console.log('Logged in as:', authResult.User.Name);
console.log('Access token:', client.accessToken);
```

If you already have a stored token and user ID:

```typescript
const client = new JellyfinClient({
  serverUrl: 'https://jellyfin.example.com',
  accessToken: 'your-saved-access-token',
  userId: 'your-user-id'
});
```

---

### 2. Browse Music, Movies & Series

```typescript
// Browse music
const albums = await client.library.getAlbums({ limit: 20 });
const songs = await client.library.getSongs({ limit: 50, albumId: albums.Items[0]?.Id });

// Browse video libraries
const videoViews = await client.library.getVideoLibraries();

// Browse movies (with genres and year filtering)
const movies = await client.library.getMovies({
  limit: 25,
  genres: ['Action', 'Sci-Fi'],
  sortBy: 'CommunityRating',
  sortOrder: 'Descending'
});

// Browse TV series, seasons, and episodes
const series = await client.library.getSeries({ limit: 20 });
const seasons = await client.library.getSeasons(series.Items[0].Id);
const episodes = await client.library.getEpisodes(series.Items[0].Id, seasons.Items[0]?.Id);

// Request playback negotiation info (sources, audio/subtitle streams)
const playbackInfo = await client.library.getPlaybackInfo(movies.Items[0].Id);
```

---

### 3. Video Streaming & Quality Presets

```typescript
import { VIDEO_QUALITY_PRESETS, resolveVideoQuality, formatBitrate } from '@francofantomius/jellyfin';

const movieId = 'some-movie-id';

// Direct play video stream URL
const directVideoUrl = client.media.getVideoStreamUrl(movieId, {
  static: true,
  container: 'mp4'
});

// Transcoded video stream URL with a quality preset
const transcodeVideoUrl = client.media.getVideoStreamUrl(movieId, {
  quality: '1080p', // Automatically sets 10 Mbps bitrate, 1920x1080
  audioStreamIndex: 1,
  subtitleStreamIndex: 2,
  subtitleMethod: 'Encode'
});

// Adaptive HLS video playlist URL
const videoHlsUrl = client.media.getVideoHlsStreamUrl(movieId, {
  quality: '720p',
  segmentLength: 4
});

// Inspect quality presets
console.log(VIDEO_QUALITY_PRESETS['1080p'].label); // "1080p (10 Mbps)"
console.log(formatBitrate(10_000_000)); // "10 Mbps"
```

---

### 4. Subtitles

```typescript
const movie = movies.Items[0];

// Extract subtitle tracks from item metadata
const subtitleTracks = client.media.getSubtitleTracks(movie);
subtitleTracks.forEach((track) => {
  console.log(`${track.displayTitle} (${track.codec}) -> ${track.url}`);
});

// Generate subtitle stream URL
const vttUrl = client.media.getSubtitleUrl(movie.Id, movie.MediaSources[0].Id, 2, {
  format: 'vtt'
});

// Fetch raw subtitle text (e.g. WebVTT or SRT content)
const subtitleText = await client.media.getSubtitles(movie.Id, movie.MediaSources[0].Id, 2, {
  format: 'vtt'
});
```

---

### 5. Downloads & Offline Storage

```typescript
const itemId = 'some-item-id';

// Get server direct download URL (unmodified original file)
const downloadUrl = client.media.getDownloadUrl(itemId, { filename: 'movie.mp4' });

// Download file as a Blob with progress
const blob = await client.media.downloadFile(itemId, {
  onProgress: (fraction) => console.log(`Download: ${(fraction * 100).toFixed(0)}%`)
});

// Offline Storage Manager (IndexedDB caching in browser)
if (client.offline.isSupported()) {
  // Download audio or video item
  await client.offline.downloadItem(movie, (progress) => {
    console.log(`Offline download: ${(progress * 100).toFixed(0)}%`);
  });

  // Check if downloaded
  const isDownloaded = await client.offline.isItemDownloaded(movie.Id);

  // Get local object URL for offline playback
  const localBlobUrl = await client.offline.getDownloadedBlobUrl(movie.Id);
}
```

---

### 6. Audio Streaming & Artwork URLs

```typescript
const trackId = 'some-track-id';

// Universal audio streaming URL
const streamUrl = client.media.getAudioStreamUrl(trackId, {
  quality: '320k', // or maxStreamingBitrate: '320000'
  startTimeTicks: 0
});

// Artwork URL (with custom dimensions and quality)
const album = albums.Items[0];
const artworkUrl = client.media.getArtworkUrl(album, {
  maxWidth: 500,
  quality: 90,
  fallbackUrl: '/assets/placeholder-cover.png'
});
```

---

### 7. Playback Reporting (Scrobbling & Sync)

```typescript
// When track starts playing
await client.playback.reportStart(trackId, 0);

// Periodic progress update (e.g. every 10 seconds)
await client.playback.reportProgress(trackId, positionTicks, false);

// When playback stops or completes
await client.playback.reportStopped(trackId, positionTicks);
```

---

### 8. Playlists

```typescript
// Create a playlist
const playlistId = await client.playlists.createPlaylist({
  name: 'Favorites 2026',
  trackIds: ['track-id-1', 'track-id-2']
});

// Add more tracks
await client.playlists.addTracks(playlistId, ['track-id-3']);

// Upload a custom cover image (base64)
await client.playlists.uploadPlaylistImage(playlistId, base64JpgData, 'image/jpeg');

// Fetch playlist items
const playlistItems = await client.playlists.getPlaylistItems(playlistId);

// Delete playlist
await client.playlists.deletePlaylist(playlistId);
```

---

### 9. Synced Lyrics & Favorites

```typescript
// Fetch song lyrics
const lyrics = await client.lyrics.getLyrics(trackId);
console.log(lyrics?.Lyrics); // [{ Start: 10000000, Text: 'Hello world' }, ...]

// Toggle favorites
await client.favorites.markFavorite(trackId);
await client.favorites.unmarkFavorite(trackId);
```

---

### 10. Handling Unauthorized Sessions

```typescript
client.on('unauthorized', () => {
  console.warn('Jellyfin session has expired. Redirecting to login...');
});
```

---

### 11. Dashboard, Continue Watching & Next Up

```typescript
// Fetch in-progress items for Continue Watching carousels
const resume = await client.resume.getResumeItems({
  limit: 10,
  mediaTypes: ['Video']
});
console.log('Continue watching:', resume.Items);

// Fetch the next unplayed episodes for followed series
const nextUp = await client.nextUp.getNextUp({
  limit: 12,
  enableTotalRecordCount: true
});
console.log('Next up episodes:', nextUp.Items);

// Query recently added media across libraries or specific types
const latestMovies = await client.latest.getLatestMovies({ limit: 10 });
const latestEpisodes = await client.latest.getLatestEpisodes({ limit: 10 });
const latestAlbums = await client.latest.getLatestAlbums({ limit: 10 });
```

---

### 12. Active Transcode Session Teardown

```typescript
const playSessionId = 'playback-session-id';

// Teardown active server transcoding to terminate lingering FFmpeg processes
await client.transcode.stopActiveEncoding(playSessionId);

// Or automatically teardown during playback stop reporting:
await client.playback.reportStopped(movieId, currentTicks, { playSessionId });
```

---

### 13. Universal & Scoped Search

```typescript
// Universal search across all items
const results = await client.search.search('Inception', {
  includeItemTypes: ['Movie', 'Series'],
  genres: ['Sci-Fi'],
  limit: 20
});

// Search within a specific library folder
const musicResults = await client.search.searchInLibrary('music-library-id', 'Queen');

// Media-specific search shortcuts
const songs = await client.search.searchSongs('Yellow');
const albums = await client.search.searchAlbums('Parachutes');
const movies = await client.search.searchMovies('Interstellar');
const series = await client.search.searchSeries('Breaking Bad');
```

---

### 14. Real-time WebSocket Event Streaming

```typescript
// Connect to real-time WebSocket event feed
client.websocket.connect({
  autoReconnect: true,
  keepAliveIntervalMs: 30000
});

// Listen to connection state
client.websocket.on('open', () => console.log('WebSocket connected'));
client.websocket.on('close', (code, reason) => console.log('WebSocket closed', code, reason));

// Listen for library updates (scanned/added items)
client.websocket.on('libraryChanged', (data) => {
  console.log('Library changed. Items added:', data.ItemsAdded);
});

// Listen for user data updates (played state, favorites)
client.websocket.on('userDataChanged', (data) => {
  console.log('User data changed for user:', data.UserId);
});

// Subscribe to live session updates across the server
client.websocket.startSessionsSubscription(2000);
client.websocket.on('sessions', (sessions) => {
  console.log('Active server sessions:', sessions);
});
```

---

### 15. Remote Control & Sessions Management

```typescript
// Query all active sessions
const sessions = await client.sessions.getSessions();
const targetSession = sessions.find((s) => s.DeviceName === 'Living Room TV');

if (targetSession) {
  // Remote playback control
  await client.sessions.play(targetSession.Id, ['movie-id-1'], {
    playCommand: 'PlayNow',
    startPositionTicks: 0
  });

  // Playback commands
  await client.sessions.pause(targetSession.Id);
  await client.sessions.playPause(targetSession.Id);
  await client.sessions.seek(targetSession.Id, 120_000_000); // 12 seconds in ticks

  // Volume control
  await client.sessions.setVolume(targetSession.Id, 75);
  await client.sessions.toggleMute(targetSession.Id);

  // Send an on-screen dialog message
  await client.sessions.sendMessage(targetSession.Id, {
    header: 'Notification',
    text: 'Dinner is ready in 5 minutes!',
    timeoutMs: 8000
  });

  // Instruct session to navigate to an item
  await client.sessions.viewItem(targetSession.Id, 'Movie', 'movie-id-1', 'Inception');
}
```

---

### 16. Quick Connect Device Pairing Flow

```typescript
// On a secondary device (e.g. Smart TV or CLI app):
if (await client.quickConnect.isEnabled()) {
  const { Code, Secret } = await client.quickConnect.initiate();
  console.log(`Enter this code on your phone/PC: ${Code}`);

  // Automatically poll until authorized
  const state = await client.quickConnect.poll(Secret, { intervalMs: 2000, timeoutMs: 120000 });
  if (state.Authenticated && state.AuthenticationToken) {
    client.accessToken = state.AuthenticationToken;
    if (state.UserId) client.userId = state.UserId;
    console.log('Successfully authenticated via Quick Connect!');
  }
}

// On an already authenticated device (e.g. phone or PC):
await client.quickConnect.authorize('123 456');
console.log('Device authorized!');
```

---

## License

MIT © [Franco Fantomius](https://github.com/francofantomius)

