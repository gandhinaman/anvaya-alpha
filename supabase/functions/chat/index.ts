import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SATHI_SYSTEM = `You are Ava, a warm and friendly AI companion for elderly Indian users. Respond in the user's chosen language (Hindi or English).

CRITICAL RULES:
- Keep replies to 1-3 sentences MAX. Be brief like a real conversation.
- Sound natural and chatty, like a caring friend — not a textbook.
- Use simple, everyday words. No jargon or long explanations.
- If asked a factual question, give a direct short answer first, then maybe one friendly follow-up line.
- Never give medical diagnoses. If health concerns arise, gently suggest talking to their doctor or family.
- If the user seems distressed, warmly suggest calling their family member.
- Use light humor and warmth when appropriate.
- If you know the user's medication schedule, naturally weave in gentle reminders when relevant (e.g. "Have you taken your morning medicine?") — but don't nag.
- Reference the user's interests and health conditions to make conversations personal and warm.
- If the user has health conditions listed, be aware of them but don't constantly bring them up unless relevant.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, system, userId } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build personalized system prompt with user context
    let systemPrompt = system || SATHI_SYSTEM;

    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: profile } = await supabase.from("profiles")
          .select("full_name, age, health_issues, interests, location, language")
          .eq("id", userId).maybeSingle();

        const { data: meds } = await supabase.from("medications")
          .select("name, dose, scheduled_time, taken_today")
          .eq("user_id", userId);

        if (profile || (meds && meds.length > 0)) {
          let context = "\n\nUSER CONTEXT (use naturally, don't recite):";
          if (profile?.full_name) context += `\n- Name: ${profile.full_name}`;
          if (profile?.age) context += `\n- Age: ${profile.age}`;
          if (profile?.location) context += `\n- Location: ${profile.location}`;
          if (profile?.health_issues?.length) context += `\n- Health conditions: ${profile.health_issues.join(", ")}`;
          if (profile?.interests?.length) context += `\n- Interests: ${profile.interests.join(", ")}`;
          if (meds && meds.length > 0) {
            context += `\n- Medications:`;
            meds.forEach(m => {
              const taken = m.taken_today ? " (taken today ✓)" : " (NOT yet taken today)";
              context += `\n  · ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.scheduled_time ? ` at ${m.scheduled_time}` : ""}${taken}`;
            });
          }
          systemPrompt += context;
        }
      } catch (ctxErr) {
        console.error("Failed to load user context:", ctxErr);
      }
    }

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const errData = await aiRes.text();
      throw new Error(`AI Gateway error: ${errData}`);
    }

    const reader = aiRes.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`)
                  );
                }
              } catch {
                // skip unparseable lines
              }
            }
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();

          // Save conversation to DB after streaming completes
          if (userId) {
            try {
              const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
              const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
              const supabase = createClient(supabaseUrl, supabaseKey);

              const allMessages = [
                ...messages,
                { role: "assistant", content: fullText },
              ];

              const today = new Date().toISOString().split("T")[0];
              const { data: existing } = await supabase
                .from("conversations")
                .select("id")
                .eq("user_id", userId)
                .gte("created_at", today)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

              if (existing) {
                await supabase
                  .from("conversations")
                  .update({ messages: allMessages })
                  .eq("id", existing.id);
              } else {
                await supabase
                  .from("conversations")
                  .insert({ user_id: userId, messages: allMessages });
              }
            } catch (dbErr) {
              console.error("Failed to save conversation:", dbErr);
            }
          }
        } catch (err) {
          controller.error(err);
        }
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
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
