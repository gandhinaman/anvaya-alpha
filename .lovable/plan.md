
# Fix Plan: Comment Sending, Visual Insights, and Voice Orb

## Issues Found

### 1. Comment Sending Not Working (Both Senior and Caregiver)
**Root Cause**: The `sendComment` function in `MemoryCard` (guardian) and `send` in `CommentInput` (senior) both silently swallow errors. The insert may be failing due to RLS or the error is not shown to the user. Additionally, the `sendComment` in `MemoryCard` does not handle the Supabase insert response -- it doesn't check for errors from the `.insert()` call.

**Fix**:
- Add proper error handling and user feedback (toast/alert) to both `sendComment` in `GuardianDashboard.jsx` and `send` in `MemoryLog.jsx`
- Log the actual Supabase error response from the insert call
- Add `.select()` to the insert to verify success and catch RLS violations

### 2. Visual Insights Not Showing
**Root Cause**: When data was cloned from the original accounts to `senior@anvaya.com`, the health events (including `visual_analysis`) kept their original `memory_id` references. The cloned memories got new UUIDs, so `visualAnalysisMap[m.id]` never matches. The visual analysis health event references `memory_id: 4c99ac90-...` but the cloned memory has a different ID.

**Fix**:
- Update the cloned `visual_analysis` health events to reference the correct new memory IDs via a data migration
- Also, the `useParentData` hook only fetches health events from the last 7 days, so older visual analysis events may be missed. This is OK for now since the cloned data is from today.
- To ensure visual insights appear going forward, verify the `process-memory` edge function correctly saves `visual_analysis` with the new memory's ID (it does -- this is only a data migration issue from the cloning).

### 3. Voice Orb Check
**Current State**: The orb code in `AnvayaApp.jsx` (lines 621-770) has been updated with:
- Web Speech API as primary with proper error handling
- WAV fallback via `startWavFallback()` for iOS/PWA
- Audio unlock for iOS autoplay restrictions
- Auto-stop at 10 seconds for WAV fallback
- Proper stop handling when tapping orb again

**Remaining Issue**: The WAV auto-stop timeout is only 10 seconds (line 759), which may be too short for natural speech. Also, `recognition.continuous = false` on Web Speech API (line 692) means it stops after the first pause, which can cut off mid-sentence.

**Fix**:
- Set `recognition.continuous = true` for Web Speech API so it captures longer utterances
- Add a silence timeout (3-4 seconds of no new results) to auto-stop gracefully
- Increase WAV auto-stop to 30 seconds

---

## Implementation Steps

### Step 1: Fix comment sending with proper error handling
**Files**: `src/components/guardian/GuardianDashboard.jsx`, `src/components/sathi/MemoryLog.jsx`

- In `MemoryCard.sendComment()`: Add `.select()` to the insert, check for `error` in response, and show an alert or console error with the actual error message
- In `CommentInput.send()`: Same treatment -- check Supabase response and surface errors
- Both: Clear the sending state properly on error

### Step 2: Fix visual analysis data references
**Action**: Run a SQL update to map the cloned `visual_analysis` health events to the correct new memory IDs based on matching `audio_url` or `title`+`created_at` between old and new memories.

### Step 3: Improve voice orb reliability
**File**: `src/components/AnvayaApp.jsx`

- Change `recognition.continuous = false` to `recognition.continuous = true` (line 692)
- Add a silence timeout: track last result timestamp and auto-stop after 3-4 seconds of silence
- Increase WAV auto-stop from 10s to 30s (line 759)

---

## Technical Details

### Comment Error Handling Pattern
```text
// Current (silent failure):
await supabase.from("memory_comments").insert({...});

// Fixed (surface errors):
const { error } = await supabase.from("memory_comments").insert({...}).select();
if (error) {
  console.error("Comment insert failed:", error);
  alert("Could not send comment. Please try again.");
  return;
}
```

### Visual Analysis Data Fix
Query to find matching memories between original and cloned users by audio_url, then update the `memory_id` in the health event value JSONB.

### Voice Orb Silence Detection
```text
// Add silence timeout with continuous mode:
recognition.continuous = true;
let silenceTimer = null;
recognition.onresult = (event) => {
  clearTimeout(silenceTimer);
  // ... process results ...
  silenceTimer = setTimeout(() => recognition.stop(), 3500);
};
```
