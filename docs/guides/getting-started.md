---
title: Getting Started
category: Guides
order: 1
icon: rocket_launch
badge: "Guide"
description: "Learn how to install, configure, and authenticate the Jellyfin SDK."
---

# Getting Started with @francofantomius/jellyfin

This guide walks you through setting up `@francofantomius/jellyfin` in your JavaScript or TypeScript application, connecting to a server, and managing user sessions.

---

## 1. Installation

Install the package using your favorite package manager:

```bash
npm install @francofantomius/jellyfin
```

Or using pnpm, yarn, or bun:

```bash
# pnpm
pnpm add @francofantomius/jellyfin

# yarn
yarn add @francofantomius/jellyfin

# bun
bun add @francofantomius/jellyfin
```

---

## 2. Initializing the Client

Import and instantiate `JellyfinClient`. You must provide at minimum the Jellyfin server URL:

```typescript
import { JellyfinClient } from '@francofantomius/jellyfin';

const client = new JellyfinClient({
  serverUrl: 'https://jellyfin.example.com',
  clientInfo: {
    name: 'My Media Client',
    version: '1.0.0',
    device: 'Desktop Browser',
    deviceId: 'custom-unique-id' // Optional; auto-generated if omitted
  }
});
```

> [!TIP]
> Trailing slashes in `serverUrl` (e.g., `https://jellyfin.example.com/`) are automatically normalized and removed by the client's internal transport.

---

## 3. Authenticating Users

### Username & Password Login

Call `client.authenticate()` (or `client.auth.authenticateByName()`) to authenticate with user credentials:

```typescript
try {
  const authResult = await client.authenticate('alice', 'super-secret-password');
  
  console.log(`Welcome, ${authResult.User.Name}!`);
  console.log(`User ID: ${authResult.User.Id}`);
  console.log(`Access Token: ${authResult.AccessToken}`);
} catch (error) {
  console.error('Authentication failed:', error.message);
}
```

When authentication succeeds:
1. The access token is stored automatically in the client instance and its pluggable storage.
2. The user ID is recorded and used for subsequent user-scoped queries.
3. Client capabilities are reported to the server.
4. An `'authenticated'` event is emitted.

### Restoring Saved Sessions

If you already have a persisted token and user ID from a previous session, you can initialize the client with them directly:

```typescript
const client = new JellyfinClient({
  serverUrl: 'https://jellyfin.example.com',
  accessToken: localStorage.getItem('jellyfin_token'),
  userId: localStorage.getItem('jellyfin_user_id')
});
```

---

## 4. Server Version Detection

Jellyfin 10 and Jellyfin 12 have differing API schemas for certain endpoints (such as playlists and session capabilities). The SDK includes automatic version detection:

```typescript
// Query public server info without credentials
const publicInfo = await client.system.getPublicInfo();
console.log('Server Name:', publicInfo.ServerName);
console.log('Server Version:', publicInfo.Version);

// Detect version and determine if Jellyfin 12+ features should be enabled
const isV12 = await client.system.detectVersion();
if (isV12) {
  console.log('Connected to Jellyfin 12+! Advanced endpoints enabled.');
}
```

---

## 5. Listening to Client Events

`JellyfinClient` emits lifecycle events so your application UI can react dynamically:

```typescript
// Dispatched when authentication succeeds
client.on('authenticated', () => {
  console.log('User authenticated');
});

// Dispatched when any server API call returns a 401/403 Unauthorized
client.on('unauthorized', () => {
  console.warn('Session has expired. Redirecting to login...');
  window.location.href = '/login';
});

// Dispatched when client.logout() is invoked
client.on('logout', () => {
  console.log('User logged out');
});
```

To remove an event listener:

```typescript
const handleUnauthorized = () => { /* ... */ };
client.on('unauthorized', handleUnauthorized);

// Later:
client.off('unauthorized', handleUnauthorized);
```

---

## 6. Logging Out

To clear the active credentials and stored sessions:

```typescript
await client.logout();
// Access token and user ID are now cleared from the client instance and storage
```

