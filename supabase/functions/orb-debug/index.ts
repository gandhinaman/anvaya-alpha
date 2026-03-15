import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OrbDebugEntry = {
  ts?: string;
  sessionId?: string;
  userId?: string | null;
  linkedUserId?: string | null;
  lang?: string;
  phase?: string;
  message?: string;
  extra?: Record<string, unknown>;
};

const formatEntry = (entry: OrbDebugEntry, route?: string) => {
  const meta = entry.extra && Object.keys(entry.extra).length > 0 ? ` | meta=${JSON.stringify(entry.extra)}` : "";
  return `${entry.ts ?? new Date().toISOString()} | session=${entry.sessionId ?? "unknown"} | route=${route ?? "/sathi"} | user=${entry.userId ?? "anonymous"} | linked=${entry.linkedUserId ?? "none"} | lang=${entry.lang ?? "unknown"} | phase=${entry.phase ?? "unknown"} | ${entry.message ?? ""}${meta}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    let authUserId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      authUserId = user?.id ?? null;
    }

    const { entries, userId, route } = await req.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error("entries array is required");
    }

    const sanitizedEntries = entries
      .filter((entry): entry is OrbDebugEntry => !!entry && typeof entry.message === "string")
      .slice(-50)
      .map((entry) => ({
        ...entry,
        userId: authUserId ?? entry.userId ?? userId ?? null,
      }));

    if (sanitizedEntries.length === 0) {
      throw new Error("No valid entries provided");
    }

    const fileUserId = sanitizedEntries[0].userId ?? "anonymous";
    const filePath = `orb_debug/orb_debug_${fileUserId}.txt`;

    let existingText = "";
    const { data: existingFile, error: downloadError } = await supabase.storage
      .from("memories")
      .download(filePath);

    if (!downloadError && existingFile) {
      existingText = await existingFile.text();
    }

    const nextLines = sanitizedEntries.map((entry) => formatEntry(entry, route)).join("\n");
    const mergedText = [existingText.trimEnd(), nextLines].filter(Boolean).join("\n");
    const trimmedText = `${mergedText.split("\n").filter(Boolean).slice(-500).join("\n")}\n`;

    const { error: uploadError } = await supabase.storage
      .from("memories")
      .upload(filePath, new Blob([trimmedText], { type: "text/plain;charset=utf-8" }), {
        contentType: "text/plain;charset=utf-8",
        cacheControl: "0",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    return new Response(JSON.stringify({ success: true, filePath, linesAdded: sanitizedEntries.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("orb-debug error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});