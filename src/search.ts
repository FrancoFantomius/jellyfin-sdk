import type { HttpTransport } from './http.js';
import type { ItemsResponse, SearchOptions } from './types.js';
import { JellyfinError } from './errors.js';

export const COMMON_SEARCH_FIELDS =
  'PrimaryImageAspectRatio,PrimaryImageTag,ImageTags,BackdropImageTags,AlbumPrimaryImageTag,AlbumId,AudioInfo,MediaSources,Chapters,HasLyrics,Overview,Genres,Studios,ProductionYear,OfficialRating,CommunityRating,CriticRating,PremiereDate,RunTimeTicks,IndexNumber,ParentIndexNumber,SeriesName,SeriesId,SeasonId,SeasonName,UserData';

export class SearchModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  private resolveUserId(explicitUserId?: string): string {
    const userId = explicitUserId || this.getUserId();
    if (!userId) {
      throw new JellyfinError('User ID is required for search requests. Please authenticate or provide a userId.');
    }
    return userId;
  }

  /**
   * Universal search across Jellyfin items with comprehensive filters.
   */
  async search(query: string, options: SearchOptions = {}): Promise<ItemsResponse> {
    if (!query || !query.trim()) {
      return { Items: [], TotalRecordCount: 0 };
    }

    const userId = this.resolveUserId(options.userId);
    const {
      limit = 30,
      startIndex = 0,
      parentId,
      includeItemTypes = 'Audio,MusicAlbum,MusicArtist,Playlist,Movie,Series,Episode',
      mediaTypes,
      genres,
      years,
      isFavorite,
      sortBy,
      sortOrder,
      fields = COMMON_SEARCH_FIELDS,
      recursive = true
    } = options;

    const params: Record<string, unknown> = {
      SearchTerm: query.trim(),
      Limit: limit,
      StartIndex: startIndex,
      Recursive: recursive,
      Fields: fields
    };

    if (parentId) params.ParentId = parentId;

    if (includeItemTypes) {
      params.IncludeItemTypes = Array.isArray(includeItemTypes)
        ? includeItemTypes.join(',')
        : includeItemTypes;
    }

    if (mediaTypes) {
      params.MediaTypes = Array.isArray(mediaTypes)
        ? mediaTypes.join(',')
        : mediaTypes;
    }

    if (genres && genres.length > 0) params.Genres = genres.join('|');
    if (years && years.length > 0) params.Years = years.join(',');
    if (isFavorite) params.Filters = 'IsFavorite';
    if (sortBy) params.SortBy = sortBy;
    if (sortOrder) params.SortOrder = sortOrder;

    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, { params });
  }

  /**
   * Search specifically within a specific library or parent folder.
   */
  async searchInLibrary(
    parentId: string,
    query: string,
    options: Omit<SearchOptions, 'parentId'> = {}
  ): Promise<ItemsResponse> {
    return await this.search(query, { ...options, parentId });
  }

  /**
   * Convenience helper to search audio tracks / songs.
   */
  async searchSongs(
    query: string,
    options: Omit<SearchOptions, 'includeItemTypes'> = {}
  ): Promise<ItemsResponse> {
    return await this.search(query, { ...options, includeItemTypes: 'Audio' });
  }

  /**
   * Convenience helper to search music albums.
   */
  async searchAlbums(
    query: string,
    options: Omit<SearchOptions, 'includeItemTypes'> = {}
  ): Promise<ItemsResponse> {
    return await this.search(query, { ...options, includeItemTypes: 'MusicAlbum' });
  }

  /**
   * Convenience helper to search music artists.
   */
  async searchArtists(
    query: string,
    options: Omit<SearchOptions, 'includeItemTypes'> = {}
  ): Promise<ItemsResponse> {
    return await this.search(query, { ...options, includeItemTypes: 'MusicArtist' });
  }

  /**
   * Convenience helper to search movies.
   */
  async searchMovies(
    query: string,
    options: Omit<SearchOptions, 'includeItemTypes'> = {}
  ): Promise<ItemsResponse> {
    return await this.search(query, { ...options, includeItemTypes: 'Movie' });
  }

  /**
   * Convenience helper to search TV series.
   */
  async searchSeries(
    query: string,
    options: Omit<SearchOptions, 'includeItemTypes'> = {}
  ): Promise<ItemsResponse> {
    return await this.search(query, { ...options, includeItemTypes: 'Series' });
  }

  /**
   * Convenience helper to search TV episodes.
   */
  async searchEpisodes(
    query: string,
    options: Omit<SearchOptions, 'includeItemTypes'> = {}
  ): Promise<ItemsResponse> {
    return await this.search(query, { ...options, includeItemTypes: 'Episode' });
  }
}

