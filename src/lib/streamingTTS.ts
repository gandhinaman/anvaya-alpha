/**
 * Streaming TTS helper — progressive audio playback from Sarvam HTTP stream.
 * The edge function returns a binary MP3 stream. We use MediaSource on
 * supported browsers, and blob fallback on iOS Safari.
 * Falls back to batch JSON response automatically.
 */

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
 * Decode base64 string to Uint8Array (for batch fallback)
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function streamTTS(options: StreamTTSOptions): StreamTTSController {
  const { text, lang, audioContext, onStart, onEnd, onError } = options;
  let stopped = false;
  let audio: HTMLAudioElement | null = null;
  let source: AudioBufferSourceNode | null = null;

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

      // Binary audio stream (MP3) — primary path
      if (contentType.includes("audio/mpeg") || contentType.includes("audio/")) {
        // Check if MediaSource is supported (Chrome, Android) for progressive playback
        const canUseMediaSource =
          typeof MediaSource !== "undefined" &&
          MediaSource.isTypeSupported("audio/mpeg");

        if (canUseMediaSource && res.body) {
          // Progressive playback via MediaSource
          audio = new Audio();
          const mediaSource = new MediaSource();
          audio.src = URL.createObjectURL(mediaSource);

          const audioEl = audio;

          await new Promise<void>((resolve, reject) => {
            mediaSource.addEventListener(
              "sourceopen",
              async () => {
                try {
                  const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
                  const reader = res.body!.getReader();
                  let started = false;

                  const pump = async () => {
                    if (stopped) return;
                    const { done, value } = await reader.read();
                    if (done) {
                      if (mediaSource.readyState === "open") {
                        // Wait for sourceBuffer to finish before ending
                        if (sourceBuffer.updating) {
                          sourceBuffer.addEventListener("updateend", () => {
                            try { mediaSource.endOfStream(); } catch {}
                          }, { once: true });
                        } else {
                          try { mediaSource.endOfStream(); } catch {}
                        }
                      }
                      return;
                    }
                    sourceBuffer.appendBuffer(value);
                    if (!started) {
                      started = true;
                      onStart?.();
                      audioEl.play().catch(() => {});
                    }
                    sourceBuffer.addEventListener("updateend", pump, { once: true });
                  };
                  pump();
                  resolve();
                } catch (err) {
                  reject(err);
                }
              },
              { once: true }
            );
          });

          audioEl.onended = () => {
            if (!stopped) onEnd?.();
          };
          audioEl.onerror = () => {
            if (!stopped) onEnd?.();
          };
        } else {
          // iOS Safari / no MediaSource — blob fallback (still faster than batch
          // since the HTTP stream starts sending sooner than full synthesis)
          const blob = await res.blob();
          if (stopped) return;

          audio = new Audio();
          audio.src = URL.createObjectURL(blob);
          onStart?.();
          audio.onended = () => {
            if (!stopped) onEnd?.();
          };
          audio.onerror = () => {
            if (!stopped) onEnd?.();
          };
          await audio.play();
        }
        return;
      }

      // JSON fallback (batch response with base64 audio)
      const data = await res.json();
      if (stopped) return;

      if (!data.audio) throw new Error("No audio in response");

      const bytes = base64ToBytes(data.audio);
      const arrayBuffer = bytes.buffer.slice(0) as ArrayBuffer;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if (stopped) return;

      source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      onStart?.();
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
      if (audio) {
        try {
          audio.pause();
          audio.src = "";
        } catch {}
        audio = null;
      }
      if (source) {
        try { source.stop(); } catch {}
        source = null;
      }
    },
  };
}
