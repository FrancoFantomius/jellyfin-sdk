import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JellyfinClient } from '../src/client.js';

class MockWebSocket {
  public url: string;
  public readyState: number = 0; // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
  public sentMessages: string[] = [];

  public onopen: (() => void) | null = null;
  public onclose: ((ev?: { code?: number; reason?: string }) => void) | null = null;
  public onerror: ((err: unknown) => void) | null = null;
  public onmessage: ((ev: { data: unknown }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = 3;
    if (this.onclose) this.onclose({ code, reason });
  }

  // Helper for test simulation
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: typeof data === 'string' ? data : JSON.stringify(data) });
    }
  }
}

describe('WebSocketModule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate correct WebSocket URL with ws:// and wss://', () => {
    const clientHttp = new JellyfinClient({
      serverUrl: 'http://jellyfin.local:8096',
      accessToken: 'token-abc',
      clientInfo: { deviceId: 'dev-123' }
    });
    expect(clientHttp.websocket.getWebSocketUrl()).toBe(
      'ws://jellyfin.local:8096/socket?api_key=token-abc&deviceId=dev-123'
    );

    const clientHttps = new JellyfinClient({
      serverUrl: 'https://jellyfin.local:8920/',
      accessToken: 'token-xyz',
      clientInfo: { deviceId: 'dev-456' }
    });
    expect(clientHttps.websocket.getWebSocketUrl()).toBe(
      'wss://jellyfin.local:8920/socket?api_key=token-xyz&deviceId=dev-456'
    );
  });

  it('should throw if serverUrl or accessToken is missing', () => {
    const clientNoUrl = new JellyfinClient({ accessToken: 'token-123' });
    expect(() => clientNoUrl.websocket.getWebSocketUrl()).toThrow(/Server URL is required/);

    const clientNoToken = new JellyfinClient({ serverUrl: 'https://jellyfin.local' });
    expect(() => clientNoToken.websocket.getWebSocketUrl()).toThrow(/Access token is required/);
  });

  it('should connect using webSocketFactory, emit open, and send keep-alive', () => {
    let mockWsInstance: MockWebSocket | null = null;
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.local',
      accessToken: 'token-ws',
      clientInfo: { deviceId: 'dev-ws' }
    });

    const onOpen = vi.fn();
    client.websocket.on('open', onOpen);

    client.websocket.connect({
      keepAliveIntervalMs: 15000,
      webSocketFactory: (url) => {
        mockWsInstance = new MockWebSocket(url);
        return mockWsInstance;
      }
    });

    expect(mockWsInstance).not.toBeNull();
    expect(mockWsInstance!.url).toContain('wss://jellyfin.local/socket');

    // Fast-forward timers to trigger socket open
    vi.advanceTimersByTime(20);
    expect(client.websocket.isConnected).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);

    // Fast forward 15 seconds to check keep-alive heartbeat
    vi.advanceTimersByTime(15000);
    expect(mockWsInstance!.sentMessages).toContain(JSON.stringify({ MessageType: 'KeepAlive' }));
  });

  it('should dispatch inbound messages and specific events', () => {
    let mockWsInstance: MockWebSocket | null = null;
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.local',
      accessToken: 'token-ws',
      clientInfo: { deviceId: 'dev-ws' }
    });

    const onMessage = vi.fn();
    const onLibraryChanged = vi.fn();
    const onUserDataChanged = vi.fn();
    const onSessions = vi.fn();

    client.websocket.on('message', onMessage);
    client.websocket.on('libraryChanged', onLibraryChanged);
    client.websocket.on('userDataChanged', onUserDataChanged);
    client.websocket.on('sessions', onSessions);

    client.websocket.connect({
      webSocketFactory: (url) => {
        mockWsInstance = new MockWebSocket(url);
        return mockWsInstance;
      }
    });
    vi.advanceTimersByTime(20);

    // 1. Inbound LibraryChanged
    mockWsInstance!.simulateMessage({
      MessageType: 'LibraryChanged',
      Data: { ItemsAdded: ['item-1', 'item-2'] }
    });
    expect(onMessage).toHaveBeenCalled();
    expect(onLibraryChanged).toHaveBeenCalledWith({ ItemsAdded: ['item-1', 'item-2'] });

    // 2. Inbound UserDataChanged
    mockWsInstance!.simulateMessage({
      MessageType: 'UserDataChanged',
      Data: { UserId: 'user-1', UserDataList: [{ Key: 'key1' }] }
    });
    expect(onUserDataChanged).toHaveBeenCalledWith({ UserId: 'user-1', UserDataList: [{ Key: 'key1' }] });

    // 3. Inbound Sessions
    mockWsInstance!.simulateMessage({
      MessageType: 'Sessions',
      Data: [{ Id: 'sess-1', UserName: 'Alice' }]
    });
    expect(onSessions).toHaveBeenCalledWith([{ Id: 'sess-1', UserName: 'Alice' }]);

    // 4. ForceKeepAlive message from server triggers keep-alive response
    mockWsInstance!.simulateMessage({ MessageType: 'ForceKeepAlive' });
    expect(mockWsInstance!.sentMessages).toContain(JSON.stringify({ MessageType: 'KeepAlive' }));
  });

  it('should support subscription commands', () => {
    let mockWsInstance: MockWebSocket | null = null;
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.local',
      accessToken: 'token-ws'
    });

    client.websocket.connect({
      webSocketFactory: (url) => {
        mockWsInstance = new MockWebSocket(url);
        return mockWsInstance;
      }
    });
    vi.advanceTimersByTime(20);

    client.websocket.startSessionsSubscription(2000);
    expect(mockWsInstance!.sentMessages).toContain(
      JSON.stringify({ MessageType: 'SessionsStart', Data: '0,2000' })
    );

    client.websocket.stopSessionsSubscription();
    expect(mockWsInstance!.sentMessages).toContain(JSON.stringify({ MessageType: 'SessionsStop' }));

    client.websocket.startScheduledTasksSubscription(3000);
    expect(mockWsInstance!.sentMessages).toContain(
      JSON.stringify({ MessageType: 'ScheduledTasksInfoStart', Data: '0,3000' })
    );

    client.websocket.stopScheduledTasksSubscription();
    expect(mockWsInstance!.sentMessages).toContain(
      JSON.stringify({ MessageType: 'ScheduledTasksInfoStop' })
    );
  });

  it('should disconnect cleanly and stop timers', () => {
    let mockWsInstance: MockWebSocket | null = null;
    const client = new JellyfinClient({
      serverUrl: 'https://jellyfin.local',
      accessToken: 'token-ws'
    });

    const onClose = vi.fn();
    client.websocket.on('close', onClose);

    client.websocket.connect({
      webSocketFactory: (url) => {
        mockWsInstance = new MockWebSocket(url);
        return mockWsInstance;
      }
    });
    vi.advanceTimersByTime(20);
    expect(client.websocket.isConnected).toBe(true);

    client.websocket.disconnect();
    expect(client.websocket.isConnected).toBe(false);
  });
});

