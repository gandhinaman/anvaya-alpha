import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Update password to admin123
  const { data, error } = await supabase.auth.admin.updateUserById(
    "3ce2bf42-4bd9-4da6-82c2-65528626e90e",
    { password: "admin123" }
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true }));
});
