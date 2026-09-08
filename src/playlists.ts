import type { HttpTransport } from './http.js';
import type { BaseItemDto, CreatePlaylistOptions, ItemsResponse, UpdatePlaylistOptions } from './types.js';
import { JellyfinApiError, JellyfinError } from './errors.js';

export class PlaylistsModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  private requireUserId(): string {
    const userId = this.getUserId();
    if (!userId) {
      throw new JellyfinError('User ID is required for playlist operations.');
    }
    return userId;
  }

  /**
   * Get all playlists for the current user.
   */
  async getPlaylists(): Promise<ItemsResponse> {
    const userId = this.requireUserId();
    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, {
      params: {
        IncludeItemTypes: 'Playlist',
        Recursive: true,
        Fields: 'PrimaryImageTag,ImageTags,DateCreated,DateLastMediaAdded,UserData'
      }
    });
  }

  /**
   * Get items belonging to a specific playlist.
   */
  async getPlaylistItems(playlistId: string): Promise<ItemsResponse> {
    if (!playlistId) {
      throw new JellyfinError('Playlist ID is required.');
    }
    const userId = this.requireUserId();
    return await this.http.request<ItemsResponse>(`/Playlists/${playlistId}/Items`, {
      params: {
        UserId: userId,
        Fields: 'PrimaryImageAspectRatio,PrimaryImageTag,ImageTags,AlbumPrimaryImageTag,AlbumId,AudioInfo,MediaSources,HasLyrics,UserData'
      }
    });
  }

  /**
   * Create a new playlist.
   * Jellyfin 12 requires a JSON request body with CreatePlaylistDto.
   * Falls back to legacy query parameters if server returns 400/415.
   */
  async createPlaylist(options: CreatePlaylistOptions): Promise<string> {
    const userId = options.userId || this.requireUserId();
    const { name, isPublic = false, trackIds = [], mediaType = 'Audio' } = options;

    if (!name || !name.trim()) {
      throw new JellyfinError('Playlist name is required.');
    }

    const idsArray = Array.isArray(trackIds) ? trackIds : [trackIds].filter(Boolean);
    let playlistId: string | undefined;

    try {
      // Modern Jellyfin 12+ API: JSON body (CreatePlaylistDto)
      const resData = await this.http.request<{ Id: string }>('/Playlists', {
        method: 'POST',
        body: {
          Name: name.trim(),
          Ids: idsArray,
          UserId: userId,
          MediaType: mediaType
        }
      });
      playlistId = resData?.Id;
    } catch (err) {
      // Graceful fallback for older Jellyfin servers (<10.8) expecting query params
      if (err instanceof JellyfinApiError && (err.status === 400 || err.status === 415)) {
        const idsStr = idsArray.join(',');
        const resData = await this.http.request<{ Id: string }>('/Playlists', {
          method: 'POST',
          params: {
            Name: name.trim(),
            UserId: userId,
            MediaType: mediaType,
            ...(idsStr ? { Ids: idsStr } : {})
          }
        });
        playlistId = resData?.Id;
      } else {
        throw err;
      }
    }

    if (playlistId && isPublic) {
      try {
        // Jellyfin 12 uses user permissions endpoint
        await this.http.request(`/Playlists/${playlistId}/Users/${userId}`, {
          method: 'POST',
          body: { UserId: userId, CanEdit: true }
        });
      } catch {
        // Fallback for legacy Jellyfin servers
        try {
          await this.http.request(`/Playlists/${playlistId}`, {
            method: 'POST',
            body: { IsPublic: true }
          });
        } catch (err) {
          console.warn('[Jellyfin SDK] Failed to update public status for playlist:', err);
        }
      }
    }

    return playlistId || '';
  }

  /**
   * Update playlist metadata (e.g. name).
   * Jellyfin 12 removed POST /Playlists/{id}; item updates use POST /Items/{id},
   * which is also supported across older Jellyfin versions.
   */
  async updatePlaylist(playlistId: string, options: UpdatePlaylistOptions): Promise<void> {
    if (!playlistId) {
      throw new JellyfinError('Playlist ID is required.');
    }

    const body: Record<string, unknown> = { Id: playlistId };
    if (options.name) body.Name = options.name;

    try {
      await this.http.request(`/Items/${playlistId}`, {
        method: 'POST',
        body
      });
    } catch (err) {
      // Fallback for legacy servers that only support POST /Playlists/{playlistId}
      await this.http.request(`/Playlists/${playlistId}`, {
        method: 'POST',
        body: options.name ? { Name: options.name } : {}
      });
    }
  }

  /**
   * Upload custom cover image for a playlist.
   */
  async uploadPlaylistImage(playlistId: string, base64ImageString: string, mimeType: string = 'image/jpeg'): Promise<void> {
    if (!playlistId || !base64ImageString) {
      throw new JellyfinError('Playlist ID and image data are required.');
    }

    const base64Data = base64ImageString.includes(',') ? base64ImageString.split(',')[1] : base64ImageString;

    await this.http.request(`/Items/${playlistId}/Images/Primary`, {
      method: 'POST',
      contentType: mimeType,
      body: base64Data
    });
  }

  /**
   * Delete a playlist.
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    if (!playlistId) {
      throw new JellyfinError('Playlist ID is required.');
    }
    await this.http.request(`/Items/${playlistId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Add tracks to an existing playlist.
   */
  async addTracks(playlistId: string, trackIds: string | string[]): Promise<void> {
    if (!playlistId || !trackIds) return;
    const userId = this.requireUserId();

    const idsStr = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;
    if (!idsStr) return;

    await this.http.request(`/Playlists/${playlistId}/Items`, {
      method: 'POST',
      params: {
        Ids: idsStr,
        UserId: userId
      }
    });
  }

  /**
   * Remove a track from a playlist by playlist entry ID or track ID.
   */
  async removeTrack(playlistId: string, entryIdOrTrackId: string): Promise<void> {
    if (!playlistId || !entryIdOrTrackId) return;

    try {
      await this.http.request(`/Playlists/${playlistId}/Items`, {
        method: 'DELETE',
        params: { EntryIds: entryIdOrTrackId }
      });
    } catch {
      // Fallback for older Jellyfin servers using ItemIds
      await this.http.request(`/Playlists/${playlistId}/Items`, {
        method: 'DELETE',
        params: { ItemIds: entryIdOrTrackId }
      });
    }
  }

  /**
   * Remove a specific playlist item by its unique entry ID (PlaylistItemId).
   * Especially recommended on Jellyfin 12+ when playlists contain duplicate tracks.
   */
  async removePlaylistItem(playlistId: string, playlistItemId: string): Promise<void> {
    return this.removeTrack(playlistId, playlistItemId);
  }
}

