import type { HttpTransport } from './http.js';
import type { LyricsDto } from './types.js';

export class LyricsModule {
  private http: HttpTransport;

  constructor(http: HttpTransport) {
    this.http = http;
  }

  /**
   * Fetch synced or unsynced lyrics for an audio item.
   */
  async getLyrics(itemId: string): Promise<LyricsDto | null> {
    if (!itemId) return null;
    try {
      return await this.http.request<LyricsDto>(`/Audio/${itemId}/Lyrics`);
    } catch (err) {
      console.warn('[Jellyfin SDK] Failed to fetch lyrics:', err);
      return null;
    }
  }
}

