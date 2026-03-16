

## Plan: Sarvam Flow Optimization — Intent Router + Streaming TTS

### Current Flow (slow)
```text
User speaks → STT → full LLM call (streaming) → wait for complete response → TTS entire response
                                                   ~3-5s wasted
```

### New Flow
```text
User speaks → STT → Intent Check (client-side, <10ms)
                      ├─ ACTION MATCHED → brief TTS confirmation + trigger UI immediately
                      └─ NO MATCH → Sarvam LLM (streaming) → sentence-level TTS (start speaking first sentence while rest streams)
```

### Changes

#### 1. Client-side Intent Router (`AnvayaApp.jsx` — new function)
Add a fast regex/keyword matcher that runs instantly on the transcript before any network call:
- Patterns like "record a memory", "मेमोरी रिकॉर्ड", "show my stories", "call my daughter/family", "मेरी कहानियाँ दिखाओ"
- If matched → speak a short confirmation ("Sure, opening the recorder for you!") via TTS and trigger the action
- Skips the entire LLM round-trip — saves 2-4 seconds

#### 2. Sentence-level Streaming TTS (`AnvayaApp.jsx` — modify `sendVoiceToLLM`)
For non-action responses, instead of waiting for the full LLM response before starting TTS:
- Buffer streaming tokens until a sentence boundary (`.` `?` `!` or `।` for Hindi)
- Fire TTS for the first sentence immediately while the LLM continues generating
- Queue subsequent sentences for sequential playback
- This gives sub-second time-to-first-audio after LLM starts responding

#### 3. Keep server-side action tags as fallback (`chat/index.ts` — no change)
The existing `[ACTION:...]` tags in the system prompt remain as a fallback for ambiguous intent the client-side matcher misses. The LLM path still parses these.

#### 4. Parallel TTS pre-warm (`AnvayaApp.jsx`)
Pre-create the AudioContext during the STT phase (while user is speaking) so TTS playback starts instantly when needed — no cold-start delay.

### Latency Savings
| Step | Before | After |
|------|--------|-------|
| Action routing | ~3-5s (full LLM) | <100ms (local match) |
| First audio for conversation | ~4-6s (full LLM + TTS) | ~2-3s (first sentence TTS) |
| AudioContext init | ~200ms on first play | 0ms (pre-warmed) |

### Files Modified
- `src/components/AnvayaApp.jsx` — intent router, sentence-level streaming TTS, AudioContext pre-warm

