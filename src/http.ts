import { JellyfinApiError, JellyfinAuthError, JellyfinError } from './errors.js';
import type { ClientInfo } from './types.js';

export interface RequestOptions {
  method?: string;
  params?: Record<string, unknown>;
  body?: unknown;
  contentType?: string;
  headers?: Record<string, string>;
}

export function cleanUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

export function buildAuthHeader(clientInfo: ClientInfo, token?: string): string {
  const tokenPart = token ? `, Token="${token}"` : '';
  return `MediaBrowser Client="${clientInfo.name}", Device="${clientInfo.device}", DeviceId="${clientInfo.deviceId}", Version="${clientInfo.version}"${tokenPart}`;
}

export class HttpTransport {
  private serverUrl: string = '';
  private token: string = '';
  private clientInfo: ClientInfo;
  private fetchFn: typeof fetch;
  private onUnauthorized?: () => void;

  constructor(options: {
    serverUrl?: string;
    token?: string;
    clientInfo: ClientInfo;
    fetch?: typeof fetch;
    onUnauthorized?: () => void;
  }) {
    this.serverUrl = options.serverUrl ? cleanUrl(options.serverUrl) : '';
    this.token = options.token || '';
    this.clientInfo = options.clientInfo;
    this.fetchFn = options.fetch || (globalThis.fetch ? globalThis.fetch.bind(globalThis) : fetch);
    this.onUnauthorized = options.onUnauthorized;
  }

  setServerUrl(url: string): void {
    this.serverUrl = cleanUrl(url);
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string {
    return this.token;
  }

  setClientInfo(info: Partial<ClientInfo>): void {
    this.clientInfo = { ...this.clientInfo, ...info };
  }

  getClientInfo(): ClientInfo {
    return this.clientInfo;
  }

  setOnUnauthorized(handler?: () => void): void {
    this.onUnauthorized = handler;
  }

  getAuthHeader(): string {
    return buildAuthHeader(this.clientInfo, this.token);
  }

  async requestRaw(endpoint: string, options: RequestOptions = {}): Promise<Response> {
    if (!this.serverUrl) {
      throw new JellyfinError('Jellyfin server URL is not configured.');
    }

    const { method = 'GET', params = {}, body = null, contentType, headers: customHeaders = {} } = options;

    const url = new URL(`${this.serverUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const authHeader = this.getAuthHeader();
    const headers: Record<string, string> = {
      'X-Emby-Authorization': authHeader,
      'Authorization': authHeader,
      ...customHeaders
    };

    let serializedBody: string | undefined;
    if (contentType) {
      headers['Content-Type'] = contentType;
      serializedBody = typeof body === 'string' ? body : JSON.stringify(body);
    } else if (body !== null && body !== undefined) {
      if (typeof body === 'string') {
        headers['Content-Type'] = 'application/json';
        serializedBody = body;
      } else {
        headers['Content-Type'] = 'application/json';
        serializedBody = JSON.stringify(body);
      }
    }

    let response: Response;
    try {
      response = await this.fetchFn(url.toString(), {
        method,
        headers,
        body: serializedBody
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new JellyfinError(`Network request failed (${endpoint}): ${errorMsg}`);
    }

    if (response.status === 401 || response.status === 403) {
      if (response.status === 401 && this.onUnauthorized) {
        try {
          this.onUnauthorized();
        } catch {
          // ignore callback exceptions
        }
      }
      throw new JellyfinAuthError(`Unauthorized (HTTP ${response.status}) on ${endpoint}`, response.status, endpoint);
    }

    if (!response.ok) {
      let details = '';
      try {
        const text = await response.text();
        if (text) {
          details = `: ${text.slice(0, 500)}`;
        }
      } catch {
        // ignore
      }
      throw new JellyfinApiError(`Jellyfin API request failed (${endpoint}): ${response.statusText || response.status}${details}`, response.status, endpoint);
    }

    return response;
  }

  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.requestRaw(endpoint, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });

    const contentTypeHeader = response.headers.get('Content-Type') || '';
    if (contentTypeHeader.includes('application/json')) {
      return (await response.json()) as T;
    }

    return null as unknown as T;
  }

  async requestText(endpoint: string, options: RequestOptions = {}): Promise<string> {
    const response = await this.requestRaw(endpoint, {
      ...options,
      headers: {
        Accept: 'text/vtt, text/plain, */*',
        ...(options.headers || {})
      }
    });
    return await response.text();
  }

  async requestBlob(endpoint: string, options: RequestOptions = {}): Promise<Blob> {
    const response = await this.requestRaw(endpoint, options);
    return await response.blob();
  }
}

