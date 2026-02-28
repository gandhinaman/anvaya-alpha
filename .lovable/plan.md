

# Fix Orb Tap, Hindi Name, and Sarvam TTS Upgrade

## 1. Fix Orb Tap on iOS

**Problem**: The orb uses both `onPointerUp` and `onTouchEnd` (line 1082-1083 of AnvayaApp.jsx), which can double-fire on iOS WKWebView, causing the voice conversation to start and immediately cancel.

**Fix**: Replace both handlers with a single `onClick` handler plus a debounce guard ref to prevent double-invocation. The existing `touchAction: "manipulation"` and `WebkitTapHighlightColor: "transparent"` are already correct.

**File**: `src/components/AnvayaApp.jsx` (lines 1082-1083)
- Remove `onPointerUp` and `onTouchEnd`
- Add `onClick` with a simple timestamp-based guard (ignore taps within 400ms of each other)

## 2. Fix Hindi Name: आवा to एवा

Replace all occurrences of "आवा" with "एवा" across three files:

| File | Occurrences |
|------|-------------|
| `src/components/AnvayaApp.jsx` | 5 instances (title, subtitle, "Ask Ava" card, instruction text, voice prompt) |
| `src/components/sathi/SathiChat.jsx` | 2 instances (header, placeholder) |
| `src/components/sathi/MemoryRecorder.jsx` | 2 instances (listening prompt, processing text) |

## 3. Upgrade Sarvam TTS

**File**: `supabase/functions/elevenlabs-tts/index.ts`

Changes to the Sarvam TTS section:
- Upgrade model from `bulbul:v2` to `bulbul:v2` (keep v2 as v3 is not yet documented as GA; instead focus on param tuning)
- Add `enable_preprocessing: true` for better handling of numbers, abbreviations, and mixed-language text
- Adjust `pace` from `1.1` to `1.0` for clearer speech for elderly users
- Keep WAV output format (Sarvam returns base64 WAV natively; converting to MP3 would add latency)

These are the only three changes -- no new features or database modifications needed.

---

## Technical Details

### Orb click guard pattern
```text
const lastTapRef = useRef(0);
const handleOrbTap = () => {
  const now = Date.now();
  if (now - lastTapRef.current < 400) return;
  lastTapRef.current = now;
  startVoiceConversation();
};
// Then on the div: onClick={handleOrbTap}
```

### Files Modified
1. `src/components/AnvayaApp.jsx` -- orb handler + आवा to एवा
2. `src/components/sathi/SathiChat.jsx` -- आवा to एवा
3. `src/components/sathi/MemoryRecorder.jsx` -- आवा to एवा
4. `supabase/functions/elevenlabs-tts/index.ts` -- Sarvam TTS params
