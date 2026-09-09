---
title: Auth & System
category: API Reference
order: 11
icon: lock
badge: "Auth"
description: "Authentication, user capabilities, profile avatars, and server version detection."
---

# Authentication & System API

Covers `client.auth` and `client.system` for logging in, managing credentials, reporting client playback capabilities, and negotiating Jellyfin server versions.

---

## `client.auth`

### Methods

#### `authenticateByName(username, password)`
Authenticates with credentials against `/Users/AuthenticateByName`.

```typescript
const authResult = await client.auth.authenticateByName('admin', 'secret');
```

- **Returns**: `Promise<AuthenticationResult>`
- **Throws**: `JellyfinAuthError` on invalid credentials.

#### `reportCapabilities(capabilities?)`
Reports client playback capabilities. Supports Jellyfin 12 (`/Sessions/Capabilities/Full`) and Jellyfin 10 (`/Sessions/Capabilities`).

```typescript
await client.auth.reportCapabilities({
  PlayableMediaTypes: ['Audio', 'Video'],
  SupportedCommands: ['Play', 'Pause', 'Seek'],
  SupportsMediaControl: true
});
```

#### `getUserImageUrl(userId?, options?)`
Generates the avatar image URL for a user profile.

```typescript
const avatarUrl = client.auth.getUserImageUrl(client.userId, {
  maxWidth: 256,
  quality: 90
});
```

#### `logout()`
Clears session token and user ID.

#### `getUserId()` / `setUserId(id)`
Gets or sets the active user ID string.

---

## `client.system`

### Methods

#### `getPublicInfo()`
Fetches unauthenticated server information (`GET /System/Info/Public`).

```typescript
const publicInfo = await client.system.getPublicInfo();
console.log(publicInfo.ServerName);
console.log(publicInfo.Version);
console.log(publicInfo.Id);
```

#### `getInfo()`
Fetches detailed server system info (`GET /System/Info`), requiring authentication.

```typescript
const info = await client.system.getInfo();
console.log(info.OperatingSystem);
console.log(info.SystemArchitecture);
```

#### `detectVersion()`
Queries public info, parses the semantic version, and sets the internal version cache.

```typescript
const isV12 = await client.system.detectVersion();
```

- **Returns**: `Promise<boolean>` (true if version is 12.0 or higher).

#### `isV12()`
Synchronously checks whether the detected server version is 12.0 or higher.

```typescript
if (client.system.isV12()) {
  // Use v12 features
}
```

#### `parseSemVer(version)`
Utility to parse semantic version strings (`'10.9.11'` -> `{ major: 10, minor: 9, patch: 11 }`).

#### `isVersionAtLeast(targetMajor, targetMinor?, targetPatch?)`
Checks if the detected server version meets a minimum threshold.

