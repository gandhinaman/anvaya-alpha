

# Fix Care Partner Audio/Video Recording & Close Senior Feedback Loop

## Problem
The Mic and Video buttons in the care partner's MemoryCard comment section record silently in the background with no UI (no camera preview, no timer, no review). The user expects the same modal experience as the "React to this Story" button. Additionally, the audio player shows "Infinity:NaN" before metadata loads.

## What already works (no changes needed)
The senior-side feedback loop is already functional:
- `MemoryLog.jsx` subscribes to realtime changes on `memory_comments` and `memory_reactions`
- Comments/reactions from care partners appear with a "Gift" badge, author name, and audio/video playback
- `AnvayaApp.jsx` shows unread badges for new hearts and comments
- Hearts are visible on the senior's memory cards

## Changes

### 1. `ReactionRecorder.jsx` — Accept `initialMode` prop
- Add `initialMode` prop (default `"audio"`)
- Use it to set initial `mode` state instead of always defaulting to `"audio"`

### 2. `CarePartnerDashboard.jsx` — MemoryCard component
- **Remove** all inline recording logic: `startAudioReply`, `stopAudioReply`, `startVideoReply`, `stopVideoReply`, and related state (`recording`, `videoRecording`, `recorderRef`)
- **Replace** the Mic and Video buttons in the comment input area to call `onReact(memoryId, title, "audio")` or `onReact(memoryId, title, "video")` — opening the ReactionRecorder modal with the correct mode pre-selected
- **Fix AudioPlayer**: Guard duration display against `Infinity`/`NaN` by checking `isFinite(duration)` before rendering

### 3. `CarePartnerDashboard.jsx` — Dashboard component
- Update `handleOpenReaction` to accept a third `initialMode` parameter
- Store it in state and pass to `ReactionRecorder` as `initialMode` prop

### Files changed

| File | Change |
|---|---|
| `src/components/care-partner/ReactionRecorder.jsx` | Add `initialMode` prop, use as initial `mode` state |
| `src/components/care-partner/CarePartnerDashboard.jsx` | Remove inline recording from MemoryCard, wire Mic/Video to ReactionRecorder modal, fix AudioPlayer NaN, update `handleOpenReaction` signature |

