import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  language: string | null;
  linked_user_id: string | null;
  created_at: string | null;
  age: number | null;
  health_issues: string[] | null;
  onboarding_completed: boolean | null;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (!cancelled) {
          if (fetchError) {
            setError(fetchError.message);
          } else {
            setProfile(data as Profile);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setProfile(null);
          setLoading(false);
        } else {
          fetchProfile();
        }
      }
    );

    fetchProfile();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { profile, loading, error };
}
