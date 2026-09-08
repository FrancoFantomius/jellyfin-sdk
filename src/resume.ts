import type { HttpTransport } from './http.js';
import type { GetResumeItemsOptions, ItemsResponse } from './types.js';
import { JellyfinError } from './errors.js';

const RESUME_ITEM_FIELDS =
  'PrimaryImageAspectRatio,PrimaryImageTag,ImageTags,BackdropImageTags,AlbumPrimaryImageTag,AlbumId,AudioInfo,MediaSources,Chapters,HasLyrics,Overview,Genres,Studios,ProductionYear,OfficialRating,CommunityRating,CriticRating,PremiereDate,RunTimeTicks,IndexNumber,ParentIndexNumber,SeriesName,SeriesId,SeasonId,SeasonName,UserData';

export class ResumeModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  private resolveUserId(explicitUserId?: string): string {
    const userId = explicitUserId || this.getUserId();
    if (!userId) {
      throw new JellyfinError('User ID is required for resume requests. Please authenticate or provide a userId.');
    }
    return userId;
  }

  /**
   * Fetch items currently in-progress for the user via /UserItems/Resume.
   */
  async getResumeItems(options: GetResumeItemsOptions = {}): Promise<ItemsResponse> {
    const userId = this.resolveUserId(options.userId);
    const {
      limit = 20,
      startIndex = 0,
      parentId,
      mediaTypes,
      enableImages,
      enableUserData,
      imageTypeLimit,
      enableImageTypes,
      fields = RESUME_ITEM_FIELDS
    } = options;

    const params: Record<string, unknown> = {
      UserId: userId,
      Limit: limit,
      StartIndex: startIndex,
      Recursive: true,
      Fields: fields
    };

    if (parentId) params.ParentId = parentId;
    if (mediaTypes && mediaTypes.length > 0) params.MediaTypes = mediaTypes.join(',');
    if (enableImages !== undefined) params.EnableImages = enableImages;
    if (enableUserData !== undefined) params.EnableUserData = enableUserData;
    if (imageTypeLimit !== undefined) params.ImageTypeLimit = imageTypeLimit;
    if (enableImageTypes && enableImageTypes.length > 0) params.EnableImageTypes = enableImageTypes.join(',');

    return await this.http.request<ItemsResponse>('/UserItems/Resume', { params });
  }

  /**
   * Convenience alias for getResumeItems.
   */
  async getItems(options: GetResumeItemsOptions = {}): Promise<ItemsResponse> {
    return await this.getResumeItems(options);
  }
}

