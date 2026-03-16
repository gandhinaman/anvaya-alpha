import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Create admin user
  const { data, error } = await supabase.auth.admin.createUser({
    email: "admin@anvaya.com",
    password: "admin123",
    email_confirm: true,
    user_metadata: { full_name: "Admin", role: "admin" },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true, user_id: data.user.id }), { status: 200 });
});
