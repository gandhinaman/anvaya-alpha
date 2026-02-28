import { useState, useEffect, useCallback } from "react";
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

function deriveStats(healthEvents: HealthEvent[], memories: Memory[]): Stats {
  const latestByType = (type: string) => {
    const events = healthEvents.filter(e => e.event_type === type);
    return events.length > 0 ? events[0] : null;
  };

  // Vocal Energy: tone & pitch analysis
  const vocalEvent = latestByType("vocal_energy");
  const vocalLabel = vocalEvent?.value?.label || "No data";
  const vocalScore = vocalEvent?.value?.score;
  const vocalTrend = vocalEvent?.value?.detail || "—";

  // Cognitive Vitality: word retrieval, recall, coherence
  const cogEvent = latestByType("cognitive_vitality") || latestByType("cognitive_clarity");
  const cogScore = cogEvent?.value?.score;
  const cogLabel = cogEvent?.value?.label || "No data";
  const cogTrend = cogEvent?.value?.detail || "—";

  // Emotional State: breathing & tone
  const emoEvent = latestByType("emotional_state");
  const emoLabel = emoEvent?.value?.label || "Neutral";
  const emoTrend = emoEvent?.value?.detail || "—";

  // Activity Level: speech speed & enthusiasm
  const actEvent = latestByType("activity_level");
  const actLabel = actEvent?.value?.label || "No data";
  const actTrend = actEvent?.value?.detail || "—";

  return {
    vocalEnergy: { value: capitalize(vocalLabel), trend: vocalScore != null ? `${vocalScore}%` : vocalTrend },
    cognitiveClarity: { value: cogScore != null ? `${cogScore}%` : cogLabel, trend: cogTrend },
    emotionalTone: { value: capitalize(emoLabel), trend: emoTrend },
    activityLevel: { value: capitalize(actLabel), trend: actTrend },
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
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [profileId, fetchAll]);

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

  return { parentProfile, memories, medications, healthEvents, stats, loading, lastUpdated, toggleMedication };
}
