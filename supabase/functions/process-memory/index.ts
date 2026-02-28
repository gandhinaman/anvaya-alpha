import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUMMARY_PROMPT = `You are analyzing a personal memory recording. You have access to BOTH the raw audio waveform AND the transcript text.

CRITICAL: Use the ACTUAL AUDIO SIGNAL to assess vocal_energy, emotional_state, and activity_level. Listen for real pitch variation, speech rate, pauses, trembling, breathing patterns, and tonal energy — do NOT guess these from words alone.
Use the TRANSCRIPT TEXT to assess cognitive_vitality (word retrieval, narrative coherence, vocabulary richness, recall accuracy).

Respond in this exact JSON format only, no other text:
{
  "title": "Short descriptive title, max 6 words, e.g. 'Childhood story about kite flying'",
  "summary": "2 warm sentences summarizing the memory",
  "emotional_tone": "one of: joyful, nostalgic, peaceful, concerned",
  "voice_metrics": {
    "vocal_energy": {
      "score": 0-100,
      "label": "one of: Low, Moderate, High, Very High",
      "detail": "Brief note on actual pitch range, volume variation, and tonal expressiveness heard in the audio"
    },
    "cognitive_vitality": {
      "score": 0-100,
      "label": "one of: Declining, Fair, Sharp, Very Sharp",
      "detail": "Brief note on word retrieval, narrative coherence, vocabulary richness, and recall accuracy from the transcript"
    },
    "emotional_state": {
      "score": 0-100,
      "label": "one of: Distressed, Tense, Calm, Serene",
      "detail": "Brief note on breathing patterns, vocal trembling, tonal warmth/tension heard in the audio"
    },
    "activity_level": {
      "score": 0-100,
      "label": "one of: Low, Moderate, Active, Very Active",
      "detail": "Brief note on speech pace, rhythm, and enthusiasm heard in the audio"
    }
  }
}

Scoring guidance (use AUDIO for first three, TRANSCRIPT for cognitive):
- vocal_energy (AUDIO): Listen to actual pitch range and volume dynamics. Flat monotone = low, wide pitch variation with emphasis = high.
- cognitive_vitality (TRANSCRIPT): Assess word-finding pauses, narrative coherence, vocabulary richness, temporal recall accuracy. Frequent hesitations or confused timelines = declining, fluent recall with rich detail = very sharp.
- emotional_state (AUDIO): Listen for vocal trembling, rushed breathing, sighing, tonal warmth vs tension. Trembling/rushed = distressed, warm/steady = calm/serene.
- activity_level (AUDIO): Listen to actual speech rate (words per minute), rhythmic energy, enthusiasm in delivery. Slow/lethargic = low, fast/energetic = very active.

Do NOT use generic titles like "Share a memory" or "Untitled".`;

const SUMMARY_PROMPT_TEXT_ONLY = `Analyze this personal memory recording from transcript text only (audio was too large for direct analysis). Respond in this exact JSON format only, no other text:
{
  "title": "Short descriptive title, max 6 words",
  "summary": "2 warm sentences summarizing the memory",
  "emotional_tone": "one of: joyful, nostalgic, peaceful, concerned",
  "voice_metrics": {
    "vocal_energy": {
      "score": 0-100,
      "label": "one of: Low, Moderate, High, Very High",
      "detail": "Inferred from linguistic cues (limited accuracy without audio)"
    },
    "cognitive_vitality": {
      "score": 0-100,
      "label": "one of: Declining, Fair, Sharp, Very Sharp",
      "detail": "Brief note on word retrieval, narrative coherence, vocabulary richness"
    },
    "emotional_state": {
      "score": 0-100,
      "label": "one of: Distressed, Tense, Calm, Serene",
      "detail": "Inferred from linguistic cues (limited accuracy without audio)"
    },
    "activity_level": {
      "score": 0-100,
      "label": "one of: Low, Moderate, Active, Very Active",
      "detail": "Inferred from linguistic cues (limited accuracy without audio)"
    }
  }
}

Do NOT use generic titles like "Share a memory" or "Untitled".`;

const VIDEO_VISUAL_PROMPT = `You are also analyzing a VIDEO recording of an elderly person. In addition to the audio/transcript analysis above, also provide a visual analysis section.

Carefully examine the video frame(s) for:
- Facial expression: Is the person calm, happy, distressed, neutral, or in pain?
- Apparent energy level: Do they look tired/low energy, moderate, or high energy?
- Environment: Note the background — is it tidy, well-lit, cluttered? Any safety concerns?
- Posture/mobility: Any visible posture issues, mobility aids, or movement concerns?
- Concerns: Any visual red flags (bruises, unkempt appearance, unsafe environment)?

Add this to your JSON response:
"visual_analysis": {
  "facial_expression": "one of: calm, happy, distressed, neutral, pain",
  "apparent_energy": "one of: low, moderate, high",
  "environment_notes": "Brief note on background, lighting, tidiness",
  "posture_mobility": "Brief note on visible posture or movement",
  "concerns": "Any visual red flags, or null if none"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, audioUrl, durationSeconds, promptQuestion, mediaType } = await req.json();

    // Step 1: Fetch the audio/video file and transcribe with Sarvam STT
    let transcript = "[Audio recording - transcription unavailable]";
    let audioBase64: string | null = null;
    let audioMimeType = "audio/webm";
    const isVideo = mediaType === "video";

    try {
      const fileRes = await fetch(audioUrl);
      if (fileRes.ok) {
        const fileBuffer = await fileRes.arrayBuffer();
        const bytes = new Uint8Array(fileBuffer);
        audioMimeType = isVideo ? "video/webm" : "audio/webm";

        // Keep audio bytes as base64 for multimodal analysis (under 5MB)
        if (bytes.length < 5 * 1024 * 1024) {
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          audioBase64 = btoa(binary);
          console.log(`Media base64 prepared: ${(bytes.length / 1024).toFixed(0)}KB, isVideo: ${isVideo}`);
        } else {
          console.log(`Media too large for multimodal (${(bytes.length / 1024 / 1024).toFixed(1)}MB), using text-only analysis`);
        }

        // Only attempt transcription if file is under 10MB
        if (bytes.length < 10 * 1024 * 1024) {
          const sarvamKey = Deno.env.get("SARVAM_API_KEY");

          if (sarvamKey) {
            const formData = new FormData();
            const blob = new Blob([bytes], { type: audioMimeType });
            formData.append("file", blob, "recording.webm");
            formData.append("model", "saarika:v2.5");
            formData.append("language_code", "unknown");
            formData.append("with_timestamps", "false");

            const sttRes = await fetch("https://api.sarvam.ai/speech-to-text", {
              method: "POST",
              headers: { "api-subscription-key": sarvamKey },
              body: formData,
            });

            if (sttRes.ok) {
              const sttData = await sttRes.json();
              transcript = sttData.transcript || transcript;
            } else {
              const errBody = await sttRes.text();
              console.error("Sarvam STT failed:", sttRes.status, errBody);
            }
          } else {
            console.error("SARVAM_API_KEY not configured, skipping transcription");
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

    // Step 2: Generate summary using Lovable AI Gateway
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    let title = promptQuestion || "A shared memory";
    let summary = transcript;
    let emotional_tone = "peaceful";
    let voice_metrics = null;
    let visual_analysis = null;

    if (aiKey) {
      try {
        // Build multimodal or text-only message
        const useMultimodal = !!audioBase64;
        const basePrompt = useMultimodal ? SUMMARY_PROMPT : SUMMARY_PROMPT_TEXT_ONLY;
        // Add visual analysis prompt for video recordings
        const fullPrompt = isVideo && useMultimodal
          ? `${basePrompt}\n\n${VIDEO_VISUAL_PROMPT}`
          : basePrompt;

        const promptText = `The person was asked this prompt: "${promptQuestion || 'Share a memory'}"\n\nHere is their transcribed response:\n\n"${transcript}"\n\n${fullPrompt}`;

        const messageContent = useMultimodal
          ? [
              { type: isVideo ? "input_video" : "input_audio", [isVideo ? "input_video" : "input_audio"]: { data: audioBase64, format: isVideo ? "webm" : "wav" } },
              { type: "text", text: promptText },
            ]
          : promptText;

        console.log(`Using ${useMultimodal ? "multimodal" : "text-only"} analysis, isVideo: ${isVideo}`);

        const summaryRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${aiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: messageContent },
            ],
          }),
        });

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          const rawText = summaryData.choices?.[0]?.message?.content || "";

          try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              title = parsed.title || title;
              summary = parsed.summary || summary;
              emotional_tone = parsed.emotional_tone || emotional_tone;
              voice_metrics = parsed.voice_metrics || null;
              visual_analysis = parsed.visual_analysis || null;
            }
          } catch {
            console.error("Failed to parse summary JSON:", rawText);
          }
        } else {
          const errBody = await summaryRes.text();
          console.error("AI summary failed:", errBody);
        }
      } catch (summaryErr) {
        console.error("Summary generation error:", summaryErr);
      }
    }

    // Step 3: Save to memories table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const vocalEnergyLabel = voice_metrics?.vocal_energy?.label || "Normal";

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
        vocal_energy: vocalEnergyLabel,
        prompt_question: promptQuestion || null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("DB insert error:", insertErr);
      throw new Error("Failed to save memory");
    }

    // Step 4: Save voice metrics as health_events
    if (voice_metrics) {
      const metricsToSave = [
        { event_type: "vocal_energy", value: voice_metrics.vocal_energy },
        { event_type: "cognitive_vitality", value: voice_metrics.cognitive_vitality },
        { event_type: "emotional_state", value: voice_metrics.emotional_state },
        { event_type: "activity_level", value: voice_metrics.activity_level },
      ].filter(m => m.value);

      if (metricsToSave.length > 0) {
        const { error: metricsErr } = await supabase
          .from("health_events")
          .insert(metricsToSave.map(m => ({
            user_id: userId,
            event_type: m.event_type,
            value: { ...m.value, memory_id: memoryRow.id },
          })));

        if (metricsErr) {
          console.error("Failed to save voice metrics:", metricsErr);
        }
      }
    }

    // Step 5: Save visual analysis as health_event (for video recordings)
    if (visual_analysis) {
      const { error: visualErr } = await supabase
        .from("health_events")
        .insert({
          user_id: userId,
          event_type: "visual_analysis",
          value: { ...visual_analysis, memory_id: memoryRow.id },
        });

      if (visualErr) {
        console.error("Failed to save visual analysis:", visualErr);
      }
    }

    return new Response(
      JSON.stringify({
        transcript,
        summary,
        title,
        emotional_tone,
        voice_metrics,
        visual_analysis,
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
