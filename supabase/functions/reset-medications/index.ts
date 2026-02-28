import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Reset all daily medications where taken_today is true
    // and last_taken is from a previous day (UTC-based, runs at midnight IST = 18:30 UTC)
    const { data: dailyReset, error: dailyErr } = await supabase
      .from("medications")
      .update({ taken_today: false })
      .eq("frequency", "daily")
      .eq("taken_today", true)
      .select("id");

    // Reset weekly medications where last_taken is 7+ days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: weeklyReset, error: weeklyErr } = await supabase
      .from("medications")
      .update({ taken_today: false })
      .eq("frequency", "weekly")
      .eq("taken_today", true)
      .lt("last_taken", sevenDaysAgo.toISOString())
      .select("id");

    // Reset monthly medications where last_taken is from a previous month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const { data: monthlyReset, error: monthlyErr } = await supabase
      .from("medications")
      .update({ taken_today: false })
      .eq("frequency", "monthly")
      .eq("taken_today", true)
      .lt("last_taken", firstOfMonth.toISOString())
      .select("id");

    const resetCount =
      (dailyReset?.length || 0) +
      (weeklyReset?.length || 0) +
      (monthlyReset?.length || 0);

    console.log(`Reset ${resetCount} medications (daily: ${dailyReset?.length || 0}, weekly: ${weeklyReset?.length || 0}, monthly: ${monthlyReset?.length || 0})`);

    return new Response(
      JSON.stringify({ success: true, resetCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error resetting medications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
