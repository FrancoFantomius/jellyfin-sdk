---
title: Playback & Transcoding
category: API Reference
order: 15
icon: sync
badge: "Playback"
description: "Reporting playback start, progress, stop, scrobbling, and terminating active FFmpeg transcodes."
---

# Playback & Transcoding API

Covers `client.playback` for keeping playback states, play counts, and resume points synchronized with the Jellyfin server, and `client.transcode` for stopping active server FFmpeg transcoding jobs.

---

## `client.playback`

### Methods

#### `reportStart(itemId, positionTicks?, options?)`
Reports playback start to `/Sessions/Playing`.

```typescript
await client.playback.reportStart('movie-id', 0, {
  playSessionId: 'session-123',
  audioStreamIndex: 1,
  subtitleStreamIndex: 2
});
```

#### `reportProgress(itemId, positionTicks?, isPaused?, options?)`
Reports current playback progress to `/Sessions/Playing/Progress`.

```typescript
// Called periodically (e.g. every 5-10s) or on seek/pause
await client.playback.reportProgress('movie-id', currentTicks, false, {
  playSessionId: 'session-123'
});
```

#### `reportStopped(itemId, positionTicks?, options?)`
Reports that playback has ended or was closed to `/Sessions/Playing/Stopped`.

```typescript
await client.playback.reportStopped('movie-id', finalTicks, {
  playSessionId: 'session-123'
});
```

> [!NOTE]
> If `playSessionId` is passed in `options`, `reportStopped` automatically triggers `client.transcode.stopActiveEncoding(playSessionId)` to ensure the server tears down any ongoing FFmpeg processes.

---

## `client.transcode`

### Methods

#### `stopActiveEncoding(playSessionId, deviceId?)`
Explicitly invokes `DELETE /Videos/ActiveEncodings` to instruct the Jellyfin server to terminate the background FFmpeg transcoding process tied to the given session.

```typescript
await client.transcode.stopActiveEncoding('session-123');
```

- **Parameters**:
  - `playSessionId`: The unique playback session ID assigned during stream creation.
  - `deviceId`: Optional client device ID override (defaults to client instance device ID).

#### `stop(playSessionId, deviceId?)`
Alias for `stopActiveEncoding`.

