

## Fix 3-Second Audio Delay

### Root Causes
1. **Full blob download before playback** — Both `AnvayaApp.jsx` and `SathiChat.jsx` do `await response.blob()` which waits for the entire TTS audio to download before playing. The edge function streams ElevenLabs audio, but the client buffers it all.
2. **`unlockAudio()` on every orb tap** — Creates a new AudioContext, resumes, plays silent audio, and waits — adds ~500ms+ on every tap, not just the first.

### Changes

**1. Stream audio playback in `AnvayaApp.jsx` `speakResponse()`**
- Replace `await response.blob()` with piping the response `ReadableStream` into a `MediaSource` (Chrome/Android) or fall back to blob for Safari/iOS
- Simpler cross-browser approach: Use `response.blob()` but start audio `.load()` earlier, or use a `Blob` stream reader with `URL.createObjectURL` on partial data
- **Simplest reliable fix**: Use `audio.src` with a service-worker-free approach — create a blob URL from a `new Response(response.body)` blob, but kick off the fetch and audio setup in parallel

**2. Stream audio playback in `SathiChat.jsx` `speakText()`**
- Same fix as above

**3. Only unlock audio once in `AnvayaApp.jsx`**
- Move `unlockAudio()` behind a guard: skip if `preWarmedAudioRef.current` already exists
- This eliminates repeated ~500ms overhead on subsequent taps

**4. Optimize edge function: add `Cache-Control` header**
- Won't help first load but prevents re-fetching identical responses

### Implementation Detail

The most impactful and reliable cross-browser fix:

**`AnvayaApp.jsx` — skip unlock if already done:**
```javascript
if (!preWarmedAudioRef.current) {
  const { unlockAudio } = await import("@/lib/audioUnlock");
  preWarmedAudioRef.current = await unlockAudio();
}
```

**`AnvayaApp.jsx` `speakResponse()` — stream via MediaSource where supported, blob fallback:**
```javascript
// Try streaming playback first (Chrome/Android)
if (window.MediaSource && MediaSource.isTypeSupported('audio/mpeg')) {
  const mediaSource = new MediaSource();
  audio.src = URL.createObjectURL(mediaSource);
  mediaSource.addEventListener('sourceopen', async () => {
    const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
    const reader = response.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { mediaSource.endOfStream(); return; }
      sourceBuffer.appendBuffer(value);
      sourceBuffer.addEventListener('updateend', pump, { once: true });
    };
    pump();
  });
  audio.play();
} else {
  // iOS/Safari fallback — blob approach (no MediaSource for mp3)
  const blob = await response.blob();
  audio.src = URL.createObjectURL(blob);
  await audio.play();
}
```

**`SathiChat.jsx` `speakText()` — same streaming approach**

**Files to change:**
- `src/components/AnvayaApp.jsx` — guard `unlockAudio`, stream TTS playback
- `src/components/sathi/SathiChat.jsx` — stream TTS playback

