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

    let audioBytes: Uint8Array;
    let mime = "audio/wav";
    let ext = "audio.wav";

    const contentTypeHeader = req.headers.get("content-type") || "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      // New path: raw FormData blob from orb
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) throw new Error("file is required in FormData");

      audioBytes = new Uint8Array(await file.arrayBuffer());

      const fileType = file.type || "";
      if (fileType.includes("mp3") || fileType.includes("mpeg")) { mime = "audio/mp3"; ext = "audio.mp3"; }
      else if (fileType.includes("ogg")) { mime = "audio/ogg"; ext = "audio.ogg"; }
      else if (fileType.includes("wav")) { mime = "audio/wav"; ext = "audio.wav"; }

      console.log("FormData path - file type:", fileType, "bytes:", audioBytes.length);
    } else {
      // Legacy path: base64 JSON
      const { audioBase64, contentType } = await req.json();
      if (!audioBase64) throw new Error("audioBase64 is required");

      const binaryStr = atob(audioBase64);
      audioBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        audioBytes[i] = binaryStr.charCodeAt(i);
      }

      const ct = contentType || "audio/wav";
      if (ct.includes("mp3") || ct.includes("mpeg")) { mime = "audio/mp3"; ext = "audio.mp3"; }
      else if (ct.includes("ogg")) { mime = "audio/ogg"; ext = "audio.ogg"; }
      else if (ct.includes("flac")) { mime = "audio/flac"; ext = "audio.flac"; }
      else if (ct.includes("aac")) { mime = "audio/aac"; ext = "audio.aac"; }

      console.log("Base64 path - contentType:", ct, "bytes:", audioBytes.length);
    }

    // Build multipart form data for Sarvam Saaras v3
    const sarvamForm = new FormData();
    const blob = new Blob([audioBytes], { type: mime });
    sarvamForm.append("file", blob, ext);
    sarvamForm.append("model", "saaras:v3");
    sarvamForm.append("mode", "transcribe");

    console.log("Sending to Sarvam Saaras v3 with mime:", mime);

    const sttRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": sarvamKey },
      body: sarvamForm,
    });

    if (!sttRes.ok) {
      const errText = await sttRes.text();
      console.error("Sarvam STT error:", sttRes.status, errText);
      throw new Error(`Sarvam STT failed: ${sttRes.status}`);
    }

    const result = await sttRes.json();
    console.log("Saaras v3 result:", JSON.stringify(result));

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
