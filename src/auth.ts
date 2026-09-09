import type { HttpTransport } from './http.js';
import type { AuthenticationResult, ClientCapabilities, UserDto } from './types.js';
import { JellyfinAuthError, JellyfinError } from './errors.js';

export class AuthModule {
  private http: HttpTransport;
  private currentUser: UserDto | null = null;
  private currentUserId: string = '';
  private currentUsername: string = '';

  constructor(http: HttpTransport, userId: string = '') {
    this.http = http;
    this.currentUserId = userId;
  }

  getUserId(): string {
    return this.currentUserId;
  }

  setUserId(id: string): void {
    this.currentUserId = id;
  }

  getUsername(): string {
    return this.currentUsername || this.currentUser?.Name || '';
  }

  getCurrentUser(): UserDto | null {
    return this.currentUser;
  }

  setCurrentUser(user: UserDto | null): void {
    this.currentUser = user;
    if (user?.Id) {
      this.currentUserId = user.Id;
    }
    if (user?.Name) {
      this.currentUsername = user.Name;
    }
  }

  /**
   * Authenticate with the Jellyfin server using username and password.
   */
  async authenticateByName(username: string, password: string = ''): Promise<AuthenticationResult> {
    if (!username || !username.trim()) {
      throw new JellyfinError('Username is required for authentication.');
    }

    const result = await this.http.request<AuthenticationResult>('/Users/AuthenticateByName', {
      method: 'POST',
      body: {
        Username: username.trim(),
        Pw: password || ''
      }
    });

    if (!result || !result.AccessToken || !result.User?.Id) {
      throw new JellyfinAuthError('Invalid response received from Jellyfin authentication endpoint.');
    }

    this.http.setToken(result.AccessToken);
    // Jellyfin 12 enforces case-insensitive usernames; store normalized username returned in User.Name
    this.setCurrentUser(result.User);
    this.currentUsername = result.User.Name;

    return result;
  }

  /**
   * Report client capabilities to the Jellyfin server.
   */
  async reportCapabilities(capabilities?: ClientCapabilities): Promise<void> {
    const payload: ClientCapabilities = {
      PlayableMediaTypes: ['Audio', 'Video'],
      SupportedCommands: [
        'MoveUp',
        'MoveDown',
        'MoveLeft',
        'MoveRight',
        'Select',
        'Back',
        'VolumeUp',
        'VolumeDown',
        'Mute',
        'Unmute',
        'ToggleMute',
        'SetVolume',
        'PlayState',
        'SetRepeatMode',
        'SetShuffleQueue',
        'DisplayMessage'
      ],
      SupportsMediaControl: true,
      SupportsSync: false,
      SupportsPersistentIdentifier: true,
      MessageFormat: 'Json',
      ...capabilities
    };

    try {
      await this.http.request('/Sessions/Capabilities/Full', {
        method: 'POST',
        body: payload
      });
    } catch {
      // Fallback for older Jellyfin servers
      try {
        await this.http.request('/Sessions/Capabilities', {
          method: 'POST',
          body: payload
        });
      } catch (fallbackErr) {
        console.warn('[Jellyfin SDK] Failed to report client capabilities:', fallbackErr);
      }
    }
  }

  /**
   * Build the user profile avatar image URL.
   */
  getUserImageUrl(userId?: string, tag?: string): string {
    const uid = userId || this.currentUserId;
    const serverUrl = this.http.getServerUrl();
    if (!serverUrl || !uid) return '';

    const tagToUse = tag || this.currentUser?.PrimaryImageTag || this.currentUser?.ImageTags?.Primary || '';
    const tagParam = tagToUse ? `?tag=${tagToUse}` : '';
    return `${serverUrl}/Users/${uid}/Images/Primary${tagParam}`;
  }

  /**
   * Clear active user credentials and token.
   */
  logout(): void {
    this.http.setToken('');
    this.currentUserId = '';
    this.currentUsername = '';
    this.currentUser = null;
  }
}

