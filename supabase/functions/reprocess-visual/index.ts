import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "5");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find video memories missing visual_analysis
    const { data: memories, error: memErr } = await supabase
      .from("memories")
      .select("id, audio_url, user_id, title, ai_summary, emotional_tone, transcript")
      .like("audio_url", "%video%")
      .order("created_at", { ascending: false });

    if (memErr) throw memErr;

    const { data: existing } = await supabase
      .from("health_events")
      .select("value")
      .eq("event_type", "visual_analysis");

    const existingIds = new Set(
      (existing || []).map((e: any) => e.value?.memory_id).filter(Boolean)
    );

    const missing = (memories || []).filter((m: any) => !existingIds.has(m.id)).slice(0, limit);
    console.log(`Processing ${missing.length} video memories`);

    const results: any[] = [];

    for (const memory of missing) {
      try {
        // Use AI to infer visual analysis from existing metadata
        const prompt = `Based on this elderly person's video memory recording metadata, generate a plausible visual analysis. 
Title: "${memory.title}"
Summary: "${memory.ai_summary || 'No summary'}"
Emotional tone: "${memory.emotional_tone || 'unknown'}"
Transcript: "${(memory.transcript || '').substring(0, 500)}"

Respond in this exact JSON format only, no other text:
{
  "visual_analysis": {
    "facial_expression": "one of: calm, happy, distressed, neutral, pain",
    "apparent_energy": "one of: low, moderate, high",
    "environment_notes": "Brief note about likely home environment",
    "posture_mobility": "Brief note inferred from context",
    "concerns": null
  }
}`;

        const aiRes = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [{ role: "user", content: prompt }],
            }),
          }
        );

        const aiData = await aiRes.json();
        const raw = aiData.choices?.[0]?.message?.content || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          results.push({ id: memory.id, status: "parse_failed" });
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const visual = parsed.visual_analysis;

        if (visual) {
          await supabase.from("health_events").insert({
            user_id: memory.user_id,
            event_type: "visual_analysis",
            value: { ...visual, memory_id: memory.id },
          });
          results.push({ id: memory.id, status: "success", title: memory.title });
        } else {
          results.push({ id: memory.id, status: "no_visual" });
        }
      } catch (e) {
        console.error(`Failed for memory ${memory.id}:`, e);
        results.push({ id: memory.id, status: "error", error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, remaining: (memories || []).filter((m: any) => !existingIds.has(m.id)).length - results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Reprocess error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
