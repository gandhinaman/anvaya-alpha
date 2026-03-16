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

  const truncatedText = text.length > 2400 ? text.slice(0, 2400) + "…" : text;
  const targetLang = lang === "hi" ? "hi-IN" : "en-IN";

  // Try streaming WebSocket first, fall back to batch API
  try {
    const audioChunks = await streamViaSarvamWS(truncatedText, targetLang, SARVAM_API_KEY);

    // Stream chunks as SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of audioChunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ audio: chunk, done: false })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (wsError) {
    console.error("WebSocket streaming failed, falling back to batch:", wsError);

    // Batch fallback — returns JSON with base64 audio (backward compat)
    try {
      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
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
          enable_preprocessing: true,
          pace: 1.15,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Sarvam TTS batch error:", response.status, errText);
        return new Response(JSON.stringify({ error: `TTS failed: ${response.status}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      if (data.audios && data.audios[0]) {
        return new Response(
          JSON.stringify({ audio: data.audios[0] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "No audio returned from Sarvam" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (batchError) {
      console.error("Batch TTS error:", batchError);
      return new Response(JSON.stringify({ error: batchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
});

/**
 * Connect to Sarvam TTS streaming WebSocket, send text, collect all audio chunks.
 * Returns an array of base64-encoded PCM audio strings.
 */
async function streamViaSarvamWS(
  text: string,
  targetLang: string,
  apiKey: string,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    let resolved = false;

    const ws = new WebSocket(
      `wss://api.sarvam.ai/text-to-speech/streaming?api_subscription_key=${apiKey}`
    );

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { ws.close(); } catch {}
        if (chunks.length > 0) {
          resolve(chunks);
        } else {
          reject(new Error("WebSocket timeout"));
        }
      }
    }, 15000);

    ws.onopen = () => {
      // 1. Send config
      ws.send(JSON.stringify({
        type: "config",
        data: {
          speaker: "priya",
          target_language_code: targetLang,
          pace: 1.15,
          min_buffer_size: 50,
          max_chunk_length: 200,
          output_audio_codec: "pcm",
        },
      }));

      // 2. Send text
      ws.send(JSON.stringify({
        type: "text",
        data: text,
      }));

      // 3. Flush
      ws.send(JSON.stringify({
        type: "flush",
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Audio chunks have data.audio field
        if (msg?.data?.audio) {
          chunks.push(msg.data.audio);
        }
        // Check for completion event
        if (msg?.data?.event_type === "final" || msg?.type === "completion") {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            try { ws.close(); } catch {}
            resolve(chunks);
          }
        }
      } catch {
        // non-JSON message, ignore
      }
    };

    ws.onclose = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (chunks.length > 0) {
          resolve(chunks);
        } else {
          reject(new Error("WebSocket closed without audio"));
        }
      }
    };

    ws.onerror = (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${err}`));
      }
    };
  });
}
