import type { HttpTransport } from './http.js';
import type {
  BaseItemDto,
  GetAlbumsOptions,
  GetArtistsOptions,
  GetEpisodesOptions,
  GetMoviesOptions,
  GetSeasonsOptions,
  GetSeriesOptions,
  GetSongsOptions,
  GetVideosOptions,
  ItemsResponse,
  PlaybackInfoOptions,
  PlaybackInfoResponse,
  SearchOptions
} from './types.js';
import { JellyfinError } from './errors.js';

const COMMON_ITEM_FIELDS =
  'PrimaryImageAspectRatio,PrimaryImageTag,ImageTags,BackdropImageTags,AlbumPrimaryImageTag,AlbumId,AudioInfo,MediaSources,Chapters,HasLyrics,Overview,Genres,Studios,ProductionYear,OfficialRating,CommunityRating,CriticRating,PremiereDate,RunTimeTicks,IndexNumber,ParentIndexNumber,SeriesName,SeriesId,SeasonId,SeasonName,UserData';

export class LibraryModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  private requireUserId(): string {
    const userId = this.getUserId();
    if (!userId) {
      throw new JellyfinError('User ID is required for library requests. Please authenticate or provide a userId.');
    }
    return userId;
  }

  /**
   * Get list of music library views (folders) for the current user.
   */
  async getMusicLibraries(): Promise<BaseItemDto[]> {
    const userId = this.requireUserId();
    const data = await this.http.request<ItemsResponse>(`/Users/${userId}/Views`);
    return (data.Items || []).filter((item) => item.CollectionType === 'music');
  }

  /**
   * Get list of video library views (movies, tv shows, home videos) for the current user.
   */
  async getVideoLibraries(): Promise<BaseItemDto[]> {
    const userId = this.requireUserId();
    const data = await this.http.request<ItemsResponse>(`/Users/${userId}/Views`);
    const videoTypes = new Set(['movies', 'tvshows', 'homevideos', 'videos', 'musicvideos']);
    return (data.Items || []).filter(
      (item) => typeof item.CollectionType === 'string' && videoTypes.has(item.CollectionType)
    );
  }

  /**
   * Get music albums.
   */
  async getAlbums(options: GetAlbumsOptions = {}): Promise<ItemsResponse> {
    const userId = this.requireUserId();
    const {
      limit = 50,
      startIndex = 0,
      parentId,
      artistId,
      sortBy = 'SortName',
      sortOrder = 'Ascending'
    } = options;

    const params: Record<string, unknown> = {
      IncludeItemTypes: 'MusicAlbum',
      Recursive: true,
      Limit: limit,
      StartIndex: startIndex,
      SortBy: sortBy,
      SortOrder: sortOrder,
      Fields: 'PrimaryImageAspectRatio,PrimaryImageTag,ImageTags,BasicSyncInfo,AlbumArtists,ArtistItems,DateCreated,DateLastMediaAdded,UserData'
    };

    if (parentId) params.ParentId = parentId;
    if (artistId) params.ArtistIds = artistId;

    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, { params });
  }

  /**
   * Get music artists.
   */
  async getArtists(options: GetArtistsOptions = {}): Promise<ItemsResponse> {
    const userId = this.requireUserId();
    const {
      limit = 50,
      startIndex = 0,
      sortBy = 'SortName',
      sortOrder = 'Ascending'
    } = options;

    return await this.http.request<ItemsResponse>('/Artists', {
      params: {
        UserId: userId,
        Limit: limit,
        StartIndex: startIndex,
        SortBy: sortBy,
        SortOrder: sortOrder,
        Fields: 'PrimaryImageTag,ImageTags,DateCreated,UserData'
      }
    });
  }

  /**
   * Get audio songs/tracks.
   */
  async getSongs(options: GetSongsOptions = {}): Promise<ItemsResponse> {
    const userId = this.requireUserId();
    const {
      limit = 100,
      startIndex = 0,
      albumId,
      artistId,
      isFavorite,
      sortBy = 'ParentIndexNumber,IndexNumber,SortName',
      sortOrder = 'Ascending'
    } = options;

    const params: Record<string, unknown> = {
      IncludeItemTypes: 'Audio',
      Recursive: true,
      Limit: limit,
      StartIndex: startIndex,
      SortBy: sortBy,
      SortOrder: sortOrder,
      Fields: COMMON_ITEM_FIELDS
    };

    if (albumId) params.ParentId = albumId;
    if (artistId) params.ArtistIds = artistId;
    if (isFavorite) params.Filters = 'IsFavorite';

    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, { params });
  }

  /**
   * Get favorite songs/tracks for the current user.
   */
  async getFavoriteSongs(options: Omit<GetSongsOptions, 'isFavorite'> = {}): Promise<ItemsResponse> {
    return await this.getSongs({
      ...options,
      isFavorite: true,
      limit: options.limit || 1000,
      sortBy: options.sortBy || 'SortName'
    });
  }

  /**
   * Get movies for the current user.
   */
  async getMovies(options: GetMoviesOptions = {}): Promise<ItemsResponse> {
    const userId = this.requireUserId();
    const {
      limit = 50,
      startIndex = 0,
      parentId,
      isFavorite,
      sortBy = 'SortName',
      sortOrder = 'Ascending',
      genres,
      years,
      searchTerm
    } = options;

    const params: Record<string, unknown> = {
      IncludeItemTypes: 'Movie',
      Recursive: true,
      Limit: limit,
      StartIndex: startIndex,
      SortBy: sortBy,
      SortOrder: sortOrder,
      Fields: COMMON_ITEM_FIELDS
    };

    if (parentId) params.ParentId = parentId;
    if (isFavorite) params.Filters = 'IsFavorite';
    if (genres && genres.length > 0) params.Genres = genres.join('|');
    if (years && years.length > 0) params.Years = years.join(',');
    if (searchTerm) params.SearchTerm = searchTerm;

    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, { params });
  }

  /**
   * Get TV series for the current user.
   */
  async getSeries(options: GetSeriesOptions = {}): Promise<ItemsResponse> {
    const userId = this.requireUserId();
    const {
      limit = 50,
      startIndex = 0,
      parentId,
      isFavorite,
      sortBy = 'SortName',
      sortOrder = 'Ascending',
      genres,
      years,
      searchTerm
    } = options;

    const params: Record<string, unknown> = {
      IncludeItemTypes: 'Series',
      Recursive: true,
      Limit: limit,
      StartIndex: startIndex,
      SortBy: sortBy,
      SortOrder: sortOrder,
      Fields: COMMON_ITEM_FIELDS
    };

    if (parentId) params.ParentId = parentId;
    if (isFavorite) params.Filters = 'IsFavorite';
    if (genres && genres.length > 0) params.Genres = genres.join('|');
    if (years && years.length > 0) params.Years = years.join(',');
    if (searchTerm) params.SearchTerm = searchTerm;

    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, { params });
  }

  /**
   * Get seasons for a given TV series.
   */
  async getSeasons(seriesId: string, options: GetSeasonsOptions = {}): Promise<ItemsResponse> {
    const userId = options.userId || this.requireUserId();
    const params: Record<string, unknown> = {
      UserId: userId,
      Fields: options.fields || COMMON_ITEM_FIELDS
    };
    if (options.isSpecialSeason !== undefined) {
      params.IsSpecialSeason = options.isSpecialSeason;
    }

    return await this.http.request<ItemsResponse>(`/Shows/${seriesId}/Seasons`, { params });
  }

  /**
   * Get episodes for a TV series or specific season.
   */
  async getEpisodes(seriesId?: string, seasonId?: string, options: GetEpisodesOptions = {}): Promise<ItemsResponse> {
    const userId = this.requireUserId();
    const {
      seasonNumber,
      startIndex = 0,
      limit = 100,
      isMissing,
      sortBy = 'IndexNumber,SortName',
      sortOrder = 'Ascending'
    } = options;

    if (seriesId) {
      const params: Record<string, unknown> = {
        UserId: userId,
        StartIndex: startIndex,
        Limit: limit,
        SortBy: sortBy,
        SortOrder: sortOrder,
        Fields: COMMON_ITEM_FIELDS
      };
      if (seasonId) params.SeasonId = seasonId;
      if (seasonNumber !== undefined) params.Season = seasonNumber;
      if (isMissing !== undefined) params.IsMissing = isMissing;

      return await this.http.request<ItemsResponse>(`/Shows/${seriesId}/Episodes`, { params });
    }

    const params: Record<string, unknown> = {
      IncludeItemTypes: 'Episode',
      Recursive: true,
      StartIndex: startIndex,
      Limit: limit,
      SortBy: sortBy,
      SortOrder: sortOrder,
      Fields: COMMON_ITEM_FIELDS
    };
    if (seasonId) params.ParentId = seasonId;

    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, { params });
  }

  /**
   * General query for video items (movies, episodes, videos).
   */
  async getVideos(options: GetVideosOptions = {}): Promise<ItemsResponse> {
    const userId = this.requireUserId();
    const {
      limit = 50,
      startIndex = 0,
      parentId,
      includeItemTypes = 'Movie,Episode,Video',
      sortBy = 'SortName',
      sortOrder = 'Ascending'
    } = options;

    const params: Record<string, unknown> = {
      IncludeItemTypes: includeItemTypes,
      Recursive: true,
      Limit: limit,
      StartIndex: startIndex,
      SortBy: sortBy,
      SortOrder: sortOrder,
      Fields: COMMON_ITEM_FIELDS
    };
    if (parentId) params.ParentId = parentId;

    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, { params });
  }

  /**
   * Request media playback information for an item (sources, streams, play session).
   */
  async getPlaybackInfo(itemId: string, options: PlaybackInfoOptions = {}): Promise<PlaybackInfoResponse> {
    if (!itemId) {
      throw new JellyfinError('itemId is required for getPlaybackInfo');
    }
    const userId = options.userId || this.requireUserId();
    const payload: Record<string, unknown> = {
      UserId: userId
    };

    if (options.startTimeTicks !== undefined) payload.StartTimeTicks = options.startTimeTicks;
    if (options.audioStreamIndex !== undefined) payload.AudioStreamIndex = options.audioStreamIndex;
    if (options.subtitleStreamIndex !== undefined) payload.SubtitleStreamIndex = options.subtitleStreamIndex;
    if (options.maxStreamingBitrate !== undefined) payload.MaxStreamingBitrate = options.maxStreamingBitrate;
    if (options.mediaSourceId !== undefined) payload.MediaSourceId = options.mediaSourceId;
    if (options.deviceProfile !== undefined) payload.DeviceProfile = options.deviceProfile;
    if (options.autoOpenLiveStream !== undefined) payload.AutoOpenLiveStream = options.autoOpenLiveStream;

    return await this.http.request<PlaybackInfoResponse>(`/Items/${itemId}/PlaybackInfo`, {
      method: 'POST',
      body: payload
    });
  }

  /**
   * Get single item details by its Jellyfin ID.
   */
  async getItem(itemId: string): Promise<BaseItemDto | null> {
    if (!itemId) return null;
    const userId = this.requireUserId();
    return await this.http.request<BaseItemDto>(`/Users/${userId}/Items/${itemId}`, {
      params: {
        Fields: COMMON_ITEM_FIELDS
      }
    });
  }

  /**
   * Search Jellyfin library for songs, albums, artists, playlists, movies, or series.
   */
  async search(query: string, options: SearchOptions = {}): Promise<ItemsResponse> {
    if (!query || !query.trim()) {
      return { Items: [], TotalRecordCount: 0 };
    }

    const userId = this.requireUserId();
    const {
      limit = 30,
      startIndex = 0,
      includeItemTypes = 'Audio,MusicAlbum,MusicArtist,Playlist,Movie,Series,Episode'
    } = options;

    return await this.http.request<ItemsResponse>(`/Users/${userId}/Items`, {
      params: {
        SearchTerm: query.trim(),
        IncludeItemTypes: includeItemTypes,
        Limit: limit,
        StartIndex: startIndex,
        Recursive: true,
        Fields: COMMON_ITEM_FIELDS
      }
    });
  }
}
