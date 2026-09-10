---
title: Home
category: Overview
order: 0
icon: home
badge: "v0.4.1"
description: "A modern, lightweight, modular, and type-safe Jellyfin SDK for Node.js and the Browser."
hero:
  badge: "Version 0.4.1 • TypeScript & Universal"
  title: "@francofantomius/jellyfin"
  subtitle: "A modern, lightweight, modular, and type-safe Jellyfin SDK for Node.js and the Browser."
  actions:
    - text: "Getting Started"
      link: "#/guides/getting-started"
      variant: "filled"
      icon: "rocket_launch"
    - text: "API Reference"
      link: "#/api/client"
      variant: "outlined"
      icon: "menu_book"
---

## Introduction

`@francofantomius/jellyfin` is a modular, zero-bloat, type-safe client library designed for interacting with [Jellyfin media servers](https://jellyfin.org). Built from the ground up using modern TypeScript, it runs seamlessly across **Node.js** (scripts, daemons, backend microservices, SSR) and **the Browser** (vanilla JS/TS, React, Vue, Svelte, Electron, Tauri).

> [!NOTE]
> The SDK targets both Jellyfin 10.x and the upcoming Jellyfin 12.x architectures with automatic version negotiation.

---

## Core Highlights

- **Universal & Isomorphic**: Works in Node.js 18+, Bun, Deno, and modern web browsers without polyfills.
- **Dual Module Exports**: Clean native ESM (`import`) and CommonJS (`require`) builds with bundled TypeScript `.d.ts` declaration maps.
- **Modular Sub-Clients**: Every feature domain is organized cleanly under dedicated sub-modules (`client.auth`, `client.library`, `client.media`, `client.search`, `client.playback`, `client.websocket`, `client.sessions`, `client.trickplay`, `client.chapters`, `client.genres`, `client.collections`, `client.displayPreferences`, `client.offline`, etc.).
- **Trickplay & Scrubbing Previews**: Jellyfin 10.9+ trickplay HLS tile manifests, thumbnail sheet extraction, and automatic timestamp-to-sprite coordinates.
- **Chapters & Intro/Credits Skipping**: Chapter marker extraction, visual thumbnails, MediaSegments API (Jellyfin 10.10+), and automatic intro/credits skip detection.
- **Collections & Genres**: Browse movie/music genres, production studios, and manage BoxSet collections (`create`, `add`, `remove`).
- **User Display Preferences**: Persist and retrieve view types, sorting configurations, and custom client UI preferences via `/DisplayPreferences/{id}`.
- **Smart Quality Presets**: Built-in resolution and bitrate presets for video (4K, 1080p, 720p, 480p, direct) and audio (320k, 256k, 192k, 128k, direct).
- **Subtitles & Transcoding**: First-class support for VTT/SRT subtitle streaming, track parsing, and automated FFmpeg transcode process teardown.
- **Offline Storage**: Integrated IndexedDB offline media manager for web browsers with progress tracking.
- **Real-Time WebSockets**: Live event streaming with automatic heartbeat keep-alive and reconnection handling.
- **Remote Control & Quick Connect**: Full remote session playback command set and passwordless device pairing flow for TVs and secondary devices.

---

## Quick Installation

```bash
# npm
npm install @francofantomius/jellyfin

# pnpm
pnpm add @francofantomius/jellyfin

# yarn
yarn add @francofantomius/jellyfin
```

---

## Fast Example

```typescript
import { JellyfinClient } from '@francofantomius/jellyfin';

const client = new JellyfinClient({
  serverUrl: 'https://jellyfin.example.com',
  clientInfo: {
    name: 'My Media App',
    version: '1.0.0',
    device: 'Web App'
  }
});

// Authenticate
await client.authenticate('username', 'password');

// Browse recent movies
const movies = await client.library.getMovies({ limit: 10 });
console.log('Movies:', movies.Items.map((m) => m.Name));

// Generate a streaming URL
const streamUrl = client.media.getVideoStreamUrl(movies.Items[0].Id, {
  quality: '1080p'
});
```

---

## Documentation Guide

Explore the structured guides and comprehensive API reference:

- **[Getting Started](#/guides/getting-started)**: Installation, authentication, configuration, and event listening.
- **[Streaming & Media](#/guides/streaming-and-media)**: Audio/video streaming, HLS playlists, quality presets, subtitles, and artwork.
- **[Offline & Downloads](#/guides/offline-and-downloads)**: Browser IndexedDB offline caching and progress-tracked downloads.
- **[Real-time & Remote Control](#/guides/realtime-and-remote)**: WebSocket event feed, remote playback commands, and Quick Connect device pairing.
- **[API Reference](#/api/client)**: Complete reference of all classes, methods, parameters, and interfaces.

