import type {
  VideoQualityPresetKey,
  VideoQualityOption,
  AudioQualityPresetKey,
  AudioQualityOption
} from './quality.js';

/**
 * Client identification info sent in Jellyfin authorization headers.
 */
export interface ClientInfo {
  name: string;
  version: string;
  device: string;
  deviceId: string;
}

/**
 * Storage adapter interface for persisting session data.
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * Options to initialize a JellyfinClient.
 */
export interface JellyfinClientOptions {
  /**
   * Base URL of the Jellyfin server (e.g., https://jellyfin.example.com).
   */
  serverUrl?: string;

  /**
   * Jellyfin access token for authenticated requests.
   */
  accessToken?: string;

  /**
   * Jellyfin User ID.
   */
  userId?: string;

  /**
   * Client identity parameters. Defaults to generic SDK information if omitted.
   */
  clientInfo?: Partial<ClientInfo>;

  /**
   * Custom storage adapter to persist session data (e.g. LocalStorageAdapter or custom).
   * Defaults to MemoryStorage.
   */
  storage?: StorageAdapter;

  /**
   * Custom fetch function (defaults to globalThis.fetch).
   */
  fetch?: typeof fetch;

  /**
   * Callback invoked when a 401 Unauthorized response is received.
   */
  onUnauthorized?: () => void;

  /**
   * Pinned server version or version hint (e.g. "12.0.0" or "10.9.11").
   * If omitted, the client can auto-detect via SystemModule.
   */
  serverVersion?: string;

  /**
   * Compatibility target version: 'auto' (detect automatically), '10' (legacy Jellyfin 10.x), or '12' (Jellyfin 12+).
   * Defaults to 'auto'.
   */
  targetVersion?: 'auto' | '10' | '12';
}

/**
 * Authenticated user information.
 */
export interface UserDto {
  Id: string;
  Name: string;
  ServerId?: string;
  PrimaryImageTag?: string;
  ImageTags?: Record<string, string>;
  HasPassword?: boolean;
  LastLoginDate?: string;
  LastActivityDate?: string;
  Configuration?: Record<string, unknown>;
  Policy?: Record<string, unknown>;
}

/**
 * Authentication response from Jellyfin.
 */
export interface AuthenticationResult {
  User: UserDto;
  AccessToken: string;
  ServerId: string;
  SessionInfo?: Record<string, unknown>;
}

/**
 * Generic Jellyfin items response.
 */
export interface ItemsResponse<T = BaseItemDto> {
  Items: T[];
  TotalRecordCount: number;
  StartIndex?: number;
}

/**
 * User data associated with an item (played status, favorites, rating).
 */
export interface UserItemDataDto {
  Rating?: number;
  PlayedPercentage?: number;
  UnplayedItemCount?: number;
  PlaybackPositionTicks?: number;
  PlayCount?: number;
  IsFavorite?: boolean;
  LastPlayedDate?: string;
  Played?: boolean;
  Key?: string;
}

/**
 * Common Jellyfin item structure.
 */
export interface BaseItemDto {
  Id: string;
  Name: string;
  ServerId?: string;
  Type?: string;
  CollectionType?: string;
  RunTimeTicks?: number;
  Container?: string;
  MediaType?: string;
  ProductionYear?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  IndexNumberEnd?: number;
  IsFolder?: boolean;
  ParentId?: string;
  Album?: string;
  AlbumId?: string;
  AlbumPrimaryImageTag?: string;
  AlbumArtist?: string;
  Artists?: string[];
  ArtistItems?: Array<{ Id: string; Name: string }>;
  Overview?: string;
  Genres?: string[];
  Taglines?: string[];
  DateCreated?: string;
  DateLastMediaAdded?: string;
  UserData?: UserItemDataDto;
  PrimaryImageAspectRatio?: number;
  ImageTags?: Record<string, string>;
  PrimaryImageTag?: string;
  BackdropImageTags?: string[];
  MediaSources?: MediaSourceInfo[];
  HasLyrics?: boolean;
  /**
   * Unique relational playlist entry ID (Jellyfin 12+).
   * Distinguishes duplicate tracks inside the same playlist.
   */
  PlaylistItemId?: string;
  [key: string]: unknown;
}

export interface MediaSourceInfo {
  Id?: string;
  Path?: string;
  Protocol?: string;
  MediaStreams?: MediaStreamInfo[];
  Container?: string;
  Size?: number;
  Bitrate?: number;
}

export interface MediaStreamInfo {
  Codec?: string;
  Type?: string;
  Index?: number;
  BitRate?: number;
  Channels?: number;
  SampleRate?: number;
  Width?: number;
  Height?: number;
  AspectRatio?: string;
  AverageFrameRate?: number;
  RealFrameRate?: number;
  Profile?: string;
  Level?: number;
  PixelFormat?: string;
  IsInterlaced?: boolean;
  Language?: string;
  DisplayTitle?: string;
  DisplayLanguage?: string;
  IsDefault?: boolean;
  IsForced?: boolean;
  IsExternal?: boolean;
  DeliveryMethod?: string;
  DeliveryUrl?: string;
  [key: string]: unknown;
}

export interface GetAlbumsOptions {
  limit?: number;
  startIndex?: number;
  parentId?: string;
  artistId?: string;
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
}

export interface GetArtistsOptions {
  limit?: number;
  startIndex?: number;
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
}

export interface GetSongsOptions {
  limit?: number;
  startIndex?: number;
  albumId?: string;
  artistId?: string;
  isFavorite?: boolean;
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
}

export interface SearchOptions {
  limit?: number;
  startIndex?: number;
  parentId?: string;
  includeItemTypes?: string | string[];
  mediaTypes?: string | string[];
  genres?: string[];
  years?: number[];
  isFavorite?: boolean;
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
  fields?: string;
  recursive?: boolean;
  userId?: string;
}

export interface CreatePlaylistDto {
  Name: string;
  Ids?: string[];
  UserId?: string;
  MediaType?: string;
  Users?: Array<{ UserId: string; CanEdit?: boolean }>;
  IsPublic?: boolean;
}

export interface CreatePlaylistOptions {
  name: string;
  isPublic?: boolean;
  trackIds?: string[];
  userId?: string;
  mediaType?: string;
}

export interface UpdatePlaylistOptions {
  name?: string;
}

export interface AudioStreamOptions {
  maxStreamingBitrate?: string | number;
  quality?: AudioQualityPresetKey | AudioQualityOption | number | string;
  startTimeTicks?: number;
  container?: string;
  transcodingContainer?: string;
  audioCodec?: string;
  /**
   * Whether to include the api_key token in the URL query parameters.
   * Defaults to true for HTML5 <audio> tag compatibility.
   * If false, callers are expected to provide Authorization headers.
   */
  useQueryToken?: boolean;
}

export interface AudioHlsStreamOptions {
  maxStreamingBitrate?: string | number;
  quality?: AudioQualityPresetKey | AudioQualityOption | number | string;
  startTimeTicks?: number;
  audioCodec?: string;
  segmentLength?: number;
  /**
   * Whether to include the api_key token in the URL query parameters.
   * Defaults to true for legacy compatibility.
   * If false, players (e.g. hls.js) should be configured with Authorization headers via xhrSetup.
   */
  useQueryToken?: boolean;
}

export interface ArtworkUrlOptions {
  imageType?: 'Primary' | 'Art' | 'Backdrop' | 'Banner' | 'Logo' | 'Thumb' | 'Disc';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  fallbackUrl?: string;
}

export interface PublicSystemInfo {
  LocalAddress?: string;
  ServerName?: string;
  Version?: string;
  ProductName?: string;
  OperatingSystem?: string;
  Id?: string;
  StartupWizardCompleted?: boolean;
  [key: string]: unknown;
}

export interface SystemInfo extends PublicSystemInfo {
  SystemArchitecture?: string;
  HasPendingRestart?: boolean;
  IsShuttingDown?: boolean;
  SupportsLibraryMonitor?: boolean;
  WebSocketPortNumber?: number;
  CompletedInstallations?: unknown[];
  CanSelfRestart?: boolean;
  CanLaunchWebBrowser?: boolean;
  ProgramDataPath?: string;
  WebPath?: string;
  ItemsByNamePath?: string;
  CachePath?: string;
  LogPath?: string;
  InternalMetadataPath?: string;
  TranscodingTempPath?: string;
  HasUpdateAvailable?: boolean;
}

export interface LyricLine {
  Start?: number;
  Text: string;
}

export interface LyricsDto {
  Lyrics?: LyricLine[];
  [key: string]: unknown;
}

export interface ClientCapabilities {
  PlayableMediaTypes?: string[];
  SupportedCommands?: string[];
  SupportsMediaControl?: boolean;
  SupportsSync?: boolean;
  SupportsPersistentIdentifier?: boolean;
  IconUrl?: string;
  AppStoreUrl?: string;
  MessageFormat?: string;
}

// --- Video Options & Types ---

export interface GetMoviesOptions {
  limit?: number;
  startIndex?: number;
  parentId?: string;
  isFavorite?: boolean;
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
  genres?: string[];
  years?: number[];
  searchTerm?: string;
}

export interface GetSeriesOptions {
  limit?: number;
  startIndex?: number;
  parentId?: string;
  isFavorite?: boolean;
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
  genres?: string[];
  years?: number[];
  searchTerm?: string;
}

export interface GetSeasonsOptions {
  userId?: string;
  fields?: string;
  isSpecialSeason?: boolean;
}

export interface GetEpisodesOptions {
  seasonId?: string;
  seasonNumber?: number;
  startIndex?: number;
  limit?: number;
  isMissing?: boolean;
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
}

export interface GetVideosOptions {
  limit?: number;
  startIndex?: number;
  parentId?: string;
  includeItemTypes?: string;
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
}

export interface PlaybackInfoOptions {
  userId?: string;
  startTimeTicks?: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  maxStreamingBitrate?: number;
  mediaSourceId?: string;
  deviceProfile?: Record<string, unknown>;
  autoOpenLiveStream?: boolean;
}

export interface PlaybackInfoResponse {
  MediaSources: MediaSourceInfo[];
  PlaySessionId?: string;
  ErrorCode?: string;
  [key: string]: unknown;
}

export interface VideoStreamOptions {
  mediaSourceId?: string;
  static?: boolean;
  videoCodec?: string;
  audioCodec?: string;
  maxStreamingBitrate?: string | number;
  quality?: VideoQualityPresetKey | VideoQualityOption | number | string;
  maxWidth?: number;
  maxHeight?: number;
  maxFramerate?: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  subtitleMethod?: 'Embed' | 'Encode' | 'Hls' | 'External';
  startTimeTicks?: number;
  container?: string;
  transcodingContainer?: string;
  transcodingProtocol?: string;
  useQueryToken?: boolean;
}

export interface VideoHlsStreamOptions {
  mediaSourceId?: string;
  videoCodec?: string;
  audioCodec?: string;
  maxStreamingBitrate?: string | number;
  quality?: VideoQualityPresetKey | VideoQualityOption | number | string;
  maxWidth?: number;
  maxHeight?: number;
  maxFramerate?: number;
  segmentLength?: number;
  minSegments?: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  subtitleMethod?: 'Embed' | 'Encode' | 'Hls' | 'External';
  transcodingContainer?: 'ts' | 'fmp4' | string;
  transcodingProtocol?: 'hls';
  startTimeTicks?: number;
  useQueryToken?: boolean;
}

// --- Subtitles Options & Types ---

export interface SubtitleTrackInfo {
  index: number;
  codec: string;
  language?: string;
  displayTitle: string;
  displayLanguage?: string;
  isDefault: boolean;
  isForced: boolean;
  isExternal: boolean;
  deliveryMethod?: string;
  deliveryUrl?: string;
  url: string;
}

export interface SubtitleUrlOptions {
  format?: 'vtt' | 'srt' | 'subrip' | string;
  useQueryToken?: boolean;
  startTimeTicks?: number;
}

// --- Downloads Options & Types ---

export interface DownloadUrlOptions {
  useQueryToken?: boolean;
  filename?: string;
}

export interface DownloadItemOptions {
  onProgress?: (progressFraction: number) => void;
  group?: { id?: string; name?: string; type?: string; artworkUrl?: string; owner?: string; count?: number } | null;
  index?: number;
  quality?: VideoQualityPresetKey | VideoQualityOption | number | string;
}

// --- Milestone 1: Dashboard, Resume & Transcode Options ---

export interface GetResumeItemsOptions {
  userId?: string;
  limit?: number;
  startIndex?: number;
  parentId?: string;
  mediaTypes?: string[];
  enableImages?: boolean;
  enableUserData?: boolean;
  imageTypeLimit?: number;
  enableImageTypes?: string[];
  fields?: string;
}

export interface GetNextUpOptions {
  userId?: string;
  parentId?: string;
  seriesId?: string;
  limit?: number;
  startIndex?: number;
  fields?: string;
  enableImages?: boolean;
  enableUserData?: boolean;
  enableTotalRecordCount?: boolean;
  imageTypeLimit?: number;
  enableImageTypes?: string[];
  disableFirstEpisode?: boolean;
  nextUpDateCutoff?: string;
}

export interface GetLatestMediaOptions {
  userId?: string;
  parentId?: string;
  limit?: number;
  fields?: string;
  includeItemTypes?: string[];
  isPlayed?: boolean;
  enableImages?: boolean;
  imageTypeLimit?: number;
  enableImageTypes?: string[];
  groupItems?: boolean;
}

export interface StopActiveEncodingOptions {
  playSessionId: string;
  deviceId?: string;
}

// --- Milestone 2: Real-time Communication & Remote Control ---

export type WebSocketMessageType =
  | 'KeepAlive'
  | 'ForceKeepAlive'
  | 'LibraryChanged'
  | 'UserDataChanged'
  | 'Sessions'
  | 'Play'
  | 'Playstate'
  | 'GeneralCommand'
  | 'ActivityLogEntry'
  | 'ScheduledTasksInfo'
  | 'ScheduledTasksInfoStop'
  | 'SessionsStart'
  | 'SessionsStop'
  | (string & {});

export interface WebSocketInboundMessage<T = unknown> {
  MessageType: WebSocketMessageType;
  MessageId?: string;
  Data?: T;
}

export interface LibraryChangedData {
  FoldersAddedTo?: string[];
  FoldersRemovedFrom?: string[];
  ItemsAdded?: string[];
  ItemsUpdated?: string[];
  ItemsRemoved?: string[];
  CollectionFolders?: string[];
  EmptyFolders?: string[];
}

export interface UserDataChangedData {
  UserId: string;
  UserDataList: UserItemDataDto[];
}

export interface WebSocketModuleOptions {
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
  keepAliveIntervalMs?: number;
  webSocketFactory?: (url: string) => any;
}

export interface SessionPlayState {
  PositionTicks?: number;
  CanSeek?: boolean;
  IsPaused?: boolean;
  IsMuted?: boolean;
  VolumeLevel?: number;
  AudioStreamIndex?: number;
  SubtitleStreamIndex?: number;
  MediaSourceId?: string;
  PlayMethod?: string;
  RepeatMode?: string;
  PlaylistItemId?: string;
}

export interface SessionInfoDto {
  Id: string;
  UserId?: string;
  UserName?: string;
  Client?: string;
  LastActivityDate?: string;
  LastPlaybackCheckIn?: string;
  DeviceName?: string;
  DeviceType?: string;
  NowPlayingItem?: BaseItemDto;
  NowViewingItem?: BaseItemDto;
  DeviceId?: string;
  ApplicationVersion?: string;
  IsActive?: boolean;
  SupportsMediaControl?: boolean;
  SupportsRemoteControl?: boolean;
  PlayableMediaTypes?: string[];
  SupportedCommands?: string[];
  TranscodingInfo?: Record<string, unknown>;
  PlayState?: SessionPlayState;
  AdditionalUsers?: Array<{ UserId: string; UserName: string }>;
  Capabilities?: Record<string, unknown>;
}

export interface GetSessionsOptions {
  controllableByUserId?: string;
  deviceId?: string;
  activeWithinSeconds?: number;
}

export type PlayCommandType = 'PlayNow' | 'PlayNext' | 'PlayLast';

export interface RemotePlayOptions {
  playCommand?: PlayCommandType;
  startPositionTicks?: number;
  mediaSourceId?: string;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  startIndex?: number;
}

export type PlaystateCommand =
  | 'PlayPause'
  | 'Pause'
  | 'Unpause'
  | 'Stop'
  | 'Seek'
  | 'NextTrack'
  | 'PreviousTrack';

export type GeneralCommandType =
  | 'MoveUp'
  | 'MoveDown'
  | 'MoveLeft'
  | 'MoveRight'
  | 'PageUp'
  | 'PageDown'
  | 'PreviousLetter'
  | 'NextLetter'
  | 'ToggleOsd'
  | 'ToggleContextMenu'
  | 'Select'
  | 'Back'
  | 'TakeScreenshot'
  | 'SendKey'
  | 'SendString'
  | 'GoHome'
  | 'GoToSettings'
  | 'VolumeUp'
  | 'VolumeDown'
  | 'Mute'
  | 'Unmute'
  | 'ToggleMute'
  | 'SetVolume'
  | 'SetAudioStreamIndex'
  | 'SetSubtitleStreamIndex'
  | 'DisplayContent'
  | 'DisplayMessage'
  | (string & {});

export interface GeneralCommandDto {
  Name: GeneralCommandType;
  Arguments?: Record<string, string>;
}

export interface SessionMessageOptions {
  header?: string;
  text: string;
  timeoutMs?: number;
}

export interface QuickConnectResult {
  Code: string;
  Secret: string;
  AuthenticationToken?: string;
}

export interface QuickConnectState {
  Authenticated: boolean;
  Secret: string;
  Code?: string;
  AuthenticationToken?: string;
  UserId?: string;
  DateAdded?: string;
}

export interface QuickConnectPollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type {
  VideoQualityPresetKey,
  VideoQualityOption,
  AudioQualityPresetKey,
  AudioQualityOption
};




