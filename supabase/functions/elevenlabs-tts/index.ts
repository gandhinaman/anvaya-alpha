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

  const { text, lang } = await req.json();

  if (!text) {
    return new Response(JSON.stringify({ error: "text is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SARVAM_API_KEY) {
    return new Response(JSON.stringify({ error: "SARVAM_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const truncatedText = text.length > 3400 ? text.slice(0, 3400) + "…" : text;
  const targetLang = lang === "hi" ? "hi-IN" : "en-IN";

  try {
    // Use Sarvam HTTP streaming endpoint — returns binary audio stream directly
    const response = await fetch("https://api.sarvam.ai/text-to-speech/stream", {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: truncatedText,
        target_language_code: targetLang,
        speaker: "priya",
        model: "bulbul:v3",
        output_audio_codec: "mp3",
        output_audio_bitrate: "128k",
        pace: 1.15,
        enable_preprocessing: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam TTS stream error:", response.status, errText);

      // Fall back to batch API
      return await batchFallback(truncatedText, targetLang, SARVAM_API_KEY);
    }

    // Proxy the binary audio stream directly to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Streaming TTS error, trying batch fallback:", error);
    try {
      return await batchFallback(truncatedText, targetLang, SARVAM_API_KEY);
    } catch (batchErr) {
      console.error("Batch TTS also failed:", batchErr);
      return new Response(JSON.stringify({ error: batchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
});

async function batchFallback(text: string, targetLang: string, apiKey: string) {
  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      target_language_code: targetLang,
      speaker: "priya",
      model: "bulbul:v3",
      enable_preprocessing: true,
      pace: 1.15,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Batch TTS failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (data.audios && data.audios[0]) {
    return new Response(
      JSON.stringify({ audio: data.audios[0] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  throw new Error("No audio returned from batch API");
}
