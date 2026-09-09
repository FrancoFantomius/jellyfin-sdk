import type { HttpTransport } from './http.js';
import type {
  BaseItemDto,
  TrickplayInfoDto,
  TrickplayStreamOptions,
  TrickplayManifestInfo,
  TrickplayManifestTile,
  ThumbnailLookupOptions,
  ThumbnailLookupResult
} from './types.js';
import { JellyfinError } from './errors.js';

export class TrickplayModule {
  private http: HttpTransport;

  constructor(http: HttpTransport) {
    this.http = http;
  }

  /**
   * Generates the HLS playlist URL for trickplay scrubbing image tiles.
   * E.g. /Videos/{itemId}/Trickplay/{width}/tiles.m3u8
   */
  getTilesHlsUrl(itemId: string, width: number, options: TrickplayStreamOptions = {}): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const { mediaSourceId, useQueryToken = true } = options;

    const url = new URL(`${serverUrl}/Videos/${itemId}/Trickplay/${width}/tiles.m3u8`);
    if (token && useQueryToken) {
      url.searchParams.append('api_key', token);
      url.searchParams.append('X-Emby-Token', token);
    }
    if (mediaSourceId) {
      url.searchParams.append('MediaSourceId', mediaSourceId);
    }

    return url.toString();
  }

  /**
   * Generates the URL for a specific trickplay thumbnail tile image sheet.
   * E.g. /Videos/{itemId}/Trickplay/{width}/{index}.jpg
   */
  getTileImageUrl(itemId: string, width: number, index: number, options: TrickplayStreamOptions = {}): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const { mediaSourceId, useQueryToken = true } = options;

    const url = new URL(`${serverUrl}/Videos/${itemId}/Trickplay/${width}/${index}.jpg`);
    if (token && useQueryToken) {
      url.searchParams.append('api_key', token);
      url.searchParams.append('X-Emby-Token', token);
    }
    if (mediaSourceId) {
      url.searchParams.append('MediaSourceId', mediaSourceId);
    }

    return url.toString();
  }

  /**
   * Fetches and parses the HLS trickplay manifest (tiles.m3u8) for the given item and resolution.
   */
  async getTrickplayManifest(
    itemId: string,
    width: number,
    options: { mediaSourceId?: string; useQueryToken?: boolean } = {}
  ): Promise<TrickplayManifestInfo> {
    const params: Record<string, unknown> = {};
    if (options.mediaSourceId) {
      params.MediaSourceId = options.mediaSourceId;
    }

    const endpoint = `/Videos/${itemId}/Trickplay/${width}/tiles.m3u8`;
    const rawM3u8 = await this.http.requestText(endpoint, { params });
    const tiles = this.parseTilesM3u8(itemId, width, rawM3u8, options.mediaSourceId, options.useQueryToken);

    return {
      width,
      rawM3u8,
      tiles
    };
  }

  /**
   * Helper to parse #EXTINF and tile file names from a tiles.m3u8 playlist.
   */
  private parseTilesM3u8(
    itemId: string,
    width: number,
    rawM3u8: string,
    mediaSourceId?: string,
    useQueryToken = true
  ): TrickplayManifestTile[] {
    const lines = rawM3u8.split(/\r?\n/);
    const tiles: TrickplayManifestTile[] = [];
    let currentDurationMs = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('#EXTINF:')) {
        const secondsStr = trimmed.substring(8).split(',')[0];
        const seconds = parseFloat(secondsStr);
        currentDurationMs = !isNaN(seconds) ? Math.round(seconds * 1000) : 0;
      } else if (!trimmed.startsWith('#')) {
        const indexMatch = trimmed.match(/^(\d+)\.(jpg|jpeg|png|webp)/i);
        const index = indexMatch ? parseInt(indexMatch[1], 10) : tiles.length;
        const url = this.getTileImageUrl(itemId, width, index, { mediaSourceId, useQueryToken });

        tiles.push({
          index,
          durationMs: currentDurationMs,
          url
        });
      }
    }

    return tiles;
  }

  /**
   * Extracts the available trickplay thumbnail widths from a BaseItemDto's Trickplay metadata.
   */
  getAvailableResolutions(item: BaseItemDto, mediaSourceId?: string): number[] {
    if (!item.Trickplay) {
      return [];
    }

    const targetMediaSourceId =
      mediaSourceId ||
      (item.MediaSources && item.MediaSources[0]?.Id) ||
      Object.keys(item.Trickplay)[0];

    if (!targetMediaSourceId || !item.Trickplay[targetMediaSourceId]) {
      return [];
    }

    const sourceTrickplay = item.Trickplay[targetMediaSourceId];
    return Object.keys(sourceTrickplay)
      .map((w) => parseInt(w, 10))
      .filter((w) => !isNaN(w))
      .sort((a, b) => a - b);
  }

  /**
   * Retrieves the TrickplayInfoDto metadata for a specified item and optional width.
   */
  getTrickplayInfo(
    item: BaseItemDto,
    width?: number,
    mediaSourceId?: string
  ): TrickplayInfoDto | null {
    if (!item.Trickplay) {
      return null;
    }

    const targetMediaSourceId =
      mediaSourceId ||
      (item.MediaSources && item.MediaSources[0]?.Id) ||
      Object.keys(item.Trickplay)[0];

    if (!targetMediaSourceId || !item.Trickplay[targetMediaSourceId]) {
      return null;
    }

    const sourceTrickplay = item.Trickplay[targetMediaSourceId];
    if (width !== undefined && sourceTrickplay[String(width)]) {
      return sourceTrickplay[String(width)];
    }

    // Default to the first available resolution
    const availableWidths = Object.keys(sourceTrickplay);
    if (availableWidths.length === 0) {
      return null;
    }

    return sourceTrickplay[availableWidths[0]];
  }

  /**
   * Calculates the exact tile sheet index, image URL, and sprite coordinates (x, y, width, height)
   * for a given playback timestamp to render scrubbing thumbnails in a player or seekbar UI.
   */
  getThumbnailForTimestamp(options: ThumbnailLookupOptions): ThumbnailLookupResult | null {
    const {
      item,
      timestampMs,
      timestampTicks,
      width,
      mediaSourceId,
      useQueryToken = true
    } = options;

    let info = options.trickplayInfo;
    if (!info && item) {
      info = this.getTrickplayInfo(item, width, mediaSourceId) || undefined;
    }

    if (!info) {
      return null;
    }

    const timeMs =
      timestampMs !== undefined
        ? timestampMs
        : timestampTicks !== undefined
          ? Math.round(timestampTicks / 10000)
          : 0;

    const interval = info.Interval > 0 ? info.Interval : 10000;
    let thumbIndex = Math.floor(Math.max(0, timeMs) / interval);

    if (info.ThumbnailCount > 0 && thumbIndex >= info.ThumbnailCount) {
      thumbIndex = info.ThumbnailCount - 1;
    }

    const tileCols = info.TileWidth > 0 ? info.TileWidth : 1;
    const tileRows = info.TileHeight > 0 ? info.TileHeight : 1;
    const thumbsPerSheet = tileCols * tileRows;

    const sheetIndex = Math.floor(thumbIndex / thumbsPerSheet);
    const indexInSheet = thumbIndex % thumbsPerSheet;

    const col = indexInSheet % tileCols;
    const row = Math.floor(indexInSheet / tileCols);

    const x = col * info.Width;
    const y = row * info.Height;

    const itemId = item?.Id || '';
    if (!itemId) {
      throw new JellyfinError('Item or itemId is required to generate the thumbnail URL.');
    }

    const imageUrl = this.getTileImageUrl(itemId, info.Width, sheetIndex, {
      mediaSourceId,
      useQueryToken
    });

    return {
      tileIndex: sheetIndex,
      imageUrl,
      x,
      y,
      width: info.Width,
      height: info.Height,
      thumbnailIndex: thumbIndex
    };
  }
}

