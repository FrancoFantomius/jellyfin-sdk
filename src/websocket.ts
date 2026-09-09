import type { HttpTransport } from './http.js';
import { JellyfinError } from './errors.js';
import type {
  WebSocketInboundMessage,
  WebSocketMessageType,
  WebSocketModuleOptions,
  LibraryChangedData,
  UserDataChangedData,
  SessionInfoDto
} from './types.js';

export type WebSocketEventListener = (...args: any[]) => void;

export class WebSocketModule {
  private http: HttpTransport;
  private getDeviceId: () => string;
  private ws: any = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<string, Set<WebSocketEventListener>>();
  private reconnectAttempts = 0;
  private explicitlyClosed = false;
  private options: WebSocketModuleOptions = {};

  constructor(http: HttpTransport, getDeviceId: () => string) {
    this.http = http;
    this.getDeviceId = getDeviceId;
  }

  /**
   * Check whether the WebSocket is currently open and connected.
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === 1; // 1 = OPEN
  }

  /**
   * Build the Jellyfin WebSocket URL from current serverUrl, accessToken, and deviceId.
   */
  getWebSocketUrl(): string {
    const serverUrl = this.http.getServerUrl();
    if (!serverUrl) {
      throw new JellyfinError('Server URL is required to connect to WebSocket.');
    }

    const token = this.http.getToken();
    if (!token) {
      throw new JellyfinError('Access token is required to connect to WebSocket. Please authenticate first.');
    }

    const deviceId = this.getDeviceId();
    const wsBaseUrl = serverUrl.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://').replace(/\/+$/, '');
    const url = new URL(`${wsBaseUrl}/socket`);
    url.searchParams.set('api_key', token);
    if (deviceId) {
      url.searchParams.set('deviceId', deviceId);
    }

    return url.toString();
  }

  /**
   * Connect to the Jellyfin WebSocket endpoint.
   */
  connect(options: WebSocketModuleOptions = {}): void {
    this.options = {
      autoReconnect: true,
      reconnectIntervalMs: 5000,
      maxReconnectAttempts: 10,
      keepAliveIntervalMs: 30000,
      ...options
    };

    this.explicitlyClosed = false;
    this.cleanup();

    const socketUrl = this.options.url || this.getWebSocketUrl();

    let SocketConstructor: any = this.options.webSocketFactory
      ? null
      : (typeof globalThis !== 'undefined' ? (globalThis as any).WebSocket : null);

    if (this.options.webSocketFactory) {
      this.ws = this.options.webSocketFactory(socketUrl);
    } else if (SocketConstructor) {
      this.ws = new SocketConstructor(socketUrl);
    } else {
      throw new JellyfinError('WebSocket constructor is not available in the current environment. Please supply webSocketFactory in options.');
    }

    this.setupSocketEvents();
  }

  /**
   * Disconnect the WebSocket and prevent automatic reconnection.
   */
  disconnect(): void {
    this.explicitlyClosed = true;
    this.cleanup();
  }

  /**
   * Send a raw string or JSON message through the open WebSocket.
   */
  send(message: string | Record<string, unknown>): void {
    if (!this.isConnected) {
      throw new JellyfinError('Cannot send message: WebSocket is not open.');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.ws.send(payload);
  }

  /**
   * Send a KeepAlive message to the Jellyfin server.
   */
  sendKeepAlive(): void {
    this.send({ MessageType: 'KeepAlive' });
  }

  /**
   * Subscribe to real-time session updates from the server.
   */
  startSessionsSubscription(intervalMs: number = 1500): void {
    this.send({
      MessageType: 'SessionsStart',
      Data: `0,${intervalMs}`
    });
  }

  /**
   * Stop receiving real-time session updates.
   */
  stopSessionsSubscription(): void {
    this.send({ MessageType: 'SessionsStop' });
  }

  /**
   * Subscribe to scheduled tasks updates from the server.
   */
  startScheduledTasksSubscription(intervalMs: number = 1500): void {
    this.send({
      MessageType: 'ScheduledTasksInfoStart',
      Data: `0,${intervalMs}`
    });
  }

  /**
   * Stop scheduled tasks updates.
   */
  stopScheduledTasksSubscription(): void {
    this.send({ MessageType: 'ScheduledTasksInfoStop' });
  }

  /**
   * Subscribe to server activity log updates.
   */
  startActivityLogSubscription(intervalMs: number = 1500): void {
    this.send({
      MessageType: 'ActivityLogEntryStart',
      Data: `0,${intervalMs}`
    });
  }

  /**
   * Stop server activity log updates.
   */
  stopActivityLogSubscription(): void {
    this.send({ MessageType: 'ActivityLogEntryStop' });
  }

  // --- Event Handling ---

  on(event: 'open', listener: () => void): () => void;
  on(event: 'close', listener: (code?: number, reason?: string) => void): () => void;
  on(event: 'error', listener: (error: unknown) => void): () => void;
  on(event: 'message', listener: (msg: WebSocketInboundMessage) => void): () => void;
  on(event: 'libraryChanged', listener: (data: LibraryChangedData) => void): () => void;
  on(event: 'userDataChanged', listener: (data: UserDataChangedData) => void): () => void;
  on(event: 'sessions', listener: (data: SessionInfoDto[]) => void): () => void;
  on(event: string, listener: WebSocketEventListener): () => void;
  on(event: string, listener: WebSocketEventListener): () => void {
    const key = event.toLowerCase();
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => this.off(key, listener);
  }

  off(event: string, listener: WebSocketEventListener): void {
    const key = event.toLowerCase();
    const set = this.listeners.get(key);
    if (set) {
      set.delete(listener);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const key = event.toLowerCase();
    const set = this.listeners.get(key);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(...args);
        } catch (e) {
          console.error(`[Jellyfin SDK] WebSocket listener error on '${event}':`, e);
        }
      });
    }
  }

  // --- Internal Socket Helpers ---

  private setupSocketEvents(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startKeepAlive();
      this.emit('open');
    };

    this.ws.onclose = (ev?: { code?: number; reason?: string }) => {
      this.stopKeepAlive();
      this.emit('close', ev?.code, ev?.reason);
      if (!this.explicitlyClosed && this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err: unknown) => {
      this.emit('error', err);
    };

    this.ws.onmessage = (event: { data: unknown }) => {
      try {
        const text = typeof event.data === 'string' ? event.data : String(event.data);
        const parsed: WebSocketInboundMessage = JSON.parse(text);

        this.emit('message', parsed);

        if (parsed.MessageType) {
          // Emit specific event by MessageType (e.g. 'libraryChanged', 'sessions')
          this.emit(parsed.MessageType, parsed.Data);

          // Handle KeepAlive / ForceKeepAlive from server by sending KeepAlive back
          if (parsed.MessageType === 'ForceKeepAlive') {
            this.sendKeepAlive();
          }
        }
      } catch (e) {
        // Non-JSON message received
        this.emit('rawMessage', event.data);
      }
    };
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    const interval = this.options.keepAliveIntervalMs || 30000;
    if (interval > 0) {
      this.keepAliveTimer = setInterval(() => {
        if (this.isConnected) {
          try {
            this.sendKeepAlive();
          } catch {
            // Ignore keep-alive send errors
          }
        }
      }, interval);
    }
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private scheduleReconnect(): void {
    const maxAttempts = this.options.maxReconnectAttempts ?? 10;
    if (this.reconnectAttempts >= maxAttempts) {
      return;
    }

    const interval = this.options.reconnectIntervalMs ?? 5000;
    const backoffDelay = Math.min(interval * Math.pow(1.5, this.reconnectAttempts), 60000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (!this.explicitlyClosed) {
        try {
          this.connect(this.options);
        } catch (e) {
          this.emit('error', e);
        }
      }
    }, backoffDelay);
  }

  private cleanup(): void {
    this.stopKeepAlive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        if (this.ws.readyState === 0 || this.ws.readyState === 1) {
          this.ws.close();
        }
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
  }
}

