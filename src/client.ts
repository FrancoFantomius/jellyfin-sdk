import { HttpTransport } from './http.js';
import { AuthModule } from './auth.js';
import { SystemModule } from './system.js';
import { LibraryModule } from './library.js';
import { PlaylistsModule } from './playlists.js';
import { PlaybackModule } from './playback.js';
import { MediaModule } from './media.js';
import { LyricsModule } from './lyrics.js';
import { FavoritesModule } from './favorites.js';
import { OfflineStorageManager } from './offline.js';
import { ResumeModule } from './resume.js';
import { NextUpModule } from './next-up.js';
import { LatestModule } from './latest.js';
import { TranscodeModule } from './transcode.js';
import { SearchModule } from './search.js';
import { WebSocketModule } from './websocket.js';
import { SessionsModule } from './sessions.js';
import { QuickConnectModule } from './quick-connect.js';
import { CacheAdapter, MemoryCacheAdapter } from './cache.js';
import { generateDeviceId, getDefaultStorage } from './storage.js';
import type { ClientInfo, JellyfinClientOptions, StorageAdapter } from './types.js';

export type ClientEventType = 'unauthorized' | 'authenticated' | 'logout';
export type ClientEventListener = (...args: unknown[]) => void;

export class JellyfinClient {
  public readonly auth: AuthModule;
  public readonly system: SystemModule;
  public readonly library: LibraryModule;
  public readonly search: SearchModule;
  public readonly playlists: PlaylistsModule;
  public readonly playback: PlaybackModule;
  public readonly media: MediaModule;
  public readonly lyrics: LyricsModule;
  public readonly favorites: FavoritesModule;
  public readonly offline: OfflineStorageManager;
  public readonly resume: ResumeModule;
  public readonly nextUp: NextUpModule;
  public readonly latest: LatestModule;
  public readonly transcode: TranscodeModule;
  public readonly websocket: WebSocketModule;
  public readonly sessions: SessionsModule;
  public readonly quickConnect: QuickConnectModule;

  private http: HttpTransport;
  private storage: StorageAdapter;
  private cache: CacheAdapter;
  private clientInfo: ClientInfo;
  private eventListeners = new Map<ClientEventType, Set<ClientEventListener>>();

  constructor(options: JellyfinClientOptions = {}) {
    this.storage = options.storage || getDefaultStorage();
    this.cache = new MemoryCacheAdapter();

    this.clientInfo = {
      name: options.clientInfo?.name || '@francofantomius/jellyfin',
      version: options.clientInfo?.version || '0.3.0',
      device: options.clientInfo?.device || (typeof window !== 'undefined' ? 'Web Browser' : 'Node.js'),
      deviceId: options.clientInfo?.deviceId || generateDeviceId()
    };

    this.http = new HttpTransport({
      serverUrl: options.serverUrl,
      token: options.accessToken,
      clientInfo: this.clientInfo,
      fetch: options.fetch,
      onUnauthorized: () => {
        this.emit('unauthorized');
        if (options.onUnauthorized) {
          options.onUnauthorized();
        }
      }
    });

    const getUserId = () => this.auth.getUserId();
    const getDeviceId = () => this.clientInfo.deviceId;

    this.system = new SystemModule(this.http, {
      serverVersion: options.serverVersion,
      targetVersion: options.targetVersion
    });
    this.auth = new AuthModule(this.http, options.userId || '');
    this.library = new LibraryModule(this.http, getUserId);
    this.search = new SearchModule(this.http, getUserId);
    this.playlists = new PlaylistsModule(this.http, getUserId);
    this.playback = new PlaybackModule(this.http);
    this.media = new MediaModule(this.http, getUserId);
    this.lyrics = new LyricsModule(this.http);
    this.favorites = new FavoritesModule(this.http, getUserId);
    this.offline = new OfflineStorageManager(this.media);
    this.resume = new ResumeModule(this.http, getUserId);
    this.nextUp = new NextUpModule(this.http, getUserId);
    this.latest = new LatestModule(this.http, getUserId);
    this.transcode = new TranscodeModule(this.http, getDeviceId);
    this.websocket = new WebSocketModule(this.http, getDeviceId);
    this.sessions = new SessionsModule(this.http, getUserId);
    this.quickConnect = new QuickConnectModule(this.http);
  }

  // --- Configuration Getters & Setters ---

  get serverUrl(): string {
    return this.http.getServerUrl();
  }

  set serverUrl(url: string) {
    this.http.setServerUrl(url);
  }

  get accessToken(): string {
    return this.http.getToken();
  }

  set accessToken(token: string) {
    this.http.setToken(token);
  }

  get userId(): string {
    return this.auth.getUserId();
  }

  set userId(id: string) {
    this.auth.setUserId(id);
  }

  get serverVersion(): string | null {
    return this.system.getVersion();
  }

  set serverVersion(version: string | null) {
    this.system.setVersion(version);
  }

  /**
   * Check whether the connected Jellyfin server is version 12.0 or higher.
   */
  async isV12(): Promise<boolean> {
    return await this.system.isV12();
  }

  /**
   * Query server and detect the server version via /System/Info/Public.
   */
  async detectServerVersion(): Promise<string | null> {
    return await this.system.detectVersion();
  }

  get info(): ClientInfo {
    return this.http.getClientInfo();
  }

  setClientInfo(info: Partial<ClientInfo>): void {
    this.http.setClientInfo(info);
  }

  getCache(): CacheAdapter {
    return this.cache;
  }

  setCache(cache: CacheAdapter): void {
    this.cache = cache;
  }

  getStorage(): StorageAdapter {
    return this.storage;
  }

  setStorage(storage: StorageAdapter): void {
    this.storage = storage;
  }

  // --- Event Handling ---

  on(event: ClientEventType, listener: ClientEventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  off(event: ClientEventType, listener: ClientEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  emit(event: ClientEventType, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((fn) => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`[Jellyfin SDK] Event handler error on '${event}':`, e);
        }
      });
    }
  }

  // --- Convenience Shortcuts ---

  /**
   * Authenticate with username and password, update client state, and emit 'authenticated'.
   */
  async authenticate(username: string, password: string = '') {
    const res = await this.auth.authenticateByName(username, password);
    if (!this.system.getVersion()) {
      this.system.detectVersion().catch(() => {});
    }
    this.emit('authenticated', res);
    return res;
  }

  /**
   * Log out and clear tokens and session.
   */
  logout(): void {
    if (this.websocket.isConnected) {
      this.websocket.disconnect();
    }
    this.auth.logout();
    this.emit('logout');
  }

  /**
   * Manually set authentication credentials.
   */
  setCredentials(credentials: { serverUrl?: string; accessToken: string; userId: string }): void {
    if (credentials.serverUrl) {
      this.http.setServerUrl(credentials.serverUrl);
    }
    this.http.setToken(credentials.accessToken);
    this.auth.setUserId(credentials.userId);
  }
}

