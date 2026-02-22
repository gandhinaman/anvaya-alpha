import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a 6-digit code from a UUID (deterministic, last 6 hex digits converted to decimal)
function uuidToCode(uuid: string): string {
  const hex = uuid.replace(/-/g, "").slice(-6);
  const num = parseInt(hex, 16) % 1000000;
  return String(num).padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid token");

    const { action, code } = await req.json();

    if (action === "get-code") {
      // Return the parent's linking code
      const linkCode = uuidToCode(user.id);
      return new Response(JSON.stringify({ code: linkCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "link") {
      // Child enters the code — find the parent whose UUID ends match
      if (!code || code.length !== 6) {
        throw new Error("Invalid code. Please enter a 6-digit code.");
      }

      // Get all parent profiles and find which one matches the code
      const { data: parents, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "parent");

      if (pErr) throw pErr;

      const matchedParent = parents?.find(p => uuidToCode(p.id) === code);
      if (!matchedParent) {
        throw new Error("No parent found with this code. Please check and try again.");
      }

      // Update both profiles
      const { error: e1 } = await supabase
        .from("profiles")
        .update({ linked_user_id: matchedParent.id })
        .eq("id", user.id);

      const { error: e2 } = await supabase
        .from("profiles")
        .update({ linked_user_id: user.id })
        .eq("id", matchedParent.id);

      if (e1) throw e1;
      if (e2) throw e2;

      return new Response(
        JSON.stringify({ success: true, parent_name: matchedParent.full_name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
