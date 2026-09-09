---
title: WebSocket Events
category: API Reference
order: 17
icon: hub
badge: "Real-Time"
description: "Real-time WebSocket event streaming, keep-alive heartbeat, subscriptions, and auto-reconnection."
---

# WebSocket Events API

`client.websocket` provides a real-time event streaming client connecting directly to Jellyfin's WebSocket feed (`/socket?api_key={token}&deviceId={deviceId}`).

---

## Connecting & Lifecycle

### `connect(options?)`
Establishes a WebSocket connection with heartbeat and reconnection logic.

```typescript
client.websocket.connect({
  autoReconnect: true,
  reconnectIntervalMs: 5000,
  maxReconnectAttempts: 10,
  keepAliveIntervalMs: 30000
});
```

### `disconnect()`
Cleanly closes the WebSocket connection and halts all internal timers.

### `isConnected`
Getter property returning `true` if the underlying WebSocket is open and ready.

### `getWebSocketUrl()`
Computes and returns the complete WebSocket endpoint URL.

---

## Subscriptions

### Sessions
- `startSessionsSubscription(intervalMs?)`: Initiates periodic session reports (defaults to `2000` ms).
- `stopSessionsSubscription()`: Stops session reports.

### Scheduled Tasks
- `startScheduledTasksSubscription(intervalMs?)`: Subscribes to server scheduled task progress.
- `stopScheduledTasksSubscription()`: Cancels subscription.

### Activity Log
- `startActivityLogSubscription(intervalMs?)`: Subscribes to server administrative activity entries.
- `stopActivityLogSubscription()`: Cancels subscription.

---

## Event Handlers

Register event listeners via `client.websocket.on(eventName, handler)`:

| Event | Payload | Description |
| :--- | :--- | :--- |
| `'open'` | `void` | Fired when connection is established. |
| `'close'` | `(code: number, reason: string)` | Fired when connection closes. |
| `'error'` | `(error: Event)` | Fired on socket error. |
| `'message'` | `(data: any)` | Fired on any incoming raw WebSocket message. |
| `'libraryChanged'` | `LibraryChangedData` | Fired when server library content is added, changed, or deleted. |
| `'userDataChanged'` | `UserDataChangedData` | Fired when playback progress, favorites, or played status changes. |
| `'sessions'` | `SessionInfoDto[]` | Fired with latest active server session list. |
| `'restartRequired'` | `void` | Fired when server requests a client restart. |
| `'serverShuttingDown'` | `void` | Fired when server is stopping. |

Example:
```typescript
client.websocket.on('libraryChanged', (data) => {
  console.log('Items added:', data.ItemsAdded);
  console.log('Items removed:', data.ItemsRemoved);
});
```

