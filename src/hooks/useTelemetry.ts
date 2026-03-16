import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TelemetryEvent {
  session_id: string;
  user_id: string;
  event_type: string;
  event_name: string;
  metadata: Record<string, any>;
}

let globalSessionId: string | null = null;
let globalUserId: string | null = null;
let eventBuffer: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flushEvents() {
  if (eventBuffer.length === 0) return;
  const batch = [...eventBuffer];
  eventBuffer = [];
  try {
    await supabase.from("telemetry_events").insert(batch as any);
  } catch {
    eventBuffer.push(...batch);
  }
}

function flushBeacon() {
  if (eventBuffer.length === 0 && !globalSessionId) return;

  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Use fetch with keepalive so we can include auth headers (sendBeacon can't)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": anonKey,
    "Authorization": `Bearer ${anonKey}`,
    "Prefer": "return=minimal",
  };

  if (globalSessionId) {
    try {
      fetch(`${baseUrl}/rest/v1/telemetry_sessions?id=eq.${globalSessionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ended_at: new Date().toISOString() }),
        keepalive: true,
      });
    } catch {}
  }

  if (eventBuffer.length > 0) {
    try {
      fetch(`${baseUrl}/rest/v1/telemetry_events`, {
        method: "POST",
        headers,
        body: JSON.stringify(eventBuffer),
        keepalive: true,
      });
    } catch {}
    eventBuffer = [];
  }
}

/** Flush all buffered telemetry and close the session. Call before signOut. */
export async function flushTelemetry() {
  // Flush buffered events
  if (eventBuffer.length > 0) {
    const batch = [...eventBuffer];
    eventBuffer = [];
    try {
      await supabase.from("telemetry_events").insert(batch as any);
    } catch {}
  }

  // Close session
  if (globalSessionId) {
    try {
      await supabase
        .from("telemetry_sessions")
        .update({ ended_at: new Date().toISOString() } as any)
        .eq("id", globalSessionId);
    } catch {}
  }

  // Reset globals
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  globalSessionId = null;
  globalUserId = null;
}

export function trackEvent(eventName: string, metadata: Record<string, any> = {}, eventType = "feature_use") {
  if (!globalSessionId || !globalUserId) return;
  eventBuffer.push({
    session_id: globalSessionId,
    user_id: globalUserId,
    event_type: eventType,
    event_name: eventName,
    metadata,
  });
}

export function useTelemetry() {
  const location = useLocation();
  const lastPath = useRef("");
  const sessionStarted = useRef(false);

  // Start session
  useEffect(() => {
    const startSession = async (userId: string) => {
      if (sessionStarted.current) return;

      globalUserId = userId;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profile?.role === "admin") return;

      const { data, error } = await supabase
        .from("telemetry_sessions")
        .insert({
          user_id: userId,
          user_agent: navigator.userAgent,
          role: profile?.role || "unknown",
        } as any)
        .select("id")
        .single();

      if (error) {
        console.error("[Telemetry] session insert failed:", error.message);
        return;
      }

      if (data) {
        globalSessionId = data.id;
        sessionStarted.current = true;

        if (!flushTimer) {
          flushTimer = setInterval(flushEvents, 5000);
        }

        trackEvent(location.pathname, {}, "page_view");
        lastPath.current = location.pathname;
      }
    };

    // Check if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) startSession(session.user.id);
    });

    // Listen for auth changes (login after mount, or sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        startSession(session.user.id);
      } else if (event === "SIGNED_OUT") {
        flushBeacon();
        globalSessionId = null;
        globalUserId = null;
        sessionStarted.current = false;
        if (flushTimer) {
          clearInterval(flushTimer);
          flushTimer = null;
        }
      }
    });

    // End session on unload
    const handleUnload = () => flushBeacon();
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushBeacon();
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      subscription.unsubscribe();
      if (flushTimer) clearInterval(flushTimer);
      flushEvents();
    };
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (location.pathname !== lastPath.current && globalSessionId) {
      trackEvent(location.pathname, {}, "page_view");
      lastPath.current = location.pathname;
    }
  }, [location.pathname]);

  return { trackEvent };
}
