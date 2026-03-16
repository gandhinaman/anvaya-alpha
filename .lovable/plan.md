

# Plan: Update Backend for Redesigned Orb Voice Flow

## What Changed in the Spec

The spec redesigns the orb voice pipeline to be simpler and more reliable:

1. **TTS**: Switch from Anushka to **Meera** voice, model **bulbul:v3** (from v2), pace **0.85** (slower for seniors), loudness **1.3** (louder for hearing), return **base64 WAV** instead of raw audio bytes
2. **STT**: Accept raw audio blob via FormData (not base64 JSON), use `saarika:v2.5` (already correct), pass proper `language_code` (`hi-IN`/`en-IN`)
3. **Chat**: Shorter responses (`max_tokens: 120`), simpler system prompt focused on 1-2 sentence replies
4. **Audio playback**: Use Web Audio API (`AudioContext.decodeAudioData`) with base64 WAV instead of `<audio>` element — more reliable on iOS

## Backend Changes

### 1. Update `elevenlabs-tts` Edge Function
- Change Sarvam voice from `anushka` to `meera`
- Change model from `bulbul:v2` to `bulbul:v3`
- Set `pace: 0.85`, `loudness: 1.3`
- Return JSON `{ audio: base64string }` instead of raw WAV bytes — this is what the new client-side Web Audio API playback expects
- Keep ElevenLabs as fallback but also return base64

### 2. Update `sarvam-stt` Edge Function
- Accept both current base64 JSON format AND raw FormData blob (for new orb flow)
- Add `language_code` mapping: accept `hi-IN` / `en-IN` directly

### 3. Update `chat` Edge Function
- Add `max_tokens: 120` to the AI gateway request to enforce short responses for voice
- The system prompt is already passed from the client, so no structural change needed

### 4. Update `AnvayaApp.jsx` — Orb Voice Pipeline
- **TTS playback**: Switch from `<audio>` blob/MediaSource to Web Audio API (`AudioContext.decodeAudioData` on base64 WAV) — more reliable on iOS Safari
- **STT call**: Keep WAV fallback path but ensure `getUserMedia` is always called inside tap handler (iOS requirement)
- **speakResponse**: Parse JSON `{ audio }` response, decode base64, play via AudioContext
- Remove ElevenLabs MediaSource streaming path (Sarvam is now primary and returns base64 WAV)

## Technical Details

### TTS Response Format Change
```
// Before: raw audio/wav bytes
return new Response(bytes, { headers: { "Content-Type": "audio/wav" } })

// After: JSON with base64
return new Response(JSON.stringify({ audio: base64 }), { 
  headers: { "Content-Type": "application/json" } 
})
```

### Client-side Web Audio Playback
```javascript
const { audio: base64wav } = await response.json();
const ctx = new AudioContext();
await ctx.resume(); // iOS requirement
const binary = atob(base64wav);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
const buffer = await ctx.decodeAudioData(bytes.buffer);
const source = ctx.createBufferSource();
source.buffer = buffer;
source.connect(ctx.destination);
source.onended = () => { setVoicePhase("idle"); };
source.start(0);
```

### Files to Modify
- `supabase/functions/elevenlabs-tts/index.ts` — voice, model, pace, loudness, response format
- `supabase/functions/chat/index.ts` — add max_tokens
- `src/components/AnvayaApp.jsx` — TTS playback via Web Audio API, simplified flow

