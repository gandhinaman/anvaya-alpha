import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ParentProfile {
  id: string;
  full_name: string | null;
  role: string;
  language: string | null;
}

interface Memory {
  id: string;
  title: string | null;
  ai_summary: string | null;
  emotional_tone: string | null;
  vocal_energy: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  created_at: string | null;
  transcript: string | null;
  prompt_question: string | null;
}

interface Medication {
  id: string;
  name: string;
  dose: string | null;
  scheduled_time: string | null;
  taken_today: boolean | null;
  last_taken: string | null;
}

interface HealthEvent {
  id: string;
  event_type: string;
  value: any;
  recorded_at: string | null;
}

interface Stats {
  vocalEnergy: { value: string; trend: string };
  cognitiveClarity: { value: string; trend: string };
  emotionalTone: { value: string; trend: string };
  activityLevel: { value: string; trend: string };
}

function weightedAggregateByType(healthEvents: HealthEvent[], types: string[]): { score: number | null; label: string; trend: string } {
  const events = healthEvents.filter(e => types.includes(e.event_type) && e.value?.score != null);
  if (events.length === 0) {
    // Fallback to latest event label
    const latest = healthEvents.filter(e => types.includes(e.event_type));
    if (latest.length > 0) {
      return { score: null, label: latest[0]?.value?.label || "No data", trend: latest[0]?.value?.detail || "—" };
    }
    return { score: null, label: "No data", trend: "—" };
  }

  const now = new Date();
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  // Split into recent (0-2 days, 50% weight) and older (2-7 days, 50% weight)
  const recent: number[] = [];
  const older: number[] = [];
  for (const e of events) {
    const d = new Date(e.recorded_at || "");
    if (d >= twoDaysAgo) {
      recent.push(e.value.score);
    } else {
      older.push(e.value.score);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const recentAvg = avg(recent);
  const olderAvg = avg(older);

  let finalScore: number;
  if (recentAvg != null && olderAvg != null) {
    finalScore = Math.round(recentAvg * 0.5 + olderAvg * 0.5);
  } else if (recentAvg != null) {
    finalScore = Math.round(recentAvg);
  } else {
    finalScore = Math.round(olderAvg!);
  }

  // Latest event for label/trend
  const latest = events[0];
  const label = latest?.value?.label || "No data";
  const trend = latest?.value?.detail || "—";

  return { score: finalScore, label, trend };
}

function deriveStats(healthEvents: HealthEvent[], _memories: Memory[]): Stats {
  const vocal = weightedAggregateByType(healthEvents, ["vocal_energy"]);
  const cog = weightedAggregateByType(healthEvents, ["cognitive_vitality", "cognitive_clarity"]);
  const emo = weightedAggregateByType(healthEvents, ["emotional_state"]);
  const act = weightedAggregateByType(healthEvents, ["activity_level"]);

  return {
    vocalEnergy: { value: vocal.score != null ? `${vocal.score}%` : vocal.label, trend: vocal.score != null ? capitalize(vocal.label) : vocal.trend },
    cognitiveClarity: { value: cog.score != null ? `${cog.score}%` : cog.label, trend: cog.score != null ? capitalize(cog.label) : cog.trend },
    emotionalTone: { value: emo.score != null ? `${emo.score}%` : capitalize(emo.label), trend: emo.score != null ? capitalize(emo.label) : emo.trend },
    activityLevel: { value: act.score != null ? `${act.score}%` : capitalize(act.label), trend: act.score != null ? capitalize(act.label) : act.trend },
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function useParentData(profileId: string | null) {
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [memoryReactions, setMemoryReactions] = useState<Record<string, any[]>>({});
  const [memoriesLastViewedAt, setMemoriesLastViewedAt] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!profileId) { setLoading(false); return; }

    try {
      // Get linked parent's user_id from the child's profile
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("linked_user_id")
        .eq("id", profileId)
        .maybeSingle();

      const parentId = myProfile?.linked_user_id;
      if (!parentId) { setLoading(false); return; }

      // Fetch parent profile
      const { data: pp } = await supabase
        .from("profiles")
        .select("id, full_name, role, language")
        .eq("id", parentId)
        .maybeSingle();
      if (pp) setParentProfile(pp as ParentProfile);

      // Fetch last 10 memories
      const { data: mems } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", parentId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (mems) setMemories(mems as Memory[]);

      // Fetch medications
      const { data: meds } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", parentId);
      if (meds) setMedications(meds as Medication[]);

      // Fetch health events from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: hevts } = await supabase
        .from("health_events")
        .select("*")
        .eq("user_id", parentId)
        .gte("recorded_at", sevenDaysAgo.toISOString())
        .order("recorded_at", { ascending: false });
      if (hevts) setHealthEvents(hevts as HealthEvent[]);

      // Fetch memory reactions
      if (mems && mems.length > 0) {
        const memIds = mems.map((m: any) => m.id);
        const { data: reactions } = await supabase
          .from("memory_reactions")
          .select("*")
          .in("memory_id", memIds);
        const grouped: Record<string, any[]> = {};
        (reactions || []).forEach((r: any) => {
          if (!grouped[r.memory_id]) grouped[r.memory_id] = [];
          grouped[r.memory_id].push(r);
        });
        setMemoryReactions(grouped);
      }

      // Fetch caregiver's own last-viewed timestamp
      const { data: myOwnProfile } = await supabase
        .from("profiles")
        .select("memories_last_viewed_at")
        .eq("id", profileId)
        .maybeSingle();
      if (myOwnProfile) setMemoriesLastViewedAt(myOwnProfile.memories_last_viewed_at);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("useParentData fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscriptions for memories and health_events
  useEffect(() => {
    if (!profileId) return;

    const ch = supabase
      .channel("parent-data-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "memories" },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "health_events" },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "medications" },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memory_comments" },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memory_reactions" },
        () => fetchAll()
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [profileId, fetchAll]);

  // Refresh data at midnight local time for daily metric reset
  const midnightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const scheduleMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const ms = midnight.getTime() - now.getTime();
      midnightTimer.current = setTimeout(() => {
        fetchAll();
        scheduleMidnight();
      }, ms);
    };
    scheduleMidnight();
    return () => {
      if (midnightTimer.current) clearTimeout(midnightTimer.current);
    };
  }, [fetchAll]);

  const stats = deriveStats(healthEvents, memories);

  const toggleMedication = async (medId: string, taken: boolean) => {
    // Get parent id
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("linked_user_id")
      .eq("id", profileId!)
      .maybeSingle();
    const parentId = myProfile?.linked_user_id;
    if (!parentId) return;

    const now = new Date().toISOString();
    await supabase
      .from("medications")
      .update({ taken_today: taken, last_taken: taken ? now : null })
      .eq("id", medId);

    if (taken) {
      const med = medications.find(m => m.id === medId);
      await supabase.from("health_events").insert({
        user_id: parentId,
        event_type: "medication_taken",
        value: { medication_name: med?.name, medication_id: medId },
      });
    }

    fetchAll();
  };

  // Fetch memory comments for all loaded memories
  const [memoryComments, setMemoryComments] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (memories.length === 0) return;
    const ids = memories.map(m => m.id);
    supabase
      .from("memory_comments")
      .select("*")
      .in("memory_id", ids)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((c: any) => {
          if (!grouped[c.memory_id]) grouped[c.memory_id] = [];
          grouped[c.memory_id].push(c);
        });
        setMemoryComments(grouped);
      });
  }, [memories]);

  // Compute unread hearts and comments separately
  const { unreadHearts, unreadComments } = (() => {
    const cutoff = memoriesLastViewedAt ? new Date(memoriesLastViewedAt).getTime() : 0;
    let hearts = 0;
    let comments = 0;
    Object.values(memoryComments).forEach(arr => {
      arr.forEach(c => {
        if (new Date(c.created_at).getTime() > cutoff) comments++;
      });
    });
    Object.values(memoryReactions).forEach(arr => {
      arr.forEach(r => {
        if (new Date(r.created_at).getTime() > cutoff) hearts++;
      });
    });
    return { unreadHearts: hearts, unreadComments: comments };
  })();
  const unreadCount = unreadHearts + unreadComments;

  const markMemoriesViewed = async () => {
    if (!profileId) return;
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ memories_last_viewed_at: now } as any).eq("id", profileId);
    setMemoriesLastViewedAt(now);
  };

  return { parentProfile, memories, medications, healthEvents, stats, loading, lastUpdated, toggleMedication, memoryComments, memoryReactions, unreadCount, unreadHearts, unreadComments, markMemoriesViewed };
}
