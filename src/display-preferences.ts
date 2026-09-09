import type { HttpTransport } from './http.js';
import type {
  DisplayPreferencesDto,
  GetDisplayPreferencesOptions,
  UpdateDisplayPreferencesOptions
} from './types.js';
import { JellyfinError } from './errors.js';

export class DisplayPreferencesModule {
  private http: HttpTransport;
  private getUserId: () => string;
  private defaultClient: string;

  constructor(http: HttpTransport, getUserId: () => string, defaultClient = 'emby') {
    this.http = http;
    this.getUserId = getUserId;
    this.defaultClient = defaultClient;
  }

  private resolveUserId(explicitUserId?: string): string {
    const userId = explicitUserId || this.getUserId();
    if (!userId) {
      throw new JellyfinError(
        'User ID is required for DisplayPreferences. Please authenticate or specify userId.'
      );
    }
    return userId;
  }

  /**
   * Retrieves the user's display preferences for a specific folder or view.
   * GET /DisplayPreferences/{displayPreferencesId}
   */
  async getDisplayPreferences(
    displayPreferencesId: string,
    options: GetDisplayPreferencesOptions = {}
  ): Promise<DisplayPreferencesDto> {
    const userId = this.resolveUserId(options.userId);
    const client = options.client || this.defaultClient;

    return await this.http.request<DisplayPreferencesDto>(
      `/DisplayPreferences/${displayPreferencesId}`,
      {
        params: {
          userId,
          client
        }
      }
    );
  }

  /**
   * Updates display preferences for a specific folder or view.
   * POST /DisplayPreferences/{displayPreferencesId}
   */
  async updateDisplayPreferences(
    displayPreferencesId: string,
    preferences: DisplayPreferencesDto,
    options: UpdateDisplayPreferencesOptions = {}
  ): Promise<void> {
    const userId = this.resolveUserId(options.userId);
    const client = options.client || this.defaultClient;

    const payload: DisplayPreferencesDto = {
      ...preferences,
      Id: preferences.Id || displayPreferencesId,
      Client: preferences.Client || client
    };

    await this.http.request(`/DisplayPreferences/${displayPreferencesId}`, {
      method: 'POST',
      params: {
        userId,
        client
      },
      body: payload
    });
  }

  /**
   * Sets a custom client-specific key-value pair in CustomPrefs.
   */
  async setCustomPreference(
    displayPreferencesId: string,
    key: string,
    value: string,
    options: UpdateDisplayPreferencesOptions = {}
  ): Promise<DisplayPreferencesDto> {
    const current = await this.getDisplayPreferences(displayPreferencesId, options);
    const customPrefs = {
      ...(current.CustomPrefs || {}),
      [key]: value
    };

    const updated: DisplayPreferencesDto = {
      ...current,
      CustomPrefs: customPrefs
    };

    await this.updateDisplayPreferences(displayPreferencesId, updated, options);
    return updated;
  }

  /**
   * Updates sort field and order preferences for a view.
   */
  async setSortPreferences(
    displayPreferencesId: string,
    sortBy: string,
    sortOrder: 'Ascending' | 'Descending',
    options: UpdateDisplayPreferencesOptions = {}
  ): Promise<DisplayPreferencesDto> {
    const current = await this.getDisplayPreferences(displayPreferencesId, options);
    const updated: DisplayPreferencesDto = {
      ...current,
      SortBy: sortBy,
      SortOrder: sortOrder,
      RememberSorting: true
    };

    await this.updateDisplayPreferences(displayPreferencesId, updated, options);
    return updated;
  }

  /**
   * Sets the view presentation layout type (e.g. 'Poster', 'Thumb', 'Banner', 'List').
   */
  async setViewType(
    displayPreferencesId: string,
    viewType: string,
    options: UpdateDisplayPreferencesOptions = {}
  ): Promise<DisplayPreferencesDto> {
    const current = await this.getDisplayPreferences(displayPreferencesId, options);
    const updated: DisplayPreferencesDto = {
      ...current,
      ViewType: viewType
    };

    await this.updateDisplayPreferences(displayPreferencesId, updated, options);
    return updated;
  }
}

