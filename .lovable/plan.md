

## Plan: Use Gemini Multimodal Audio Analysis for Voice Metrics

### Problem
Voice metrics (vocal energy, cognitive vitality, emotional state, activity level) are currently inferred purely from **transcript text** by the LLM. This means metrics like pitch range, speech pace, and tonal stress are guessed from words, not measured from actual audio.

### Solution
Gemini natively supports **multimodal audio input** — we can send the raw audio file alongside the transcript to Gemini, letting it analyze actual vocal characteristics (pitch, energy, pace, breathing patterns) directly from the audio waveform.

### Changes

**File: `supabase/functions/process-memory/index.ts`**

1. After fetching and transcribing the audio (Step 1), convert the audio bytes to **base64** and include them as an inline multimodal part in the Gemini request.
2. Update the Gemini API call (Step 2) to use a **multimodal message** with two parts:
   - An `inline_data` part containing the audio as base64 with its MIME type (`audio/webm`)
   - A `text` part with the existing analysis prompt, now instructing Gemini to analyze the **actual audio signal** for pitch variation, speech rate, pauses, trembling, and energy — not just the transcript
3. Update the `SUMMARY_PROMPT` to emphasize that Gemini should use the **audio waveform** for vocal_energy, emotional_state, and activity_level scoring, while using the **transcript** for cognitive_vitality (word retrieval, coherence, vocabulary).

### Technical Detail

The Lovable AI Gateway is OpenAI-compatible, and Gemini multimodal works by passing content as an array of parts:

```typescript
messages: [{
  role: "user",
  content: [
    {
      type: "input_audio",
      input_audio: { data: base64Audio, format: "wav" }
    },
    {
      type: "text",
      text: `Transcript: "${transcript}"\n\n${SUMMARY_PROMPT}`
    }
  ]
}]
```

If the audio exceeds a size threshold (e.g. 5MB base64), fall back to transcript-only analysis as today. The prompt will be updated to distinguish audio-derived metrics from text-derived metrics clearly.

