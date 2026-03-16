

## Plan: App Telemetry & Admin Dashboard

### Overview
Build a lightweight analytics system that tracks user sessions, page views, and feature usage across both Loved One and Care Partner UIs, with an Admin dashboard to visualize the data.

### Database Schema (2 new tables)

```text
telemetry_sessions
├── id (uuid, PK)
├── user_id (uuid, NOT NULL)
├── started_at (timestamptz, default now())
├── ended_at (timestamptz, nullable)
├── duration_seconds (int, nullable)
├── user_agent (text)
└── role (text) — snapshot of user role at session time

telemetry_events
├── id (uuid, PK)
├── session_id (uuid, FK → telemetry_sessions)
├── user_id (uuid, NOT NULL)
├── event_type (text) — 'page_view' | 'feature_use'
├── event_name (text) — e.g. 'record_memory', 'open_chat', '/loved-one'
├── metadata (jsonb, default '{}')
├── created_at (timestamptz, default now())
```

RLS: Only admins can SELECT. Users can INSERT their own rows. Admin check via a `get_profile_role` comparison (role = 'admin').

### Admin Role Setup
- Add 'admin' as a recognized role in the app routing
- Update `RoleRedirect` to route admin users to `/admin`
- Update the profile for `admin@anvaya.com` to have role = 'admin'

### Implementation Pieces

#### 1. Telemetry Hook — `src/hooks/useTelemetry.ts`
A lightweight hook used in `App.tsx` (or a wrapper) that:
- Creates a session row on mount (or app focus), updates `ended_at` on unmount/blur via `beforeunload` + `visibilitychange`
- Tracks page views by listening to route changes (react-router `useLocation`)
- Exposes `trackEvent(eventName, metadata?)` for feature-level tracking
- Batches events (flush every 5s or on unload) to minimize network calls
- Uses `navigator.sendBeacon` on unload for reliability

#### 2. Event Instrumentation
Sprinkle `trackEvent()` calls at key interaction points:
- **Loved One**: record_memory, open_memory_log, open_chat, call_family, save_profile, voice_orb_activate, emergency_alert
- **Care Partner**: view_memories, react_to_memory, comment_on_memory, send_question, view_alerts, view_daily_rhythm

#### 3. Admin Route & Dashboard — `src/pages/AdminDashboard.tsx`
- New route `/admin` behind `ProtectedRoute` + admin role check
- Summary cards: total users, active sessions today, avg session duration, total events
- Charts (using existing recharts): daily active users over 30 days, top features by usage count, session duration distribution
- User-level drill-down table: user name, role, last active, session count, top features
- Date range filter

#### 4. Routing Changes — `src/App.tsx` + `src/pages/RoleRedirect.tsx`
- Add `/admin` route
- Route admin role to `/admin` in RoleRedirect

### Files to Create/Modify
| File | Action |
|------|--------|
| `supabase/migrations/...` | Create 2 tables + RLS policies |
| `src/hooks/useTelemetry.ts` | New — session + event tracking hook |
| `src/App.tsx` | Add admin route, wrap with telemetry provider |
| `src/pages/RoleRedirect.tsx` | Route admin → `/admin` |
| `src/pages/AdminDashboard.tsx` | New — analytics dashboard |
| `src/components/AnvayaApp.jsx` | Add trackEvent calls at key features |
| `src/components/care-partner/CarePartnerDashboard.jsx` | Add trackEvent calls |

### Latency Considerations
- Events are batched client-side (array buffer flushed every 5s)
- Session end uses `sendBeacon` — non-blocking
- No impact on user-facing performance

