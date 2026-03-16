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
    // If flush fails, re-queue
    eventBuffer.push(...batch);
  }
}

function flushBeacon() {
  if (eventBuffer.length === 0 && !globalSessionId) return;
  
  // Update session end
  if (globalSessionId) {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/telemetry_sessions?id=eq.${globalSessionId}`;
    const body = JSON.stringify({ ended_at: new Date().toISOString() });
    navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }));
  }

  if (eventBuffer.length > 0) {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/telemetry_events`;
    const body = JSON.stringify(eventBuffer);
    navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }));
    eventBuffer = [];
  }
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
    if (sessionStarted.current) return;

    const startSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      globalUserId = userId;

      // Get role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const { data, error } = await supabase
        .from("telemetry_sessions")
        .insert({
          user_id: userId,
          user_agent: navigator.userAgent,
          role: profile?.role || "unknown",
        } as any)
        .select("id")
        .single();

      if (!error && data) {
        globalSessionId = data.id;
        sessionStarted.current = true;

        // Start flush interval
        flushTimer = setInterval(flushEvents, 5000);

        // Track initial page view
        trackEvent(location.pathname, {}, "page_view");
        lastPath.current = location.pathname;
      }
    };

    startSession();

    // End session on unload
    const handleUnload = () => {
      flushBeacon();
      if (globalSessionId) {
        // Try to update via regular fetch as well
        supabase
          .from("telemetry_sessions")
          .update({ ended_at: new Date().toISOString() } as any)
          .eq("id", globalSessionId)
          .then(() => {});
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushEvents();
        if (globalSessionId) {
          supabase
            .from("telemetry_sessions")
            .update({ ended_at: new Date().toISOString() } as any)
            .eq("id", globalSessionId)
            .then(() => {});
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
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
