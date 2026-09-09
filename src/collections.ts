import type { HttpTransport } from './http.js';
import type {
  CreateCollectionOptions,
  GetCollectionItemsOptions,
  GetCollectionsOptions,
  ItemsResponse
} from './types.js';

export class CollectionsModule {
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
   * Retrieves user BoxSet / Collections via GET /Collections.
   */
  async getCollections(options: GetCollectionsOptions = {}): Promise<ItemsResponse> {
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

    return await this.http.request<ItemsResponse>('/Collections', { params });
  }

  /**
   * Retrieves the items belonging to a collection / BoxSet.
   */
  async getCollectionItems(
    collectionId: string,
    options: GetCollectionItemsOptions = {}
  ): Promise<ItemsResponse> {
    const userId = this.resolveUserId(options.userId);
    const endpoint = userId ? `/Users/${userId}/Items` : '/Items';

    const params: Record<string, unknown> = {
      ParentId: collectionId
    };

    if (options.startIndex !== undefined) params.StartIndex = options.startIndex;
    if (options.limit !== undefined) params.Limit = options.limit;
    if (options.fields) params.Fields = options.fields;
    if (options.sortBy) params.SortBy = options.sortBy;
    if (options.sortOrder) params.SortOrder = options.sortOrder;

    return await this.http.request<ItemsResponse>(endpoint, { params });
  }

  /**
   * Creates a new BoxSet / Collection via POST /Collections.
   */
  async createCollection(options: CreateCollectionOptions): Promise<{ Id: string }> {
    const params: Record<string, unknown> = {
      Name: options.name
    };

    if (options.ids && options.ids.length > 0) {
      params.Ids = options.ids.join(',');
    }
    if (options.parentId) {
      params.ParentId = options.parentId;
    }
    if (options.isFolder !== undefined) {
      params.IsFolder = options.isFolder;
    }

    return await this.http.request<{ Id: string }>('/Collections', {
      method: 'POST',
      params
    });
  }

  /**
   * Adds items to an existing BoxSet / Collection via POST /Collections/{collectionId}/Items.
   */
  async addToCollection(collectionId: string, itemIds: string | string[]): Promise<void> {
    const ids = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;

    await this.http.request(`/Collections/${collectionId}/Items`, {
      method: 'POST',
      params: {
        Ids: ids
      }
    });
  }

  /**
   * Removes items from an existing BoxSet / Collection via DELETE /Collections/{collectionId}/Items.
   */
  async removeFromCollection(collectionId: string, itemIds: string | string[]): Promise<void> {
    const ids = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;

    await this.http.request(`/Collections/${collectionId}/Items`, {
      method: 'DELETE',
      params: {
        Ids: ids
      }
    });
  }
}

