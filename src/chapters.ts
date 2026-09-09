import type { HttpTransport } from './http.js';
import type {
  BaseItemDto,
  ChapterInfoDto,
  ChapterImageOptions,
  MediaSegmentDto,
  GetMediaSegmentsOptions,
  IntroCreditsMarkers,
  ItemsResponse
} from './types.js';

export class ChaptersModule {
  private http: HttpTransport;
  private getUserId?: () => string;

  constructor(http: HttpTransport, getUserId?: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  /**
   * Synchronously extracts chapter markers from an already fetched BaseItemDto.
   */
  extractChapters(item: BaseItemDto): ChapterInfoDto[] {
    return item.Chapters || [];
  }

  /**
   * Fetches the chapter markers for an item from the server.
   */
  async getChapters(itemId: string): Promise<ChapterInfoDto[]> {
    const userId = this.getUserId ? this.getUserId() : '';
    const endpoint = userId ? `/Users/${userId}/Items/${itemId}` : `/Items/${itemId}`;

    const item = await this.http.request<BaseItemDto>(endpoint, {
      params: {
        Fields: 'Chapters'
      }
    });

    return item.Chapters || [];
  }

  /**
   * Generates the URL for a chapter preview thumbnail image.
   * E.g. /Items/{itemId}/Images/Chapter/{chapterIndex}
   */
  getChapterImageUrl(
    itemId: string,
    chapterIndex: number,
    options: ChapterImageOptions = {}
  ): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const {
      maxWidth,
      maxHeight,
      width,
      height,
      quality,
      format,
      tag,
      fillWidth,
      fillHeight,
      useQueryToken = true
    } = options;

    const url = new URL(`${serverUrl}/Items/${itemId}/Images/Chapter/${chapterIndex}`);

    if (token && useQueryToken) {
      url.searchParams.append('api_key', token);
      url.searchParams.append('X-Emby-Token', token);
    }
    if (tag) url.searchParams.append('tag', tag);
    if (maxWidth) url.searchParams.append('maxWidth', String(maxWidth));
    if (maxHeight) url.searchParams.append('maxHeight', String(maxHeight));
    if (width) url.searchParams.append('width', String(width));
    if (height) url.searchParams.append('height', String(height));
    if (quality) url.searchParams.append('quality', String(quality));
    if (format) url.searchParams.append('format', format);
    if (fillWidth) url.searchParams.append('fillWidth', String(fillWidth));
    if (fillHeight) url.searchParams.append('fillHeight', String(fillHeight));

    return url.toString();
  }

  /**
   * Retrieves media segments (Intro, Outro, Recap, Commercials) for an item via Jellyfin 10.10+ /MediaSegments.
   */
  async getMediaSegments(
    itemId: string,
    options: GetMediaSegmentsOptions = {}
  ): Promise<MediaSegmentDto[]> {
    const params: Record<string, unknown> = {
      itemId
    };

    if (options.includeSegmentTypes && options.includeSegmentTypes.length > 0) {
      params.includeSegmentTypes = options.includeSegmentTypes.join(',');
    }

    try {
      const res = await this.http.request<MediaSegmentDto[] | ItemsResponse<MediaSegmentDto>>(
        '/MediaSegments',
        { params }
      );

      if (Array.isArray(res)) {
        return res;
      }
      if (res && Array.isArray((res as ItemsResponse<MediaSegmentDto>).Items)) {
        return (res as ItemsResponse<MediaSegmentDto>).Items;
      }
      return [];
    } catch {
      // If server does not support /MediaSegments (pre-10.10), return empty list
      return [];
    }
  }

  /**
   * Resolves intro and end credits markers for an item, combining /MediaSegments API
   * and chapter marker heuristics (MarkerType or naming like 'Intro', 'Opening', 'Credits', 'Ending').
   */
  async getIntroCredits(
    itemOrChaptersOrId: BaseItemDto | ChapterInfoDto[] | string,
    mediaSegments?: MediaSegmentDto[]
  ): Promise<IntroCreditsMarkers> {
    let itemId = '';
    let chapters: ChapterInfoDto[] = [];
    let segments: MediaSegmentDto[] = mediaSegments || [];

    if (typeof itemOrChaptersOrId === 'string') {
      itemId = itemOrChaptersOrId;
      if (segments.length === 0) {
        segments = await this.getMediaSegments(itemId);
      }
      if (segments.length === 0) {
        chapters = await this.getChapters(itemId);
      }
    } else if (Array.isArray(itemOrChaptersOrId)) {
      chapters = itemOrChaptersOrId;
    } else if (typeof itemOrChaptersOrId === 'object' && itemOrChaptersOrId !== null) {
      itemId = itemOrChaptersOrId.Id;
      chapters = itemOrChaptersOrId.Chapters || [];
      if (segments.length === 0 && itemId) {
        segments = await this.getMediaSegments(itemId);
      }
    }

    const markers: IntroCreditsMarkers = {
      segments
    };

    // 1. Process from MediaSegments if available
    for (const seg of segments) {
      const type = String(seg.Type).toLowerCase();
      if (type === 'intro' && !markers.intro) {
        markers.intro = {
          startTicks: seg.StartTicks,
          endTicks: seg.EndTicks,
          startMs: Math.round(seg.StartTicks / 10000),
          endMs: Math.round(seg.EndTicks / 10000)
        };
      } else if ((type === 'outro' || type === 'credits') && !markers.credits) {
        markers.credits = {
          startTicks: seg.StartTicks,
          endTicks: seg.EndTicks,
          startMs: Math.round(seg.StartTicks / 10000),
          endMs: Math.round(seg.EndTicks / 10000)
        };
      }
    }

    // 2. Fallback to Chapter markers if intro or credits are missing
    if ((!markers.intro || !markers.credits) && chapters.length > 0) {
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const nextChapter = chapters[i + 1];
        const name = (chapter.Name || '').trim();
        const markerType = (chapter.MarkerType || '').toLowerCase();

        // Check for Intro
        if (!markers.intro) {
          if (
            markerType === 'introstart' ||
            /^(intro|opening|theme\s*song)/i.test(name)
          ) {
            const startTicks = chapter.StartPositionTicks;
            const endTicks = nextChapter
              ? nextChapter.StartPositionTicks
              : startTicks + 90 * 10000000; // Default ~90s if no next chapter

            markers.intro = {
              startTicks,
              endTicks,
              startMs: Math.round(startTicks / 10000),
              endMs: Math.round(endTicks / 10000)
            };
          }
        }

        // Check for Credits
        if (!markers.credits) {
          if (
            markerType === 'creditsstart' ||
            /^(credits|outro|ending|end\s*credits)/i.test(name)
          ) {
            const startTicks = chapter.StartPositionTicks;
            const endTicks = nextChapter
              ? nextChapter.StartPositionTicks
              : startTicks + 180 * 10000000;

            markers.credits = {
              startTicks,
              endTicks,
              startMs: Math.round(startTicks / 10000),
              endMs: Math.round(endTicks / 10000)
            };
          }
        }
      }
    }

    return markers;
  }

  /**
   * Checks whether the current playback position falls within an intro or credits range.
   */
  findCurrentSegment(
    positionTicks: number,
    markersOrSegments: IntroCreditsMarkers | MediaSegmentDto[]
  ): { type: string; startTicks: number; endTicks: number } | null {
    if (Array.isArray(markersOrSegments)) {
      for (const seg of markersOrSegments) {
        if (positionTicks >= seg.StartTicks && positionTicks < seg.EndTicks) {
          return {
            type: seg.Type,
            startTicks: seg.StartTicks,
            endTicks: seg.EndTicks
          };
        }
      }
      return null;
    }

    const { intro, credits } = markersOrSegments;

    if (intro && positionTicks >= intro.startTicks && positionTicks < intro.endTicks) {
      return {
        type: 'Intro',
        startTicks: intro.startTicks,
        endTicks: intro.endTicks
      };
    }

    if (credits && positionTicks >= credits.startTicks && positionTicks < credits.endTicks) {
      return {
        type: 'Credits',
        startTicks: credits.startTicks,
        endTicks: credits.endTicks
      };
    }

    return null;
  }

  /**
   * Returns the timestamp ticks to skip to if the current position is within a skippable segment,
   * or null if not currently within any skippable range.
   */
  getSkipPosition(
    positionTicks: number,
    markersOrSegments: IntroCreditsMarkers | MediaSegmentDto[]
  ): number | null {
    const current = this.findCurrentSegment(positionTicks, markersOrSegments);
    return current ? current.endTicks : null;
  }
}

