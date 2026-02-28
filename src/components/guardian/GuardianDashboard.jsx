import React, { useState, useEffect, useRef } from "react";
import {
  Phone, Mic, MessageCircle, Heart, Activity, Pill,
  Home, Bell, Settings, ChevronRight, Play, Pause,
  User, LogOut, Headphones, Brain, Check, Menu, X,
  TrendingUp, Zap, PhoneOff, AlertTriangle, ShieldCheck,
  Loader2, Link2, Copy, Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useParentData } from "@/hooks/useParentData";

// ─── STYLES (shared with AnvayaApp) ────────────────────────────────────────────
export const guardianStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: 'DM Sans', sans-serif; -webkit-tap-highlight-color: transparent; overflow-x: hidden; }
  button { font-family: 'DM Sans', sans-serif; }
  input  { font-family: 'DM Sans', sans-serif; }

  @keyframes fadeUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes callPulse {
    0%   { transform:scale(1); box-shadow:0 0 0 0 rgba(198,139,89,.5); }
    70%  { transform:scale(1.05); box-shadow:0 0 0 30px rgba(198,139,89,0); }
    100% { transform:scale(1); box-shadow:0 0 0 0 rgba(198,139,89,0); }
  }
  @keyframes spin {
    from { transform:rotate(0deg); }
    to { transform:rotate(360deg); }
  }

  .fadein    { animation: fadeIn .35s ease forwards; }
  .gcard {
    background:rgba(255,255,255,0.72);
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,0.55);
    border-radius:20px;
    box-shadow:0 8px 32px rgba(62,39,35,0.06);
  }
  .gtxt {
    background:linear-gradient(135deg,#3E2723 0%,#5D4037 50%,#8D6E63 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }

  .s1{animation:fadeUp .5s ease .05s both;} .s2{animation:fadeUp .5s ease .12s both;}
  .s3{animation:fadeUp .5s ease .19s both;} .s4{animation:fadeUp .5s ease .26s both;}
  .s5{animation:fadeUp .5s ease .33s both;} .s6{animation:fadeUp .5s ease .40s both;}
  .s7{animation:fadeUp .5s ease .47s both;} .s8{animation:fadeUp .5s ease .54s both;}

  .scr::-webkit-scrollbar{width:4px;}
  .scr::-webkit-scrollbar-track{background:transparent;}
  .scr::-webkit-scrollbar-thumb{background:rgba(0,0,0,.1);border-radius:4px;}
`;

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({ w: typeof window !== "undefined" ? window.innerWidth : 1200 });
  useEffect(() => {
    const h = () => setSize({ w: window.innerWidth });
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return size;
}

// ─── AUDIO PLAYER ─────────────────────────────────────────────────────────────
function AudioPlayer({ color = "#5D4037", audioUrl = null }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;
    const a = new Audio(audioUrl);
    audioRef.current = a;
    a.addEventListener("loadedmetadata", () => setDuration(a.duration));
    a.addEventListener("timeupdate", () => { if (a.duration) setProgress((a.currentTime / a.duration) * 100); });
    a.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
    return () => { a.pause(); a.src = ""; };
  }, [audioUrl]);

  const toggle = () => {
    if (!audioRef.current && !audioUrl) { setPlaying(p => !p); return; }
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(p => !p);
  };

  useEffect(() => {
    if (audioUrl || !playing) return;
    const t = setInterval(() => setProgress(p => p >= 100 ? (setPlaying(false), 0) : p + 0.5), 80);
    return () => clearInterval(t);
  }, [playing, audioUrl]);

  const seek = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - r.left) / r.width) * 100;
    setProgress(pct);
    if (audioRef.current && audioRef.current.duration) { audioRef.current.currentTime = (pct / 100) * audioRef.current.duration; }
  };

  const fmt = (s) => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={toggle} style={{
        width: 36, height: 36, borderRadius: "50%", background: color,
        border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        {playing ? <Pause size={13} color="#FFF8F0" fill="#FFF8F0" /> : <Play size={13} color="#FFF8F0" fill="#FFF8F0" />}
      </button>
      <div style={{ flex: 1, height: 4, background: "#E5E7EB", borderRadius: 4, cursor: "pointer" }} onClick={seek}>
        <div style={{ height: "100%", width: `${progress}%`, background: color, borderRadius: 4, transition: "width .1s" }} />
      </div>
      <span style={{ fontSize: 11, color: "#6b6b6b", flexShrink: 0 }}>{duration ? fmt(duration) : "—"}</span>
    </div>
  );
}

// ─── COGNITIVE RING ───────────────────────────────────────────────────────────
function CognitiveRing({ value = 94 }) {
  const r = 56, cx = 72, cy = 72, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={144} height={144} viewBox="0 0 144 144">
        <defs>
           <linearGradient id="crg" x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" stopColor="#5D4037" />
             <stop offset="100%" stopColor="#C68B59" />
           </linearGradient>
          <filter id="crglow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
         <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(93,64,55,0.1)" strokeWidth={11} />
         <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#crg)" strokeWidth={11}
           strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
           transform={`rotate(-90 ${cx} ${cy})`} filter="url(#crglow)"
           style={{ transition: "stroke-dashoffset 1.2s ease" }} />
         <text x={cx} y={cy - 6} textAnchor="middle" fontSize={30} fontWeight={700} fill="#3E2723" fontFamily="DM Sans">{value}</text>
         <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill="#C68B59" fontFamily="DM Sans" fontWeight={500}>Stable</text>
       </svg>
       <span style={{ fontSize: 12, color: "#6b6b6b", fontWeight: 500 }}>Cognitive Clarity</span>
    </div>
  );
}

// ─── ACOUSTIC HEATMAP ─────────────────────────────────────────────────────────
function AcousticHeatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["12a", "2a", "4a", "6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"];
  const seed = (r, c) => {
    const base = [0, 0, 0, 1, 2, 3, 4, 3, 3, 2, 1, 0];
    const v = base[c] + (Math.sin(r * 3.7 + c * 1.3) * 1.2);
    return Math.max(0, Math.min(4, Math.round(v)));
  };
  const colors = ["rgba(93,64,55,0.06)", "rgba(93,64,55,0.18)", "rgba(198,139,89,0.35)", "rgba(198,139,89,0.6)", "rgba(198,139,89,0.9)"];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `44px repeat(12,1fr)`, gap: 3, alignItems: "center" }}>
        <div />
        {hours.map(h => (
          <div key={h} style={{ fontSize: 9, color: "#9CA3AF", textAlign: "center", fontWeight: 500 }}>{h}</div>
        ))}
        {days.map((day, r) => (
          <React.Fragment key={`row-${r}`}>
            <div style={{ fontSize: 10, color: "#6b6b6b", fontWeight: 500, textAlign: "right", paddingRight: 6 }}>{day}</div>
            {hours.map((_, c) => {
              const v = seed(r, c);
              return (
                <div key={`${r}-${c}`} style={{
                  height: 18, borderRadius: 4,
                  background: colors[v],
                  transition: "background .3s"
                }} title={`${day} ${hours[c]}: activity ${v}`} />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>Less</span>
        {colors.map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: "1px solid rgba(0,0,0,.06)" }} />)}
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>More</span>
      </div>
    </div>
  );
}

// ─── WEEKLY TREND CHART ───────────────────────────────────────────────────────
function WeeklyTrendChart() {
  const mood = [72, 78, 85, 80, 88, 92, 90];
  const energy = [65, 70, 80, 75, 82, 88, 85];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const W = 100, H = 60, pad = 4;
  const toX = (i) => pad + i * (W - pad * 2) / 6;
  const toY = (v) => H - pad - ((v - 50) / (100 - 50)) * (H - pad * 2);
  const pathD = (arr) => {
    const pts = arr.map((v, i) => `${toX(i)},${toY(v)}`);
    const area = `M${toX(0)},${H} L${pts.join(" L")} L${toX(6)},${H} Z`;
    const line = `M${pts.join(" L")}`;
    return { area, line };
  };
  const m = pathD(mood), e = pathD(energy);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120, overflow: "visible" }}>
        <defs>
           <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor="#5D4037" stopOpacity={0.2} />
             <stop offset="100%" stopColor="#5D4037" stopOpacity={0} />
           </linearGradient>
           <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor="#C68B59" stopOpacity={0.15} />
             <stop offset="100%" stopColor="#C68B59" stopOpacity={0} />
           </linearGradient>
         </defs>
         {[60, 70, 80, 90, 100].map(v => (
           <line key={v} x1={pad} y1={toY(v)} x2={W - pad} y2={toY(v)}
             stroke="rgba(93,64,55,0.07)" strokeWidth={0.5} strokeDasharray="2 2" />
         ))}
         <path d={m.area} fill="url(#mg)" />
         <path d={e.area} fill="url(#eg)" />
         <path d={m.line} fill="none" stroke="#5D4037" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
         <path d={e.line} fill="none" stroke="#C68B59" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
         {mood.map((v, i) => (<circle key={i} cx={toX(i)} cy={toY(v)} r={1.5} fill="#5D4037" />))}
         {energy.map((v, i) => (<circle key={i} cx={toX(i)} cy={toY(v)} r={1.5} fill="#C68B59" />))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {days.map(d => <span key={d} style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 500 }}>{d}</span>)}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
         <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
           <div style={{ width: 16, height: 2, borderRadius: 2, background: "#5D4037" }} />
           <span style={{ fontSize: 11, color: "#6b6b6b" }}>Mood</span>
         </div>
         <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
           <div style={{ width: 16, height: 2, borderRadius: 2, background: "#C68B59" }} />
          <span style={{ fontSize: 11, color: "#6b6b6b" }}>Energy</span>
        </div>
      </div>
    </div>
  );
}

// ─── MEMORY CARD ──────────────────────────────────────────────────────────────
function MemoryCard({ title, summary, duration, date, index = 0, audioUrl = null, emotionalTone = null }) {
  const toneColors = { joyful: "#C68B59", nostalgic: "#8D6E63", peaceful: "#5D4037", concerned: "#DC2626" };
  const tone = emotionalTone || "positive";
  const toneColor = toneColors[tone.toLowerCase()] || "#C68B59";
  return (
    <div className="gcard" style={{ padding: 18, animation: `fadeUp .5s ease ${.6 + index * .1}s both` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3E2723", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled Memory"}</div>
          <div style={{ display: "flex", gap: 6 }}>
             <span style={{ fontSize: 10, fontWeight: 600, color: "#6b6b6b", background: "rgba(93,64,55,0.07)", padding: "2px 8px", borderRadius: 100 }}>{date}</span>
             <span style={{ fontSize: 10, fontWeight: 600, color: "#6b6b6b", background: "rgba(93,64,55,0.07)", padding: "2px 8px", borderRadius: 100 }}>{duration}</span>
          </div>
        </div>
      </div>
      <AudioPlayer color="#5D4037" audioUrl={audioUrl} />
      {summary && <p style={{
        marginTop: 10, fontStyle: "italic",
        fontFamily: "'Cormorant Garamond',serif", fontSize: 14,
        color: "#6b6b6b", lineHeight: 1.65,
        borderLeft: "2px solid rgba(93,64,55,0.2)", paddingLeft: 10
      }}>
        "{summary}"
      </p>}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: toneColor }} />
        <span style={{ fontSize: 10, color: toneColor, fontWeight: 600 }}>Emotional tone: {tone.charAt(0).toUpperCase() + tone.slice(1)}</span>
      </div>
    </div>
  );
}

// ─── GUARDIAN DASHBOARD ───────────────────────────────────────────────────────
export default function GuardianDashboard({ inPanel = false, profileId = null }) {
  const { w } = useWindowSize();
  const isMobile = !inPanel && w < 768;
  const [nav, setNav] = useState("home");
  const [drawer, setDrawer] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [emergency, setEmergency] = useState(null);
  const [callOpen, setCallOpen] = useState(false);

  const { parentProfile, memories: realMemories, medications, healthEvents, stats: derivedStats, loading: dataLoading, lastUpdated, toggleMedication } = useParentData(profileId);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Play alert sound
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = "sine"; gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { gain.gain.value = 0; }, 200);
      setTimeout(() => { gain.gain.value = 0.3; }, 400);
      setTimeout(() => { gain.gain.value = 0; }, 600);
      setTimeout(() => { gain.gain.value = 0.3; }, 800);
      setTimeout(() => { osc.stop(); ctx.close(); }, 1000);
    } catch (e) { /* ignore */ }
  };

  // Realtime: incoming calls + emergency
  useEffect(() => {
    if (!profileId) return;
    const ch = supabase.channel(`user:${profileId}`)
      .on("broadcast", { event: "incoming_call" }, ({ payload }) => setIncomingCall(payload))
      .on("broadcast", { event: "call_ended" }, () => setIncomingCall(null))
      .on("broadcast", { event: "emergency" }, ({ payload }) => {
        setEmergency(payload);
        playAlertSound();
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          new Notification("⚠️ Emergency Alert", {
            body: `${payload.from || "Amma"} needs help!`,
            icon: "/favicon.ico",
            requireInteraction: true,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profileId]);

  const handleMarkSafe = async () => {
    if (profileId && parentProfile) {
      await supabase.from("health_events").insert({
        user_id: parentProfile.id,
        event_type: "emergency_resolved",
        value: { resolved_by: profileId, timestamp: new Date().toISOString() },
      });
    }
    setEmergency(null);
  };

  // Settings state
  const [linkCodeInput, setLinkCodeInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");
  const [notifPref, setNotifPref] = useState({ emergency: true, medication: true, memories: true });
  const [signingOut, setSigningOut] = useState(false);
  const [memorySearch, setMemorySearch] = useState("");

  const handleLinkAccount = async () => {
    setLinkError(""); setLinkSuccess("");
    if (linkCodeInput.length !== 6) { setLinkError("Please enter a 6-digit code."); return; }
    setLinkLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("link-account", { body: { action: "link", code: linkCodeInput } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLinkSuccess(`Linked to ${data.parent_name || "parent"}! Refreshing…`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) { setLinkError(e.message || "Failed to link"); }
    finally { setLinkLoading(false); }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navItems = [
    { id: "home", icon: <Home size={17} />, label: "Overview" },
    { id: "memories", icon: <Headphones size={17} />, label: "Memories" },
    { id: "health", icon: <Activity size={17} />, label: "Health" },
    { id: "alerts", icon: <Bell size={17} />, label: "Alerts" },
    { id: "settings", icon: <Settings size={17} />, label: "Settings" },
  ];

  const stats = [
     { label: "Vocal Energy", value: derivedStats.vocalEnergy.value, icon: Mic, color: "#5D4037", trend: derivedStats.vocalEnergy.trend },
     { label: "Cognitive Clarity", value: derivedStats.cognitiveClarity.value, icon: TrendingUp, color: "#8D6E63", trend: derivedStats.cognitiveClarity.trend },
     { label: "Emotional Tone", value: derivedStats.emotionalTone.value, icon: Heart, color: "#C68B59", trend: derivedStats.emotionalTone.trend },
     { label: "Activity Level", value: derivedStats.activityLevel.value, icon: Zap, color: "#A1887F", trend: derivedStats.activityLevel.trend },
  ];

  const alerts = healthEvents.slice(0, 3).map(e => ({
    text: e.event_type === "medication_taken"
      ? `Medication taken: ${e.value?.medication_name || "Unknown"}`
      : `${e.event_type.replace(/_/g, " ")} recorded`,
    type: e.event_type === "medication_taken" ? "success" : "info"
  }));
  if (alerts.length === 0) alerts.push({ text: "No recent events", type: "info" });

  const fmtDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - date) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff} days ago`;
  };
  const fmtDuration = (s) => s ? (s >= 60 ? `${Math.round(s / 60)} min` : `${s}s`) : "—";

  const memories = realMemories.length > 0
    ? realMemories.map(m => ({
      title: m.title || "Untitled",
      date: fmtDate(m.created_at),
      duration: fmtDuration(m.duration_seconds),
      summary: m.ai_summary || m.transcript || "",
      transcript: m.transcript || "",
      audioUrl: m.audio_url || null,
      emotionalTone: m.emotional_tone || null,
    }))
    : [{ title: "No memories yet", date: "—", duration: "—", summary: "Memories recorded by your parent will appear here.", transcript: "", audioUrl: null, emotionalTone: null }];

  const Sidebar = ({ mobile = false }) => (
     <div style={{
       width: mobile ? "100%" : 210, background: "rgba(255,248,240,0.97)",
       borderRight: mobile ? "none" : "1px solid rgba(93,64,55,0.08)",
       display: "flex", flexDirection: "column", padding: "22px 0",
       flexShrink: 0, height: "100%",
       boxShadow: mobile ? "none" : "2px 0 20px rgba(62,39,35,0.04)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px 18px", borderBottom: "1px solid rgba(93,64,55,0.07)" }}>
        <div>
           <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, color: "#3E2723", letterSpacing: "0.3em", fontWeight: 600 }}>ANVAYA</div>
           <div className="gtxt" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 600 }}>Guardian</div>
        </div>
        {mobile && <button onClick={() => setDrawer(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={18} color="#FFF8F0" /></button>}
      </div>

      {/* Parent status */}
       <div style={{ padding: "12px 14px", margin: "12px 10px", background: "rgba(93,64,55,0.05)", borderRadius: 14, border: "1px solid rgba(93,64,55,0.12)" }}>
         <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
           <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#5D4037,#C68B59)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
             <User size={15} color="#FFF8F0" />
           </div>
           <div>
             <div style={{ fontSize: 12, fontWeight: 700, color: "#3E2723" }}>{parentProfile?.full_name || "Parent"}</div>
             <div style={{ fontSize: 10, color: "#C68B59", display: "flex", alignItems: "center", gap: 4 }}>
               <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#C68B59", display: "inline-block" }} />
               {dataLoading ? "Loading…" : "Active"}
             </div>
           </div>
         </div>
       </div>

      <nav style={{ flex: 1, padding: "4px 10px", display: "flex", flexDirection: "column", gap: 1 }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setNav(item.id); setDrawer(false); }} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
            borderRadius: 11, border: "none", cursor: "pointer", textAlign: "left", width: "100%",
             background: nav === item.id ? "rgba(93,64,55,0.08)" : "transparent",
             color: nav === item.id ? "#3E2723" : "#6b6b6b",
            fontWeight: nav === item.id ? 700 : 400, fontSize: 13, transition: "all .2s"
          }}>{item.icon}{item.label}</button>
        ))}
      </nav>

      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(93,64,55,0.07)" }}>
        <button onClick={handleSignOut} disabled={signingOut} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", width: "100%", border: "none", background: "transparent", cursor: signingOut ? "wait" : "pointer", color: "#9CA3AF", fontSize: 12, borderRadius: 11, opacity: signingOut ? .5 : 1 }}>
          {signingOut ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <LogOut size={14} />}{signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#FAF6F1", position: "relative", overflow: "hidden" }}>

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile drawer */}
      {isMobile && drawer && (
        <>
          <div className="fadein" onClick={() => setDrawer(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 40, backdropFilter: "blur(4px)" }} />
          <div className="fadein" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 256, zIndex: 50, boxShadow: "4px 0 28px rgba(0,0,0,.1)" }}>
            <Sidebar mobile />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="scr" style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 14px 80px" : "20px 24px" }}>

        {/* Header */}
        <div className="s1" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isMobile && (
               <button onClick={() => setDrawer(true)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                 <Menu size={20} color="#3E2723" />
              </button>
            )}
            <div>
               <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 24 : 30, fontWeight: 700, color: "#3E2723", lineHeight: 1.2 }}>
                 {nav === "settings" ? "Settings" : "Guardian Dashboard"}
              </h1>
              <p style={{ color: "#6b6b6b", fontSize: 12, marginTop: 3 }}>
                {nav === "settings" ? "Manage your account & preferences" : <>
                  Monitoring {parentProfile?.full_name || "Amma"}'s wellbeing
                  <span style={{ color: "#9CA3AF", fontSize: 10, marginLeft: 8 }}>
                    Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </>}
              </p>
            </div>
          </div>
          {nav !== "settings" && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{
              position: "relative", width: 40, height: 40, borderRadius: 12, border: "none", cursor: "pointer",
               background: "rgba(255,248,240,0.8)", backdropFilter: "blur(8px)",
               display: "flex", alignItems: "center", justifyContent: "center",
               boxShadow: "0 2px 8px rgba(93,64,55,0.1)"
             }}>
               <Bell size={16} color="#3E2723" />
               <span style={{
                 position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: "50%",
                 background: "#C68B59", color: "#fff", fontSize: 9, fontWeight: 700,
                 display: "flex", alignItems: "center", justifyContent: "center"
              }}>{healthEvents.length || 0}</span>
            </button>
          </div>}
        </div>

        {/* No linked parent onboarding */}
        {!parentProfile && !dataLoading && nav !== "settings" && (
          <div className="gcard" style={{ padding: 28, textAlign: "center", marginBottom: 16 }}>
           <Link2 size={32} color="#5D4037" style={{ margin: "0 auto 12px" }} />
             <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: "#3E2723", marginBottom: 8 }}>No parent linked yet</div>
             <p style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.6, marginBottom: 16 }}>
               Ask your parent to share their 6-digit linking code from the Sathi app, then enter it in Settings.
             </p>
             <button onClick={() => setNav("settings")} style={{
               padding: "12px 24px", borderRadius: 14, border: "none", cursor: "pointer",
               background: "linear-gradient(135deg,#8D6E63,#5D4037)", color: "#FFF8F0", fontSize: 13, fontWeight: 600,
               boxShadow: "0 4px 16px rgba(93,64,55,.3)"
             }}>Go to Settings</button>
          </div>
        )}

        {/* Loading */}
        {dataLoading && nav === "home" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
            <Loader2 size={28} color="#5D4037" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "#6b6b6b" }}>Loading dashboard…</span>
          </div>
        )}

        {/* ══ SETTINGS VIEW ══ */}
        {nav === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 500 }}>
            {/* Link Account */}
            <div className="gcard" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Link Parent Account</div>
              <div style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 12 }}>Enter the 6-digit code from your parent's Sathi screen</div>
              {parentProfile ? (
                 <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(198,139,89,0.06)", borderRadius: 12, border: "1px solid rgba(198,139,89,0.15)" }}>
                   <Check size={18} color="#C68B59" />
                   <div>
                     <div style={{ fontSize: 12, fontWeight: 600, color: "#C68B59" }}>Linked to {parentProfile.full_name || "Parent"}</div>
                     <div style={{ fontSize: 10, color: "#6b6b6b", marginTop: 1 }}>Accounts are connected</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={linkCodeInput} onChange={e => setLinkCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000" maxLength={6}
                      style={{
                       flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(93,64,55,0.15)",
                         fontSize: 18, fontWeight: 700, letterSpacing: "0.2em", textAlign: "center",
                         fontFamily: "'DM Sans',sans-serif", outline: "none", color: "#3E2723"
                      }} />
                    <button onClick={handleLinkAccount} disabled={linkLoading} style={{
                      padding: "11px 20px", borderRadius: 12, border: "none", cursor: linkLoading ? "wait" : "pointer",
                       background: "linear-gradient(135deg,#8D6E63,#5D4037)", color: "#FFF8F0", fontSize: 13, fontWeight: 600,
                      opacity: linkLoading ? .6 : 1, display: "flex", alignItems: "center", gap: 6
                    }}>
                      {linkLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                      {linkLoading ? "Linking…" : "Link"}
                    </button>
                  </div>
                  {linkError && <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626", fontSize: 11 }}>{linkError}</div>}
                  {linkSuccess && <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(198,139,89,0.08)", border: "1px solid rgba(198,139,89,0.2)", color: "#C68B59", fontSize: 11 }}>{linkSuccess}</div>}
                </>
              )}
            </div>

            {/* Notification Preferences */}
            <div className="gcard" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Notification Preferences</div>
              <div style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 12 }}>Choose which notifications you receive</div>
              {[
                 { key: "emergency", label: "Emergency Alerts", desc: "Critical alerts when parent needs help", icon: <AlertTriangle size={16} color="#DC2626" /> },
                 { key: "medication", label: "Medication Updates", desc: "When medications are taken or missed", icon: <Pill size={16} color="#8D6E63" /> },
                 { key: "memories", label: "New Memories", desc: "When a new memory is recorded", icon: <Headphones size={16} color="#C68B59" /> },
              ].map(n => (
                <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(93,64,55,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {n.icon}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{n.label}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>{n.desc}</div>
                    </div>
                  </div>
                  <button onClick={() => setNotifPref(p => ({ ...p, [n.key]: !p[n.key] }))} style={{
                    width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", padding: 2,
                    background: notifPref[n.key] ? "#C68B59" : "#D1D5DB", transition: "background .2s",
                    display: "flex", alignItems: "center",
                    justifyContent: notifPref[n.key] ? "flex-end" : "flex-start"
                  }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "all .2s" }} />
                  </button>
                </div>
              ))}
            </div>

            {/* Linked Parent Info */}
            {parentProfile && (
              <div className="gcard" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>Linked Parent</div>
                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                   <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#5D4037,#C68B59)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                     <User size={20} color="#FFF8F0" />
                   </div>
                   <div>
                     <div style={{ fontSize: 14, fontWeight: 700, color: "#3E2723" }}>{parentProfile.full_name || "Parent"}</div>
                     <div style={{ fontSize: 11, color: "#C68B59", display: "flex", alignItems: "center", gap: 4 }}>
                       <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C68B59" }} />Active
                     </div>
                   </div>
                </div>
              </div>
            )}

            {/* Sign Out */}
            <div className="gcard" style={{ padding: 20 }}>
              <button onClick={handleSignOut} disabled={signingOut} style={{
                width: "100%", padding: "13px", borderRadius: 14, border: "1px solid rgba(220,38,38,0.2)",
                background: "rgba(220,38,38,0.04)", color: "#DC2626", fontSize: 13, fontWeight: 600,
                cursor: signingOut ? "wait" : "pointer", opacity: signingOut ? .6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}>
                {signingOut ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <LogOut size={14} />}
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        )}

        {/* ══ HOME VIEW ══ */}
        {/* ══ MEMORIES VIEW ══ */}
        {nav === "memories" && (
          <div className="s2">
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Memory Archive</h2>
              <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 3 }}>AI-summarized recordings with emotional context</p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(93,64,55,0.12)", borderRadius: 14, marginBottom: 16
            }}>
              <Search size={16} color="#9CA3AF" />
              <input
                value={memorySearch}
                onChange={e => setMemorySearch(e.target.value)}
                placeholder="Search memories…"
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontSize: 13, color: "#3E2723", fontFamily: "'DM Sans',sans-serif"
                }}
              />
              {memorySearch && (
                <button onClick={() => setMemorySearch("")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
                  <X size={14} color="#9CA3AF" />
                </button>
              )}
            </div>
            {realMemories.length === 0 ? (
              <div className="gcard" style={{ padding: 28, textAlign: "center" }}>
                <Headphones size={28} color="#9CA3AF" style={{ margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.6 }}>
                  No memories recorded yet.<br />
                  <span style={{ color: "#9CA3AF", fontSize: 12 }}>Tap "Record a Memory" on the Sathi app to begin.</span>
                </p>
              </div>
            ) : (() => {
              const q = memorySearch.toLowerCase();
              const filtered = memories.filter(m =>
                !q || m.title.toLowerCase().includes(q) || (m.transcript && m.transcript.toLowerCase().includes(q))
              );
              return filtered.length === 0 ? (
                <div className="gcard" style={{ padding: 28, textAlign: "center" }}>
                  <Search size={28} color="#9CA3AF" style={{ margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, color: "#6b6b6b" }}>No memories match "{memorySearch}"</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 13 }}>
                  {filtered.map((m, i) => (
                    <MemoryCard key={i} {...m} index={i} />
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ HEALTH VIEW ══ */}
        {nav === "health" && !dataLoading && (
          <div className="s2">
            {/* Stats row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : inPanel ? "1fr 1fr" : "repeat(4,1fr)",
              gap: 12, marginBottom: 16
            }}>
              {stats.map((st, i) => (
                <div key={i} className="gcard" style={{ padding: 16, animation: `fadeUp .5s ease ${.1 + i * .07}s both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${st.color}12`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <st.icon size={16} color={st.color} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                      background: `${st.color}10`, color: st.color
                    }}>{st.trend}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{st.value}</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>{st.label}</div>
                </div>
              ))}
            </div>

            {/* Cognitive + Weekly Trends */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "1fr 2fr",
              gap: 14, marginBottom: 14
            }}>
              <div className="gcard s3" style={{ padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Cognitive Vitality</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Real-time cognitive assessment</div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <CognitiveRing value={94} />
                </div>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px",
                  background: "rgba(198,139,89,0.06)", borderRadius: 12, border: "1px solid rgba(198,139,89,0.12)"
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C68B59", marginTop: 4, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#6b6b6b", lineHeight: 1.5 }}>
                    Pattern recognition and recall scores are within healthy range
                  </p>
                </div>
              </div>

              <div className="gcard s4" style={{ padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Weekly Wellness Trends</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Mood and energy levels over the past week</div>
                </div>
                <WeeklyTrendChart />
              </div>
            </div>

            {/* Acoustic + Medication */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "2fr 1fr",
              gap: 14, marginBottom: 14
            }}>
              <div className="gcard s5" style={{ padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Acoustic Insights</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>24-hour vocal and acoustic analysis</div>
                </div>
                <AcousticHeatmap />
              </div>

              <div className="gcard s6" style={{ padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Medication Tracker</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Today's medications</div>
                </div>
                {medications.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>No medications configured</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {medications.map(med => (
                      <div key={med.id} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        background: med.taken_today ? "rgba(198,139,89,0.06)" : "rgba(255,248,240,0.6)",
                        borderRadius: 12, border: `1px solid ${med.taken_today ? "rgba(198,139,89,0.15)" : "rgba(93,64,55,0.08)"}`,
                        cursor: "pointer", transition: "all .2s"
                      }} onClick={() => toggleMedication(med.id, !med.taken_today)}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          border: med.taken_today ? "none" : "2px solid rgba(93,64,55,0.25)",
                          background: med.taken_today ? "#C68B59" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {med.taken_today && <Check size={13} color="#fff" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, color: med.taken_today ? "#C68B59" : "#1a1a1a",
                            textDecoration: med.taken_today ? "line-through" : "none"
                          }}>{med.name}</div>
                          <div style={{ fontSize: 10, color: "#9CA3AF" }}>{med.dose || ""}{med.scheduled_time ? ` · ${med.scheduled_time}` : ""}</div>
                        </div>
                        {med.taken_today && med.last_taken && (
                          <span style={{ fontSize: 9, color: "#C68B59", fontWeight: 500 }}>
                            {new Date(med.last_taken).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ ALERTS VIEW ══ */}
        {nav === "alerts" && (
          <div className="s2">
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Alerts & Events</h2>
              <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 3 }}>Recent health events and notifications</p>
            </div>
            {healthEvents.length === 0 ? (
              <div className="gcard" style={{ padding: 28, textAlign: "center" }}>
                <Bell size={28} color="#9CA3AF" style={{ margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: "#6b6b6b" }}>No alerts yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {healthEvents.map((e, i) => (
                  <div key={e.id || i} className="gcard" style={{ padding: "14px 16px", animation: `fadeUp .5s ease ${.1 + i * .06}s both` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                        background: e.event_type === "medication_taken" ? "#C68B59" : e.event_type === "emergency" ? "#DC2626" : "#8D6E63"
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                          {e.event_type === "medication_taken"
                            ? `Medication taken: ${e.value?.medication_name || "Unknown"}`
                            : e.event_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>
                          {e.recorded_at ? new Date(e.recorded_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ HOME VIEW ══ */}
        {nav === "home" && !dataLoading && (
          <>
            {/* Stats row */}
            <div className="s2" style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : inPanel ? "1fr 1fr" : "repeat(4,1fr)",
              gap: 12, marginBottom: 16
            }}>
              {stats.map((st, i) => (
                <div key={i} className="gcard" style={{ padding: 16, animation: `fadeUp .5s ease ${.1 + i * .07}s both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${st.color}12`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <st.icon size={16} color={st.color} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                      background: `${st.color}10`, color: st.color
                    }}>{st.trend}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{st.value}</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>{st.label}</div>
                </div>
              ))}
            </div>

            {/* Cognitive + Weekly Trends */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "1fr 2fr",
              gap: 14, marginBottom: 14
            }}>
              <div className="gcard s3" style={{ padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Cognitive Vitality</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Real-time cognitive assessment</div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <CognitiveRing value={94} />
                </div>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px",
                  background: "rgba(198,139,89,0.06)", borderRadius: 12, border: "1px solid rgba(198,139,89,0.12)"
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C68B59", marginTop: 4, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#6b6b6b", lineHeight: 1.5 }}>
                    Pattern recognition and recall scores are within healthy range
                  </p>
                </div>
              </div>

              <div className="gcard s4" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Weekly Wellness Trends</div>
                    <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Mood and energy levels over the past week</div>
                  </div>
                  <button onClick={() => setNav("health")} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#5D4037", background: "transparent", border: "none", cursor: "pointer" }}>
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                <WeeklyTrendChart />
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "2fr 1fr",
              gap: 14, marginBottom: 14
            }}>
              <div className="gcard s5" style={{ padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Acoustic Insights</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>24-hour vocal and acoustic analysis</div>
                </div>
                <AcousticHeatmap />
              </div>

              <div className="gcard s6" style={{ padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Recent Alerts</div>
                  <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Today's notifications</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {alerts.map((a, i) => (
                    <div key={i} className="gcard" style={{
                      padding: "10px 12px",
                      animation: `fadeUp .5s ease ${.8 + i * .1}s both`,
                      background: "rgba(255,255,255,0.6)"
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                          background: a.type === "info" ? "#C68B59" : "#8D6E63"
                        }} />
                        <p style={{ fontSize: 11, color: "#6b6b6b", lineHeight: 1.5 }}>{a.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Medication Tracker */}
            <div className="gcard s6" style={{ padding: 20, marginBottom: 14 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Medication Tracker</div>
                <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Today's medications</div>
              </div>
              {medications.length === 0 ? (
                <p style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>No medications configured</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {medications.map(med => (
                    <div key={med.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      background: med.taken_today ? "rgba(198,139,89,0.06)" : "rgba(255,248,240,0.6)",
                      borderRadius: 12, border: `1px solid ${med.taken_today ? "rgba(198,139,89,0.15)" : "rgba(93,64,55,0.08)"}`,
                      cursor: "pointer", transition: "all .2s"
                    }} onClick={() => toggleMedication(med.id, !med.taken_today)}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: med.taken_today ? "none" : "2px solid rgba(93,64,55,0.25)",
                        background: med.taken_today ? "#C68B59" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {med.taken_today && <Check size={13} color="#fff" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: med.taken_today ? "#C68B59" : "#1a1a1a",
                          textDecoration: med.taken_today ? "line-through" : "none"
                        }}>{med.name}</div>
                        <div style={{ fontSize: 10, color: "#9CA3AF" }}>{med.dose || ""}{med.scheduled_time ? ` · ${med.scheduled_time}` : ""}</div>
                      </div>
                      {med.taken_today && med.last_taken && (
                        <span style={{ fontSize: 9, color: "#C68B59", fontWeight: 500 }}>
                          {new Date(med.last_taken).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Memory Archive preview */}
            <div className="s7">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>Memory Archive</h3>
                  <p style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>AI-summarized recordings with emotional context</p>
                </div>
                <button onClick={() => setNav("memories")} style={{ fontSize: 11, fontWeight: 600, color: "#5D4037", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                  View all <ChevronRight size={12} />
                </button>
              </div>
              {realMemories.length === 0 ? (
                <div className="gcard" style={{ padding: 28, textAlign: "center" }}>
                  <Headphones size={28} color="#9CA3AF" style={{ margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.6 }}>
                    No memories recorded yet.<br />
                    <span style={{ color: "#9CA3AF", fontSize: 12 }}>Tap "Record a Memory" on the Sathi app to begin.</span>
                  </p>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "1fr 1fr",
                  gap: 13
                }}>
                  {memories.slice(0, 2).map((m, i) => (
                    <MemoryCard key={i} {...m} index={i} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
           background: "rgba(255,248,240,.95)", backdropFilter: "blur(12px)",
           borderTop: "1px solid rgba(93,64,55,0.08)",
          display: "flex", justifyContent: "space-around", alignItems: "center",
          padding: "9px 0", paddingBottom: "max(9px,env(safe-area-inset-bottom))", zIndex: 30
        }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setNav(item.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              border: "none", background: "transparent", cursor: "pointer", padding: "0 6px",
              color: nav === item.id ? "#3E2723" : "#9CA3AF", transition: "color .2s"
            }}>
              {item.icon}
              <span style={{ fontSize: 9, fontWeight: nav === item.id ? 700 : 400 }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Incoming call toast */}
      {incomingCall && (
        <div className="fadein" style={{
          position: "absolute", top: 16, right: 16, zIndex: 60,
           background: "linear-gradient(135deg,#3E2723,#5D4037)",
           borderRadius: 16, padding: "16px 20px", minWidth: 260,
           boxShadow: "0 8px 32px rgba(62,39,35,0.3)", border: "1px solid rgba(198,139,89,0.3)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
               background: "rgba(198,139,89,0.3)", display: "flex", alignItems: "center", justifyContent: "center"
             }}>
               <Phone size={18} color="#C68B59" />
            </div>
            <div>
              <div style={{ color: "#F9F9F7", fontSize: 14, fontWeight: 600 }}>
                📞 {incomingCall.from_name || "Amma"} is calling
              </div>
              <div style={{ color: "rgba(249,249,247,.5)", fontSize: 11, marginTop: 2 }}>Incoming call</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setIncomingCall(null)} style={{
              flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
               background: "#C68B59", color: "#FFF8F0", fontSize: 13, fontWeight: 600
            }}>Answer</button>
            <button onClick={() => setIncomingCall(null)} style={{
              flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.12)", color: "rgba(249,249,247,.7)", fontSize: 13, fontWeight: 600
            }}>Decline</button>
          </div>
        </div>
      )}

      {/* Emergency overlay */}
      {emergency && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 100,
          background: "linear-gradient(160deg,#7F1D1D 0%,#991B1B 40%,#B91C1C 70%,#DC2626 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 32, gap: 20
        }}>
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "callPulse 1.5s ease-in-out infinite"
          }}>
            <AlertTriangle size={42} color="#fff" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: "#fff", fontWeight: 700, lineHeight: 1.3 }}>
              ⚠️ {parentProfile?.full_name || "Amma"} needs help
            </div>
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: 14, marginTop: 10 }}>
              {emergency.timestamp ? new Date(emergency.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Just now"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16, width: "100%", maxWidth: 320 }}>
            <button onClick={() => { setEmergency(null); setCallOpen(true); }} style={{
              flex: 1, padding: "16px 0", borderRadius: 16, border: "none", cursor: "pointer",
              background: "#fff", color: "#991B1B", fontSize: 16, fontWeight: 700,
              boxShadow: "0 4px 20px rgba(0,0,0,.2)"
            }}>
              <Phone size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Call Now
            </button>
            <button onClick={handleMarkSafe} style={{
              flex: 1, padding: "16px 0", borderRadius: 16, border: "2px solid rgba(255,255,255,.3)", cursor: "pointer",
              background: "transparent", color: "#fff", fontSize: 16, fontWeight: 700
            }}>
              <ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Mark as Safe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
