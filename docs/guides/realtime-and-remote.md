---
title: Real-Time & Remote Control
category: Guides
order: 4
icon: cast
badge: "Guide"
description: "Work with real-time WebSocket event streams, remote session control, and Quick Connect pairing."
---

# Real-Time WebSockets & Remote Control

`@francofantomius/jellyfin` provides real-time event streaming over WebSockets, remote playback session management, and Quick Connect pairing for secondary devices.

---

## 1. Real-Time WebSockets (`client.websocket`)

Connect to the Jellyfin server's real-time WebSocket feed to receive notifications about media library updates, user activity, playstate changes, and server sessions.

### Connecting & Keep-Alive

```typescript
// Connect with automatic reconnection and heartbeat keep-alive
client.websocket.connect({
  autoReconnect: true,
  reconnectIntervalMs: 5000,
  keepAliveIntervalMs: 30000
});

// Check connection status
console.log('Connected?', client.websocket.isConnected);
```

### Listening to Connection Events

```typescript
client.websocket.on('open', () => {
  console.log('WebSocket connection established');
});

client.websocket.on('close', (code, reason) => {
  console.log(`WebSocket closed: [${code}] ${reason}`);
});

client.websocket.on('error', (err) => {
  console.error('WebSocket error:', err);
});
```

### Library & User Data Subscriptions

```typescript
// Triggered when items are added, modified, or deleted in library scans
client.websocket.on('libraryChanged', (data) => {
  console.log('Library changed!');
  console.log('Items added:', data.ItemsAdded);
  console.log('Items updated:', data.ItemsUpdated);
  console.log('Items removed:', data.ItemsRemoved);
});

// Triggered when user watched progress, favorites, or played status changes
client.websocket.on('userDataChanged', (data) => {
  console.log('User data modified for user:', data.UserId);
  data.UserDataList.forEach((entry) => {
    console.log(`Item ${entry.ItemId}: Played=${entry.Played}, Favorite=${entry.IsFavorite}`);
  });
});
```

### Server Sessions Feed

```typescript
// Subscribe to periodic session reports (e.g. every 2 seconds)
client.websocket.startSessionsSubscription(2000);

client.websocket.on('sessions', (sessions) => {
  console.log(`Active clients on server: ${sessions.length}`);
});

// Stop subscription
// client.websocket.stopSessionsSubscription();
```

---

## 2. Remote Session Control (`client.sessions`)

Manage and control other active Jellyfin playback sessions (e.g. smart TVs, web clients, or mobile devices) across the network.

### Discovering Active Sessions

```typescript
const sessions = await client.sessions.getSessions({
  controllableByUserId: client.userId
});

const tvSession = sessions.find((s) => s.DeviceName === 'Living Room TV');
```

### Remote Playback Commands

```typescript
if (tvSession) {
  // Instruct session to play media immediately
  await client.sessions.play(tvSession.Id, ['movie-item-id'], {
    playCommand: 'PlayNow',
    startPositionTicks: 0
  });

  // Playback state commands
  await client.sessions.pause(tvSession.Id);
  await client.sessions.unpause(tvSession.Id);
  await client.sessions.playPause(tvSession.Id);
  await client.sessions.seek(tvSession.Id, 60_000_000); // Seek to 6 seconds

  // Track skipping
  await client.sessions.nextTrack(tvSession.Id);
  await client.sessions.previousTrack(tvSession.Id);
}
```

### Volume & Audio/Subtitle Controls

```typescript
// Volume level between 0 and 100
await client.sessions.setVolume(tvSession.Id, 80);

// Mute toggle
await client.sessions.toggleMute(tvSession.Id);

// Switch audio or subtitle track remotely
await client.sessions.setAudioStreamIndex(tvSession.Id, 1);
await client.sessions.setSubtitleStreamIndex(tvSession.Id, 2);
```

### On-Screen Messages & Navigation

```typescript
// Display a modal dialog on the remote screen
await client.sessions.sendMessage(tvSession.Id, {
  header: 'Notice',
  text: 'Server restart scheduled in 10 minutes.',
  timeoutMs: 10000
});

// Navigate remote device to a specific media details page
await client.sessions.viewItem(tvSession.Id, 'Movie', 'movie-id', 'Inception');
```

---

## 3. Quick Connect Device Pairing (`client.quickConnect`)

Quick Connect enables secondary devices (like Smart TVs or game consoles) to authenticate without typing complex passwords on an on-screen keyboard.

### Secondary Device (Client initiating login):

```typescript
// 1. Check if Quick Connect is enabled on the server
if (await client.quickConnect.isEnabled()) {
  // 2. Initiate code generation
  const { Code, Secret } = await client.quickConnect.initiate();
  
  // Display the 6-digit code on screen:
  console.log(`Quick Connect Code: ${Code}`);

  // 3. Poll until authorized by user on another device
  const result = await client.quickConnect.poll(Secret, {
    intervalMs: 2000,
    timeoutMs: 120000 // 2 minutes
  });

  if (result.Authenticated && result.AuthenticationToken) {
    client.accessToken = result.AuthenticationToken;
    if (result.UserId) client.userId = result.UserId;
    console.log('Successfully authenticated via Quick Connect!');
  }
}
```

### Primary Device (User approving login):

From a phone or computer that is already logged in:

```typescript
// Enter the 6-digit code displayed on the TV screen:
await client.quickConnect.authorize('123456');
console.log('Device authorized successfully!');
```

