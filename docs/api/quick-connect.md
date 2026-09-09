---
title: Quick Connect
category: API Reference
order: 19
icon: qr_code_2
badge: "Auth"
description: "Quick Connect passwordless pairing flow for Smart TVs, consoles, and secondary devices."
---

# Quick Connect API

`client.quickConnect` implements Jellyfin's Quick Connect pairing workflow, allowing secondary devices (like Smart TVs or media sticks) to be authorized from a phone or computer.

---

## Secondary Device Flow (Initiating Device)

### `isEnabled()`
Queries `GET /QuickConnect/Enabled` to check if Quick Connect is turned on by the server administrator.

```typescript
const enabled = await client.quickConnect.isEnabled();
```

### `initiate()`
Posts to `/QuickConnect/Initiate` to request a unique pairing code and secret token.

```typescript
const { Code, Secret } = await client.quickConnect.initiate();
// Display Code (e.g. "654 321") on the TV screen
```

### `check(secret)`
Queries `GET /QuickConnect/Connect?secret={secret}` to check the current authorization state.

```typescript
const state = await client.quickConnect.check(Secret);
if (state.Authenticated) {
  console.log('Authorized token:', state.AuthenticationToken);
}
```

### `poll(secret, options?)`
Utility method that polls `check(secret)` continuously until authenticated or timed out.

```typescript
const state = await client.quickConnect.poll(Secret, {
  intervalMs: 2000,
  timeoutMs: 120000 // 2 minutes
});

if (state.Authenticated && state.AuthenticationToken) {
  client.accessToken = state.AuthenticationToken;
  if (state.UserId) client.userId = state.UserId;
}
```

---

## Primary Device Flow (Authorizing Device)

### `authorize(code, userId?)`
Called from an already authenticated session (e.g. user logged into their phone or PC) to approve the pending Quick Connect code.

```typescript
await client.quickConnect.authorize('654321');
console.log('Device approved!');
```

