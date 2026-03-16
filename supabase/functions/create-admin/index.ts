import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // First try to create the user
    const { data, error } = await supabase.auth.admin.createUser({
      email: "admin@anvaya.com",
      password: "admin1234",
      email_confirm: true,
    });

    if (error) {
      console.error("Auth error:", error.message, error.status, error.code);
      
      // If user exists, try to get them
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users?.find(u => u.email === "admin@anvaya.com");
      
      if (existing) {
        // Update their profile to admin
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ role: "admin", full_name: "Admin" })
          .eq("id", existing.id);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Existing user updated to admin",
          user_id: existing.id,
          updateError: updateErr?.message
        }));
      }
      
      return new Response(JSON.stringify({ error: error.message, code: error.code }), { status: 400 });
    }

    // Update the profile role to admin (trigger may have set it wrong)
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ role: "admin", full_name: "Admin" })
      .eq("id", data.user.id);

    console.log("Profile update:", profileErr?.message || "success");

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: data.user.id,
      profileUpdate: profileErr?.message || "ok"
    }));
  } catch (e) {
    console.error("Caught:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
