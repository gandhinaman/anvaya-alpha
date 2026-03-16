

## Problem

Telemetry events are buffered in memory and flushed every 5 seconds, but on logout the code calls `supabase.auth.signOut()` and immediately redirects to `/login` — the auth token is invalidated before the flush can complete, so buffered events and the session `ended_at` are lost.

The `sendBeacon` fallback in `flushBeacon` also lacks the required `Authorization` and `apikey` headers, so it silently fails even on tab close.

## Plan

### 1. Export a `flushTelemetry()` function from `useTelemetry.ts`

A synchronous-safe async function that:
- Flushes all buffered events via the Supabase client
- Updates `telemetry_sessions.ended_at` for the current session
- Resets globals (`globalSessionId`, `globalUserId`, `sessionStarted`)

### 2. Fix `flushBeacon` to include auth headers

The `sendBeacon` calls for `beforeunload` need `apikey` and `Authorization` headers. Since `sendBeacon` only supports body blobs, switch to `fetch(..., { keepalive: true })` which supports headers and survives page unload.

### 3. Call `flushTelemetry()` before `signOut()` in all logout handlers

There are 4 logout locations:
- `AnvayaApp.jsx` — inline button (line ~1342) and `handleSignOut` (line ~2140)
- `CarePartnerDashboard.jsx` — `handleSignOut` (line ~970)
- `AdminDashboard.tsx` — `handleLogout` (line ~151)

Each will `await flushTelemetry()` before calling `supabase.auth.signOut()`.

### 4. Listen to Supabase `onAuthStateChange` for `SIGNED_OUT`

As a safety net inside `useTelemetry.ts`, listen to the auth state change event. On `SIGNED_OUT`, flush any remaining events (the token is still briefly valid at event fire time).

### Files changed

| File | Change |
|---|---|
| `src/hooks/useTelemetry.ts` | Export `flushTelemetry()`, fix beacon to use `fetch+keepalive`, add auth listener cleanup |
| `src/components/AnvayaApp.jsx` | Import & await `flushTelemetry` before both sign-out calls |
| `src/components/care-partner/CarePartnerDashboard.jsx` | Import & await `flushTelemetry` before sign-out |
| `src/pages/AdminDashboard.tsx` | Import & await `flushTelemetry` before sign-out |

