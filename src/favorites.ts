import type { HttpTransport } from './http.js';
import { JellyfinError } from './errors.js';

export class FavoritesModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  private requireUserId(): string {
    const userId = this.getUserId();
    if (!userId) {
      throw new JellyfinError('User ID is required to mark favorites.');
    }
    return userId;
  }

  /**
   * Mark an item as favorite.
   */
  async markFavorite(itemId: string): Promise<void> {
    if (!itemId) return;
    const userId = this.requireUserId();
    await this.http.request(`/Users/${userId}/FavoriteItems/${itemId}`, {
      method: 'POST'
    });
  }

  /**
   * Unmark an item as favorite.
   */
  async unmarkFavorite(itemId: string): Promise<void> {
    if (!itemId) return;
    const userId = this.requireUserId();
    await this.http.request(`/Users/${userId}/FavoriteItems/${itemId}`, {
      method: 'DELETE'
    });
  }
}

