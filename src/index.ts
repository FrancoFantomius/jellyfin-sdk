export { JellyfinClient } from './client.js';
export type { ClientEventType, ClientEventListener } from './client.js';

export { HttpTransport, cleanUrl, buildAuthHeader } from './http.js';
export type { RequestOptions } from './http.js';

export { AuthModule } from './auth.js';
export { SystemModule, parseSemVer, isVersionAtLeast, isV12OrHigher } from './system.js';
export { LibraryModule } from './library.js';
export { PlaylistsModule } from './playlists.js';
export { PlaybackModule } from './playback.js';
export { MediaModule } from './media.js';
export { LyricsModule } from './lyrics.js';
export { FavoritesModule } from './favorites.js';
export { OfflineStorageManager } from './offline.js';
export type { DownloadRecord, DownloadProgress } from './offline.js';
export { ResumeModule } from './resume.js';
export { NextUpModule } from './next-up.js';
export { LatestModule } from './latest.js';
export { TranscodeModule } from './transcode.js';
export { SearchModule, COMMON_SEARCH_FIELDS } from './search.js';

export {
  VIDEO_QUALITY_PRESETS,
  AUDIO_QUALITY_PRESETS,
  getVideoQualityList,
  getAudioQualityList,
  resolveVideoQuality,
  resolveAudioQuality,
  formatBitrate
} from './quality.js';
export type {
  VideoQualityPresetKey,
  VideoQualityOption,
  AudioQualityPresetKey,
  AudioQualityOption
} from './quality.js';

export {
  MemoryStorage,
  LocalStorageAdapter,
  getDefaultStorage,
  generateDeviceId
} from './storage.js';

export {
  MemoryCacheAdapter,
  IndexedDBCacheAdapter,
  fetchWithCache
} from './cache.js';
export type { CacheAdapter, CacheRecord } from './cache.js';

export {
  JellyfinError,
  JellyfinApiError,
  JellyfinAuthError
} from './errors.js';

export type {
  ClientInfo,
  StorageAdapter,
  JellyfinClientOptions,
  UserDto,
  AuthenticationResult,
  ItemsResponse,
  UserItemDataDto,
  BaseItemDto,
  MediaSourceInfo,
  MediaStreamInfo,
  GetAlbumsOptions,
  GetArtistsOptions,
  GetSongsOptions,
  GetMoviesOptions,
  GetSeriesOptions,
  GetSeasonsOptions,
  GetEpisodesOptions,
  GetVideosOptions,
  PlaybackInfoOptions,
  PlaybackInfoResponse,
  SearchOptions,
  CreatePlaylistDto,
  CreatePlaylistOptions,
  UpdatePlaylistOptions,
  AudioStreamOptions,
  AudioHlsStreamOptions,
  VideoStreamOptions,
  VideoHlsStreamOptions,
  SubtitleTrackInfo,
  SubtitleUrlOptions,
  DownloadUrlOptions,
  DownloadItemOptions,
  ArtworkUrlOptions,
  PublicSystemInfo,
  SystemInfo,
  LyricLine,
  LyricsDto,
  ClientCapabilities,
  GetResumeItemsOptions,
  GetNextUpOptions,
  GetLatestMediaOptions,
  StopActiveEncodingOptions
} from './types.js';
