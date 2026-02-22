import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SATHI_SYSTEM = `You are Sathi, a warm and culturally sensitive AI companion for elderly Indian users. Respond in the user's chosen language (Hindi or English). Keep responses short, warm, and clear. You can help with health reminders, telling stories, answering questions, and providing companionship. Never give medical diagnoses. If the user seems distressed, gently suggest calling their family member.`;

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

    const systemPrompt = system || SATHI_SYSTEM;

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
