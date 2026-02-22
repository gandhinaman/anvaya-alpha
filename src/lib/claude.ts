import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeRequest {
  messages: ChatMessage[];
  system?: string;
}

export async function askClaude({ messages, system }: ClaudeRequest): Promise<string> {
  const { data, error } = await supabase.functions.invoke("chat", {
    body: { messages, system },
  });

  if (error) {
    throw new Error(`Claude API error: ${error.message}`);
  }

  return data.response;
}
