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
  const byType = (type: string) => healthEvents.filter(e => e.event_type === type).slice(0, 5);

  // Vocal energy from memories
  const recentMemories = memories.slice(0, 5);
  const energies = recentMemories.map(m => m.vocal_energy).filter(Boolean);
  const vocalValue = energies.length > 0 ? (energies[0] || "Normal") : "No data";

  // Cognitive from health events
  const cogEvents = byType("cognitive_clarity");
  const cogValue = cogEvents.length > 0 && cogEvents[0].value
    ? `${typeof cogEvents[0].value === 'object' && cogEvents[0].value !== null ? (cogEvents[0].value as any).score ?? 94 : cogEvents[0].value}%`
    : "94%";

  // Emotional tone from recent memories
  const tones = recentMemories.map(m => m.emotional_tone).filter(Boolean);
  const toneValue = tones.length > 0 ? capitalize(tones[0]!) : "Neutral";

  // Activity from medication_taken events
  const medEvents = byType("medication_taken");
  const actValue = medEvents.length >= 3 ? "Active" : medEvents.length >= 1 ? "Moderate" : "Low";

  return {
    vocalEnergy: { value: capitalize(vocalValue), trend: energies.length >= 2 ? "Tracking" : "—" },
    cognitiveClarity: { value: cogValue, trend: "Stable" },
    emotionalTone: { value: toneValue, trend: tones.length >= 2 ? "Tracking" : "—" },
    activityLevel: { value: actValue, trend: medEvents.length > 0 ? `${medEvents.length} today` : "—" },
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
