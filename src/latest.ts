import type { HttpTransport } from './http.js';
import type { BaseItemDto, GetLatestMediaOptions } from './types.js';
import { JellyfinError } from './errors.js';

const LATEST_ITEM_FIELDS =
  'PrimaryImageAspectRatio,PrimaryImageTag,ImageTags,BackdropImageTags,AlbumPrimaryImageTag,AlbumId,AudioInfo,MediaSources,Chapters,Overview,Genres,Studios,ProductionYear,PremiereDate,RunTimeTicks,IndexNumber,ParentIndexNumber,SeriesName,SeriesId,SeasonId,SeasonName,UserData';

export class LatestModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  private resolveUserId(explicitUserId?: string): string {
    const userId = explicitUserId || this.getUserId();
    if (!userId) {
      throw new JellyfinError('User ID is required for latest media requests. Please authenticate or provide a userId.');
    }
    return userId;
  }

  /**
   * Fetch recently added media items for the user via /Users/{userId}/Items/Latest.
   */
  async getLatest(options: GetLatestMediaOptions = {}): Promise<BaseItemDto[]> {
    const userId = this.resolveUserId(options.userId);
    const {
      parentId,
      limit = 20,
      fields = LATEST_ITEM_FIELDS,
      includeItemTypes,
      isPlayed,
      enableImages,
      imageTypeLimit,
      enableImageTypes,
      groupItems
    } = options;

    const params: Record<string, unknown> = {
      Limit: limit,
      Fields: fields
    };

    if (parentId) params.ParentId = parentId;
    if (includeItemTypes && includeItemTypes.length > 0) {
      params.IncludeItemTypes = includeItemTypes.join(',');
    }
    if (isPlayed !== undefined) params.IsPlayed = isPlayed;
    if (enableImages !== undefined) params.EnableImages = enableImages;
    if (imageTypeLimit !== undefined) params.ImageTypeLimit = imageTypeLimit;
    if (enableImageTypes && enableImageTypes.length > 0) {
      params.EnableImageTypes = enableImageTypes.join(',');
    }
    if (groupItems !== undefined) params.GroupItems = groupItems;

    const result = await this.http.request<BaseItemDto[]>(`/Users/${userId}/Items/Latest`, { params });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Convenience helper to fetch recently added movies.
   */
  async getLatestMovies(options: Omit<GetLatestMediaOptions, 'includeItemTypes'> = {}): Promise<BaseItemDto[]> {
    return await this.getLatest({ ...options, includeItemTypes: ['Movie'] });
  }

  /**
   * Convenience helper to fetch recently added TV episodes.
   */
  async getLatestEpisodes(options: Omit<GetLatestMediaOptions, 'includeItemTypes'> = {}): Promise<BaseItemDto[]> {
    return await this.getLatest({ ...options, includeItemTypes: ['Episode'] });
  }

  /**
   * Convenience helper to fetch recently added music albums.
   */
  async getLatestAlbums(options: Omit<GetLatestMediaOptions, 'includeItemTypes'> = {}): Promise<BaseItemDto[]> {
    return await this.getLatest({ ...options, includeItemTypes: ['MusicAlbum'] });
  }
}

