import type { HttpTransport } from './http.js';
import type {
  ArtworkUrlOptions,
  AudioHlsStreamOptions,
  AudioStreamOptions,
  BaseItemDto,
  DownloadUrlOptions,
  MediaSourceInfo,
  MediaStreamInfo,
  SubtitleTrackInfo,
  SubtitleUrlOptions,
  VideoHlsStreamOptions,
  VideoStreamOptions
} from './types.js';
import { resolveAudioQuality, resolveVideoQuality } from './quality.js';

export class MediaModule {
  private http: HttpTransport;
  private getUserId: () => string;

  constructor(http: HttpTransport, getUserId: () => string) {
    this.http = http;
    this.getUserId = getUserId;
  }

  /**
   * Constructs the URL for an item's image/artwork.
   * If the item lacks images or server is not set, returns options.fallbackUrl or null.
   */
  getArtworkUrl(itemOrId: BaseItemDto | string | null | undefined, options: ArtworkUrlOptions = {}): string | null {
    const serverUrl = this.http.getServerUrl();
    const {
      imageType = 'Primary',
      maxWidth = 400,
      maxHeight,
      quality = 90,
      fallbackUrl = null
    } = options;

    if (!serverUrl || !itemOrId) return fallbackUrl;

    if (typeof itemOrId === 'object') {
      const item = itemOrId;
      let targetId: string | null = null;
      let tag: string | null = null;

      if (item.ImageTags && item.ImageTags[imageType]) {
        targetId = item.Id;
        tag = item.ImageTags[imageType];
      } else if (imageType === 'Primary' && item.PrimaryImageTag) {
        targetId = item.Id;
        tag = item.PrimaryImageTag;
      } else if (imageType === 'Primary' && item.AlbumPrimaryImageTag && item.AlbumId) {
        targetId = item.AlbumId;
        tag = item.AlbumPrimaryImageTag;
      }

      if (!targetId || !tag) {
        return fallbackUrl;
      }

      const params = new URLSearchParams({
        maxWidth: String(maxWidth),
        quality: String(quality),
        tag
      });
      if (maxHeight) params.append('maxHeight', String(maxHeight));

      return `${serverUrl}/Items/${targetId}/Images/${imageType}?${params.toString()}`;
    }

    if (typeof itemOrId === 'string' && itemOrId.trim() !== '') {
      const params = new URLSearchParams({
        maxWidth: String(maxWidth),
        quality: String(quality)
      });
      if (maxHeight) params.append('maxHeight', String(maxHeight));

      return `${serverUrl}/Items/${itemOrId}/Images/${imageType}?${params.toString()}`;
    }

    return fallbackUrl;
  }

  /**
   * Constructs the audio stream URL using Jellyfin's universal audio endpoint.
   * Transparently negotiates codecs (direct play or transcode to MP3/AAC as needed).
   */
  getAudioStreamUrl(itemId: string, options: AudioStreamOptions = {}): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const userId = this.getUserId();
    const clientInfo = this.http.getClientInfo();

    if (!serverUrl || !itemId) return '';

    const qualityResolved = resolveAudioQuality(options.quality);
    const maxStreamingBitrate = options.maxStreamingBitrate ?? qualityResolved.maxStreamingBitrate;

    const {
      startTimeTicks = 0,
      container = 'opus,mp3|mp3,aac,m4a,m4b,flac,wav,ogg',
      transcodingContainer = 'mp3',
      audioCodec = 'mp3',
      useQueryToken = true
    } = options;

    const url = new URL(`${serverUrl}/Audio/${itemId}/universal`);
    if (token && useQueryToken) url.searchParams.append('api_key', token);
    if (userId) url.searchParams.append('UserId', userId);
    if (clientInfo.deviceId) url.searchParams.append('DeviceId', clientInfo.deviceId);

    url.searchParams.append('Container', container);
    url.searchParams.append('TranscodingContainer', transcodingContainer);
    url.searchParams.append('TranscodingProtocol', 'http');
    url.searchParams.append('AudioCodec', audioCodec);

    if (maxStreamingBitrate && maxStreamingBitrate !== 'Direct') {
      url.searchParams.append('MaxStreamingBitrate', String(maxStreamingBitrate));
    }
    if (startTimeTicks > 0) {
      url.searchParams.append('StartTimeTicks', String(startTimeTicks));
    }

    url.searchParams.append('EnableRedirection', 'true');
    url.searchParams.append('EnableRemoteMedia', 'false');

    return url.toString();
  }

  /**
   * Constructs the HLS master playlist URL for an audio stream.
   */
  getAudioHlsStreamUrl(itemId: string, options: AudioHlsStreamOptions = {}): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const userId = this.getUserId();
    const clientInfo = this.http.getClientInfo();

    if (!serverUrl || !itemId) return '';

    const qualityResolved = resolveAudioQuality(options.quality);
    const maxStreamingBitrate = options.maxStreamingBitrate ?? qualityResolved.maxStreamingBitrate;

    const {
      startTimeTicks = 0,
      audioCodec = 'aac,mp3',
      segmentLength = 3,
      useQueryToken = true
    } = options;

    const url = new URL(`${serverUrl}/Audio/${itemId}/master.m3u8`);
    if (token && useQueryToken) url.searchParams.append('api_key', token);
    if (userId) url.searchParams.append('UserId', userId);
    if (clientInfo.deviceId) url.searchParams.append('DeviceId', clientInfo.deviceId);

    url.searchParams.append('MediaSourceId', itemId);
    url.searchParams.append('AudioCodec', audioCodec);
    url.searchParams.append('TranscodingContainer', 'ts');
    url.searchParams.append('TranscodingProtocol', 'hls');
    url.searchParams.append('SegmentLength', String(segmentLength));
    url.searchParams.append('MinSegments', '2');

    if (maxStreamingBitrate && maxStreamingBitrate !== 'Direct') {
      url.searchParams.append('MaxStreamingBitrate', String(maxStreamingBitrate));
    }
    if (startTimeTicks > 0) {
      url.searchParams.append('StartTimeTicks', String(startTimeTicks));
    }

    return url.toString();
  }

  /**
   * Constructs the progressive/universal video stream URL.
   * Supports direct play (static=true) or on-the-fly transcoding with quality, audio, and subtitle options.
   */
  getVideoStreamUrl(itemId: string, options: VideoStreamOptions = {}): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const userId = this.getUserId();
    const clientInfo = this.http.getClientInfo();

    if (!serverUrl || !itemId) return '';

    const qualityResolved = resolveVideoQuality(options.quality);
    const maxStreamingBitrate = options.maxStreamingBitrate ?? qualityResolved.maxStreamingBitrate;
    const maxWidth = options.maxWidth ?? qualityResolved.maxWidth;
    const maxHeight = options.maxHeight ?? qualityResolved.maxHeight;

    const {
      mediaSourceId = itemId,
      static: isStatic = false,
      videoCodec = 'h264,hevc,vp9,av1',
      audioCodec = 'aac,mp3,opus,flac',
      maxFramerate,
      audioStreamIndex,
      subtitleStreamIndex,
      subtitleMethod,
      startTimeTicks = 0,
      container,
      transcodingContainer = 'ts',
      transcodingProtocol = 'http',
      useQueryToken = true
    } = options;

    const endpoint = container && !container.includes(',')
      ? `/Videos/${itemId}/stream.${container}`
      : `/Videos/${itemId}/stream`;

    const url = new URL(`${serverUrl}${endpoint}`);
    if (token && useQueryToken) url.searchParams.append('api_key', token);
    if (userId) url.searchParams.append('UserId', userId);
    if (clientInfo.deviceId) url.searchParams.append('DeviceId', clientInfo.deviceId);
    if (mediaSourceId) url.searchParams.append('MediaSourceId', mediaSourceId);

    if (isStatic) {
      url.searchParams.append('Static', 'true');
    } else {
      url.searchParams.append('VideoCodec', videoCodec);
      url.searchParams.append('AudioCodec', audioCodec);
      url.searchParams.append('TranscodingContainer', transcodingContainer);
      url.searchParams.append('TranscodingProtocol', transcodingProtocol);

      if (maxStreamingBitrate && maxStreamingBitrate !== 'Direct') {
        url.searchParams.append('MaxStreamingBitrate', String(maxStreamingBitrate));
      }
      if (maxWidth) url.searchParams.append('MaxWidth', String(maxWidth));
      if (maxHeight) url.searchParams.append('MaxHeight', String(maxHeight));
      if (maxFramerate) url.searchParams.append('MaxFramerate', String(maxFramerate));
    }

    if (audioStreamIndex !== undefined && audioStreamIndex !== null) {
      url.searchParams.append('AudioStreamIndex', String(audioStreamIndex));
    }
    if (subtitleStreamIndex !== undefined && subtitleStreamIndex !== null) {
      url.searchParams.append('SubtitleStreamIndex', String(subtitleStreamIndex));
      if (subtitleMethod) url.searchParams.append('SubtitleMethod', subtitleMethod);
    }
    if (startTimeTicks > 0) {
      url.searchParams.append('StartTimeTicks', String(startTimeTicks));
    }

    url.searchParams.append('EnableRedirection', 'true');
    url.searchParams.append('EnableRemoteMedia', 'false');

    return url.toString();
  }

  /**
   * Constructs the HLS master playlist URL for an adaptive video stream.
   */
  getVideoHlsStreamUrl(itemId: string, options: VideoHlsStreamOptions = {}): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const userId = this.getUserId();
    const clientInfo = this.http.getClientInfo();

    if (!serverUrl || !itemId) return '';

    const qualityResolved = resolveVideoQuality(options.quality);
    const maxStreamingBitrate = options.maxStreamingBitrate ?? qualityResolved.maxStreamingBitrate;
    const maxWidth = options.maxWidth ?? qualityResolved.maxWidth;
    const maxHeight = options.maxHeight ?? qualityResolved.maxHeight;

    const {
      mediaSourceId = itemId,
      videoCodec = 'h264,hevc,vp9,av1',
      audioCodec = 'aac,mp3,opus',
      maxFramerate,
      segmentLength = 3,
      minSegments = 2,
      audioStreamIndex,
      subtitleStreamIndex,
      subtitleMethod,
      transcodingContainer = 'ts',
      transcodingProtocol = 'hls',
      startTimeTicks = 0,
      useQueryToken = true
    } = options;

    const url = new URL(`${serverUrl}/Videos/${itemId}/master.m3u8`);
    if (token && useQueryToken) url.searchParams.append('api_key', token);
    if (userId) url.searchParams.append('UserId', userId);
    if (clientInfo.deviceId) url.searchParams.append('DeviceId', clientInfo.deviceId);
    if (mediaSourceId) url.searchParams.append('MediaSourceId', mediaSourceId);

    url.searchParams.append('VideoCodec', videoCodec);
    url.searchParams.append('AudioCodec', audioCodec);
    url.searchParams.append('TranscodingContainer', transcodingContainer);
    url.searchParams.append('TranscodingProtocol', transcodingProtocol);
    url.searchParams.append('SegmentLength', String(segmentLength));
    url.searchParams.append('MinSegments', String(minSegments));

    if (maxStreamingBitrate && maxStreamingBitrate !== 'Direct') {
      url.searchParams.append('MaxStreamingBitrate', String(maxStreamingBitrate));
    }
    if (maxWidth) url.searchParams.append('MaxWidth', String(maxWidth));
    if (maxHeight) url.searchParams.append('MaxHeight', String(maxHeight));
    if (maxFramerate) url.searchParams.append('MaxFramerate', String(maxFramerate));

    if (audioStreamIndex !== undefined && audioStreamIndex !== null) {
      url.searchParams.append('AudioStreamIndex', String(audioStreamIndex));
    }
    if (subtitleStreamIndex !== undefined && subtitleStreamIndex !== null) {
      url.searchParams.append('SubtitleStreamIndex', String(subtitleStreamIndex));
      if (subtitleMethod) url.searchParams.append('SubtitleMethod', subtitleMethod);
    }
    if (startTimeTicks > 0) {
      url.searchParams.append('StartTimeTicks', String(startTimeTicks));
    }

    return url.toString();
  }

  /**
   * Constructs the URL for streaming a specific subtitle track.
   */
  getSubtitleUrl(
    itemId: string,
    mediaSourceId: string,
    subtitleStreamIndex: number,
    options: SubtitleUrlOptions = {}
  ): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const { format = 'vtt', useQueryToken = true, startTimeTicks = 0 } = options;

    if (!serverUrl || !itemId) return '';

    const sourceId = mediaSourceId || itemId;
    const url = new URL(`${serverUrl}/Videos/${itemId}/${sourceId}/Subtitles/${subtitleStreamIndex}/Stream.${format}`);
    if (token && useQueryToken) {
      url.searchParams.append('api_key', token);
    }
    if (startTimeTicks > 0) {
      url.searchParams.append('StartTimeTicks', String(startTimeTicks));
    }

    return url.toString();
  }

  /**
   * Fetches subtitle content as raw text (e.g. WebVTT or SRT format).
   */
  async getSubtitles(
    itemId: string,
    mediaSourceId: string,
    subtitleStreamIndex: number,
    options: SubtitleUrlOptions = {}
  ): Promise<string> {
    const { format = 'vtt', startTimeTicks = 0 } = options;
    const sourceId = mediaSourceId || itemId;
    const params: Record<string, unknown> = {};
    if (startTimeTicks > 0) {
      params.StartTimeTicks = startTimeTicks;
    }

    return await this.http.requestText(
      `/Videos/${itemId}/${sourceId}/Subtitles/${subtitleStreamIndex}/Stream.${format}`,
      { params }
    );
  }

  /**
   * Extracts and normalizes subtitle streams from an item or media source into SubtitleTrackInfo objects with URLs.
   */
  getSubtitleTracks(itemOrMediaSource: BaseItemDto | MediaSourceInfo): SubtitleTrackInfo[] {
    if (!itemOrMediaSource) return [];

    let streams: MediaStreamInfo[] = [];
    let itemId = '';
    let mediaSourceId = '';

    if ('MediaSources' in itemOrMediaSource && Array.isArray(itemOrMediaSource.MediaSources)) {
      itemId = itemOrMediaSource.Id;
      const primarySource = itemOrMediaSource.MediaSources[0];
      if (primarySource) {
        mediaSourceId = primarySource.Id || itemId;
        streams = primarySource.MediaStreams || [];
      }
    } else if ('MediaStreams' in itemOrMediaSource && Array.isArray(itemOrMediaSource.MediaStreams)) {
      const source = itemOrMediaSource as MediaSourceInfo;
      mediaSourceId = source.Id || '';
      itemId = mediaSourceId;
      streams = source.MediaStreams || [];
    }

    return streams
      .filter((s) => s.Type === 'Subtitle')
      .map((s) => {
        const index = s.Index ?? 0;
        const codec = (s.Codec || 'vtt').toLowerCase();
        const preferredFormat = codec === 'subrip' || codec === 'srt' ? 'srt' : 'vtt';
        const url = itemId ? this.getSubtitleUrl(itemId, mediaSourceId, index, { format: preferredFormat }) : '';

        return {
          index,
          codec: s.Codec || 'vtt',
          language: s.Language,
          displayTitle: s.DisplayTitle || s.Language || `Subtitle ${index}`,
          displayLanguage: s.DisplayLanguage,
          isDefault: !!s.IsDefault,
          isForced: !!s.IsForced,
          isExternal: !!s.IsExternal,
          deliveryMethod: s.DeliveryMethod,
          deliveryUrl: s.DeliveryUrl,
          url
        };
      });
  }

  /**
   * Constructs the direct download URL for an original, unmodified media file on the Jellyfin server.
   */
  getDownloadUrl(itemId: string, options: DownloadUrlOptions = {}): string {
    const serverUrl = this.http.getServerUrl();
    const token = this.http.getToken();
    const { useQueryToken = true, filename } = options;

    if (!serverUrl || !itemId) return '';

    const url = new URL(`${serverUrl}/Items/${itemId}/Download`);
    if (token && useQueryToken) {
      url.searchParams.append('api_key', token);
    }
    if (filename) {
      url.searchParams.append('filename', filename);
    }

    return url.toString();
  }

  /**
   * Downloads a media file as a Blob with optional progress monitoring.
   */
  async downloadFile(
    itemId: string,
    options: {
      onProgress?: (progressFraction: number) => void;
      useQueryToken?: boolean;
    } = {}
  ): Promise<Blob> {
    const downloadUrl = this.getDownloadUrl(itemId, { useQueryToken: options.useQueryToken });
    if (!downloadUrl) {
      throw new Error('Cannot construct download URL: missing serverUrl or itemId');
    }

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}: ${response.statusText}`);
    }

    const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10) || 0;
    const reader = response.body ? response.body.getReader() : null;

    if (reader && contentLength > 0) {
      const chunks: BlobPart[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (options.onProgress) {
            options.onProgress(received / contentLength);
          }
        }
      }
      return new Blob(chunks, { type: response.headers.get('Content-Type') || 'application/octet-stream' });
    }

    const blob = await response.blob();
    if (options.onProgress) {
      options.onProgress(1);
    }
    return blob;
  }

  /**
   * Returns authentication headers for media streaming requests (e.g., configuring hls.js xhrSetup).
   * Crucial for Jellyfin 12+ servers where query-based auth (?api_key=) is disabled.
   */
  getStreamHeaders(): Record<string, string> {
    const authHeader = this.http.getAuthHeader();
    return {
      Authorization: authHeader,
      'X-Emby-Authorization': authHeader
    };
  }
}
