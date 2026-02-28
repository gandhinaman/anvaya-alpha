
# Collaborative Memory Comments, Video Analysis, and Dynamic Call Button

## Overview
Three enhancements: (1) a rich comment/reaction system where caregivers can respond with audio/video recordings alongside text, (2) AI-powered visual analysis of video memories to assess the senior's emotional and physical state, and (3) a dynamic "Call [Name]" button that opens the native phone dialer.

---

## 1. Caregiver Audio/Video Comment Responses

### Database Changes
- Add columns to `memory_comments`:
  - `media_url` (text, nullable) -- URL to an audio/video recording stored in the `memories` bucket
  - `media_type` (text, nullable) -- "audio" or "video"
  - `author_name` (text, nullable) -- cached display name of commenter
- Add RLS policies:
  - Parents can INSERT comments on their own memories (currently only children can)
  - Users can DELETE their own comments

### Guardian Dashboard (GuardianDashboard.jsx)
- Expand `MemoryCard` to include:
  - A collapsible comments section showing existing text and media comments
  - A text input + send button for quick text comments
  - "Record Audio" and "Record Video" buttons that capture media, upload to `memories` bucket, and insert a `memory_comments` row with the `media_url`
  - Inline playback for audio/video comments

### Senior Memory Log (MemoryLog.jsx)
- Add a text comment input box below existing family comments
- Add "Record Reply" button for audio responses
- Display media comments with inline audio/video players
- Show commenter name (from `author_name` column)

### Data Fetching (useParentData.ts)
- Fetch `memory_comments` grouped by `memory_id` alongside memories for the guardian view

---

## 2. AI Video Analysis for Senior Health Assessment

### Edge Function Enhancement (process-memory/index.ts)
- For video recordings, extract a frame (or pass the video to the AI model) and add a **visual analysis** section to the AI prompt
- Add new fields to the JSON response schema:
  ```text
  "visual_analysis": {
    "facial_expression": "calm/happy/distressed/neutral",
    "apparent_energy": "low/moderate/high",
    "environment_notes": "Brief note on background, lighting, tidiness",
    "posture_mobility": "Brief note on visible posture or movement",
    "concerns": "Any visual red flags or null"
  }
  ```
- Save visual analysis data as a `health_events` entry with `event_type: "visual_analysis"`

### Guardian Dashboard Display
- When a video memory has visual analysis data, show a "Visual Insights" card below the video with the AI observations
- Add visual analysis trends to the health tab over time

### How It Works
- The existing `process-memory` function already supports multimodal (audio + text) via Gemini. For video, we send a video frame as an image to the model alongside the transcript
- The model analyzes facial expressions, environment, posture, and flags concerns
- This data is stored as health events and displayed to the caregiver

---

## 3. Dynamic "Call [Name]" Button with Native Dialer

### Current State
- Line 1272 of `AnvayaApp.jsx` hardcodes "Call Child" / "बच्चे को कॉल करें"
- `linkedName` is already fetched from the database (line 352-356)
- `CallOverlay` already fetches the phone number and uses `tel:` link (line 214)

### Changes (AnvayaApp.jsx)
- Replace the static label:
  - English: `"Call Child"` becomes `\`Call ${linkedName || 'Family'}\``
  - Hindi: `"बच्चे को कॉल करें"` becomes `\`${linkedName || 'परिवार'} को कॉल करें\``
- The sub-label already shows `linkedName || "Caregiver"` -- keep as is
- The `CallOverlay` component already handles `tel:` dialing correctly; no changes needed there

---

## Technical Summary

| File | Changes |
|------|---------|
| Database migration | Add `media_url`, `media_type`, `author_name` to `memory_comments`; RLS for parent INSERT + user DELETE |
| `src/components/guardian/GuardianDashboard.jsx` | Comment section with text input + audio/video recording in MemoryCard; fetch comments; visual analysis display |
| `src/components/sathi/MemoryLog.jsx` | Text comment input + audio reply; display media comments with players |
| `src/hooks/useParentData.ts` | Fetch memory_comments for guardian; fetch visual_analysis health events |
| `supabase/functions/process-memory/index.ts` | Add visual analysis prompt for video; save visual_analysis health event |
| `src/components/AnvayaApp.jsx` | Dynamic "Call [Name]" label using linkedName |

### Sequencing
1. Database migration first (new columns + RLS)
2. Edge function update for visual analysis
3. Frontend changes (all can be done in parallel)
