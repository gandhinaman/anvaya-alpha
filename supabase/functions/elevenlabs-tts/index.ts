const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SARVAM_API_KEY = Deno.env.get("SARVAM_API_KEY")?.trim();
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")?.trim();

  const { text, voiceId, lang } = await req.json();

  if (!text) {
    return new Response(JSON.stringify({ error: "text is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Truncate to stay within API limits
  const truncatedText = text.length > 2400 ? text.slice(0, 2400) + "…" : text;

  // ── Sarvam AI TTS (fast for Indian languages) ──
  if (SARVAM_API_KEY) {
    try {
      const targetLang = lang === "hi" ? "hi-IN" : "en-IN";

      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: truncatedText,
          target_language_code: targetLang,
          speaker: "anushka",
          model: "bulbul:v2",
          enable_preprocessing: true,
          pitch: 0,
          pace: 1.0,
          loudness: 1.0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audios && data.audios[0]) {
          const audioBase64 = data.audios[0];
          const binaryString = atob(audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return new Response(bytes, {
            headers: { ...corsHeaders, "Content-Type": "audio/wav" },
          });
        }
      } else {
        console.error("Sarvam error:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Sarvam TTS error:", error);
    }
  }

  // ── ElevenLabs streaming fallback (uses turbo model for speed) ──
  if (!ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ error: "No TTS API key configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const selectedVoice = voiceId || "pFZP5JQG7iQjIQuC4Bku";

  try {
    // Use streaming endpoint + turbo model for lowest latency
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}/stream?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.8,
            style: 0.4,
            use_speaker_boost: true,
            speed: 1.0,
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

    // Stream audio directly to client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
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
