import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Try Sarvam AI first, fall back to ElevenLabs
  const SARVAM_API_KEY = Deno.env.get("SARVAM_API_KEY")?.trim();
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")?.trim();

  const { text, voiceId, lang } = await req.json();

  if (!text) {
    return new Response(JSON.stringify({ error: "text is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Sarvam AI TTS ──
  if (SARVAM_API_KEY) {
    try {
      // Map lang to Sarvam language code
      const targetLang = lang === "hi" ? "hi-IN" : "en-IN";

      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          target_language_code: targetLang,
          speaker: "anushka",
          model: "bulbul:v2",
          pitch: 0,
          pace: 1.0,
          loudness: 1.0,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Sarvam error:", response.status, errText);
        // Fall through to ElevenLabs if available
      } else {
        const data = await response.json();
        // Sarvam returns { audios: ["base64..."] }
        if (data.audios && data.audios[0]) {
          const audioBase64 = data.audios[0];
          // Decode base64 to binary WAV
          const binaryString = atob(audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          return new Response(bytes, {
            headers: {
              ...corsHeaders,
              "Content-Type": "audio/wav",
            },
          });
        }
      }
    } catch (error) {
      console.error("Sarvam TTS error:", error);
      // Fall through to ElevenLabs
    }
  }

  // ── ElevenLabs fallback ──
  if (!ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ error: "No TTS API key configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const selectedVoice = voiceId || "pFZP5JQG7iQjIQuC4Bku";

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.8,
            style: 0.6,
            use_speaker_boost: true,
            speed: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);
      return new Response(JSON.stringify({ error: `TTS failed: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
