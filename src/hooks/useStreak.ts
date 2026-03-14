import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Computes a daily recording streak from memories.
 * A streak = consecutive calendar days (local time) with ≥1 memory, ending today or yesterday.
 */
export function computeStreak(dates: string[]): { current: number; longest: number; recordedToday: boolean } {
  if (dates.length === 0) return { current: 0, longest: 0, recordedToday: false };

  // Get unique local dates (YYYY-MM-DD)
  const uniqueDays = [...new Set(dates.map(d => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }))].sort().reverse(); // most recent first

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

  const recordedToday = uniqueDays[0] === todayStr;

  // Current streak: consecutive days ending today or yesterday
  let current = 0;
  if (uniqueDays[0] === todayStr || uniqueDays[0] === yesterdayStr) {
    let expected = new Date(uniqueDays[0]);
    for (const day of uniqueDays) {
      const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, "0")}-${String(expected.getDate()).padStart(2, "0")}`;
      if (day === expectedStr) {
        current++;
        expected.setDate(expected.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Longest streak
  const sorted = [...uniqueDays].sort(); // ascending
  let longest = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  return { current, longest, recordedToday };
}

/** Hook for senior's own streak */
export function useStreak(userId: string | null) {
  const [streak, setStreak] = useState({ current: 0, longest: 0, recordedToday: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("memories")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (data) {
        const dates = data.map(m => m.created_at).filter(Boolean) as string[];
        setStreak(computeStreak(dates));
      }
      setLoading(false);
    };

    fetch();

    // Refresh on new memories
    const ch = supabase
      .channel(`streak-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "memories" }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  return { ...streak, loading };
}
