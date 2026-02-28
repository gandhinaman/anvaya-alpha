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

    console.log("Received audio, contentType:", contentType, "base64 length:", audioBase64.length, "language:", languageCode);

    // Decode base64 to binary
    const binaryStr = atob(audioBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    console.log("Decoded audio bytes:", bytes.length);

    // Determine proper MIME type and extension for Sarvam
    // Sarvam supports: wav, mp3, aac, flac, ogg — NOT webm
    // Browser MediaRecorder typically produces webm/opus
    // We'll send as ogg since opus codec is compatible with ogg container
    const ct = contentType || "audio/webm";
    let sarvamMime = "audio/ogg";
    let sarvamExt = "audio.ogg";
    
    if (ct.includes("wav")) {
      sarvamMime = "audio/wav";
      sarvamExt = "audio.wav";
    } else if (ct.includes("mp3") || ct.includes("mpeg")) {
      sarvamMime = "audio/mp3";
      sarvamExt = "audio.mp3";
    } else if (ct.includes("ogg")) {
      sarvamMime = "audio/ogg";
      sarvamExt = "audio.ogg";
    }
    // For webm/opus, try sending as-is with wav label as fallback
    // Many APIs can handle webm even when not listed

    // Build multipart form data for Sarvam
    const formData = new FormData();
    const blob = new Blob([bytes], { type: sarvamMime });
    formData.append("file", blob, sarvamExt);
    formData.append("model", "saarika:v2.5");
    formData.append("language_code", languageCode || "unknown");
    formData.append("with_timestamps", "false");

    console.log("Sending to Sarvam with mime:", sarvamMime, "ext:", sarvamExt);

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
      
      // If ogg fails, retry with wav mime type
      if (sarvamMime === "audio/ogg") {
        console.log("Retrying with audio/wav...");
        const formData2 = new FormData();
        const blob2 = new Blob([bytes], { type: "audio/wav" });
        formData2.append("file", blob2, "audio.wav");
        formData2.append("model", "saarika:v2.5");
        formData2.append("language_code", languageCode || "unknown");
        formData2.append("with_timestamps", "false");

        const sttRes2 = await fetch("https://api.sarvam.ai/speech-to-text", {
          method: "POST",
          headers: {
            "api-subscription-key": sarvamKey,
          },
          body: formData2,
        });

        if (!sttRes2.ok) {
          const errText2 = await sttRes2.text();
          console.error("Sarvam STT retry error:", sttRes2.status, errText2);
          
          // Final retry: send with original webm type
          console.log("Final retry with original webm...");
          const formData3 = new FormData();
          const blob3 = new Blob([bytes], { type: ct });
          formData3.append("file", blob3, "audio.webm");
          formData3.append("model", "saarika:v2.5");
          formData3.append("language_code", languageCode || "unknown");
          formData3.append("with_timestamps", "false");

          const sttRes3 = await fetch("https://api.sarvam.ai/speech-to-text", {
            method: "POST",
            headers: {
              "api-subscription-key": sarvamKey,
            },
            body: formData3,
          });

          if (!sttRes3.ok) {
            const errText3 = await sttRes3.text();
            console.error("Sarvam STT final retry error:", sttRes3.status, errText3);
            throw new Error(`Sarvam STT failed after retries: ${sttRes3.status}`);
          }

          const result3 = await sttRes3.json();
          console.log("Sarvam result (webm retry):", JSON.stringify(result3));
          return new Response(
            JSON.stringify({ transcript: result3.transcript || "" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const result2 = await sttRes2.json();
        console.log("Sarvam result (wav retry):", JSON.stringify(result2));
        return new Response(
          JSON.stringify({ transcript: result2.transcript || "" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Sarvam STT failed: ${sttRes.status}`);
    }

    const result = await sttRes.json();
    console.log("Sarvam result:", JSON.stringify(result));

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
