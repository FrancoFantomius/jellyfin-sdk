---
title: Sessions & Remote Control
category: API Reference
order: 16
icon: personal_video
badge: "Remote"
description: "Query active server sessions, remote playback controls, volume, messages, and item navigation."
---

# Sessions & Remote Control API

`client.sessions` allows your application to query active Jellyfin sessions and issue remote control commands to secondary devices (such as smart TVs, living room PCs, or mobile apps).

---

## Session Querying

### `getSessions(options?)`
Queries active sessions on the server (`GET /Sessions`).

```typescript
const sessions = await client.sessions.getSessions({
  controllableByUserId: client.userId,
  activeWithinSeconds: 300
});
```

---

## Remote Playback Commands

### `play(sessionId, itemIds, options?)`
Instructs the remote session to play the specified items.

```typescript
await client.sessions.play('session-id', ['item-id-1', 'item-id-2'], {
  playCommand: 'PlayNow', // 'PlayNow' | 'PlayNext' | 'PlayLast'
  startPositionTicks: 0,
  mediaSourceId: 'source-id'
});
```

### Playstate Controls
- `playPause(sessionId)`: Toggles playback state.
- `pause(sessionId)`: Pauses active playback.
- `unpause(sessionId)`: Resumes playback.
- `stop(sessionId)`: Stops playback completely.
- `seek(sessionId, positionTicks)`: Seeks to a timestamp in 100ns ticks (`1 second = 10,000,000 ticks`).
- `nextTrack(sessionId)`: Skips to the next track.
- `previousTrack(sessionId)`: Skips to the previous track.

---

## Volume & Audio Controls

### `setVolume(sessionId, volume)`
Sets session volume level (integer between `0` and `100`).

```typescript
await client.sessions.setVolume('session-id', 75);
```

### Muting
- `mute(sessionId)`: Mutes audio.
- `unmute(sessionId)`: Unmutes audio.
- `toggleMute(sessionId)`: Toggles mute state.

### Stream Selection
- `setAudioStreamIndex(sessionId, index)`: Selects active audio track.
- `setSubtitleStreamIndex(sessionId, index)`: Selects active subtitle track (use `-1` to turn off subtitles).

---

## Remote Messages & Navigation

### `sendMessage(sessionId, options)`
Displays an on-screen dialog pop-up on the remote device (`POST /Sessions/{sessionId}/Message`).

```typescript
await client.sessions.sendMessage('session-id', {
  header: 'Notice',
  text: 'Server restart in 5 minutes.',
  timeoutMs: 10000
});
```

### `viewItem(sessionId, itemType, itemId, itemName)`
Commands the remote device to navigate to the details page of an item (`POST /Sessions/{sessionId}/Viewing`).

```typescript
await client.sessions.viewItem('session-id', 'Movie', 'movie-id', 'Interstellar');
```

