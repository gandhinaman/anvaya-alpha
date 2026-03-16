

# Plan: Comprehensive Feature-Level Telemetry

## Current State

Telemetry infrastructure works (sessions, buffered events, flush on logout/unload), but only **7 events** are tracked across the entire app:

**Loved One**: `record_memory`, `open_memory_log`, `open_chat`, `call_family`, `ela_chat`
**Care Partner**: `view_<tab_name>` (nav changes only)

No tracking for: voice interactions, memory completion, memory playback, reactions, comments, profile edits, emergency alerts, link account, search/filter usage, or Ela voice conversation depth.

## What We'll Add

### Loved One (`AnvayaApp.jsx`)

| Event Name | Type | Metadata | Trigger |
|---|---|---|---|
| `voice_start` | feature_use | `{ lang }` | Orb tapped to start listening |
| `voice_complete` | feature_use | `{ lang, duration_ms, method: "web_speech"\|"wav_fallback" }` | Transcript captured |
| `voice_intent_matched` | feature_use | `{ intent, transcript_preview }` | Client-side intent router fires |
| `memory_record_complete` | feature_use | `{ duration_seconds, has_audio, prompt_question }` | Memory saved successfully |
| `memory_play` | feature_use | `{ memory_id }` | Audio playback started in MemoryLog |
| `memory_delete` | feature_use | `{ memory_id }` | Memory deleted |
| `memory_comment_send` | feature_use | `{ memory_id, has_media }` | Comment/voice reply sent |
| `emergency_trigger` | feature_use | `{ lang }` | Emergency alert sent |
| `profile_save` | feature_use | `{ fields_changed }` | Profile saved |
| `language_switch` | feature_use | `{ from, to }` | Language changed |

### Loved One Chat (`LovedOneChat.jsx`)

| Event Name | Type | Metadata | Trigger |
|---|---|---|---|
| `ela_chat_voice` | feature_use | `{ lang }` | Mic used in chat |
| `ela_chat_tts` | feature_use | `{ message_index }` | Read-aloud tapped |
| `ela_chat_history_loaded` | feature_use | `{ message_count }` | Conversation history loaded |

### Care Partner (`CarePartnerDashboard.jsx`)

| Event Name | Type | Metadata | Trigger |
|---|---|---|---|
| `heart_toggle` | feature_use | `{ memory_id, action: "add"\|"remove" }` | Heart reaction toggled |
| `reaction_record` | feature_use | `{ memory_id, mode: "audio"\|"video" }` | Reaction recorder opened |
| `reaction_send` | feature_use | `{ memory_id }` | Reaction sent successfully |
| `memory_play` | feature_use | `{ memory_id }` | Audio playback in memories tab |
| `memory_delete` | feature_use | `{ memory_id }` | Memory deleted |
| `memory_search` | feature_use | `{ query_length }` | Search used (debounced) |
| `memory_filter` | feature_use | `{ filter }` | Filter category changed |
| `link_account` | feature_use | `{}` | Account linked successfully |
| `collection_create` | feature_use | `{}` | Collection created |
| `collection_add_memory` | feature_use | `{ collection_id }` | Memory added to collection |
| `caregiver_question_send` | feature_use | `{ question_length }` | Question sent to parent |
| `call_parent` | feature_use | `{}` | Call button tapped |
| `emergency_resolve` | feature_use | `{}` | Emergency marked safe |
| `profile_save` | feature_use | `{}` | Care partner profile saved |

### Memory Recorder (`MemoryRecorder.jsx`)

| Event Name | Type | Metadata | Trigger |
|---|---|---|---|
| `memory_recorder_open` | feature_use | `{ prompt }` | Recorder modal opens |
| `memory_recorder_start` | feature_use | `{ mode: "audio"\|"video" }` | Recording begins |
| `memory_recorder_cancel` | feature_use | `{ duration_seconds }` | Closed without saving |

### Reaction Recorder (`ReactionRecorder.jsx`)

| Event Name | Type | Metadata | Trigger |
|---|---|---|---|
| `reaction_recorder_start` | feature_use | `{ mode }` | Recording begins |
| `reaction_recorder_cancel` | feature_use | `{}` | Closed without sending |

## Files Changed

| File | Change |
|---|---|
| `src/components/AnvayaApp.jsx` | Add ~10 trackEvent calls at voice, emergency, profile, language interactions |
| `src/components/loved-one/LovedOneChat.jsx` | Add trackEvent for voice input, TTS, history load |
| `src/components/loved-one/MemoryLog.jsx` | Add trackEvent for play, delete, comment send |
| `src/components/loved-one/MemoryRecorder.jsx` | Add trackEvent for open, start, cancel, complete |
| `src/components/care-partner/CarePartnerDashboard.jsx` | Add trackEvent for hearts, calls, search, filter, link, delete, collections, questions, profile, emergency |
| `src/components/care-partner/ReactionRecorder.jsx` | Add trackEvent for start, cancel, send |

## No database changes needed
The existing `telemetry_events` table schema (`event_name`, `event_type`, `metadata` jsonb) supports all these events without modification.

