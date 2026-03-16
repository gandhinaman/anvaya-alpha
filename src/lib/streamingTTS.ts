/**
 * Streaming TTS helper — handles SSE parsing and progressive PCM playback.
 * Falls back to batch JSON response automatically.
 * Works on iOS Safari (no MediaSource dependency).
 */

const SAMPLE_RATE = 22050; // Sarvam PCM default

interface StreamTTSOptions {
  text: string;
  lang: string;
  audioContext: AudioContext;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

interface StreamTTSController {
  stop: () => void;
}

/**
 * Decode base64 string to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert 16-bit PCM (little-endian, mono) to Float32Array for Web Audio API
 */
function pcm16ToFloat32(pcmBytes: Uint8Array): Float32Array {
  const samples = pcmBytes.length / 2;
  const float32 = new Float32Array(samples);
  const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
  for (let i = 0; i < samples; i++) {
    const int16 = view.getInt16(i * 2, true); // little-endian
    float32[i] = int16 / 32768;
  }
  return float32;
}

/**
 * Stream TTS audio from the edge function with progressive playback.
 * Returns a controller with stop().
 */
export function streamTTS(options: StreamTTSOptions): StreamTTSController {
  const { text, lang, audioContext, onStart, onEnd, onError } = options;
  let stopped = false;
  let scheduledSources: AudioBufferSourceNode[] = [];
  let nextPlayTime = 0;
  let started = false;

  const run = async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      await audioContext.resume();

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ text, lang }),
        }
      );

      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
      if (stopped) return;

      const contentType = res.headers.get("content-type") || "";

      // SSE streaming path
      if (contentType.includes("text/event-stream")) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        nextPlayTime = audioContext.currentTime + 0.05; // small initial delay

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.done === true) {
                // Schedule end callback after last buffer plays
                const endDelay = Math.max(0, (nextPlayTime - audioContext.currentTime) * 1000);
                setTimeout(() => { if (!stopped) onEnd?.(); }, endDelay);
                return;
              }

              if (parsed.audio && !stopped) {
                const pcmBytes = base64ToBytes(parsed.audio);
                const float32 = pcm16ToFloat32(pcmBytes);

                const audioBuffer = audioContext.createBuffer(1, float32.length, SAMPLE_RATE);
                audioBuffer.getChannelData(0).set(float32);

                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                scheduledSources.push(source);

                // Schedule playback
                if (nextPlayTime < audioContext.currentTime) {
                  nextPlayTime = audioContext.currentTime;
                }
                source.start(nextPlayTime);
                nextPlayTime += audioBuffer.duration;

                if (!started) {
                  started = true;
                  onStart?.();
                }
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        // If we get here without a done message, still fire onEnd
        if (!stopped) {
          const endDelay = Math.max(0, (nextPlayTime - audioContext.currentTime) * 1000);
          setTimeout(() => { if (!stopped) onEnd?.(); }, endDelay);
        }
        return;
      }

      // Batch JSON fallback (backward compat with old response format)
      const data = await res.json();
      if (stopped) return;

      if (!data.audio) throw new Error("No audio in response");

      const bytes = base64ToBytes(data.audio);
      const arrayBuffer = bytes.buffer.slice(0) as ArrayBuffer;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if (stopped) return;

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      scheduledSources.push(source);

      if (!started) {
        started = true;
        onStart?.();
      }

      source.onended = () => {
        if (!stopped) onEnd?.();
      };
      source.start(0);
    } catch (err) {
      if (!stopped) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  run();

  return {
    stop: () => {
      stopped = true;
      for (const s of scheduledSources) {
        try { s.stop(); } catch {}
      }
      scheduledSources = [];
    },
  };
}
