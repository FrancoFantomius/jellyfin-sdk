---
title: Chapters & Media Markers
category: API Reference
order: 22
icon: bookmarks
badge: "Chapters"
description: "Chapter marker extraction, chapter thumbnails, MediaSegments API, and automated intro/credits skipping."
---

# Chapters & Media Markers API

`client.chapters` provides utilities for navigating video chapter markers, retrieving visual chapter preview thumbnails, querying typed MediaSegments (Jellyfin 10.10+), and calculating intro and end-credits skip intervals.

---

## Chapter Extraction & Images

### `extractChapters(item)`
Extracts the chapter markers array from an already retrieved `BaseItemDto`.

```typescript
const chapters = client.chapters.extractChapters(item);
// [{ StartPositionTicks: 0, Name: 'Prologue' }, { StartPositionTicks: 600000000, Name: 'Intro' }]
```

### `getChapters(itemId)`
Queries the server for the item's chapters with `Fields=Chapters`.

```typescript
const chapters = await client.chapters.getChapters('movie-or-episode-id');
```

### `getChapterImageUrl(itemId, chapterIndex, options?)`
Generates the thumbnail URL for a specific chapter marker (`/Items/{itemId}/Images/Chapter/{chapterIndex}`).

```typescript
const chapterThumbUrl = client.chapters.getChapterImageUrl('episode-id', 1, {
  maxWidth: 400,
  quality: 85,
  format: 'webp'
});
```

---

## Media Segments API (Jellyfin 10.10+)

### `getMediaSegments(itemId, options?)`
Fetches typed media segments (such as `Intro`, `Outro`, `Commercial`, `Recap`) via `GET /MediaSegments`.

```typescript
const segments = await client.chapters.getMediaSegments('episode-id', {
  includeSegmentTypes: ['Intro', 'Outro']
});
```

---

## Intro & Credits Skipping

### `getIntroCredits(itemOrChaptersOrId)`
Resolves intro and credits ranges by inspecting `/MediaSegments` and falling back to chapter marker heuristics (`MarkerType` and chapter titles such as "Intro", "Opening Theme", "Credits", "Ending").

```typescript
const markers = await client.chapters.getIntroCredits('episode-id');

if (markers.intro) {
  console.log(`Intro from ${markers.intro.startMs}ms to ${markers.intro.endMs}ms`);
}
```

### `findCurrentSegment(positionTicks, markers)`
Checks if the current playback position falls within an active intro or credits range.

```typescript
const segment = client.chapters.findCurrentSegment(currentTicks, markers);
if (segment?.type === 'Intro') {
  showSkipIntroButton();
}
```

### `getSkipPosition(positionTicks, markers)`
Returns the target timestamp ticks to seek to if the player is currently inside a skippable segment, or `null` otherwise.

```typescript
const targetTicks = client.chapters.getSkipPosition(currentTicks, markers);
if (targetTicks !== null) {
  videoPlayer.currentTime = targetTicks / 10000000;
}
```

