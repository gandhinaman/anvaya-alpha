const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sarvamKey = Deno.env.get("SARVAM_API_KEY");
    if (!sarvamKey) {
      throw new Error("SARVAM_API_KEY not configured");
    }

    const { audioBase64, contentType, languageCode } = await req.json();

    if (!audioBase64) {
      throw new Error("audioBase64 is required");
    }

    // Decode base64 to binary
    const binaryStr = atob(audioBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Build multipart form data for Sarvam
    const formData = new FormData();
    const blob = new Blob([bytes], { type: contentType || "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "saarika:v2.5");
    formData.append("language_code", languageCode || "unknown");
    formData.append("with_timestamps", "false");

    const sttRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamKey,
      },
      body: formData,
    });

    if (!sttRes.ok) {
      const errText = await sttRes.text();
      console.error("Sarvam STT error:", sttRes.status, errText);
      throw new Error(`Sarvam STT failed: ${sttRes.status}`);
    }

    const result = await sttRes.json();

    return new Response(
      JSON.stringify({ transcript: result.transcript || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sarvam-stt error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
