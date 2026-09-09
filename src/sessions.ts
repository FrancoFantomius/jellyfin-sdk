import type { HttpTransport } from './http.js';
import { JellyfinError } from './errors.js';
import type {
  SessionInfoDto,
  GetSessionsOptions,
  RemotePlayOptions,
  PlaystateCommand,
  GeneralCommandDto,
  SessionMessageOptions
} from './types.js';

export class SessionsModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  /**
   * Query active client sessions across the Jellyfin server via GET /Sessions.
   */
  async getSessions(options: GetSessionsOptions = {}): Promise<SessionInfoDto[]> {
    const params: Record<string, unknown> = {};

    if (options.controllableByUserId) {
      params.ControllableByUserId = options.controllableByUserId;
    }
    if (options.deviceId) {
      params.DeviceId = options.deviceId;
    }
    if (options.activeWithinSeconds !== undefined) {
      params.ActiveWithinSeconds = options.activeWithinSeconds;
    }

    const result = await this.http.request<SessionInfoDto[]>('/Sessions', { params });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Instruct a remote session to start playback of specified items via POST /Sessions/{sessionId}/Playing.
   *
   * @param sessionId The target session ID.
   * @param itemIds Single item ID or array of item IDs to play.
   * @param options Additional playback parameters (command type, start ticks, etc.).
   */
  async play(
    sessionId: string,
    itemIds: string | string[],
    options: RemotePlayOptions = {}
  ): Promise<void> {
    if (!sessionId) {
      throw new JellyfinError('sessionId is required to send a play command.');
    }

    const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
    if (ids.length === 0) {
      throw new JellyfinError('At least one itemId is required to send a play command.');
    }

    const params: Record<string, unknown> = {
      ItemIds: ids.join(','),
      PlayCommand: options.playCommand || 'PlayNow'
    };

    if (options.startPositionTicks !== undefined) {
      params.StartPositionTicks = options.startPositionTicks;
    }
    if (options.mediaSourceId) {
      params.MediaSourceId = options.mediaSourceId;
    }
    if (options.audioStreamIndex !== undefined) {
      params.AudioStreamIndex = options.audioStreamIndex;
    }
    if (options.subtitleStreamIndex !== undefined) {
      params.SubtitleStreamIndex = options.subtitleStreamIndex;
    }
    if (options.startIndex !== undefined) {
      params.StartIndex = options.startIndex;
    }

    await this.http.request(`/Sessions/${sessionId}/Playing`, {
      method: 'POST',
      params
    });
  }

  /**
   * Send a playback control command to a remote session via POST /Sessions/{sessionId}/Playing/{command}.
   */
  async sendPlaystateCommand(
    sessionId: string,
    command: PlaystateCommand,
    params: Record<string, unknown> = {}
  ): Promise<void> {
    if (!sessionId) {
      throw new JellyfinError('sessionId is required to send a playstate command.');
    }

    await this.http.request(`/Sessions/${sessionId}/Playing/${command}`, {
      method: 'POST',
      params
    });
  }

  /**
   * Toggle play / pause on a remote session.
   */
  async playPause(sessionId: string): Promise<void> {
    return await this.sendPlaystateCommand(sessionId, 'PlayPause');
  }

  /**
   * Pause playback on a remote session.
   */
  async pause(sessionId: string): Promise<void> {
    return await this.sendPlaystateCommand(sessionId, 'Pause');
  }

  /**
   * Resume playback on a remote session.
   */
  async unpause(sessionId: string): Promise<void> {
    return await this.sendPlaystateCommand(sessionId, 'Unpause');
  }

  /**
   * Stop playback on a remote session.
   */
  async stop(sessionId: string): Promise<void> {
    return await this.sendPlaystateCommand(sessionId, 'Stop');
  }

  /**
   * Seek to a specific tick position on a remote session.
   *
   * @param sessionId Target session ID.
   * @param positionTicks Position in ticks (1 tick = 10,000 milliseconds = 100 nanoseconds).
   */
  async seek(sessionId: string, positionTicks: number): Promise<void> {
    return await this.sendPlaystateCommand(sessionId, 'Seek', {
      SeekPositionTicks: positionTicks
    });
  }

  /**
   * Skip to the next track on a remote session.
   */
  async nextTrack(sessionId: string): Promise<void> {
    return await this.sendPlaystateCommand(sessionId, 'NextTrack');
  }

  /**
   * Skip to the previous track on a remote session.
   */
  async previousTrack(sessionId: string): Promise<void> {
    return await this.sendPlaystateCommand(sessionId, 'PreviousTrack');
  }

  /**
   * Send a general command to a remote session via POST /Sessions/{sessionId}/Command.
   */
  async sendGeneralCommand(sessionId: string, command: GeneralCommandDto): Promise<void> {
    if (!sessionId) {
      throw new JellyfinError('sessionId is required to send a general command.');
    }

    await this.http.request(`/Sessions/${sessionId}/Command`, {
      method: 'POST',
      body: {
        Name: command.Name,
        Arguments: command.Arguments || {}
      }
    });
  }

  /**
   * Set volume level on a remote session (0-100).
   */
  async setVolume(sessionId: string, volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    return await this.sendGeneralCommand(sessionId, {
      Name: 'SetVolume',
      Arguments: { Volume: String(clamped) }
    });
  }

  /**
   * Mute audio on a remote session.
   */
  async mute(sessionId: string): Promise<void> {
    return await this.sendGeneralCommand(sessionId, { Name: 'Mute' });
  }

  /**
   * Unmute audio on a remote session.
   */
  async unmute(sessionId: string): Promise<void> {
    return await this.sendGeneralCommand(sessionId, { Name: 'Unmute' });
  }

  /**
   * Toggle mute on a remote session.
   */
  async toggleMute(sessionId: string): Promise<void> {
    return await this.sendGeneralCommand(sessionId, { Name: 'ToggleMute' });
  }

  /**
   * Switch the audio stream index on a remote session.
   */
  async setAudioStreamIndex(sessionId: string, index: number): Promise<void> {
    return await this.sendGeneralCommand(sessionId, {
      Name: 'SetAudioStreamIndex',
      Arguments: { Index: String(index) }
    });
  }

  /**
   * Switch the subtitle stream index on a remote session.
   */
  async setSubtitleStreamIndex(sessionId: string, index: number): Promise<void> {
    return await this.sendGeneralCommand(sessionId, {
      Name: 'SetSubtitleStreamIndex',
      Arguments: { Index: String(index) }
    });
  }

  /**
   * Display an on-screen dialog message modal on a remote session via POST /Sessions/{sessionId}/Message.
   */
  async sendMessage(sessionId: string, options: SessionMessageOptions | string): Promise<void> {
    if (!sessionId) {
      throw new JellyfinError('sessionId is required to send a message.');
    }

    const payload: Record<string, unknown> = typeof options === 'string'
      ? { Text: options, Header: 'Message' }
      : {
          Text: options.text,
          Header: options.header || 'Message',
          TimeoutMs: options.timeoutMs
        };

    await this.http.request(`/Sessions/${sessionId}/Message`, {
      method: 'POST',
      body: payload
    });
  }

  /**
   * Instruct a remote session to navigate and view an item or page via POST /Sessions/{sessionId}/Viewing.
   */
  async viewItem(
    sessionId: string,
    itemType: string,
    itemId: string,
    itemName: string
  ): Promise<void> {
    if (!sessionId) {
      throw new JellyfinError('sessionId is required to instruct session navigation.');
    }

    await this.http.request(`/Sessions/${sessionId}/Viewing`, {
      method: 'POST',
      params: {
        ItemType: itemType,
        ItemId: itemId,
        ItemName: itemName
      }
    });
  }
}

