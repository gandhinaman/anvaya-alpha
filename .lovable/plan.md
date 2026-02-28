

## Fix Orb Audio on Mobile

### Problem Analysis
The orb voice flow breaks on mobile (especially iOS in Capacitor WebView) due to several issues:

1. **Web Speech API unavailable** in iOS WebView — falls back to WAV recorder, but that has its own problems
2. **AudioContext not resumed** — iOS requires an `AudioContext.resume()` call inside a user gesture before audio capture works
3. **WAV recorder sample rate** — `new AudioContext({ sampleRate: 16000 })` is often ignored on iOS; the actual sample rate may be 48000, producing garbled audio sent to STT
4. **TTS playback blocked** — `audio.play()` called after an async fetch (no user gesture context) is blocked by iOS autoplay policy
5. **ScriptProcessorNode deprecated** — unreliable on some mobile browsers

### Changes

**1. Fix `src/lib/wavRecorder.js` — Resample properly**
- Remove forced `sampleRate: 16000` from AudioContext constructor (let the device pick its native rate)
- After recording, resample from the actual `audioCtx.sampleRate` down to 16000 using linear interpolation
- This ensures the WAV sent to Sarvam STT is always valid 16kHz audio regardless of device

**2. Fix `src/components/AnvayaApp.jsx` — AudioContext + playback**
- **Pre-warm AudioContext on orb tap**: Create and `.resume()` an AudioContext on the user's click, before starting async operations — this "unlocks" audio on iOS
- **Pre-warm Audio element for TTS**: Create an `Audio` element and call `.play()` with a silent data URI during the initial tap gesture, so later programmatic playback isn't blocked
- **Better error handling**: If WAV fallback also fails, show a clear message instead of silently failing

**3. Add audio unlock utility `src/lib/audioUnlock.ts`**
- Small helper that creates a silent AudioContext + silent Audio element on user gesture
- Returns the unlocked AudioContext for reuse by the WAV recorder
- Called once on orb tap before any async work

### Technical Details

**wavRecorder.js resampling fix:**
```javascript
// Use device's native sample rate
const audioCtx = new AudioContext(); // no forced sampleRate
// ... record at native rate ...
// On stop: resample from audioCtx.sampleRate → 16000
function resample(samples, fromRate, toRate) {
  const ratio = fromRate / toRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const low = Math.floor(srcIndex);
    const high = Math.min(low + 1, samples.length - 1);
    const frac = srcIndex - low;
    result[i] = samples[low] * (1 - frac) + samples[high] * frac;
  }
  return result;
}
```

**AnvayaApp.jsx orb tap — unlock audio first:**
```javascript
const startVoiceConversation = async () => {
  // Unlock audio on iOS — must happen synchronously in gesture handler
  const silentCtx = new (window.AudioContext || window.webkitAudioContext)();
  await silentCtx.resume();
  silentCtx.close();
  
  // Pre-warm an Audio element for later TTS playback
  const warmup = new Audio("data:audio/wav;base64,UklGR...");
  warmup.play().catch(() => {});
  
  // ... rest of existing logic
};
```

**TTS playback fix — reuse pre-created Audio element:**
- Create the Audio element during the tap gesture and store in ref
- When TTS response arrives, set `.src` on the existing element instead of creating a new `Audio()`
- This bypasses iOS autoplay restrictions since the element was user-gesture-activated

