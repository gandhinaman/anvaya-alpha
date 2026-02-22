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
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = system || SATHI_SYSTEM;

    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      stream: true,
    };

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json();
      throw new Error(errData.error?.message || "Anthropic API error");
    }

    // Stream the response using a TransformStream that collects full text
    const reader = anthropicRes.body!.getReader();
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
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  fullText += parsed.delta.text;
                  // Send each chunk as an SSE event
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
                  );
                }
              } catch {
                // skip unparseable lines
              }
            }
          }

          // Send done event
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

              // Try to find existing conversation for today
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
