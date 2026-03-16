

## Plan: Sarvam Streaming TTS + Faster Pace (iOS-compatible)

### Problem
- TTS waits for full audio synthesis before playback — adds 2-4s latency
- Pace at 0.85 is too slow
- STT is batch (record → upload → wait) — adds latency

### Approach

**TTS: Edge function as WebSocket→SSE bridge** (most impactful latency win)

```text
Client ──POST──▶ Edge Function ──WS──▶ Sarvam TTS Streaming
Client ◀──SSE────Edge Function ◀──WS──── (base64 PCM chunks)
```

- Edge function opens WebSocket to `wss://api.sarvam.ai/text-to-speech/streaming`
- Sends config (speaker: priya, pace: 1.15, codec: pcm), text, flush
- Receives base64 PCM audio chunks → streams back as SSE `data: {"audio":"...","done":false}` events
- Client decodes raw PCM (16-bit, mono) directly into Web Audio API AudioBuffers — no `decodeAudioData` needed, works reliably on iOS Safari
- Audio starts playing after first chunk arrives (sub-second time-to-first-audio)

**STT: Keep batch but increase pace** — Supabase Edge Functions have limited WebSocket upgrade support, so streaming STT via a WS proxy is unreliable. The batch Saaras v3 endpoint is already fast (~1-2s). We keep it as-is.

**Pace: 0.85 → 1.15** across all TTS calls.

### iOS Compatibility
- SSE (EventSource / fetch streaming): fully supported on iOS Safari
- Web Audio API with raw PCM → AudioBuffer: fully supported, no `decodeAudioData` parsing issues
- Audio unlock (existing `unlockAudio()` on first tap): preserved
- No MediaSource dependency (not supported on iOS Safari)

### Changes

#### 1. Rewrite `supabase/functions/elevenlabs-tts/index.ts`
- Accept POST with `{ text, lang }`
- Open WebSocket to `wss://api.sarvam.ai/text-to-speech/streaming`
- Send config message: `{ type: "config", data: { speaker: "priya", target_language_code, pace: 1.15, output_audio_codec: "pcm", min_buffer_size: 50 } }`
- Send text message, then flush message
- Stream received audio chunks as SSE: `data: {"audio":"<base64>","done":false}\n\n`
- On completion/close: `data: {"done":true}\n\n`
- Return `Content-Type: text/event-stream`
- Fallback: if WS fails, fall back to batch API and return single JSON response (backward compat)

#### 2. Update `src/components/AnvayaApp.jsx` — Orb `speakResponse`
- Parse SSE stream from fetch response using `getReader()`
- Decode each base64 PCM chunk → create Float32Array (16-bit LE → float)
- Queue AudioBuffers on AudioContext, schedule playback with `source.start(nextPlayTime)`
- Set `voicePhase="speaking"` on first chunk, `"idle"` when all chunks played
- Fallback: if response is JSON (batch fallback), use existing decodeAudioData path

#### 3. Update `src/components/sathi/SathiChat.jsx` — `speakText`
- Same SSE streaming playback logic as orb
- Remove dead MediaSource code path (never worked on iOS anyway)

#### 4. Update `src/components/sathi/MemoryRecorder.jsx` — `speakWithBrowserFallback`
- Same streaming playback for prompt TTS

#### 5. Shared helper: `src/lib/streamingTTS.ts`
- Extract common streaming TTS logic into a reusable module:
  - `streamTTS(text, lang, audioContext): Promise<{ onChunk, onDone }>` 
  - Handles fetch → SSE parsing → PCM decoding → AudioBuffer queuing
  - Falls back to batch JSON response automatically

#### 6. Pace update
- All TTS: `pace: 1.15` (up from 0.85)

### Files Modified
- `supabase/functions/elevenlabs-tts/index.ts` — WS→SSE bridge
- `src/lib/streamingTTS.ts` — new shared streaming playback helper
- `src/components/AnvayaApp.jsx` — use streamingTTS in speakResponse
- `src/components/sathi/SathiChat.jsx` — use streamingTTS in speakText
- `src/components/sathi/MemoryRecorder.jsx` — use streamingTTS in speakWithBrowserFallback

