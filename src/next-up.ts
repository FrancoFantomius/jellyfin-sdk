import type { HttpTransport } from './http.js';
import type { GetNextUpOptions, ItemsResponse } from './types.js';
import { JellyfinError } from './errors.js';

const NEXT_UP_FIELDS =
  'PrimaryImageAspectRatio,PrimaryImageTag,ImageTags,BackdropImageTags,AlbumPrimaryImageTag,AudioInfo,MediaSources,Chapters,Overview,Genres,ProductionYear,PremiereDate,RunTimeTicks,IndexNumber,ParentIndexNumber,SeriesName,SeriesId,SeasonId,SeasonName,UserData';

export class NextUpModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  private resolveUserId(explicitUserId?: string): string {
    const userId = explicitUserId || this.getUserId();
    if (!userId) {
      throw new JellyfinError('User ID is required for next up requests. Please authenticate or provide a userId.');
    }
    return userId;
  }

  /**
   * Fetch the next unplayed episodes for followed series via /Shows/NextUp.
   */
  async getNextUp(options: GetNextUpOptions = {}): Promise<ItemsResponse> {
    const userId = this.resolveUserId(options.userId);
    const {
      limit = 24,
      startIndex = 0,
      parentId,
      seriesId,
      fields = NEXT_UP_FIELDS,
      enableImages,
      enableUserData,
      enableTotalRecordCount,
      imageTypeLimit,
      enableImageTypes,
      disableFirstEpisode,
      nextUpDateCutoff
    } = options;

    const params: Record<string, unknown> = {
      UserId: userId,
      Limit: limit,
      StartIndex: startIndex,
      Fields: fields
    };

    if (parentId) params.ParentId = parentId;
    if (seriesId) params.SeriesId = seriesId;
    if (enableImages !== undefined) params.EnableImages = enableImages;
    if (enableUserData !== undefined) params.EnableUserData = enableUserData;
    if (enableTotalRecordCount !== undefined) params.EnableTotalRecordCount = enableTotalRecordCount;
    if (imageTypeLimit !== undefined) params.ImageTypeLimit = imageTypeLimit;
    if (enableImageTypes && enableImageTypes.length > 0) params.EnableImageTypes = enableImageTypes.join(',');
    if (disableFirstEpisode !== undefined) params.DisableFirstEpisode = disableFirstEpisode;
    if (nextUpDateCutoff) params.NextUpDateCutoff = nextUpDateCutoff;

    return await this.http.request<ItemsResponse>('/Shows/NextUp', { params });
  }

  /**
   * Convenience alias for getNextUp.
   */
  async getEpisodes(options: GetNextUpOptions = {}): Promise<ItemsResponse> {
    return await this.getNextUp(options);
  }
}

