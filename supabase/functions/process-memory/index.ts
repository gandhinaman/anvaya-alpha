import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUMMARY_PROMPT = `Summarize this personal memory in 2 warm sentences. Identify the emotional tone (one of: joyful, nostalgic, peaceful, concerned). Extract a short descriptive title (max 6 words) that captures what the memory is about — e.g. "Childhood story about kite flying" or "Favourite meal from the village". Do NOT use generic titles like "Share a memory" or "Untitled". Respond in this exact JSON format only, no other text:
{"title": "...", "summary": "...", "emotional_tone": "..."}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, audioUrl, durationSeconds, promptQuestion, mediaType } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Step 1: Fetch the audio/video file from storage URL and convert to base64
    let transcript = "[Audio recording - transcription unavailable]";
    
    try {
      const fileRes = await fetch(audioUrl);
      if (fileRes.ok) {
        const fileBuffer = await fileRes.arrayBuffer();
        const bytes = new Uint8Array(fileBuffer);
        
        // Only attempt transcription if file is under 10MB
        if (bytes.length < 10 * 1024 * 1024) {
          const base64 = btoa(String.fromCharCode(...bytes));
          const mimeType = mediaType === "video" ? "video/webm" : "audio/webm";

          const transcribeRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2048,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Please transcribe this audio recording accurately. The speaker may use English, Hindi, or a mix of both. Return only the transcription text, nothing else.",
                    },
                    {
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: mimeType,
                        data: base64,
                      },
                    },
                  ],
                },
              ],
            }),
          });

          if (transcribeRes.ok) {
            const transcribeData = await transcribeRes.json();
            transcript = transcribeData.content
              ?.filter((b: { type: string }) => b.type === "text")
              .map((b: { text: string }) => b.text)
              .join("") || transcript;
          } else {
            const errBody = await transcribeRes.text();
            console.error("Transcription failed:", errBody);
          }
        } else {
          console.error("File too large for transcription:", bytes.length);
        }
      } else {
        console.error("Failed to fetch audio file:", fileRes.status);
      }
    } catch (fetchErr) {
      console.error("Error fetching/transcribing audio:", fetchErr);
    }

    // Step 2: Generate summary, title, and emotional tone
    const summaryRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `The person was asked this prompt: "${promptQuestion || 'Share a memory'}"\n\nHere is their transcribed response:\n\n"${transcript}"\n\n${SUMMARY_PROMPT}`,
          },
        ],
      }),
    });

    let title = promptQuestion || "A shared memory";
    let summary = transcript;
    let emotional_tone = "peaceful";

    if (summaryRes.ok) {
      const summaryData = await summaryRes.json();
      const rawText = summaryData.content
        ?.filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("") || "";

      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          title = parsed.title || title;
          summary = parsed.summary || summary;
          emotional_tone = parsed.emotional_tone || emotional_tone;
        }
      } catch {
        console.error("Failed to parse summary JSON:", rawText);
      }
    } else {
      const errBody = await summaryRes.text();
      console.error("Summary failed:", errBody);
    }

    // Step 3: Save to memories table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: memoryRow, error: insertErr } = await supabase
      .from("memories")
      .insert({
        user_id: userId,
        title,
        transcript,
        ai_summary: summary,
        emotional_tone,
        audio_url: audioUrl,
        duration_seconds: durationSeconds || 0,
        vocal_energy: "Normal",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("DB insert error:", insertErr);
      throw new Error("Failed to save memory");
    }

    return new Response(
      JSON.stringify({
        transcript,
        summary,
        title,
        emotional_tone,
        id: memoryRow.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-memory error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
