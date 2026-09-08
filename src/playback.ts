import type { HttpTransport } from './http.js';

export class PlaybackModule {
  private http: HttpTransport;

  constructor(http: HttpTransport) {
    this.http = http;
  }

  /**
   * Report to the Jellyfin server that playback has started for an item.
   */
  async reportStart(itemId: string, positionTicks: number = 0): Promise<void> {
    if (!itemId || !this.http.getToken()) return;
    try {
      await this.http.request('/Sessions/Playing', {
        method: 'POST',
        body: {
          ItemId: itemId,
          PositionTicks: positionTicks,
          CanSeek: true,
          IsPaused: false
        }
      });
    } catch (e) {
      console.warn('[Jellyfin SDK] Start playback report error:', e);
    }
  }

  /**
   * Report current playback progress to the Jellyfin server.
   */
  async reportProgress(itemId: string, positionTicks: number = 0, isPaused: boolean = false): Promise<void> {
    if (!itemId || !this.http.getToken()) return;
    try {
      await this.http.request('/Sessions/Playing/Progress', {
        method: 'POST',
        body: {
          ItemId: itemId,
          PositionTicks: positionTicks,
          CanSeek: true,
          IsPaused: isPaused
        }
      });
    } catch (e) {
      console.warn('[Jellyfin SDK] Progress playback report error:', e);
    }
  }

  /**
   * Report that playback has stopped for an item.
   */
  async reportStopped(itemId: string, positionTicks: number = 0): Promise<void> {
    if (!itemId || !this.http.getToken()) return;
    try {
      await this.http.request('/Sessions/Playing/Stopped', {
        method: 'POST',
        body: {
          ItemId: itemId,
          PositionTicks: positionTicks
        }
      });
    } catch (e) {
      console.warn('[Jellyfin SDK] Stop playback report error:', e);
    }
  }
}

