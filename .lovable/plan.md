

## Plan: Subtle Nudging + App-Aware Orb

### Problem
1. The orb auto-speaks a greeting on load — too aggressive, especially on iOS where autoplay is blocked
2. Ela has no awareness of app features, so she can't route users to "Record a Memory", "Memory Log", etc.
3. Memory nudge and reaction summaries should happen naturally within conversation, not unprompted

### Changes

#### 1. Remove proactive auto-speak on load (`AnvayaApp.jsx`)
- Delete the entire `PROACTIVE ORB GREETING` useEffect block (lines 604-716)
- Keep the visual unread badge text in idle state (the `seniorUnreadCount` line) — that's subtle enough
- Instead, store the nudge/reaction context in a ref (`proactiveContextRef`) so it can be injected into the first conversation turn

#### 2. Inject context into first voice message (`AnvayaApp.jsx` — `sendVoiceToLLM`)
- Before sending the first user message to the LLM, prepend a hidden system-level context note:
  - Whether user hasn't recorded in 24h+ (nudge)
  - Unread reaction/comment summaries with story titles
- This way Ela naturally weaves it into her response to whatever the user says first
- Only inject on the first turn of a new session (check `voiceHistoryRef.current.length === 0`)

#### 3. Add app-awareness to Ela's system prompt (`chat/index.ts`)
Add to `ELA_SYSTEM`:
```
APP FEATURES (you can suggest these when relevant):
- "Record a Memory" — user can record a voice/video story. Suggest when they mention wanting to share a story, or if they haven't recorded in a while.
- "Memory Log" — user can browse past recordings and see family reactions/comments.
- "Ask Ela" (text chat) — for typing instead of talking.
- "Call Family" — to call their linked care partner.
When the user expresses intent to use a feature (e.g. "I want to record a memory", "show me my stories"), respond with a JSON action tag: [ACTION:record_memory], [ACTION:open_memory_log], [ACTION:open_chat], [ACTION:call_family]. Keep your verbal response brief alongside the action.
```

#### 4. Parse action tags in orb response (`AnvayaApp.jsx`)
- After `sendVoiceToLLM` gets `fullResponse`, scan for `[ACTION:...]` patterns
- Strip the tag from displayed/spoken text
- Trigger the corresponding UI action after TTS finishes:
  - `record_memory` → `setMemoryOpen(true)`
  - `open_memory_log` → `openMemoryLog()`
  - `open_chat` → `setChatOpen(true)`
  - `call_family` → `setCallOpen(true)`

#### 5. Enrich context sent from orb (`AnvayaApp.jsx`)
- On first conversation turn, fetch last memory time + unread counts (lightweight queries already available from existing state)
- Append to the system prompt override sent in `sendVoiceToLLM`:
  ```
  CONVERSATION CONTEXT:
  - Last memory recorded: 2 days ago (gently suggest recording if natural)
  - Unread: 3 hearts, 1 comment from [CarePartner] on "Wedding Story"
  ```

### Files Modified
- `supabase/functions/chat/index.ts` — add app-awareness instructions to ELA_SYSTEM
- `src/components/AnvayaApp.jsx` — remove auto-speak, add context injection on first turn, parse action tags

