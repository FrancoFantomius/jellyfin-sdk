import type { HttpTransport } from './http.js';
import type {
  BaseItemDto,
  GetGenresOptions,
  GetStudiosOptions,
  ItemsResponse
} from './types.js';

export class GenresModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  private resolveUserId(explicitUserId?: string): string {
    return explicitUserId || this.getUserId() || '';
  }

  /**
   * Retrieves video/movie genres from the server via GET /Genres.
   */
  async getGenres(options: GetGenresOptions = {}): Promise<ItemsResponse> {
    const userId = this.resolveUserId(options.userId);
    const params: Record<string, unknown> = {};

    if (userId) params.UserId = userId;
    if (options.parentId) params.ParentId = options.parentId;
    if (options.startIndex !== undefined) params.StartIndex = options.startIndex;
    if (options.limit !== undefined) params.Limit = options.limit;
    if (options.searchTerm) params.SearchTerm = options.searchTerm;
    if (options.sortBy) params.SortBy = options.sortBy;
    if (options.sortOrder) params.SortOrder = options.sortOrder;
    if (options.enableImages !== undefined) params.EnableImages = options.enableImages;
    if (options.imageTypeLimit !== undefined) params.ImageTypeLimit = options.imageTypeLimit;
    if (options.enableImageTypes && options.enableImageTypes.length > 0) {
      params.EnableImageTypes = options.enableImageTypes.join(',');
    }

    return await this.http.request<ItemsResponse>('/Genres', { params });
  }

  /**
   * Retrieves a single genre by name via GET /Genres/{genreName}.
   */
  async getGenre(genreName: string, options: { userId?: string } = {}): Promise<BaseItemDto> {
    const userId = this.resolveUserId(options.userId);
    const params: Record<string, unknown> = {};
    if (userId) params.UserId = userId;

    return await this.http.request<BaseItemDto>(`/Genres/${encodeURIComponent(genreName)}`, {
      params
    });
  }

  /**
   * Retrieves music genres from the server via GET /MusicGenres.
   */
  async getMusicGenres(options: GetGenresOptions = {}): Promise<ItemsResponse> {
    const userId = this.resolveUserId(options.userId);
    const params: Record<string, unknown> = {};

    if (userId) params.UserId = userId;
    if (options.parentId) params.ParentId = options.parentId;
    if (options.startIndex !== undefined) params.StartIndex = options.startIndex;
    if (options.limit !== undefined) params.Limit = options.limit;
    if (options.searchTerm) params.SearchTerm = options.searchTerm;
    if (options.sortBy) params.SortBy = options.sortBy;
    if (options.sortOrder) params.SortOrder = options.sortOrder;
    if (options.enableImages !== undefined) params.EnableImages = options.enableImages;
    if (options.imageTypeLimit !== undefined) params.ImageTypeLimit = options.imageTypeLimit;
    if (options.enableImageTypes && options.enableImageTypes.length > 0) {
      params.EnableImageTypes = options.enableImageTypes.join(',');
    }

    return await this.http.request<ItemsResponse>('/MusicGenres', { params });
  }

  /**
   * Retrieves a single music genre by name via GET /MusicGenres/{genreName}.
   */
  async getMusicGenre(genreName: string, options: { userId?: string } = {}): Promise<BaseItemDto> {
    const userId = this.resolveUserId(options.userId);
    const params: Record<string, unknown> = {};
    if (userId) params.UserId = userId;

    return await this.http.request<BaseItemDto>(`/MusicGenres/${encodeURIComponent(genreName)}`, {
      params
    });
  }

  /**
   * Retrieves studios/production companies from the server via GET /Studios.
   */
  async getStudios(options: GetStudiosOptions = {}): Promise<ItemsResponse> {
    const userId = this.resolveUserId(options.userId);
    const params: Record<string, unknown> = {};

    if (userId) params.UserId = userId;
    if (options.parentId) params.ParentId = options.parentId;
    if (options.startIndex !== undefined) params.StartIndex = options.startIndex;
    if (options.limit !== undefined) params.Limit = options.limit;
    if (options.searchTerm) params.SearchTerm = options.searchTerm;
    if (options.sortBy) params.SortBy = options.sortBy;
    if (options.sortOrder) params.SortOrder = options.sortOrder;
    if (options.enableImages !== undefined) params.EnableImages = options.enableImages;
    if (options.imageTypeLimit !== undefined) params.ImageTypeLimit = options.imageTypeLimit;
    if (options.enableImageTypes && options.enableImageTypes.length > 0) {
      params.EnableImageTypes = options.enableImageTypes.join(',');
    }

    return await this.http.request<ItemsResponse>('/Studios', { params });
  }

  /**
   * Retrieves a single studio by name via GET /Studios/{studioName}.
   */
  async getStudio(studioName: string, options: { userId?: string } = {}): Promise<BaseItemDto> {
    const userId = this.resolveUserId(options.userId);
    const params: Record<string, unknown> = {};
    if (userId) params.UserId = userId;

    return await this.http.request<BaseItemDto>(`/Studios/${encodeURIComponent(studioName)}`, {
      params
    });
  }
}

