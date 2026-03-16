import React, { useState, useEffect, useRef } from "react";
import {
  Phone, Mic, MessageCircle, Heart, Activity, BookOpen,
  Home, Bell, Settings, ChevronRight, ChevronDown, Play, Pause,
  User, LogOut, Headphones, Brain, Check, Menu, X,
  TrendingUp, Zap, PhoneOff, AlertTriangle, ShieldCheck,
  Loader2, Link2, Copy, Search, Trash2, Eye, Scan, Hand, ArrowUpRight,
  Video, Send, HelpCircle, Plus, FolderPlus, Bookmark, Layers, ChevronLeft, Info,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { flushTelemetry } from "@/hooks/useTelemetry";
import { useParentData } from "@/hooks/useParentData";
import { filterCities } from "@/lib/cities";
import { formatPhoneInput, isValidPhone } from "@/lib/phoneFormat";
import { buildMediaRecorder } from "@/lib/mediaRecorder";
import ReactionRecorder from "./ReactionRecorder";
import { trackEvent } from "@/hooks/useTelemetry";

// ─── STYLES (shared with AnvayaApp) ────────────────────────────────────────────
export const carePartnerStyles = `
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
function CognitiveRing({ value = 0, label = "" }) {
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
         <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill="#C68B59" fontFamily="DM Sans" fontWeight={500}>{label || "—"}</text>
       </svg>
       <span style={{ fontSize: 12, color: "#6b6b6b", fontWeight: 500 }}>Communication Clarity</span>
    </div>
  );
}

// ─── ACOUSTIC HEATMAP ─────────────────────────────────────────────────────────
function AcousticHeatmap({ healthEvents = [] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["12a", "2a", "4a", "6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"];

  // Build a 7x12 grid from real vocal_energy events in the last 7 days
  const grid = Array.from({ length: 7 }, () => Array(12).fill(null));
  const now = new Date();
  healthEvents.forEach(ev => {
    if (ev.event_type !== "vocal_energy" || !ev.recorded_at || ev.value?.score == null) return;
    const d = new Date(ev.recorded_at);
    const diff = Math.floor((now - d) / 86400000);
    if (diff > 6 || diff < 0) return;
    const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
    const hourIdx = Math.floor(d.getHours() / 2); // 0-11 for 2-hour buckets
    const existing = grid[dayIdx][hourIdx];
    grid[dayIdx][hourIdx] = existing != null ? Math.round((existing + ev.value.score) / 2) : ev.value.score;
  });

  // Map score (0-100) to intensity level (0-4)
  const toLevel = (score) => {
    if (score == null) return 0;
    if (score < 20) return 0;
    if (score < 40) return 1;
    if (score < 60) return 2;
    if (score < 80) return 3;
    return 4;
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
              const score = grid[r][c];
              const v = toLevel(score);
              return (
                <div key={`${r}-${c}`} style={{
                  height: 18, borderRadius: 4,
                  background: colors[v],
                  transition: "background .3s"
                }} title={score != null ? `${day} ${hours[c]}: ${score}%` : `${day} ${hours[c]}: no data`} />
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
function WeeklyTrendChart({ healthEvents = [] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Build daily averages from real health events (last 7 days)
  const buckets = { emotional_state: {}, vocal_energy: {} };
  const now = new Date();
  healthEvents.forEach(ev => {
    if (!ev.recorded_at || !ev.value?.score) return;
    if (ev.event_type !== "emotional_state" && ev.event_type !== "vocal_energy") return;
    const d = new Date(ev.recorded_at);
    const diff = Math.floor((now - d) / 86400000);
    if (diff > 6 || diff < 0) return;
    const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
    if (!buckets[ev.event_type][dayIdx]) buckets[ev.event_type][dayIdx] = [];
    buckets[ev.event_type][dayIdx].push(ev.value.score);
  });

  const avg = arr => arr && arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const mood = days.map((_, i) => avg(buckets.emotional_state[i]));
  const energy = days.map((_, i) => avg(buckets.vocal_energy[i]));

  const allVals = [...mood, ...energy].filter(v => v != null);
  const hasData = allVals.length > 0;
  const minV = hasData ? Math.max(0, Math.min(...allVals) - 10) : 50;
  const maxV = hasData ? Math.min(100, Math.max(...allVals) + 10) : 100;
  const range = maxV - minV || 1;

  const W = 100, H = 60, pad = 4;
  const toX = (i) => pad + i * (W - pad * 2) / 6;
  const toY = (v) => H - pad - ((v - minV) / range) * (H - pad * 2);

  const buildPath = (arr) => {
    const valid = arr.map((v, i) => v != null ? { x: toX(i), y: toY(v), i } : null).filter(Boolean);
    if (valid.length < 2) return null;
    const line = "M" + valid.map(p => `${p.x},${p.y}`).join(" L");
    const area = `M${valid[0].x},${H} L${valid.map(p => `${p.x},${p.y}`).join(" L")} L${valid[valid.length - 1].x},${H} Z`;
    return { line, area, points: valid };
  };

  const m = buildPath(mood);
  const e = buildPath(energy);

  const gridLines = hasData
    ? [minV, minV + range * 0.25, minV + range * 0.5, minV + range * 0.75, maxV].map(Math.round)
    : [60, 70, 80, 90, 100];

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
         {gridLines.map(v => (
           <line key={v} x1={pad} y1={toY(v)} x2={W - pad} y2={toY(v)}
             stroke="rgba(93,64,55,0.07)" strokeWidth={0.5} strokeDasharray="2 2" />
         ))}
         {!hasData && (
           <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={6} fill="#9CA3AF">No data yet</text>
         )}
         {m && <><path d={m.area} fill="url(#mg)" /><path d={m.line} fill="none" stroke="#5D4037" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></>}
         {e && <><path d={e.area} fill="url(#eg)" /><path d={e.line} fill="none" stroke="#C68B59" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></>}
         {m && m.points.map((p, i) => (<circle key={`m${i}`} cx={p.x} cy={p.y} r={1.5} fill="#5D4037" />))}
         {e && e.points.map((p, i) => (<circle key={`e${i}`} cx={p.x} cy={p.y} r={1.5} fill="#C68B59" />))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {days.map(d => <span key={d} style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 500 }}>{d}</span>)}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
         <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
           <div style={{ width: 16, height: 2, borderRadius: 2, background: "#5D4037" }} />
            <span style={{ fontSize: 11, color: "#6b6b6b" }}>Observed Sentiment</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 2, borderRadius: 2, background: "#C68B59" }} />
           <span style={{ fontSize: 11, color: "#6b6b6b" }}>Acoustic Energy</span>
        </div>
      </div>
    </div>
  );
}

// ─── MEMORY CARD ──────────────────────────────────────────────────────────────
function MemoryCard({ title, summary, duration, date, index = 0, audioUrl = null, emotionalTone = null, promptQuestion = null, onDelete = null, deleting = false, comments = [], memoryId = null, profileId = null, visualAnalysis = null, reactions = [], onToggleHeart = null, onReact = null }) {
  const toneColors = { joyful: "#C68B59", nostalgic: "#8D6E63", peaceful: "#5D4037", concerned: "#6B8A9E" };
  const tone = emotionalTone || "positive";
  const toneColor = toneColors[tone.toLowerCase()] || "#C68B59";
  const isVideo = audioUrl?.includes("/video_");
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoRecording, setVideoRecording] = useState(false);
  const recorderRef = useRef(null);

  const resolveActorId = async () => {
    if (profileId) return profileId;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  };

  const sendComment = async (mediaUrl = null, mediaType = null, actorIdOverride = null) => {
    if (!commentText.trim() && !mediaUrl) return;
    if (!memoryId) return;
    setSending(true);
    try {
      const actorId = actorIdOverride || await resolveActorId();
      if (!actorId) {
        alert("Please sign in again to send your reaction.");
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", actorId).maybeSingle();
      const { error } = await supabase.from("memory_comments").insert({
        memory_id: memoryId,
        user_id: actorId,
        comment: commentText.trim() || (mediaType === "audio" ? "🎤 Voice reply" : "🎥 Video reply"),
        media_url: mediaUrl,
        media_type: mediaType,
        author_name: prof?.full_name || "Care Partner",
      }).select();
      if (error) {
        console.error("Comment insert failed:", error);
        alert("Could not send comment. Please try again.");
        return;
      }
      setCommentText("");
    } catch (err) {
      console.error("Comment error:", err);
      alert("Could not send comment.");
    } finally {
      setSending(false);
    }
  };

  const startAudioReply = async () => {
    let stream = null;
    try {
      const actorId = await resolveActorId();
      if (!actorId) {
        alert("Please sign in again to record a reaction.");
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { recorder, format } = buildMediaRecorder(stream, "audio");
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: format.contentType });
          const path = `${actorId}/comment_audio_${Date.now()}.${format.extension}`;
          const { data, error: uploadError } = await supabase.storage
            .from("memories")
            .upload(path, blob, { contentType: format.contentType });

          if (uploadError) {
            console.error("Audio upload error:", uploadError);
            alert("Could not upload audio reaction. Please try again.");
            return;
          }

          if (data) {
            const { data: urlData } = supabase.storage.from("memories").getPublicUrl(data.path);
            await sendComment(urlData.publicUrl, "audio", actorId);
          }
        } catch (err) {
          console.error("Audio reaction error:", err);
          alert("Could not process audio reaction. Please try again.");
        } finally {
          setRecording(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch (err) {
      console.error("Audio record error:", err);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      alert("Could not start audio recording. Please allow microphone access.");
      setRecording(false);
    }
  };

  const stopAudioReply = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const startVideoReply = async () => {
    let stream = null;
    try {
      const actorId = await resolveActorId();
      if (!actorId) {
        alert("Please sign in again to record a reaction.");
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const { recorder, format } = buildMediaRecorder(stream, "video");
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: format.contentType });
          const path = `${actorId}/comment_video_${Date.now()}.${format.extension}`;
          const { data, error: uploadError } = await supabase.storage
            .from("memories")
            .upload(path, blob, { contentType: format.contentType });

          if (uploadError) {
            console.error("Video upload error:", uploadError);
            alert("Could not upload video reaction. Please try again.");
            return;
          }

          if (data) {
            const { data: urlData } = supabase.storage.from("memories").getPublicUrl(data.path);
            await sendComment(urlData.publicUrl, "video", actorId);
          }
        } catch (err) {
          console.error("Video reaction error:", err);
          alert("Could not process video reaction. Please try again.");
        } finally {
          setVideoRecording(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setVideoRecording(true);
    } catch (err) {
      console.error("Video record error:", err);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      alert("Could not start video recording. Please allow camera and microphone access.");
      setVideoRecording(false);
    }
  };

  const stopVideoReply = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  };

  return (
    <div className="gcard" style={{ padding: 18, animation: `fadeUp .5s ease ${.6 + index * .1}s both` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3E2723", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled Memory"}</div>
          <div style={{ display: "flex", gap: 6 }}>
             <span style={{ fontSize: 10, fontWeight: 600, color: "#6b6b6b", background: "rgba(93,64,55,0.07)", padding: "2px 8px", borderRadius: 100 }}>{date}</span>
             <span style={{ fontSize: 10, fontWeight: 600, color: "#6b6b6b", background: "rgba(93,64,55,0.07)", padding: "2px 8px", borderRadius: 100 }}>{duration}</span>
             {comments.length > 0 && (
               <span style={{ fontSize: 10, fontWeight: 600, color: "#C68B59", background: "rgba(198,139,89,0.1)", padding: "2px 8px", borderRadius: 100, display: "flex", alignItems: "center", gap: 3 }}>
                 <MessageCircle size={10} /> {comments.length}
               </span>
             )}
          </div>
        </div>
      </div>
      {promptQuestion && (
        <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(198,139,89,0.06)", border: "1px solid rgba(198,139,89,0.12)" }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Question</div>
          <p style={{ fontSize: 12, color: "#8D6E63", fontStyle: "italic", margin: 0, lineHeight: 1.4 }}>"{promptQuestion}"</p>
        </div>
      )}
      {isVideo ? (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(93,64,55,0.12)", maxWidth: 300, marginBottom: 8 }}>
          <video src={audioUrl} controls playsInline style={{ width: "100%", display: "block", borderRadius: 10 }} />
        </div>
      ) : (
        <AudioPlayer color="#5D4037" audioUrl={audioUrl} />
      )}
      {summary && <p style={{ marginTop: 10, fontStyle: "italic", fontFamily: "'Cormorant Garamond',serif", fontSize: 14, color: "#6b6b6b", lineHeight: 1.65, borderLeft: "2px solid rgba(93,64,55,0.2)", paddingLeft: 10 }}>"{summary}"</p>}

      {/* Visual Analysis Card for video */}
      {visualAnalysis && (
        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(93,64,55,0.04)", border: "1px solid rgba(93,64,55,0.1)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#5D4037", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <Brain size={12} /> Visual Insights
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {visualAnalysis.facial_expression && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 100, background: "rgba(198,139,89,0.1)", color: "#8D6E63", fontWeight: 600 }}>😊 {visualAnalysis.facial_expression}</span>}
            {visualAnalysis.apparent_energy && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 100, background: "rgba(93,64,55,0.08)", color: "#5D4037", fontWeight: 600 }}>⚡ {visualAnalysis.apparent_energy} energy</span>}
          </div>
          {visualAnalysis.environment_notes && <p style={{ fontSize: 11, color: "#6b6b6b", margin: "4px 0", lineHeight: 1.4 }}>🏠 {visualAnalysis.environment_notes}</p>}
          {visualAnalysis.posture_mobility && <p style={{ fontSize: 11, color: "#6b6b6b", margin: "4px 0", lineHeight: 1.4 }}>🧍 {visualAnalysis.posture_mobility}</p>}
          {visualAnalysis.concerns && <p style={{ fontSize: 11, color: "#5B7FA5", margin: "4px 0", lineHeight: 1.4, fontWeight: 600 }}>📋 {visualAnalysis.concerns}</p>}
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: toneColor }} />
          <span style={{ fontSize: 10, color: toneColor, fontWeight: 600 }}>Emotional tone: {tone.charAt(0).toUpperCase() + tone.slice(1)}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {memoryId && onToggleHeart && (() => {
            const isHearted = reactions.some(r => r.user_id === profileId && r.reaction_type === "heart");
            const heartCount = reactions.filter(r => r.reaction_type === "heart").length;
            return (
              <button onClick={() => onToggleHeart(memoryId, isHearted)} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                borderRadius: 8, border: `1px solid ${isHearted ? "rgba(220,38,38,0.25)" : "rgba(198,139,89,0.2)"}`,
                background: isHearted ? "rgba(220,38,38,0.08)" : "rgba(198,139,89,0.04)",
                color: isHearted ? "#DC2626" : "#C68B59", fontSize: 10, fontWeight: 600, cursor: "pointer",
                transition: "all .2s",
              }}>
                <Heart size={11} fill={isHearted ? "#DC2626" : "none"} /> {heartCount || ""}
              </button>
            );
          })()}
          {memoryId && (
            <button onClick={() => setShowComments(!showComments)} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
              borderRadius: 8, border: "1px solid rgba(198,139,89,0.2)",
              background: showComments ? "rgba(198,139,89,0.1)" : "rgba(198,139,89,0.04)",
              color: "#C68B59", fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>
              <MessageCircle size={11} /> {comments.length || ""}
            </button>
          )}
          {onDelete && (
            <button onClick={() => { if (window.confirm("Delete this memory? This cannot be undone.")) onDelete(); }} disabled={deleting} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
              borderRadius: 8, border: "1px solid rgba(220,38,38,0.2)",
              background: "rgba(220,38,38,0.04)", color: "#DC2626",
              fontSize: 10, fontWeight: 600, cursor: "pointer", opacity: deleting ? 0.5 : 1,
            }}>
              <Trash2 size={11} /> {deleting ? "…" : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* React to this Story button */}
      {memoryId && onReact && (
        <button onClick={() => onReact(memoryId, title)} style={{
          width: "100%", marginTop: 12, padding: "11px 16px", borderRadius: 14,
          background: "linear-gradient(135deg, rgba(198,139,89,0.08), rgba(93,64,55,0.04))",
          border: "1.5px solid rgba(198,139,89,0.2)",
          color: "#5D4037", fontSize: 12, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all .2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(198,139,89,0.15), rgba(93,64,55,0.08))"; e.currentTarget.style.borderColor = "rgba(198,139,89,0.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(198,139,89,0.08), rgba(93,64,55,0.04))"; e.currentTarget.style.borderColor = "rgba(198,139,89,0.2)"; }}
        >
          <Sparkles size={14} color="#C68B59" />
          React to this Story
          <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500 }}>🎤 🎥</span>
        </button>
      )}

      {/* Collapsible Comments Section */}
      {showComments && (
        <div style={{ marginTop: 12, borderTop: "1px solid rgba(93,64,55,0.08)", paddingTop: 12 }}>
          {comments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {comments.map(c => (
                <div key={c.id} style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(198,139,89,0.06)", border: "1px solid rgba(198,139,89,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#5D4037" }}>{c.author_name || "Family"}</span>
                    <span style={{ fontSize: 9, color: "#9CA3AF" }}>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  {c.media_url && c.media_type === "audio" && (
                    <div style={{ marginBottom: 4 }}><AudioPlayer color="#8D6E63" audioUrl={c.media_url} /></div>
                  )}
                  {c.media_url && c.media_type === "video" && (
                    <div style={{ borderRadius: 8, overflow: "hidden", maxWidth: 200, marginBottom: 4 }}>
                      <video src={c.media_url} controls playsInline style={{ width: "100%", display: "block" }} />
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: "#3E2723", margin: 0, lineHeight: 1.4 }}>{c.comment}</p>
                </div>
              ))}
            </div>
          )}
          {/* Comment input */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={e => e.key === "Enter" && sendComment()}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 10,
                border: "1px solid rgba(93,64,55,0.12)", background: "rgba(255,255,255,0.8)",
                fontSize: 12, color: "#3E2723", outline: "none",
                fontFamily: "'DM Sans',sans-serif",
              }}
            />
            {recording ? (
              <button onClick={stopAudioReply} style={{
                width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                background: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center",
                animation: "callPulse 1.5s ease infinite",
              }}>
                <Pause size={14} color="#FFF8F0" />
              </button>
            ) : (
              <button onClick={startAudioReply} style={{
                width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                background: "rgba(93,64,55,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Mic size={14} color="#5D4037" />
              </button>
            )}
            {videoRecording ? (
              <button onClick={stopVideoReply} style={{
                width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                background: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center",
                animation: "callPulse 1.5s ease infinite",
              }}>
                <Pause size={14} color="#FFF8F0" />
              </button>
            ) : (
              <button onClick={startVideoReply} style={{
                width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                background: "rgba(93,64,55,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
              }} title="Record video reply">
                <Video size={14} color="#5D4037" />
              </button>
            )}
            <button onClick={() => sendComment()} disabled={sending || !commentText.trim()} style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "#5D4037", color: "#FFF8F0", fontSize: 11, fontWeight: 600,
              opacity: sending || !commentText.trim() ? 0.5 : 1,
            }}>
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GUARDIAN DASHBOARD ───────────────────────────────────────────────────────
export default function CarePartnerDashboard({ inPanel = false, profileId = null }) {
  const { w } = useWindowSize();
  const isMobile = !inPanel && w < 768;
  const [nav, setNav] = useState("home");
  const [drawer, setDrawer] = useState(false);

  const mainContentRef = useRef(null);

  // Mark memories as viewed when switching to memories tab
  const setNavWithMark = (id) => {
    setNav(id);
    trackEvent("view_" + id);
    // Scroll main content to top
    if (mainContentRef.current) mainContentRef.current.scrollTop = 0;
    if (id === "memories") {
      // delay slightly so data renders first
      setTimeout(() => markMemoriesViewed(), 300);
    }
  };
  const [incomingCall, setIncomingCall] = useState(null);
  const [emergency, setEmergency] = useState(null);
  const [callOpen, setCallOpen] = useState(false);
  const [parentOnline, setParentOnline] = useState(false);

  const { parentProfile, memories: realMemories, healthEvents, stats: derivedStats, loading: dataLoading, lastUpdated, memoryComments, memoryReactions, unreadCount, unreadHearts, unreadComments, markMemoriesViewed, parentStreak } = useParentData(profileId);

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

  // Track parent online presence
  useEffect(() => {
    if (!parentProfile?.id) return;
    const presenceCh = supabase.channel(`presence:${parentProfile.id}`)
      .on("presence", { event: "sync" }, () => {
        const state = presenceCh.presenceState();
        const isOnline = Object.keys(state).length > 0;
        setParentOnline(isOnline);
      })
      .subscribe();
    return () => { supabase.removeChannel(presenceCh); };
  }, [parentProfile?.id]);
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
  const [notifPref, setNotifPref] = useState({ emergency: true, connection: true, memories: true });
  const [signingOut, setSigningOut] = useState(false);
  const [memorySearch, setMemorySearch] = useState("");
  const [memoryFilter, setMemoryFilter] = useState("all");
  const [deletingMemId, setDeletingMemId] = useState(null);

  // Reaction recorder state
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reactionMemoryId, setReactionMemoryId] = useState(null);
  const [reactionMemoryTitle, setReactionMemoryTitle] = useState("");

  const handleOpenReaction = (memId, memTitle) => {
    setReactionMemoryId(memId);
    setReactionMemoryTitle(memTitle || "A shared memory");
    setReactionOpen(true);
    trackEvent("reaction_record", { memory_id: memId, mode: "modal_open" });
  };

  // Caregiver questions state
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [questionSending, setQuestionSending] = useState(false);

  // Fetch caregiver questions
  useEffect(() => {
    if (!profileId || !parentProfile?.id) return;
    supabase.from("caregiver_questions")
      .select("*")
      .eq("caregiver_id", profileId)
      .eq("parent_id", parentProfile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setQuestions(data); });
  }, [profileId, parentProfile?.id]);

  const addQuestion = async () => {
    if (!newQuestion.trim() || !profileId || !parentProfile?.id) return;
    setQuestionSending(true);
    try {
      const { data, error } = await supabase.from("caregiver_questions").insert({
        caregiver_id: profileId,
        parent_id: parentProfile.id,
        question: newQuestion.trim(),
      }).select().single();
      if (data) {
        setQuestions(prev => [data, ...prev]);
        trackEvent("caregiver_question_send", { question_length: newQuestion.trim().length });
      }
      setNewQuestion("");
    } catch (err) { console.error("Add question error:", err); }
    finally { setQuestionSending(false); }
  };

  const removeQuestion = async (qId) => {
    await supabase.from("caregiver_questions").delete().eq("id", qId);
    setQuestions(prev => prev.filter(q => q.id !== qId));
  };

  // Care Partner profile state
  const [cpProfile, setCpProfile] = useState({ full_name: "", phone: "", location: "" });
  const [cpProfileLoading, setCpProfileLoading] = useState(false);
  const [cpProfileSaved, setCpProfileSaved] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const cityRef = useRef(null);

  // Memory collections / curation state
  const [collections, setCollections] = useState([]);
  const [collectionItems, setCollectionItems] = useState({}); // { collectionId: [memoryId, ...] }
  const [activeCollection, setActiveCollection] = useState(null); // viewing a specific collection
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [newCollectionEmoji, setNewCollectionEmoji] = useState("📚");
  const [collectionCreating, setCollectionCreating] = useState(false);
  const [addingToCollection, setAddingToCollection] = useState(null); // memoryId being added
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("");
  const [showCollectionAddPanel, setShowCollectionAddPanel] = useState(false);

  // Playlist state
  const [playlistActive, setPlaylistActive] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const playlistAudioRef = useRef(null);
  const playlistVideoRef = useRef(null);

  // Fetch collections
  useEffect(() => {
    if (!profileId) return;
    const fetchCollections = async () => {
      const { data: cols } = await supabase.from("memory_collections")
        .select("*")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });
      if (cols) {
        setCollections(cols);
        // Fetch all items for these collections
        if (cols.length > 0) {
          const colIds = cols.map(c => c.id);
          const { data: items } = await supabase.from("memory_collection_items")
            .select("*")
            .in("collection_id", colIds);
          const grouped = {};
          (items || []).forEach(item => {
            if (!grouped[item.collection_id]) grouped[item.collection_id] = [];
            grouped[item.collection_id].push(item.memory_id);
          });
          setCollectionItems(grouped);
        }
      }
    };
    fetchCollections();
  }, [profileId]);

  const createCollection = async () => {
    if (!newCollectionTitle.trim() || !profileId) return;
    setCollectionCreating(true);
    try {
      const { data, error } = await supabase.from("memory_collections").insert({
        user_id: profileId,
        title: newCollectionTitle.trim(),
        description: newCollectionDesc.trim() || null,
        emoji: newCollectionEmoji,
      }).select().single();
      if (data) {
        setCollections(prev => [data, ...prev]);
        setNewCollectionTitle("");
        setNewCollectionDesc("");
        setNewCollectionEmoji("📚");
        setShowCreateCollection(false);
      }
    } catch (err) { console.error("Create collection error:", err); }
    finally { setCollectionCreating(false); }
  };

  const deleteCollection = async (colId) => {
    if (!window.confirm("Delete this collection? Memories won't be deleted.")) return;
    await supabase.from("memory_collections").delete().eq("id", colId);
    setCollections(prev => prev.filter(c => c.id !== colId));
    setCollectionItems(prev => { const n = { ...prev }; delete n[colId]; return n; });
    if (activeCollection === colId) setActiveCollection(null);
  };

  const toggleMemoryInCollection = async (colId, memId) => {
    const items = collectionItems[colId] || [];
    if (items.includes(memId)) {
      await supabase.from("memory_collection_items").delete().eq("collection_id", colId).eq("memory_id", memId);
      setCollectionItems(prev => ({ ...prev, [colId]: (prev[colId] || []).filter(id => id !== memId) }));
    } else {
      await supabase.from("memory_collection_items").insert({ collection_id: colId, memory_id: memId });
      setCollectionItems(prev => ({ ...prev, [colId]: [...(prev[colId] || []), memId] }));
    }
    setAddingToCollection(null);
  };

  useEffect(() => {
    if (!profileId) return;
    supabase.from("profiles").select("full_name, phone, location").eq("id", profileId).maybeSingle()
      .then(({ data }) => {
        if (data) setCpProfile({ full_name: data.full_name || "", phone: data.phone || "", location: data.location || "" });
      });
  }, [profileId]);

  const saveCpProfile = async () => {
    if (!profileId) return;
    setCpProfileLoading(true);
    await supabase.from("profiles").update({
      full_name: cpProfile.full_name,
      phone: cpProfile.phone,
      location: cpProfile.location,
    }).eq("id", profileId);
    setCpProfileLoading(false);
    setCpProfileSaved(true);
    trackEvent("profile_save", {});
    setTimeout(() => setCpProfileSaved(false), 2000);
  };

  const handleLinkAccount = async () => {
    setLinkError(""); setLinkSuccess("");
    if (linkCodeInput.length !== 6) { setLinkError("Please enter a 6-digit code."); return; }
    setLinkLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("link-account", { body: { action: "link", code: linkCodeInput } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLinkSuccess(`Linked to ${data.parent_name || "parent"}! Refreshing…`);
      trackEvent("link_account", {});
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) { setLinkError(e.message || "Failed to link"); }
    finally { setLinkLoading(false); }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await flushTelemetry();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleToggleHeart = async (memoryId, isHearted) => {
    if (!profileId) return;
    trackEvent("heart_toggle", { memory_id: memoryId, action: isHearted ? "remove" : "add" });
    if (isHearted) {
      await supabase.from("memory_reactions").delete().eq("memory_id", memoryId).eq("user_id", profileId).eq("reaction_type", "heart");
    } else {
      await supabase.from("memory_reactions").insert({ memory_id: memoryId, user_id: profileId, reaction_type: "heart" });
    }
  };

  const navItems = [
    { id: "home", icon: <Home size={17} />, label: "Overview" },
    { id: "memories", icon: <Headphones size={17} />, label: "Memories" },
    { id: "health", icon: <Activity size={17} />, label: "Daily Rhythm" },
    { id: "alerts", icon: <Bell size={17} />, label: "Alerts" },
    { id: "settings", icon: <Settings size={17} />, label: "Settings" },
  ];

  const stats = [
     { label: "Acoustic Volume / Pitch", value: derivedStats.vocalEnergy.value, icon: Mic, color: "#5D4037", trend: derivedStats.vocalEnergy.trend,
       what: "Observed volume, pitch variation, and resonance patterns in speech.",
       how: "Analyzed directly from the audio waveform of recorded interactions.",
       meaning: { high: "75%+ = strong projection, typical speech pattern", mid: "40–75% = normal variation in volume/pitch", low: "Below 40% = reduced volume or pitch range observed" },
       infoNote: "This tracks the physical characteristics of speech — volume, pitch, and resonance patterns."
     },
     { label: "Communication Clarity", value: derivedStats.cognitiveClarity.value, icon: TrendingUp, color: "#8D6E63", trend: derivedStats.cognitiveClarity.trend,
       what: "Word retrieval pace, sentence flow, and vocabulary usage patterns.",
       how: "Derived from transcript analysis — vocabulary richness, logical flow, and self-corrections.",
       meaning: { high: "80%+ = fluent, varied vocabulary", mid: "50–80% = typical variation", low: "Below 50% = reduced fluency observed" },
       infoNote: "This monitors vocabulary use and response patterns during interactions."
     },
     { label: "Observed Sentiment", value: derivedStats.emotionalTone.value, icon: Heart, color: "#C68B59", trend: derivedStats.emotionalTone.trend,
       what: "Tone of voice and word choice patterns observed during interactions.",
       how: "Assessed from audio tone patterns, breathing rhythm, and vocal characteristics.",
       meaning: { high: "Joyful / Peaceful = positive tone observed", mid: "Calm / Nostalgic = steady tone", low: "Concerned / Subdued = lower tone observed" },
       infoNote: "This monitors tone of voice and word choice during recorded interactions."
     },
     { label: "Interaction Engagement", value: derivedStats.activityLevel.value, icon: Zap, color: "#A1887F", trend: derivedStats.activityLevel.trend,
       what: "Speech pace, interaction duration, and engagement patterns.",
       how: "Assessed from speech rate, rhythm, and interaction duration patterns.",
       meaning: { high: "Active = frequent, engaged interaction", mid: "Moderate = typical pattern", low: "Low = reduced interaction frequency observed" },
       infoNote: "This monitors the rhythm and pace of speech and interaction frequency."
     },
  ];

  const [expandedStat, setExpandedStat] = useState(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [compareIdx, setCompareIdx] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // Alerts: only actionable/problematic events + new recordings — not routine metrics
  const buildAlerts = () => {
    const items = [];
    const fmtAgo = (d) => {
      if (!d) return "";
      const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
      return `${Math.floor(mins / 1440)}d ago`;
    };

    // Emergencies
    healthEvents.filter(e => e.event_type === "emergency").forEach(e => {
      items.push({ text: "🚨 Emergency alert triggered", type: "warning", category: "urgent", time: fmtAgo(e.recorded_at), priority: 0 });
    });

    // Significant deviations from typical patterns
    healthEvents.forEach(e => {
      const score = e.value?.score;
      if (score == null) return;
      if (e.event_type === "vocal_energy" && score < 40) {
        items.push({ text: `🎙️ Reduced acoustic volume observed (${score}%)`, type: "warning", category: "anomaly", time: fmtAgo(e.recorded_at), priority: 1 });
      } else if ((e.event_type === "cognitive_vitality" || e.event_type === "cognitive_clarity") && score < 50) {
        items.push({ text: `🧠 Communication clarity below typical range (${score}%)`, type: "warning", category: "anomaly", time: fmtAgo(e.recorded_at), priority: 1 });
      } else if (e.event_type === "emotional_state" && (e.value?.label === "Distressed" || score < 30)) {
        items.push({ text: `💙 Subdued sentiment observed${e.value?.label ? ` — ${e.value.label}` : ""}`, type: "warning", category: "anomaly", time: fmtAgo(e.recorded_at), priority: 1 });
      } else if (e.event_type === "activity_level" && score < 30) {
        items.push({ text: `⚡ Reduced interaction engagement observed (${score}%)`, type: "warning", category: "anomaly", time: fmtAgo(e.recorded_at), priority: 1 });
      }
    });

    // Visual analysis — significant deviations
    healthEvents.filter(e => e.event_type === "visual_analysis" && e.value?.priority_review).forEach(e => {
      const concerns = [];
      if (e.value?.facial_symmetry?.label?.includes("Significant")) concerns.push("significant deviation in bilateral movement");
      if (e.value?.motor_control?.label?.includes("Significant")) concerns.push("deviation in movement stability");
      if (e.value?.skin_pallor?.label === "Pale") concerns.push("change in color reflectance");
      const detail = concerns.length > 0 ? concerns.join(", ") : "visual pattern deviation noted";
      items.push({ text: `👁️ Visual Pattern Review — ${detail}`, type: "warning", category: "urgent", time: fmtAgo(e.recorded_at), priority: 0 });
    });


    // New memories (recordings)
    realMemories.slice(0, 5).forEach(m => {
      const isVideo = m.audio_url?.includes("/video_");
      const icon = isVideo ? "🎥" : "🎤";
      items.push({
        text: `${icon} New memory: "${m.title || "Untitled"}"${m.emotional_tone ? ` · ${m.emotional_tone}` : ""}`,
        type: "info", category: "activity", time: fmtAgo(m.created_at), priority: 3
      });
    });

    // Sort by priority (emergencies first)
    items.sort((a, b) => a.priority - b.priority);
    return items;
  };

  const allAlerts = buildAlerts();
  const alerts = allAlerts.slice(0, 8);
  if (alerts.length === 0) alerts.push({ text: "No alerts — everything looks good ✓", type: "success", category: "info", time: "" });

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

  const deleteMemory = async (memId) => {
    if (deletingMemId) return;
    setDeletingMemId(memId);
    try {
      await supabase.from("memory_comments").delete().eq("memory_id", memId);
      await supabase.from("memories").delete().eq("id", memId);
      trackEvent("memory_delete", { memory_id: memId });
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingMemId(null);
    }
  };

  // Build visual analysis lookup from health events
  const visualAnalysisMap = {};
  healthEvents.forEach(e => {
    if (e.event_type === "visual_analysis" && e.value?.memory_id) {
      visualAnalysisMap[e.value.memory_id] = e.value;
    }
  });

  const memories = realMemories.length > 0
    ? realMemories.map(m => ({
      id: m.id,
      title: m.title || "Untitled",
      date: fmtDate(m.created_at),
      duration: fmtDuration(m.duration_seconds),
      summary: m.ai_summary || m.transcript || "",
      transcript: m.transcript || "",
      audioUrl: m.audio_url || null,
      emotionalTone: m.emotional_tone || null,
      promptQuestion: m.prompt_question || null,
      memoryId: m.id,
      comments: memoryComments[m.id] || [],
      visualAnalysis: visualAnalysisMap[m.id] || null,
      reactions: memoryReactions[m.id] || [],
    }))
    : [{ id: null, title: "No memories yet", date: "—", duration: "—", summary: "Memories recorded by your parent will appear here.", transcript: "", audioUrl: null, emotionalTone: null, promptQuestion: null, memoryId: null, comments: [], visualAnalysis: null }];

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
           <div className="gtxt" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 600 }}>Care Partner</div>
        </div>
        {mobile && <button onClick={() => setDrawer(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={18} color="#FFF8F0" /></button>}
      </div>

      {/* Parent status */}
       <div style={{ padding: "12px 14px", margin: "12px 10px", background: "rgba(93,64,55,0.05)", borderRadius: 14, border: "1px solid rgba(93,64,55,0.12)" }}>
         <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#5D4037,#C68B59)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {parentProfile?.avatar_url ? (
                <img src={parentProfile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={15} color="#FFF8F0" />
              )}
            </div>
           <div>
             <div style={{ fontSize: 12, fontWeight: 700, color: "#3E2723" }}>{parentProfile?.full_name || "Parent"}</div>
              <div style={{ fontSize: 10, color: parentOnline ? "#22C55E" : "#8D6E63", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: parentOnline ? "#22C55E" : "#8D6E63", display: "inline-block" }} />
                {dataLoading ? "Loading…" : parentOnline ? "Online" : "Offline"}
              </div>
           </div>
         </div>
       </div>

      <nav style={{ flex: 1, padding: "4px 10px", display: "flex", flexDirection: "column", gap: 1 }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setNavWithMark(item.id); setDrawer(false); }} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
            borderRadius: 11, border: "none", cursor: "pointer", textAlign: "left", width: "100%",
             background: nav === item.id ? "rgba(93,64,55,0.08)" : "transparent",
             color: nav === item.id ? "#3E2723" : "#6b6b6b",
            fontWeight: nav === item.id ? 700 : 400, fontSize: 13, transition: "all .2s",
            position: "relative",
          }}>
            {item.icon}{item.label}
            {item.id === "memories" && unreadCount > 0 && nav !== "memories" && (
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "linear-gradient(135deg, #E8403F, #C62828)", color: "#FFF", fontSize: 9, fontWeight: 700,
                borderRadius: 100, display: "flex", alignItems: "center", gap: 6,
                padding: "3px 8px", boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
              }}>
                {unreadHearts > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Heart size={10} fill="#FFF" stroke="none" />{unreadHearts}
                </span>}
                {unreadComments > 0 && <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <MessageCircle size={10} fill="#FFF" stroke="none" />{unreadComments}
                </span>}
              </span>
            )}
          </button>
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
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#FAF6F1", position: "relative", overflowX: "hidden", overflowY: "auto", WebkitOverflowScrolling: "touch", paddingTop: inPanel ? 0 : "env(safe-area-inset-top, 0px)", paddingBottom: inPanel ? 0 : "env(safe-area-inset-bottom, 0px)" }}>

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
      <div ref={mainContentRef} className="scr" style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 14px 80px" : "20px 24px" }}>

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
                 {nav === "settings" ? "Settings" : `${parentProfile?.full_name?.split(" ")[0] || "Amma"}'s Dashboard`}
              </h1>
              <p style={{ color: "#6b6b6b", fontSize: 12, marginTop: 3 }}>
                {nav === "settings" ? "Manage your account & preferences" : <>
                  Staying connected with {parentProfile?.full_name || "Amma"}
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
              }}>{allAlerts.length}</span>
            </button>
          </div>}
        </div>

        {/* No linked parent onboarding */}
        {!parentProfile && !dataLoading && nav !== "settings" && (
          <div className="gcard" style={{ padding: 28, textAlign: "center", marginBottom: 16 }}>
           <Link2 size={32} color="#5D4037" style={{ margin: "0 auto 12px" }} />
             <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: "#3E2723", marginBottom: 8 }}>No parent linked yet</div>
             <p style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.6, marginBottom: 16 }}>
               Ask your loved one to share their 6-digit linking code from the app, then enter it in Settings.
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
            {/* My Profile */}
            <div className="gcard" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>My Partner Profile</div>
              <div style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 14 }}>Your contact details — visible to {parentProfile?.full_name?.split(" ")[0] || "your parent"}</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b6b6b", marginBottom: 4, display: "block" }}>Full Name</label>
                  <input value={cpProfile.full_name} onChange={e => setCpProfile(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Your name"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(93,64,55,0.15)", fontSize: 14, outline: "none", color: "#3E2723", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b6b6b", marginBottom: 4, display: "block" }}>Phone Number</label>
                  <input value={cpProfile.phone} onChange={e => setCpProfile(p => ({ ...p, phone: formatPhoneInput(e.target.value) }))}
                    placeholder="+91 98765 43210" type="tel"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${cpProfile.phone?.length > 0 ? (isValidPhone(cpProfile.phone) ? "rgba(34,197,94,0.4)" : "rgba(220,38,38,0.4)") : "rgba(93,64,55,0.15)"}`, fontSize: 14, outline: "none", color: "#3E2723", fontFamily: "'DM Sans',sans-serif" }} />
                  <div style={{ fontSize: 10, color: cpProfile.phone?.length > 3 && !isValidPhone(cpProfile.phone) ? "#DC2626" : "#9CA3AF", marginTop: 3 }}>
                    {cpProfile.phone?.length > 3 && !isValidPhone(cpProfile.phone) ? "Include country code, e.g. +91 98765 43210" : "Your loved one can use this to call you directly"}
                  </div>
                </div>
                <div style={{ position: "relative" }} ref={cityRef}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b6b6b", marginBottom: 4, display: "block" }}>Location</label>
                  <input
                    value={cpProfile.location}
                    onChange={e => {
                      const val = e.target.value;
                      setCpProfile(p => ({ ...p, location: val }));
                      const matches = filterCities(val);
                      setCitySuggestions(matches);
                      setShowCitySuggestions(matches.length > 0);
                    }}
                    onFocus={() => {
                      const matches = filterCities(cpProfile.location);
                      if (matches.length > 0) { setCitySuggestions(matches); setShowCitySuggestions(true); }
                    }}
                    onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
                    placeholder="Start typing a city…"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(93,64,55,0.15)", fontSize: 14, outline: "none", color: "#3E2723", fontFamily: "'DM Sans',sans-serif" }}
                  />
                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                      background: "#fff", borderRadius: 12, marginTop: 4,
                      border: "1px solid rgba(93,64,55,0.15)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      maxHeight: 240, overflowY: "auto"
                    }}>
                      {citySuggestions.map(city => (
                        <div
                          key={city}
                          onMouseDown={() => {
                            setCpProfile(p => ({ ...p, location: city }));
                            setShowCitySuggestions(false);
                          }}
                          style={{
                            padding: "10px 14px", fontSize: 13, color: "#3E2723", cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif",
                            borderBottom: "1px solid rgba(93,64,55,0.06)",
                            transition: "background .15s"
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(93,64,55,0.06)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          {city}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={saveCpProfile} disabled={cpProfileLoading || (cpProfile.phone?.length > 0 && !isValidPhone(cpProfile.phone))} style={{
                  width: "100%", padding: "12px", borderRadius: 12, border: "none", cursor: cpProfileLoading ? "wait" : "pointer",
                  background: cpProfileSaved ? "#22C55E" : "linear-gradient(135deg,#8D6E63,#5D4037)",
                  color: "#FFF8F0", fontSize: 13, fontWeight: 600, opacity: cpProfileLoading ? .6 : 1,
                  transition: "all .3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}>
                  {cpProfileLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : cpProfileSaved ? <Check size={14} /> : null}
                  {cpProfileLoading ? "Saving…" : cpProfileSaved ? "Saved!" : "Save Profile"}
                </button>
              </div>
            </div>

            {/* Link Account */}
            <div className="gcard" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Connect with Parent</div>
              <div style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 12 }}>Enter the 6-digit code from your parent's Ela screen</div>
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
                 { key: "emergency", label: "Emergency Alerts", desc: "Critical alerts when your parent needs help", icon: <AlertTriangle size={16} color="#DC2626" /> },
                 { key: "memories", label: "New Memories", desc: "When a new memory is recorded", icon: <Headphones size={16} color="#C68B59" /> },
                 { key: "connection", label: "Connection Updates", desc: "When your parent is active or shares stories", icon: <MessageCircle size={16} color="#8D6E63" /> },
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
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>Connected with</div>
                 <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                   <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#5D4037,#C68B59)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                     {parentProfile.avatar_url ? (
                       <img src={parentProfile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                     ) : (
                       <User size={22} color="#FFF8F0" />
                     )}
                   </div>
                   <div>
                     <div style={{ fontSize: 15, fontWeight: 700, color: "#3E2723" }}>{parentProfile.full_name || "Parent"}</div>
                      <div style={{ fontSize: 11, color: parentOnline ? "#22C55E" : "#8D6E63", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: parentOnline ? "#22C55E" : "#8D6E63" }} />
                        {parentOnline ? "Online" : "Offline"}
                      </div>
                   </div>
                </div>
                {/* Demographics */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "#5D4037" }}>
                  {parentProfile.age && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(93,64,55,0.04)", borderRadius: 10 }}>
                      <span style={{ color: "#8D6E63" }}>Age</span><span style={{ fontWeight: 600 }}>{parentProfile.age}</span>
                    </div>
                  )}
                  {parentProfile.gender && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(93,64,55,0.04)", borderRadius: 10 }}>
                      <span style={{ color: "#8D6E63" }}>Gender</span><span style={{ fontWeight: 600 }}>{parentProfile.gender}</span>
                    </div>
                  )}
                  {parentProfile.location && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(93,64,55,0.04)", borderRadius: 10 }}>
                      <span style={{ color: "#8D6E63" }}>Location</span><span style={{ fontWeight: 600 }}>{parentProfile.location}</span>
                    </div>
                  )}
                  {parentProfile.religion && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(93,64,55,0.04)", borderRadius: 10 }}>
                      <span style={{ color: "#8D6E63" }}>Religion</span><span style={{ fontWeight: 600 }}>{parentProfile.religion}</span>
                    </div>
                  )}
                  {parentProfile.language && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(93,64,55,0.04)", borderRadius: 10 }}>
                      <span style={{ color: "#8D6E63" }}>Language</span><span style={{ fontWeight: 600 }}>{({en:"English",hi:"हिंदी",bn:"বাংলা",ta:"தமிழ்",te:"తెలుగు",mr:"मराठी",gu:"ગુજરાતી",kn:"ಕನ್ನಡ"})[parentProfile.language] || parentProfile.language}</span>
                    </div>
                  )}
                  {parentProfile.health_issues?.length > 0 && (
                    <div style={{ padding: "8px 12px", background: "rgba(93,64,55,0.04)", borderRadius: 10 }}>
                      <div style={{ color: "#8D6E63", marginBottom: 6 }}>Health Conditions</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {parentProfile.health_issues.map((h, i) => (
                          <span key={i} style={{ padding: "4px 10px", borderRadius: 100, background: "rgba(198,139,89,0.12)", color: "#8D6E63", fontSize: 11, fontWeight: 600 }}>{h}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {parentProfile.interests?.length > 0 && (
                    <div style={{ padding: "8px 12px", background: "rgba(93,64,55,0.04)", borderRadius: 10 }}>
                      <div style={{ color: "#8D6E63", marginBottom: 6 }}>Interests</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {parentProfile.interests.map((h, i) => (
                          <span key={i} style={{ padding: "4px 10px", borderRadius: 100, background: "rgba(141,110,99,0.1)", color: "#5D4037", fontSize: 11, fontWeight: 600 }}>{h}</span>
                        ))}
                      </div>
                    </div>
                  )}
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
            {/* Active collection view */}
            {activeCollection ? (() => {
              const col = collections.find(c => c.id === activeCollection);
              if (!col) { setActiveCollection(null); return null; }
              const itemIds = collectionItems[activeCollection] || [];
              const colMemories = memories.filter(m => itemIds.includes(m.id));

              // Search for memories to add
              const sq = collectionSearchQuery.toLowerCase().trim();
              const searchResults = sq ? memories.filter(m => {
                if (itemIds.includes(m.id)) return false; // already in collection
                return (
                  (m.title && m.title.toLowerCase().includes(sq)) ||
                  (m.summary && m.summary.toLowerCase().includes(sq)) ||
                  (m.transcript && m.transcript.toLowerCase().includes(sq)) ||
                  (m.emotionalTone && m.emotionalTone.toLowerCase().includes(sq)) ||
                  (m.promptQuestion && m.promptQuestion.toLowerCase().includes(sq))
                );
              }) : [];

              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <button onClick={() => { setActiveCollection(null); setShowCollectionAddPanel(false); setCollectionSearchQuery(""); setPlaylistActive(false); }} style={{
                      width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                      background: "rgba(93,64,55,0.06)", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <ChevronLeft size={18} color="#5D4037" />
                    </button>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#3E2723", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{col.emoji}</span> {col.title}
                      </h2>
                      {col.description && <p style={{ fontSize: 12, color: "#8D6E63", margin: "3px 0 0" }}>{col.description}</p>}
                    </div>
                    <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{itemIds.length} {itemIds.length === 1 ? "memory" : "memories"}</span>
                  </div>

                  {/* Add memories panel */}
                  <div style={{ marginBottom: 16 }}>
                    <button onClick={() => { setShowCollectionAddPanel(!showCollectionAddPanel); setCollectionSearchQuery(""); }} style={{
                      width: "100%", padding: "12px 16px", borderRadius: 14, cursor: "pointer",
                      border: showCollectionAddPanel ? "1.5px solid rgba(198,139,89,0.3)" : "1.5px dashed rgba(198,139,89,0.25)",
                      background: showCollectionAddPanel ? "rgba(198,139,89,0.06)" : "transparent",
                      display: "flex", alignItems: "center", gap: 8, color: "#C68B59",
                      fontSize: 13, fontWeight: 600, transition: "all .2s"
                    }}>
                      <Plus size={16} /> {showCollectionAddPanel ? "Close" : "Add memories to this collection"}
                    </button>

                    {showCollectionAddPanel && (
                      <div style={{
                        marginTop: 10, padding: 16, borderRadius: 16,
                        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)",
                        border: "1px solid rgba(198,139,89,0.12)",
                        boxShadow: "0 4px 20px rgba(62,39,35,0.06)",
                        animation: "fadeUp .2s ease both"
                      }}>
                        {/* Search input */}
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                          background: "rgba(255,248,240,0.6)", border: "1px solid rgba(93,64,55,0.1)",
                          borderRadius: 12, marginBottom: 10
                        }}>
                          <Search size={15} color="#C68B59" />
                          <input
                            value={collectionSearchQuery}
                            onChange={e => setCollectionSearchQuery(e.target.value)}
                            placeholder="Search by title, keyword, or emotional tone…"
                            autoFocus
                            style={{
                              flex: 1, border: "none", outline: "none", background: "transparent",
                              fontSize: 13, color: "#3E2723", fontFamily: "'DM Sans',sans-serif"
                            }}
                          />
                          {collectionSearchQuery && (
                            <button onClick={() => setCollectionSearchQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
                              <X size={13} color="#9CA3AF" />
                            </button>
                          )}
                        </div>

                        {/* Quick tone filters */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          {[
                            { label: "Joyful", emoji: "😊" },
                            { label: "Nostalgic", emoji: "🌅" },
                            { label: "Peaceful", emoji: "🕊️" },
                            { label: "Concerned", emoji: "😟" },
                          ].map(tone => (
                            <button key={tone.label} onClick={() => setCollectionSearchQuery(tone.label.toLowerCase())} style={{
                              padding: "4px 10px", borderRadius: 100, border: "1px solid rgba(93,64,55,0.08)",
                              background: collectionSearchQuery === tone.label.toLowerCase() ? "rgba(198,139,89,0.12)" : "transparent",
                              color: collectionSearchQuery === tone.label.toLowerCase() ? "#C68B59" : "#8D6E63",
                              fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3
                            }}>
                              <span>{tone.emoji}</span> {tone.label}
                            </button>
                          ))}
                        </div>

                        {/* Results */}
                        {!sq ? (
                          <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "12px 0", margin: 0, fontStyle: "italic" }}>
                            Type a keyword, title, or click a tone to find memories
                          </p>
                        ) : searchResults.length === 0 ? (
                          <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "12px 0", margin: 0 }}>
                            No matching memories found {itemIds.length > 0 ? "(not already in collection)" : ""}
                          </p>
                        ) : (
                          <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                            {searchResults.map(m => (
                              <div key={m.id} style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                                borderRadius: 12, border: "1px solid rgba(93,64,55,0.08)",
                                background: "rgba(255,248,240,0.4)", cursor: "pointer",
                                transition: "all .15s"
                              }}
                              onClick={() => toggleMemoryInCollection(activeCollection, m.id)}
                              >
                                <div style={{
                                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                  border: "2px solid rgba(198,139,89,0.3)", background: "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center"
                                }}>
                                  <Plus size={14} color="#C68B59" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#3E2723", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.title}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                    <span style={{ fontSize: 10, color: "#9CA3AF" }}>{m.date}</span>
                                    {m.emotionalTone && (
                                      <span style={{
                                        fontSize: 9, fontWeight: 600, padding: "1px 7px", borderRadius: 100,
                                        background: m.emotionalTone.toLowerCase() === "joyful" ? "rgba(76,175,80,0.1)" : "rgba(198,139,89,0.1)",
                                        color: m.emotionalTone.toLowerCase() === "joyful" ? "#4CAF50" : "#C68B59",
                                      }}>{m.emotionalTone}</span>
                                    )}
                                    <span style={{ fontSize: 10, color: "#9CA3AF" }}>{m.duration}</span>
                                  </div>
                                  {m.summary && (
                                    <p style={{ fontSize: 11, color: "#6b6b6b", margin: "3px 0 0", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {m.summary.slice(0, 80)}{m.summary.length > 80 ? "…" : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Playlist Player */}
                  {colMemories.length >= 2 && (
                    <div style={{ marginBottom: 16 }}>
                      {!playlistActive ? (
                        <button onClick={() => { setPlaylistActive(true); setPlaylistIndex(0); }} style={{
                          width: "100%", padding: "14px 18px", borderRadius: 16, cursor: "pointer",
                          border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                          background: "linear-gradient(135deg, #5D4037 0%, #8D6E63 100%)",
                          color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(93,64,55,0.18)",
                          transition: "all .2s"
                        }}>
                          <Play size={18} fill="#fff" /> Play All ({colMemories.length} memories)
                        </button>
                      ) : (
                        <div className="gcard" style={{ padding: 18, animation: "fadeUp .25s ease both" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: "linear-gradient(135deg, #5D4037, #8D6E63)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                              }}>
                                <Headphones size={16} color="#fff" />
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#3E2723" }}>Now Playing</div>
                                <div style={{ fontSize: 10, color: "#9CA3AF" }}>{playlistIndex + 1} of {colMemories.length}</div>
                              </div>
                            </div>
                            <button onClick={() => { setPlaylistActive(false); setPlaylistIndex(0); }} style={{
                              background: "rgba(93,64,55,0.06)", border: "none", borderRadius: 8,
                              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                            }}>
                              <X size={14} color="#5D4037" />
                            </button>
                          </div>

                          {/* Current memory info */}
                          {colMemories[playlistIndex] && (() => {
                            const cm = colMemories[playlistIndex];
                            const isVideo = cm.audioUrl?.includes("/video_");
                            return (
                              <div>
                                <div style={{
                                  fontSize: 14, fontWeight: 700, color: "#3E2723", marginBottom: 4,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                }}>{cm.title}</div>
                                {cm.emotionalTone && (
                                  <span style={{
                                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                                    background: "rgba(198,139,89,0.1)", color: "#C68B59", marginBottom: 10, display: "inline-block"
                                  }}>{cm.emotionalTone}</span>
                                )}

                                {/* Media player */}
                                {isVideo ? (
                                  <video
                                    ref={playlistVideoRef}
                                    src={cm.audioUrl}
                                    controls
                                    autoPlay
                                    onEnded={() => {
                                      if (playlistIndex < colMemories.length - 1) {
                                        setPlaylistIndex(playlistIndex + 1);
                                      } else {
                                        setPlaylistActive(false);
                                        setPlaylistIndex(0);
                                      }
                                    }}
                                    style={{
                                      width: "100%", borderRadius: 12, marginTop: 10,
                                      maxHeight: 280, background: "#000"
                                    }}
                                  />
                                ) : (
                                  <div style={{ marginTop: 10 }}>
                                    <audio
                                      ref={playlistAudioRef}
                                      src={cm.audioUrl}
                                      controls
                                      autoPlay
                                      onEnded={() => {
                                        if (playlistIndex < colMemories.length - 1) {
                                          setPlaylistIndex(playlistIndex + 1);
                                        } else {
                                          setPlaylistActive(false);
                                          setPlaylistIndex(0);
                                        }
                                      }}
                                      style={{ width: "100%", borderRadius: 10 }}
                                    />
                                  </div>
                                )}

                                {/* Summary */}
                                {cm.summary && (
                                  <p style={{
                                    fontSize: 11, color: "#6b6b6b", fontStyle: "italic",
                                    lineHeight: 1.5, margin: "10px 0 0", padding: "10px 12px",
                                    background: "rgba(255,248,240,0.6)", borderRadius: 10,
                                    borderLeft: "3px solid rgba(198,139,89,0.3)"
                                  }}>"{cm.summary.slice(0, 150)}{cm.summary.length > 150 ? "…" : ""}"</p>
                                )}
                              </div>
                            );
                          })()}

                          {/* Playlist track list */}
                          <div style={{
                            marginTop: 14, maxHeight: 180, overflowY: "auto",
                            display: "flex", flexDirection: "column", gap: 4
                          }}>
                            {colMemories.map((cm, idx) => (
                              <button key={cm.id} onClick={() => setPlaylistIndex(idx)} style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                                borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                                background: idx === playlistIndex ? "rgba(198,139,89,0.1)" : "transparent",
                                transition: "all .15s"
                              }}>
                                <div style={{
                                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                  background: idx === playlistIndex ? "linear-gradient(135deg, #5D4037, #8D6E63)" : "rgba(93,64,55,0.08)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 10, fontWeight: 700, color: idx === playlistIndex ? "#fff" : "#8D6E63"
                                }}>
                                  {idx === playlistIndex ? <Play size={10} fill="#fff" /> : idx + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 12, fontWeight: idx === playlistIndex ? 700 : 500,
                                    color: idx === playlistIndex ? "#3E2723" : "#6b6b6b",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                  }}>{cm.title}</div>
                                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>{cm.duration}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collection memories */}
                  {colMemories.length === 0 ? (
                    <div className="gcard" style={{ padding: 28, textAlign: "center" }}>
                      <Layers size={28} color="#9CA3AF" style={{ margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.6 }}>
                        No memories in this collection yet.<br />
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>Use the "Add memories" button above to search and add.</span>
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 13 }}>
                      {colMemories.map((m, i) => (
                        <div key={m.id || i} style={{ position: "relative" }}>
                          <MemoryCard {...m} index={i} profileId={profileId}
                            onDelete={m.id ? () => deleteMemory(m.id) : null}
                            deleting={deletingMemId === m.id}
                            onToggleHeart={handleToggleHeart}
                            onReact={handleOpenReaction}
                          />
                          {/* Remove from collection button */}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4, paddingRight: 8, marginBottom: 4 }}>
                            <button onClick={() => toggleMemoryInCollection(activeCollection, m.id)} style={{
                              display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
                              borderRadius: 8, border: "1px solid rgba(220,38,38,0.15)",
                              background: "rgba(220,38,38,0.04)", color: "#DC2626",
                              fontSize: 10, fontWeight: 600, cursor: "pointer"
                            }}>
                              <X size={10} /> Remove from collection
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })() : (
              <>
                {/* Header with create button */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{parentProfile?.full_name?.split(" ")[0] || "Amma"}'s Stories</h2>
                    <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 3 }}>Memories and moments shared with love</p>
                  </div>
                </div>

                {/* ── Collections Row ── */}
                {(collections.length > 0 || showCreateCollection) && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#5D4037", textTransform: "uppercase", letterSpacing: "0.1em" }}>Collections</span>
                      <button onClick={() => setShowCreateCollection(!showCreateCollection)} style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "4px 12px",
                        borderRadius: 100, border: "1px solid rgba(198,139,89,0.2)",
                        background: showCreateCollection ? "rgba(198,139,89,0.1)" : "transparent",
                        color: "#C68B59", fontSize: 11, fontWeight: 600, cursor: "pointer"
                      }}>
                        <FolderPlus size={13} /> New
                      </button>
                    </div>

                    {/* Create collection form */}
                    {showCreateCollection && (
                      <div className="gcard" style={{ padding: 16, marginBottom: 12, animation: "fadeUp .2s ease both" }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                          {/* Emoji picker (simple) */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {["📚", "🎉", "🌅", "💛", "🎂", "🏡", "✈️", "🎵", "🙏", "👨‍👩‍👧"].map(em => (
                              <button key={em} onClick={() => setNewCollectionEmoji(em)} style={{
                                width: 32, height: 32, borderRadius: 8, border: newCollectionEmoji === em ? "2px solid #C68B59" : "1px solid rgba(93,64,55,0.1)",
                                background: newCollectionEmoji === em ? "rgba(198,139,89,0.1)" : "transparent",
                                cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
                              }}>{em}</button>
                            ))}
                          </div>
                        </div>
                        <input value={newCollectionTitle} onChange={e => setNewCollectionTitle(e.target.value)}
                          placeholder="Collection name (e.g., Childhood Stories)"
                          onKeyDown={e => e.key === "Enter" && createCollection()}
                          style={{
                            width: "100%", padding: "10px 14px", borderRadius: 12, marginBottom: 8,
                            border: "1px solid rgba(93,64,55,0.12)", outline: "none",
                            fontSize: 13, color: "#3E2723", fontFamily: "'DM Sans',sans-serif"
                          }}
                        />
                        <input value={newCollectionDesc} onChange={e => setNewCollectionDesc(e.target.value)}
                          placeholder="Description (optional)"
                          style={{
                            width: "100%", padding: "10px 14px", borderRadius: 12, marginBottom: 10,
                            border: "1px solid rgba(93,64,55,0.08)", outline: "none",
                            fontSize: 12, color: "#6b6b6b", fontFamily: "'DM Sans',sans-serif"
                          }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={createCollection} disabled={collectionCreating || !newCollectionTitle.trim()} style={{
                            flex: 1, padding: "10px", borderRadius: 12, border: "none", cursor: "pointer",
                            background: !newCollectionTitle.trim() ? "rgba(93,64,55,0.08)" : "linear-gradient(135deg,#C68B59,#8D6E63)",
                            color: !newCollectionTitle.trim() ? "#9CA3AF" : "#FFF8F0", fontSize: 12, fontWeight: 600,
                            opacity: collectionCreating ? 0.5 : 1
                          }}>
                            {collectionCreating ? "Creating…" : "Create Collection"}
                          </button>
                          <button onClick={() => setShowCreateCollection(false)} style={{
                            padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(93,64,55,0.1)",
                            background: "transparent", color: "#6b6b6b", fontSize: 12, cursor: "pointer"
                          }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Collection cards */}
                    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                      {collections.map(col => {
                        const count = (collectionItems[col.id] || []).length;
                        return (
                          <div key={col.id} onClick={() => setActiveCollection(col.id)} style={{
                            minWidth: 140, padding: "14px 16px", borderRadius: 16, cursor: "pointer",
                            background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)",
                            border: "1px solid rgba(198,139,89,0.12)",
                            boxShadow: "0 2px 12px rgba(62,39,35,0.04)",
                            transition: "all .2s", flexShrink: 0
                          }}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>{col.emoji}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#3E2723", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{col.title}</div>
                            <div style={{ fontSize: 10, color: "#9CA3AF" }}>{count} {count === 1 ? "memory" : "memories"}</div>
                            <button onClick={(e) => { e.stopPropagation(); deleteCollection(col.id); }} style={{
                              marginTop: 6, background: "transparent", border: "none", cursor: "pointer",
                              fontSize: 9, color: "#9CA3AF", padding: 0, opacity: 0.6
                            }}>
                              <Trash2 size={10} /> Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Create first collection CTA if none exist */}
                {collections.length === 0 && !showCreateCollection && realMemories.length > 0 && (
                  <button onClick={() => setShowCreateCollection(true)} style={{
                    width: "100%", padding: "14px 18px", borderRadius: 16, marginBottom: 16,
                    border: "1.5px dashed rgba(198,139,89,0.3)", background: "rgba(198,139,89,0.03)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    color: "#C68B59", transition: "all .2s"
                  }}>
                    <Layers size={18} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Curate Memories</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>Create collections by theme, event, or person</div>
                    </div>
                  </button>
                )}

                {/* Search */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
                  border: "1px solid rgba(93,64,55,0.12)", borderRadius: 14, marginBottom: 10
                }}>
                  <Search size={16} color="#9CA3AF" />
                  <input value={memorySearch} onChange={e => setMemorySearch(e.target.value)}
                    placeholder="Search memories…"
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#3E2723", fontFamily: "'DM Sans',sans-serif" }}
                  />
                  {memorySearch && (
                    <button onClick={() => setMemorySearch("")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
                      <X size={14} color="#9CA3AF" />
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
                  {[
                    { id: "all", label: "All", emoji: "📚" },
                    { id: "joyful", label: "Joyful", emoji: "😊" },
                    { id: "nostalgic", label: "Nostalgic", emoji: "🌅" },
                    { id: "peaceful", label: "Peaceful", emoji: "🕊️" },
                    { id: "concerned", label: "Concerned", emoji: "😟" },
                  ].map(cat => (
                    <button key={cat.id} onClick={() => setMemoryFilter(cat.id)} style={{
                      padding: "6px 14px", borderRadius: 100, border: "none", cursor: "pointer",
                      background: memoryFilter === cat.id ? "#5D4037" : "rgba(93,64,55,0.06)",
                      color: memoryFilter === cat.id ? "#FFF8F0" : "#6b6b6b",
                      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 4, transition: "all .2s",
                    }}>
                      <span>{cat.emoji}</span> {cat.label}
                    </button>
                  ))}
                </div>

                {/* Memories list */}
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
                  const filtered = memories.filter(m => {
                    const matchesFilter = memoryFilter === "all" || (m.emotionalTone && m.emotionalTone.toLowerCase() === memoryFilter);
                    const matchesSearch = !q || m.title.toLowerCase().includes(q) || (m.transcript && m.transcript.toLowerCase().includes(q)) || (m.summary && m.summary.toLowerCase().includes(q));
                    return matchesFilter && matchesSearch;
                  });
                  return filtered.length === 0 ? (
                    <div className="gcard" style={{ padding: 28, textAlign: "center" }}>
                      <Search size={28} color="#9CA3AF" style={{ margin: "0 auto 10px" }} />
                      <p style={{ fontSize: 13, color: "#6b6b6b" }}>No memories match your filter</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 13 }}>
                      {filtered.map((m, i) => (
                        <div key={m.id || i}>
                          <MemoryCard {...m} index={i} profileId={profileId}
                            onDelete={m.id ? () => deleteMemory(m.id) : null}
                            deleting={deletingMemId === m.id}
                            onToggleHeart={handleToggleHeart}
                            onReact={handleOpenReaction}
                          />
                          {/* Add to collection button */}
                          {m.id && collections.length > 0 && (
                            <div style={{ position: "relative", marginTop: -6, marginBottom: 6, display: "flex", justifyContent: "flex-end", paddingRight: 8 }}>
                              <button onClick={() => setAddingToCollection(addingToCollection === m.id ? null : m.id)} style={{
                                display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                                borderRadius: 8, border: "1px solid rgba(198,139,89,0.15)",
                                background: addingToCollection === m.id ? "rgba(198,139,89,0.1)" : "rgba(255,255,255,0.6)",
                                color: "#C68B59", fontSize: 10, fontWeight: 600, cursor: "pointer"
                              }}>
                                <Bookmark size={11} /> Add to collection
                              </button>
                              {addingToCollection === m.id && (
                                <div style={{
                                  position: "absolute", top: "100%", right: 8, zIndex: 20, marginTop: 4,
                                  background: "#fff", borderRadius: 14, padding: 8,
                                  border: "1px solid rgba(93,64,55,0.12)",
                                  boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
                                  minWidth: 180, animation: "fadeUp .15s ease both"
                                }}>
                                  {collections.map(col => {
                                    const isIn = (collectionItems[col.id] || []).includes(m.id);
                                    return (
                                      <button key={col.id} onClick={() => toggleMemoryInCollection(col.id, m.id)} style={{
                                        display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                                        width: "100%", borderRadius: 10, border: "none", cursor: "pointer",
                                        background: isIn ? "rgba(76,175,80,0.06)" : "transparent",
                                        color: "#3E2723", fontSize: 12, fontWeight: 500, textAlign: "left",
                                        transition: "background .15s"
                                      }}>
                                        <span style={{ fontSize: 16 }}>{col.emoji}</span>
                                        <span style={{ flex: 1 }}>{col.title}</span>
                                        {isIn && <Check size={14} color="#4CAF50" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ══ HEALTH VIEW ══ */}
        {nav === "health" && !dataLoading && (
          <div className="s2">
            {/* Section header */}
            <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: "#3E2723", margin: 0 }}>{parentProfile?.full_name?.split(" ")[0] || "Amma"}'s Daily Rhythm</h2>
              <p style={{ fontSize: 12, color: "#8D6E63", marginTop: 4 }}>Behavioral indicators, visual patterns & interaction trends</p>
            </div>

            {/* Legal notice box */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: isMobile ? "12px 14px" : "14px 18px",
              borderRadius: 14, marginBottom: 20,
              background: "rgba(107,138,158,0.06)",
              border: "1px solid rgba(107,138,158,0.12)",
            }}>
              <Info size={16} color="#6B8A9E" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: "#5B7FA5", margin: 0, lineHeight: 1.6 }}>
                  Anvaya is a memory preservation and social connection tool. This application does not provide medical advice, diagnoses, or treatment. Insights are based on automated analysis of visual and audio patterns to track behavioral trends and emotional well-being.
                </p>
                <button onClick={() => setShowDisclaimerModal(true)} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 6,
                  fontSize: 11, fontWeight: 600, color: "#5B7FA5", textDecoration: "underline",
                  textUnderlineOffset: 2
                }}>Learn More</button>
              </div>
            </div>

            {/* ── 1. Voice Metrics ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(198,139,89,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mic size={14} color="#C68B59" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#3E2723" }}>Daily Indicators</span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : inPanel ? "1fr 1fr" : "repeat(4,1fr)",
                gap: 12
              }}>
                {stats.map((st, i) => {
                  const isOpen = expandedStat === `d-${i}`;
                  return (
                  <div key={i} className="gcard" style={{ padding: 16, cursor: "pointer", transition: "all .3s", border: isOpen ? `1.5px solid ${st.color}40` : undefined }}
                    onClick={() => setExpandedStat(isOpen ? null : `d-${i}`)}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: `${st.color}12`,
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <st.icon size={16} color={st.color} />
                        </div>
                        {st.infoNote && (
                          <div title={st.infoNote} style={{
                            width: 18, height: 18, borderRadius: "50%", cursor: "help",
                            background: "rgba(93,64,55,0.06)", display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            <HelpCircle size={11} color="#9CA3AF" />
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                          background: `${st.color}10`, color: st.color
                        }}>{st.trend}</span>
                        <ChevronDown size={14} color="#6b6b6b" style={{ transition: "transform .3s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{st.value}</div>
                    <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>{st.label}</div>
                  </div>
                  );
                })}
              </div>
              {/* Expanded metric explanation */}
              {stats.map((st, i) => expandedStat === `d-${i}` && (
                <div key={`exp-d-${i}`} className="gcard" style={{
                  marginTop: 12, padding: "18px 22px",
                  background: `${st.color}06`, border: `1px solid ${st.color}15`,
                  animation: "fadeUp .25s ease both"
                }}>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>What it measures</div>
                      <p style={{ fontSize: 11.5, color: "#555", lineHeight: 1.5, margin: 0 }}>{st.what}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>How it's measured</div>
                      <p style={{ fontSize: 11.5, color: "#555", lineHeight: 1.5, margin: 0 }}>{st.how}</p>
                    </div>
                     <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>What the range indicates</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {[
                          { dot: "#5D8A6B", text: st.meaning.high },
                          { dot: "#6B8A9E", text: st.meaning.mid },
                          { dot: "#8D8D8D", text: st.meaning.low },
                        ].map((row, ri) => (
                          <div key={ri} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: row.dot, marginTop: 5, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>{row.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── 2. Visual Biometrics ── */}
            {healthEvents.some(e => e.event_type === "visual_analysis") && (() => {
              const visualEvents = healthEvents.filter(e => e.event_type === "visual_analysis").slice(0, 7);
              if (visualEvents.length === 0) return null;

              const markers = [
                { key: "micro_expressions", label: "Expressive Range", desc: "Observed frequency of expression changes", icon: "😊", color: "#C68B59", infoNote: "Tracks how often facial expressions change during interactions." },
                { key: "motor_control", label: "Movement Stability", desc: "Observed steadiness in video frame", icon: "✋", color: "#8D6E63", infoNote: "Monitors steadiness and smoothness of movement observed in video." },
                { key: "vocal_visual_sync", label: "Vocal-Visual Sync", desc: "Speech & facial timing patterns", icon: "🔄", color: "#5D4037", infoNote: "Tracks synchronization between speech audio and facial movements." },
                { key: "facial_symmetry", label: "Bilateral Movement", desc: "Evenness of movement on both sides", icon: "🪞", color: "#5D8A6B", infoNote: "Analysis of facial muscle patterns compared to typical baseline." },
                { key: "skin_pallor", label: "Color Reflectance", desc: "Surface color consistency", icon: "🌡️", color: "#6B8A9E", infoNote: "Analysis of light reflection and surface color consistency in video." },
                { key: "eye_engagement", label: "Gaze Patterns", desc: "Visual attention tracking", icon: "👁️", color: "#5B7FA5", infoNote: "Tracks gaze direction and visual attention patterns." },
              ];

              const Sparkline = ({ data, color }) => {
                const valid = data.filter(v => v != null);
                if (valid.length < 2) return <span style={{ fontSize: 10, color: "#9CA3AF", fontStyle: "italic" }}>Insufficient data</span>;
                const W = 80, H = 24, pad = 2;
                const min = Math.max(0, Math.min(...valid) - 10);
                const max = Math.min(100, Math.max(...valid) + 10);
                const range = max - min || 1;
                const points = valid.map((v, i) => ({
                  x: pad + i * ((W - pad * 2) / (valid.length - 1)),
                  y: H - pad - ((v - min) / range) * (H - pad * 2)
                }));
                const path = "M" + points.map(p => `${p.x},${p.y}`).join(" L");
                return (
                  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
                    <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={color} />)}
                  </svg>
                );
              };

              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(93,64,55,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Scan size={14} color="#5D4037" />
                    </div>
                    <div>
                     <span style={{ fontSize: 13, fontWeight: 700, color: "#3E2723" }}>Visual Observations</span>
                      <span style={{ fontSize: 11, color: "#8D6E63", marginLeft: 8 }}>{visualEvents.length} recording{visualEvents.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="gcard" style={{ padding: isMobile ? 16 : 20 }}>
                    {/* Priority review banner */}
                    {visualEvents[0]?.value?.priority_review && (
                       <div style={{
                        padding: "10px 14px", borderRadius: 12, marginBottom: 14,
                        background: "rgba(107,138,158,0.06)", border: "1px solid rgba(107,138,158,0.15)",
                        display: "flex", alignItems: "center", gap: 8
                      }}>
                       <AlertTriangle size={15} color="#6B8A9E" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#5B7FA5" }}>Significant pattern deviation noted — review observations below</span>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
                      {markers.map(marker => {
                        const scores = visualEvents.map(e => e.value?.[marker.key]?.score).reverse();
                        const latest = visualEvents[0]?.value?.[marker.key];
                        return (
                          <div key={marker.key} style={{
                            padding: "14px 16px", borderRadius: 14,
                            background: "rgba(255,248,240,0.5)",
                            border: "1px solid rgba(93,64,55,0.06)"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 16 }}>{marker.icon}</span>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#3E2723" }}>{marker.label}</div>
                                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>{marker.desc}</div>
                                </div>
                                {marker.infoNote && (
                                  <div title={marker.infoNote} style={{
                                    width: 16, height: 16, borderRadius: "50%", cursor: "help",
                                    background: "rgba(93,64,55,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                                  }}>
                                    <HelpCircle size={9} color="#9CA3AF" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <Sparkline data={scores} color={marker.color} />
                              {latest?.score != null && (
                                <span style={{ fontSize: 18, fontWeight: 700, color: "#3E2723" }}>{latest.score}%</span>
                              )}
                            </div>
                            {latest && (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                                 <span style={{
                                  fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 100,
                                  background: latest.score >= 70 ? "rgba(93,138,107,0.1)" : latest.score >= 40 ? "rgba(107,138,158,0.1)" : "rgba(141,141,141,0.1)",
                                  color: latest.score >= 70 ? "#5D8A6B" : latest.score >= 40 ? "#6B8A9E" : "#8D8D8D"
                                }}>{latest.label}</span>
                              </div>
                            )}
                            {latest?.detail && (
                              <p style={{ fontSize: 10, color: "#6b6b6b", marginTop: 6, lineHeight: 1.4, margin: "6px 0 0 0" }}>{latest.detail}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Compare with previous */}
                    {visualEvents.length >= 2 && (
                      <div style={{ marginTop: 14, textAlign: "center" }}>
                        <button onClick={() => setCompareIdx(compareIdx != null ? null : 1)} style={{
                          padding: "8px 20px", borderRadius: 100, border: "1px solid rgba(93,64,55,0.15)",
                          background: compareIdx != null ? "rgba(93,64,55,0.06)" : "transparent",
                          color: "#5D4037", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          display: "inline-flex", alignItems: "center", gap: 6
                        }}>
                          <Eye size={14} /> {compareIdx != null ? "Hide Comparison" : "Compare with Previous"}
                        </button>
                        {compareIdx != null && visualEvents[compareIdx] && (
                          <div style={{
                            marginTop: 12, padding: "14px 18px", borderRadius: 16,
                            background: "rgba(198,139,89,0.04)", border: "1px solid rgba(198,139,89,0.1)",
                            textAlign: "left"
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#8D6E63", marginBottom: 8 }}>
                              Previous recording · {new Date(visualEvents[compareIdx].recorded_at).toLocaleDateString()}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                              {[
                                { label: "Bilateral Movement", key: "facial_symmetry" },
                                { label: "Color Reflectance", key: "skin_pallor" },
                                { label: "Gaze Patterns", key: "eye_engagement" },
                              ].map(m => {
                                const curr = visualEvents[0]?.value?.[m.key]?.score;
                                const prev = visualEvents[compareIdx]?.value?.[m.key]?.score;
                                const diff = curr != null && prev != null ? curr - prev : null;
                                return (
                                  <div key={m.key} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{m.label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3E2723" }}>
                                      {curr != null ? `${curr}%` : "—"}
                                    </div>
                                    {diff != null && (
                                       <div style={{
                                        fontSize: 10, fontWeight: 600, marginTop: 2,
                                        color: diff > 0 ? "#5D8A6B" : diff < 0 ? "#6B8A9E" : "#9CA3AF"
                                      }}>
                                        {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "—"}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── 3. Legacy Progress & Stories ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(198,139,89,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={14} color="#C68B59" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#3E2723" }}>Legacy & Connection</span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "1fr 1fr",
                gap: 14
              }}>
                <div className="gcard" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Legacy Progress</div>
                    <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Family history recorded</div>
                  </div>
                  {(() => {
                    const totalMin = Math.round(realMemories.reduce((s, m) => s + (m.duration_seconds || 0), 0) / 60);
                    const thisMonth = realMemories.filter(m => {
                      const d = new Date(m.created_at);
                      const now = new Date();
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    });
                    const monthMin = Math.round(thisMonth.reduce((s, m) => s + (m.duration_seconds || 0), 0) / 60);
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(198,139,89,0.06)", borderRadius: 14, border: "1px solid rgba(198,139,89,0.12)" }}>
                          <span style={{ fontSize: 24 }}>📖</span>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#3E2723" }}>{realMemories.length}</div>
                            <div style={{ fontSize: 11, color: "#8D6E63" }}>Total stories shared</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <div style={{ flex: 1, padding: "12px 14px", background: "rgba(93,64,55,0.04)", borderRadius: 14, border: "1px solid rgba(93,64,55,0.08)", textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#5D4037" }}>{totalMin}</div>
                            <div style={{ fontSize: 10, color: "#8D6E63" }}>Total minutes</div>
                          </div>
                          <div style={{ flex: 1, padding: "12px 14px", background: "rgba(93,64,55,0.04)", borderRadius: 14, border: "1px solid rgba(93,64,55,0.08)", textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#5D4037" }}>{monthMin}</div>
                            <div style={{ fontSize: 10, color: "#8D6E63" }}>This month</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="gcard" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{parentProfile?.full_name?.split(" ")[0] || "Amma"}'s Stories</div>
                    <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>{realMemories.length} memories shared</div>
                  </div>
                  {realMemories.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>No memories recorded yet</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Object.entries(realMemories.reduce((acc, m) => {
                          const tone = m.emotional_tone || "unknown";
                          acc[tone] = (acc[tone] || 0) + 1;
                          return acc;
                        }, {})).sort((a, b) => b[1] - a[1]).map(([tone, count]) => (
                          <span key={tone} style={{
                            fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                            background: tone === "joyful" ? "rgba(76,175,80,0.1)" : tone === "nostalgic" ? "rgba(198,139,89,0.1)" : tone === "peaceful" ? "rgba(141,110,99,0.1)" : "rgba(93,64,55,0.08)",
                            color: tone === "joyful" ? "#4CAF50" : tone === "nostalgic" ? "#C68B59" : tone === "peaceful" ? "#8D6E63" : "#5D4037"
                          }}>
                            {tone} · {count}
                          </span>
                        ))}
                      </div>
                      <div style={{
                        padding: "10px 12px", background: "rgba(198,139,89,0.06)",
                        borderRadius: 12, border: "1px solid rgba(198,139,89,0.12)"
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#3E2723", marginBottom: 3 }}>
                          Latest: "{realMemories[0]?.title || "Untitled"}"
                        </div>
                        <p style={{ fontSize: 10.5, color: "#6b6b6b", lineHeight: 1.5, margin: 0 }}>
                          {realMemories[0]?.ai_summary?.slice(0, 100) || realMemories[0]?.transcript?.slice(0, 100) || ""}
                          {(realMemories[0]?.ai_summary?.length > 100 || realMemories[0]?.transcript?.length > 100) ? "…" : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 4. Trends & Patterns ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(93,64,55,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={14} color="#5D4037" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#3E2723" }}>Trends & Patterns</span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "1fr 1fr",
                gap: 14
              }}>
                <div className="gcard" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Weekly Patterns</div>
                    <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>Observed sentiment & acoustic energy over 7 days</div>
                  </div>
                  <WeeklyTrendChart healthEvents={healthEvents} />
                </div>

                <div className="gcard" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Acoustic Patterns</div>
                    <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>24-hour acoustic activity heatmap</div>
                  </div>
                  <AcousticHeatmap healthEvents={healthEvents} />
                  <div style={{
                    marginTop: 12, padding: "8px 10px",
                    background: "rgba(141,110,99,0.04)", borderRadius: 10
                  }}>
                    <p style={{ fontSize: 10, color: "#8D6E63", lineHeight: 1.5, margin: 0 }}>
                      Brighter cells = higher acoustic energy. Patterns reveal daily routines and interaction windows.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Health tab footer disclaimer (removed — now at top as notice box) */}

          </div>
        )}

        {/* ══ ALERTS VIEW ══ */}
        {nav === "alerts" && (
          <div className="s2">
            <div style={{ marginBottom: 20 }}>
               <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Activity Log</h2>
              <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 3 }}>Grouped by type — only notable items shown</p>
            </div>
            {allAlerts.length === 0 ? (
              <div className="gcard" style={{ padding: 32, textAlign: "center" }}>
                <Bell size={28} color="#9CA3AF" style={{ margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>All clear</p>
                <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 4 }}>No notable observations right now</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  { key: "urgent", title: "🚨 Urgent", color: "#5B7FA5", bg: "rgba(91,127,165,0.04)", border: "rgba(91,127,165,0.12)" },
                  { key: "anomaly", title: "📊 Activity Anomalies", color: "#6B8A9E", bg: "rgba(107,138,158,0.04)", border: "rgba(107,138,158,0.12)" },
                  { key: "memory", title: "📖 Memory Activity", color: "#8D6E63", bg: "rgba(141,110,99,0.04)", border: "rgba(141,110,99,0.12)" },
                  { key: "activity", title: "🎤 Recent Activity", color: "#5D4037", bg: "rgba(93,64,55,0.04)", border: "rgba(93,64,55,0.12)" },
                ].map(group => {
                  const groupAlerts = allAlerts.filter(a => a.category === group.key);
                  if (groupAlerts.length === 0) return null;
                  return (
                    <div key={group.key}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: group.color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        {group.title}
                        <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>({groupAlerts.length})</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {groupAlerts.map((a, i) => (
                          <div key={i} className="gcard" style={{
                            padding: "12px 14px",
                            background: group.bg,
                            border: `1px solid ${group.border}`,
                            animation: `fadeUp .4s ease ${.05 + i * .05}s both`
                          }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                              <div style={{
                                width: 7, height: 7, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                                background: a.type === "warning" ? group.color : a.type === "success" ? "#22C55E" : "#A1887F"
                              }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, color: "#3E2723", lineHeight: 1.5, fontWeight: 500, margin: 0 }}>{a.text}</p>
                                {a.time && <span style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, display: "block" }}>{a.time}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ HOME VIEW ══ */}
        {nav === "home" && !dataLoading && (
          <>
            {/* ── Hero Summary Cards ── */}
            <div className="s2" style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : inPanel ? "1fr" : "1fr 1fr",
              gap: 18, marginBottom: 22
            }}>
              {/* ── Recording Streak Card ── */}
              <div style={{
                background: parentStreak.current >= 7
                  ? "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)"
                  : parentStreak.current >= 3
                    ? "linear-gradient(135deg, #FFF8F0 0%, #F5EDE4 100%)"
                    : "linear-gradient(135deg, #FAFAF5 0%, #F0EDE8 100%)",
                borderRadius: 24, padding: isMobile ? "18px 18px" : "22px 24px",
                border: parentStreak.current >= 7 ? "1px solid rgba(198,139,89,0.3)" : "1px solid rgba(93,64,55,0.1)",
                boxShadow: "0 4px 24px rgba(62,39,35,0.06)",
                animation: "fadeUp .5s ease .1s both",
                gridColumn: isMobile || inPanel ? "1" : "1 / -1"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: parentStreak.current >= 3
                        ? "linear-gradient(135deg, #FF9800, #F57C00)"
                        : "linear-gradient(135deg, #8D6E63, #5D4037)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24
                    }}>
                      🔥
                    </div>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#3E2723", lineHeight: 1 }}>
                        {parentStreak.current}
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#8D6E63", marginLeft: 6 }}>
                          {parentStreak.current === 1 ? "day" : "days"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#8D6E63", marginTop: 2 }}>
                        {parentStreak.current === 0
                          ? `${parentProfile?.full_name?.split(" ")[0] || "Amma"} hasn't started a streak yet`
                          : `${parentProfile?.full_name?.split(" ")[0] || "Amma"}'s recording streak`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#8D6E63" }}>Best streak</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#5D4037" }}>{parentStreak.longest} days</div>
                  </div>
                </div>
                {/* 7-day dots */}
                <div style={{ display: "flex", gap: 6, marginTop: 14, justifyContent: "center" }}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    const has = realMemories.some(m => {
                      if (!m.created_at) return false;
                      const md = new Date(m.created_at);
                      return `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, "0")}-${String(md.getDate()).padStart(2, "0")}` === dayStr;
                    });
                    const isToday = i === 6;
                    const label = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: has
                            ? "linear-gradient(135deg, #C68B59, #8D6E63)"
                            : isToday
                              ? "rgba(198,139,89,0.15)"
                              : "rgba(93,64,55,0.06)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: isToday && !has ? "2px dashed rgba(198,139,89,0.4)" : "none",
                          fontSize: 14
                        }}>
                          {has ? "✓" : ""}
                        </div>
                        <span style={{ fontSize: 10, color: "#8D6E63", fontWeight: isToday ? 700 : 400 }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
                {parentStreak.current > 0 && !parentStreak.recordedToday && (
                  <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: "#C68B59", fontStyle: "italic" }}>
                    No recording today yet — streak continues if they record before midnight 🌙
                  </div>
                )}
              </div>

              {/* Daily Connection Card */}
              <div style={{
                background: "linear-gradient(135deg, #FFF8F0 0%, #F5EDE4 100%)",
                borderRadius: 24, padding: isMobile ? "22px 20px" : "28px 28px",
                border: "1px solid rgba(198,139,89,0.15)",
                boxShadow: "0 4px 24px rgba(62,39,35,0.06)",
                animation: "fadeUp .5s ease .25s both"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 14,
                    background: "linear-gradient(135deg, #C68B59, #8D6E63)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <MessageCircle size={20} color="#FFF8F0" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#3E2723" }}>Daily Connection</div>
                    <div style={{ fontSize: 11, color: "#8D6E63" }}>How {parentProfile?.full_name || "Amma"}'s day is going</div>
                  </div>
                </div>
                {/* Memory blurb */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{
                    fontSize: 14, color: "#3E2723", lineHeight: 1.7,
                    fontFamily: "'DM Sans', sans-serif", margin: 0,
                    letterSpacing: "0.01em"
                  }}>
                    {(() => {
                      const name = parentProfile?.full_name?.split(" ")[0] || "Amma";
                      const memCount = realMemories.length;
                      if (memCount === 0) {
                        return `${name} hasn't recorded any memories yet. Once they start sharing stories, you'll see updates here. 💛`;
                      }
                      // Recent memories (last 24h)
                      const now = new Date();
                      const recent = realMemories.filter(m => m.created_at && (now - new Date(m.created_at)) < 86400000);
                      if (recent.length === 0) {
                        const latest = realMemories[0];
                        const daysAgo = Math.floor((now - new Date(latest.created_at)) / 86400000);
                        const topicText = latest.title && latest.title !== "Untitled" ? `"${latest.title}"` : "a story";
                        return `${name} hasn't recorded anything today. Their last memory was ${topicText}, ${daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}. Maybe a gentle nudge? 🌿`;
                      }
                      const totalDur = recent.reduce((s, m) => s + (m.duration_seconds || 0), 0);
                      const durMin = Math.max(1, Math.round(totalDur / 60));
                      const titles = recent.filter(m => m.title && m.title !== "Untitled").map(m => `"${m.title}"`);
                      const tones = [...new Set(recent.map(m => m.emotional_tone).filter(Boolean))];
                      let text = `${name} recorded ${recent.length} ${recent.length === 1 ? "memory" : "memories"} today, totaling ${durMin} minute${durMin > 1 ? "s" : ""} of sharing. `;
                      if (titles.length > 0) {
                        text += titles.length <= 2 ? `Topics include ${titles.join(" and ")}. ` : `Topics include ${titles.slice(0, 2).join(", ")} and more. `;
                      }
                      if (tones.length > 0) {
                        const emoMap = { joyful: "😊", nostalgic: "🌅", peaceful: "🕊️", distressed: "💙" };
                        const primary = tones[0];
                        text += `The overall tone feels ${primary}. ${emoMap[primary] || ""}`;
                      }
                      return text;
                    })()}
                  </p>
                </div>

                {/* Observation summary */}
                <p style={{
                  fontSize: 14, color: "#4a3f3a", lineHeight: 1.7,
                  fontFamily: "'DM Sans', sans-serif", margin: 0,
                  letterSpacing: "0.01em",
                  paddingTop: 14, borderTop: "1px solid rgba(198,139,89,0.12)"
                }}>
                  {(() => {
                    const name = parentProfile?.full_name?.split(" ")[0] || "Amma";
                    const parts = [];

                    // Acoustic volume
                    const vocalVal = parseInt(derivedStats.vocalEnergy.value);
                    if (!isNaN(vocalVal)) {
                      if (vocalVal >= 70) parts.push(`The system observed strong acoustic volume and pitch variation (${vocalVal}%) from ${name}.`);
                      else if (vocalVal >= 40) parts.push(`Acoustic volume observed at ${vocalVal}% — within typical range.`);
                      else parts.push(`Reduced acoustic volume noted at ${vocalVal}%.`);
                    }

                    // Communication clarity
                    const cogVal = parseInt(derivedStats.cognitiveClarity.value);
                    if (!isNaN(cogVal)) {
                      if (cogVal >= 70) parts.push(`Communication clarity observed at ${cogVal}% — fluent and varied.`);
                      else if (cogVal >= 45) parts.push(`Communication patterns show typical variation (${cogVal}%).`);
                      else parts.push(`Communication clarity observed at ${cogVal}% — below typical range.`);
                    }

                    // Observed sentiment
                    const emoTrend = derivedStats.emotionalTone.trend;
                    const emoVal = parseInt(derivedStats.emotionalTone.value);
                    if (emoTrend) {
                      if (/joy|happy/i.test(emoTrend)) parts.push(`Observed sentiment: upbeat and cheerful tone. 😊`);
                      else if (/peace|calm/i.test(emoTrend)) parts.push(`Observed sentiment: calm and relaxed tone. 🕊️`);
                      else if (/nostalg/i.test(emoTrend)) parts.push(`Observed sentiment: reflective and nostalgic tone. 🌅`);
                      else if (/distress|concern/i.test(emoTrend)) parts.push(`Observed sentiment: subdued tone noted. 💙`);
                      else parts.push(`Observed sentiment: ${emoTrend}.`);
                    } else if (!isNaN(emoVal)) {
                      if (emoVal >= 60) parts.push(`Observed sentiment appears positive (${emoVal}%).`);
                      else if (emoVal >= 35) parts.push(`Observed sentiment appears steady (${emoVal}%).`);
                      else parts.push(`Observed sentiment is subdued (${emoVal}%).`);
                    }

                    // Medication adherence removed — legacy-first pivot

                    if (parts.length === 0) return `Behavioral observations will appear here once ${name} starts recording interactions.`;
                    return parts.join(" ");
                  })()}
                </p>
              </div>

              {/* Health Highlights Card */}
              <div style={{
                background: "linear-gradient(135deg, #FAFAF5 0%, #F0EDE8 100%)",
                borderRadius: 24, padding: isMobile ? "22px 20px" : "28px 28px",
                border: "1px solid rgba(93,64,55,0.1)",
                boxShadow: "0 4px 24px rgba(62,39,35,0.06)",
                animation: "fadeUp .5s ease .18s both"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 14,
                    background: "linear-gradient(135deg, #5D4037, #8D6E63)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <ShieldCheck size={20} color="#FFF8F0" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#3E2723" }}>Daily Indicators</div>
                    <div style={{ fontSize: 11, color: "#8D6E63" }}>Trends at a glance</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    {
                      label: "Acoustic Volume",
                      status: (() => {
                        const v = derivedStats.vocalEnergy.value;
                        const num = parseInt(v);
                        if (isNaN(num)) return { text: v || "No data yet", color: "#8D6E63", bg: "rgba(141,110,99,0.08)" };
                        if (num >= 70) return { text: "Typical", color: "#5D8A6B", bg: "rgba(93,138,107,0.08)" };
                        if (num >= 40) return { text: "Moderate", color: "#6B8A9E", bg: "rgba(107,138,158,0.08)" };
                        return { text: "Below typical", color: "#8D8D8D", bg: "rgba(141,141,141,0.08)" };
                      })(),
                      icon: "🎙️"
                    },
                    {
                      label: "Legacy Progress",
                      status: (() => {
                        const totalMin = Math.round(realMemories.reduce((s, m) => s + (m.duration_seconds || 0), 0) / 60);
                        if (totalMin === 0) return { text: "No stories yet", color: "#8D6E63", bg: "rgba(141,110,99,0.08)" };
                        if (totalMin >= 30) return { text: `${totalMin} min recorded ✓`, color: "#5D8A6B", bg: "rgba(93,138,107,0.08)" };
                        return { text: `${totalMin} min recorded`, color: "#6B8A9E", bg: "rgba(107,138,158,0.08)" };
                      })(),
                      icon: "📖"
                    },
                    {
                      label: "Observed Sentiment",
                      status: (() => {
                        const trend = derivedStats.emotionalTone.trend;
                        const v = derivedStats.emotionalTone.value;
                        const num = parseInt(v);
                        if (isNaN(num) && !trend) return { text: "No data yet", color: "#8D6E63", bg: "rgba(141,110,99,0.08)" };
                        if (num >= 60 || /joy|happy|peace|calm/i.test(trend)) return { text: trend || "Positive tone", color: "#5D8A6B", bg: "rgba(93,138,107,0.08)" };
                        if (num >= 35 || /nostalg|neutral/i.test(trend)) return { text: trend || "Steady", color: "#6B8A9E", bg: "rgba(107,138,158,0.08)" };
                        return { text: trend || "Subdued tone", color: "#8D8D8D", bg: "rgba(141,141,141,0.08)" };
                      })(),
                      icon: "💛"
                    },
                    {
                      label: "Communication Clarity",
                      status: (() => {
                        const v = derivedStats.cognitiveClarity.value;
                        const num = parseInt(v);
                        if (isNaN(num)) return { text: v || "No data yet", color: "#8D6E63", bg: "rgba(141,110,99,0.08)" };
                        if (num >= 70) return { text: "Typical", color: "#5D8A6B", bg: "rgba(93,138,107,0.08)" };
                        if (num >= 45) return { text: "Normal variation", color: "#6B8A9E", bg: "rgba(107,138,158,0.08)" };
                        return { text: "Below typical", color: "#8D8D8D", bg: "rgba(141,141,141,0.08)" };
                      })(),
                      icon: "🧠"
                    },
                    {
                      label: "Visual Patterns",
                      status: (() => {
                        const name = parentProfile?.full_name?.split(" ")[0] || "Amma";
                        const visualEvents = healthEvents.filter(e => e.event_type === "visual_analysis");
                        if (visualEvents.length === 0) return { text: "No video data", color: "#8D6E63", bg: "rgba(141,110,99,0.08)" };
                        const latest = visualEvents[0]?.value;
                        if (!latest) return { text: "No video data", color: "#8D6E63", bg: "rgba(141,110,99,0.08)" };
                        if (latest.priority_review) return { text: "Deviation noted", color: "#6B8A9E", bg: "rgba(107,138,158,0.08)" };
                        const symScore = latest.facial_symmetry?.score;
                        const skinScore = latest.skin_pallor?.score;
                        const eyeScore = latest.eye_engagement?.score;
                        const avgScore = [symScore, skinScore, eyeScore].filter(s => s != null);
                        const avg = avgScore.length > 0 ? avgScore.reduce((a, b) => a + b, 0) / avgScore.length : null;
                        if (avg != null && avg >= 75) return { text: "Typical patterns", color: "#5D8A6B", bg: "rgba(93,138,107,0.08)" };
                        if (avg != null && avg >= 50) return { text: "Within range", color: "#6B8A9E", bg: "rgba(107,138,158,0.08)" };
                        if (avg != null) return { text: "Variation noted", color: "#8D8D8D", bg: "rgba(141,141,141,0.08)" };
                        if (latest.facial_expression === "happy" || latest.facial_expression === "calm") return { text: "Typical", color: "#5D8A6B", bg: "rgba(93,138,107,0.08)" };
                        if (latest.facial_expression === "distressed" || latest.facial_expression === "pain") return { text: "Variation noted", color: "#8D8D8D", bg: "rgba(141,141,141,0.08)" };
                        return { text: "Typical", color: "#8D6E63", bg: "rgba(141,110,99,0.08)" };
                      })(),
                      icon: "👁️"
                    },
                  ].map((item, idx) => (
                    <div key={idx} onClick={() => setNav("health")} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 14,
                      background: item.status.bg,
                      border: `1px solid ${item.status.color}18`,
                      cursor: "pointer", transition: "all .2s"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#3E2723" }}>{item.label}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: item.status.color,
                          padding: "3px 12px", borderRadius: 100,
                          background: `${item.status.color}10`
                        }}>{item.status.text}</span>
                        <ArrowUpRight size={13} color="#9CA3AF" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visual observation note */}
                {(() => {
                  const visualEvents = healthEvents.filter(e => e.event_type === "visual_analysis");
                  if (visualEvents.length === 0) return null;
                  const latest = visualEvents[0]?.value;
                  if (!latest) return null;
                  const name = parentProfile?.full_name?.split(" ")[0] || "Amma";
                  const skinLabel = latest.skin_pallor?.label;
                  const eyeLabel = latest.eye_engagement?.label;
                  if (skinLabel === "Pale" || skinLabel === "Slightly pale") {
                    return (
                      <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 14, background: "rgba(107,138,158,0.06)", border: "1px solid rgba(107,138,158,0.12)" }}>
                        <p style={{ fontSize: 12, color: "#6b6b6b", margin: 0, lineHeight: 1.5 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#6B8A9E", padding: "2px 8px", borderRadius: 100, background: "rgba(107,138,158,0.1)", marginRight: 6 }}>Observation</span>
                          Color reflectance for {name} shows variation compared to recent recordings. This may be due to lighting or other factors.
                        </p>
                      </div>
                    );
                  }
                  if (eyeLabel === "Low engagement" || eyeLabel === "Unfocused") {
                    return (
                      <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 14, background: "rgba(107,138,158,0.06)", border: "1px solid rgba(107,138,158,0.12)" }}>
                        <p style={{ fontSize: 12, color: "#6b6b6b", margin: 0, lineHeight: 1.5 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#6B8A9E", padding: "2px 8px", borderRadius: 100, background: "rgba(107,138,158,0.1)", marginRight: 6 }}>Observation</span>
                          {name}'s gaze patterns show reduced engagement compared to recent interactions — could be due to tiredness, lighting, or other factors.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                {/* Overview footer disclaimer */}
                <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 12, background: "transparent" }}>
                  <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0, lineHeight: 1.6, textAlign: "center" }}>
                    Anvaya is a memory preservation and social connection tool. Insights are based on automated analysis of visual and audio patterns to track behavioral trends and emotional well-being. Not a regulated medical device.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Questions for Parent ── */}
            {parentProfile && (
              <div style={{
                background: "rgba(255,255,255,0.8)", backdropFilter: "blur(16px)",
                borderRadius: 24, padding: isMobile ? "20px" : "24px 28px",
                border: "1px solid rgba(198,139,89,0.12)",
                boxShadow: "0 6px 28px rgba(62,39,35,0.05)",
                marginBottom: 22, animation: "fadeUp .5s ease .25s both"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: "linear-gradient(135deg, #C68B59, #8D6E63)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <HelpCircle size={18} color="#FFF8F0" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#3E2723" }}>Questions for {parentProfile?.full_name?.split(" ")[0] || "Amma"}</div>
                    <div style={{ fontSize: 11, color: "#8D6E63" }}>These will be asked during their next memory session</div>
                  </div>
                </div>

                {/* Add new question */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    placeholder="Ask something you'd love to know…"
                    onKeyDown={e => e.key === "Enter" && addQuestion()}
                    style={{
                      flex: 1, padding: "11px 16px", borderRadius: 14,
                      border: "1px solid rgba(93,64,55,0.12)", outline: "none",
                      fontSize: 13, color: "#3E2723", background: "#fff",
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                  />
                  <button onClick={addQuestion} disabled={questionSending || !newQuestion.trim()} style={{
                    width: 44, height: 44, borderRadius: 14, border: "none", cursor: "pointer",
                    background: !newQuestion.trim() ? "rgba(93,64,55,0.08)" : "linear-gradient(135deg, #C68B59, #8D6E63)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, opacity: questionSending ? 0.5 : 1,
                    boxShadow: newQuestion.trim() ? "0 2px 8px rgba(198,139,89,0.3)" : "none",
                    transition: "all .2s"
                  }}>
                    {questionSending ? <Loader2 size={16} color="#FFF8F0" style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={17} color={newQuestion.trim() ? "#FFF8F0" : "#9CA3AF"} />}
                  </button>
                </div>

                {/* Queued questions */}
                {questions.length === 0 ? (
                  <div style={{ padding: "16px 0", textAlign: "center" }}>
                    <p style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
                      No questions queued yet. Add one above and it will be asked next time {parentProfile?.full_name?.split(" ")[0] || "Amma"} records a memory.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {questions.map((q, qi) => (
                      <div key={q.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
                        background: q.used ? "rgba(76,175,80,0.04)" : "rgba(198,139,89,0.04)",
                        borderRadius: 14,
                        border: `1px solid ${q.used ? "rgba(76,175,80,0.12)" : "rgba(198,139,89,0.1)"}`,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                          background: q.used ? "rgba(76,175,80,0.1)" : "rgba(198,139,89,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {q.used ? <Check size={12} color="#4CAF50" /> : <HelpCircle size={12} color="#C68B59" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, color: "#3E2723", margin: 0, lineHeight: 1.4, fontWeight: 500 }}>"{q.question}"</p>
                          <span style={{ fontSize: 10, color: q.used ? "#4CAF50" : "#9CA3AF", marginTop: 3, display: "block" }}>
                            {q.used ? "✓ Asked" : "In queue"}
                          </span>
                        </div>
                        {!q.used && (
                          <button onClick={() => removeQuestion(q.id)} style={{
                            background: "transparent", border: "none", cursor: "pointer", padding: 4,
                            color: "#9CA3AF", opacity: 0.6
                          }} title="Remove question">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Recent Memories Feed ── */}
            <div className="s4" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: "#3E2723", margin: 0 }}>{parentProfile?.full_name?.split(" ")[0] || "Amma"}'s Recent Stories</h3>
                  <p style={{ fontSize: 12, color: "#8D6E63", marginTop: 4 }}>Moments shared by {parentProfile?.full_name?.split(" ")[0] || "Amma"}</p>
                </div>
                {realMemories.length > 3 && (
                  <button onClick={() => setNav("memories")} style={{
                    fontSize: 12, fontWeight: 600, color: "#5D4037", border: "none", background: "transparent",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                    padding: "6px 14px", borderRadius: 100, background: "rgba(93,64,55,0.06)"
                  }}>
                    View all <ChevronRight size={13} />
                  </button>
                )}
              </div>

              {realMemories.length === 0 ? (
                <div style={{
                  background: "linear-gradient(135deg, #FFF8F0, #F5EDE4)",
                  borderRadius: 24, padding: "40px 28px", textAlign: "center",
                  border: "1px solid rgba(198,139,89,0.12)"
                }}>
                  <Headphones size={36} color="#C68B59" style={{ margin: "0 auto 14px", opacity: 0.5 }} />
                  <p style={{ fontSize: 15, color: "#5D4037", fontWeight: 600, marginBottom: 6 }}>No memories yet</p>
                  <p style={{ fontSize: 13, color: "#8D6E63", lineHeight: 1.6 }}>
                    When {parentProfile?.full_name?.split(" ")[0] || "Amma"} records a story or memory,<br />it will appear here for you to listen to and respond.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {memories.slice(0, 3).map((m, i) => (
                    <div key={m.id || i} style={{
                      background: "rgba(255,255,255,0.8)",
                      backdropFilter: "blur(16px)",
                      borderRadius: 24, padding: isMobile ? "20px" : "24px 28px",
                      border: "1px solid rgba(255,255,255,0.6)",
                      boxShadow: "0 6px 28px rgba(62,39,35,0.05)",
                      animation: `fadeUp .5s ease ${.2 + i * .1}s both`
                    }}>
                      {/* Memory header */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {m.emotionalTone && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                              background: m.emotionalTone.toLowerCase() === "joyful" ? "rgba(76,175,80,0.1)" : m.emotionalTone.toLowerCase() === "nostalgic" ? "rgba(198,139,89,0.1)" : m.emotionalTone.toLowerCase() === "peaceful" ? "rgba(141,110,99,0.1)" : "rgba(93,64,55,0.08)",
                              color: m.emotionalTone.toLowerCase() === "joyful" ? "#4CAF50" : m.emotionalTone.toLowerCase() === "nostalgic" ? "#C68B59" : m.emotionalTone.toLowerCase() === "peaceful" ? "#8D6E63" : "#5D4037",
                              display: "inline-block", marginBottom: 8
                            }}>{m.emotionalTone}</span>
                          )}
                          <h4 style={{ fontSize: 17, fontWeight: 700, color: "#3E2723", margin: 0, lineHeight: 1.3 }}>{m.title}</h4>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                            <span style={{ fontSize: 11, color: "#8D6E63" }}>{m.date}</span>
                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>·</span>
                            <span style={{ fontSize: 11, color: "#8D6E63" }}>{m.duration}</span>
                          </div>
                        </div>
                        {/* Video thumbnail */}
                        {m.audioUrl?.includes("/video_") && (
                          <div onClick={(e) => { e.stopPropagation(); setActiveVideoUrl(m.audioUrl); }} style={{
                            width: 72, height: 72, borderRadius: 14, overflow: "hidden",
                            flexShrink: 0, position: "relative", cursor: "pointer",
                            background: "#1a1a1a", border: "1px solid rgba(93,64,55,0.12)"
                          }}>
                            <video
                              src={m.audioUrl}
                              muted
                              preload="metadata"
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              onLoadedData={e => { e.target.currentTime = 1; }}
                            />
                            <div style={{
                              position: "absolute", inset: 0, display: "flex",
                              alignItems: "center", justifyContent: "center",
                              background: "rgba(0,0,0,0.25)"
                            }}>
                              <Play size={18} color="#fff" fill="#fff" style={{ opacity: 0.9 }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <p style={{ fontSize: 13.5, color: "#4a3f3a", lineHeight: 1.7, margin: "0 0 16px 0" }}>
                        {m.summary ? (m.summary.length > 180 ? m.summary.slice(0, 180) + "…" : m.summary) : ""}
                      </p>

                      {/* Audio Player */}
                      {m.audioUrl && (
                        <div style={{ marginBottom: 16 }}>
                          <AudioPlayer color="#5D4037" audioUrl={m.audioUrl} />
                        </div>
                      )}

                      {/* Visual Wellness Report — for video memories */}
                      {m.audioUrl?.includes("/video_") && (() => {
                        const va = visualAnalysisMap[m.memoryId];
                        if (!va) return null;
                        const badges = [];
                        // Eye engagement badge
                        if (va.eye_engagement?.score != null) {
                          badges.push({
                            icon: "👁️", label: va.eye_engagement.score >= 70 ? "High Engagement" : va.eye_engagement.score >= 40 ? "Moderate Focus" : "Low Engagement",
                            color: va.eye_engagement.score >= 70 ? "#4CAF50" : va.eye_engagement.score >= 40 ? "#FF9800" : "#E53935"
                          });
                        }
                        // Skin pallor badge
                        if (va.skin_pallor?.label) {
                          const isHealthy = va.skin_pallor.label === "Healthy glow";
                          badges.push({
                            icon: "🌡️", label: isHealthy ? "Healthy Glow" : va.skin_pallor.label,
                            color: isHealthy ? "#4CAF50" : va.skin_pallor.label === "Slightly pale" ? "#FF9800" : "#E53935"
                          });
                        }
                        // Facial symmetry badge
                        if (va.facial_symmetry?.label) {
                          const isNormal = va.facial_symmetry.label === "Symmetric";
                          badges.push({
                            icon: "🪞", label: isNormal ? "Symmetric" : va.facial_symmetry.label,
                            color: isNormal ? "#4CAF50" : "#FF9800"
                          });
                        }
                        // Motor control badge
                        if (va.motor_control?.label) {
                          const isSteady = va.motor_control.label === "Steady";
                          badges.push({
                            icon: "✋", label: isSteady ? "Steady" : va.motor_control.label,
                            color: isSteady ? "#4CAF50" : va.motor_control.label.includes("Significant") ? "#E53935" : "#FF9800"
                          });
                        }
                        if (badges.length === 0) return null;
                        return (
                          <div style={{
                            padding: "12px 14px", borderRadius: 16, marginBottom: 16,
                            background: va.priority_review ? "rgba(229,57,53,0.04)" : "rgba(93,64,55,0.03)",
                            border: `1px solid ${va.priority_review ? "rgba(229,57,53,0.12)" : "rgba(93,64,55,0.08)"}`
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                              <Eye size={13} color={va.priority_review ? "#E53935" : "#8D6E63"} />
                              <span style={{ fontSize: 11, fontWeight: 600, color: va.priority_review ? "#E53935" : "#5D4037" }}>
                                {va.priority_review ? "⚠️ Priority Visual Review" : "Visual Wellness Check"}
                              </span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {badges.map((b, bi) => (
                                <span key={bi} style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 600,
                                  background: `${b.color}10`, color: b.color
                                }}>
                                  {b.icon} {b.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                        <button onClick={() => handleToggleHeart(m.memoryId, (m.reactions || []).some(r => r.user_id === profileId))} style={{
                          display: "flex", alignItems: "center", gap: 5, background: "transparent",
                          border: "none", cursor: "pointer", padding: "4px 0", color: (m.reactions || []).some(r => r.user_id === profileId) ? "#E53935" : "#9CA3AF",
                          fontSize: 12, fontWeight: 500
                        }}>
                          <Heart size={16} fill={(m.reactions || []).some(r => r.user_id === profileId) ? "#E53935" : "none"} />
                          {(m.reactions || []).length > 0 && <span>{(m.reactions || []).length}</span>}
                        </button>
                        {(m.comments || []).length > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#8D6E63" }}>
                            <MessageCircle size={14} /> {m.comments.length} {m.comments.length === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </div>

                      {/* Comment Back Area — the primary action */}
                      {m.memoryId && (
                        <div style={{
                          background: "rgba(198,139,89,0.04)",
                          borderRadius: 18, padding: "16px 18px",
                          border: "1px solid rgba(198,139,89,0.12)"
                        }}>
                          <p style={{ fontSize: 11, color: "#8D6E63", marginBottom: 10, fontWeight: 500 }}>
                            💬 Send a message back to {parentProfile?.full_name?.split(" ")[0] || "Amma"}
                          </p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              placeholder={`Reply to "${m.title}"…`}
                              style={{
                                flex: 1, padding: "11px 16px", borderRadius: 14,
                                border: "1px solid rgba(93,64,55,0.12)", outline: "none",
                                fontSize: 13, color: "#3E2723", background: "#fff",
                                fontFamily: "'DM Sans', sans-serif"
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter" && e.target.value.trim()) {
                                  const text = e.target.value.trim();
                                  e.target.value = "";
                                  try {
                                    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", profileId).maybeSingle();
                                    await supabase.from("memory_comments").insert({
                                      memory_id: m.memoryId,
                                      user_id: profileId,
                                      comment: text,
                                    author_name: prof?.full_name || "Care Partner",
                                    });
                                  } catch (err) { console.error("Quick reply error:", err); }
                                }
                              }}
                            />
                            <button
                              onClick={async () => {
                                if (!profileId || !m.memoryId) return;
                                try {
                                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                  const recorder = new MediaRecorder(stream);
                                  const chunks = [];
                                  recorder.ondataavailable = (e) => chunks.push(e.data);
                                  recorder.onstop = async () => {
                                    try {
                                      stream.getTracks().forEach((t) => t.stop());
                                      const blob = new Blob(chunks, { type: "audio/webm" });
                                      const path = `${profileId}/comment_audio_${Date.now()}.webm`;
                                      const { data, error: uploadError } = await supabase.storage
                                        .from("memories")
                                        .upload(path, blob, { contentType: "audio/webm" });
                                      if (uploadError) {
                                        console.error("Voice note upload error:", uploadError);
                                        alert("Could not upload voice reply. Please try again.");
                                        return;
                                      }
                                      if (data) {
                                        const { data: urlData } = supabase.storage.from("memories").getPublicUrl(data.path);
                                        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", profileId).maybeSingle();
                                        const { error: insertError } = await supabase.from("memory_comments").insert({
                                          memory_id: m.memoryId,
                                          user_id: profileId,
                                          comment: "🎤 Voice reply",
                                          media_url: urlData.publicUrl,
                                          media_type: "audio",
                                          author_name: prof?.full_name || "Care Partner",
                                        });
                                        if (insertError) {
                                          console.error("Voice note comment insert error:", insertError);
                                          alert("Could not send voice reply. Please try again.");
                                        }
                                      }
                                    } finally {
                                      stream.getTracks().forEach((t) => t.stop());
                                    }
                                  };
                                  recorder.start();
                                  setTimeout(() => recorder.stop(), 10000);
                                } catch (err) {
                                  console.error("Voice note error:", err);
                                  alert("Microphone access failed. Please allow permissions and try again.");
                                }
                              }}
                              style={{
                                width: 44, height: 44, borderRadius: 14, border: "none", cursor: "pointer",
                                background: "linear-gradient(135deg, #C68B59, #8D6E63)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, boxShadow: "0 2px 8px rgba(198,139,89,0.3)"
                              }}
                              title="Send voice note"
                            >
                              <Mic size={17} color="#FFF8F0" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!profileId || !m.memoryId) return;
                                try {
                                  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                  const recorder = new MediaRecorder(stream);
                                  const chunks = [];
                                  recorder.ondataavailable = (e) => chunks.push(e.data);
                                  recorder.onstop = async () => {
                                    try {
                                      stream.getTracks().forEach((t) => t.stop());
                                      const blob = new Blob(chunks, { type: "video/webm" });
                                      const path = `${profileId}/comment_video_${Date.now()}.webm`;
                                      const { data, error: uploadError } = await supabase.storage
                                        .from("memories")
                                        .upload(path, blob, { contentType: "video/webm" });
                                      if (uploadError) {
                                        console.error("Video note upload error:", uploadError);
                                        alert("Could not upload video reply. Please try again.");
                                        return;
                                      }
                                      if (data) {
                                        const { data: urlData } = supabase.storage.from("memories").getPublicUrl(data.path);
                                        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", profileId).maybeSingle();
                                        const { error: insertError } = await supabase.from("memory_comments").insert({
                                          memory_id: m.memoryId,
                                          user_id: profileId,
                                          comment: "🎥 Video reply",
                                          media_url: urlData.publicUrl,
                                          media_type: "video",
                                          author_name: prof?.full_name || "Care Partner",
                                        });
                                        if (insertError) {
                                          console.error("Video note comment insert error:", insertError);
                                          alert("Could not send video reply. Please try again.");
                                        }
                                      }
                                    } finally {
                                      stream.getTracks().forEach((t) => t.stop());
                                    }
                                  };
                                  recorder.start();
                                  setTimeout(() => recorder.stop(), 15000);
                                } catch (err) {
                                  console.error("Video note error:", err);
                                  alert("Camera/microphone access failed. Please allow permissions and try again.");
                                }
                              }}
                              style={{
                                width: 44, height: 44, borderRadius: 14, border: "none", cursor: "pointer",
                                background: "linear-gradient(135deg, #5D4037, #8D6E63)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, boxShadow: "0 2px 8px rgba(93,64,55,0.3)"
                              }}
                              title="Send video reply"
                            >
                              <Video size={17} color="#FFF8F0" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Connection Pulse ── */}
            <div className="s5" style={{
              background: "rgba(255,255,255,0.8)", backdropFilter: "blur(16px)",
              borderRadius: 24, padding: isMobile ? "20px" : "24px 28px",
              border: "1px solid rgba(255,255,255,0.55)",
              boxShadow: "0 6px 28px rgba(62,39,35,0.05)",
              marginBottom: 22
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: "linear-gradient(135deg, #8D6E63, #5D4037)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Heart size={18} color="#FFF8F0" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#3E2723" }}>Connection Pulse</div>
                  <div style={{ fontSize: 11, color: "#8D6E63" }}>Staying connected with {parentProfile?.full_name || "Amma"}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  background: "rgba(255,248,240,0.6)", borderRadius: 16,
                  border: "1px solid rgba(93,64,55,0.08)"
                }}>
                  <BookOpen size={16} color="#8D6E63" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#3E2723" }}>
                    {realMemories.length} {realMemories.length === 1 ? "Story" : "Stories"} Shared
                  </span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  background: "rgba(255,248,240,0.6)", borderRadius: 16,
                  border: "1px solid rgba(93,64,55,0.08)"
                }}>
                  <Mic size={16} color="#8D6E63" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#3E2723" }}>
                    {Math.round((realMemories.reduce((sum, m) => sum + (m.duration_seconds || 0), 0)) / 60)} min of legacy recorded
                  </span>
                </div>
              </div>
            </div>

            {/* ── Recent Alerts (compact) ── */}
            {allAlerts.filter(a => a.type === "warning").length > 0 && (
              <div className="s6" style={{
                background: "rgba(255,255,255,0.8)", backdropFilter: "blur(16px)",
                borderRadius: 24, padding: isMobile ? "20px" : "24px 28px",
                border: "1px solid rgba(229,57,53,0.08)",
                boxShadow: "0 6px 28px rgba(62,39,35,0.05)",
                marginBottom: 22
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: "rgba(107,138,158,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <AlertTriangle size={18} color="#6B8A9E" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#3E2723" }}>Activity Anomalies</div>
                    <div style={{ fontSize: 11, color: "#8D6E63" }}>Deviations from typical patterns</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {allAlerts.filter(a => a.type === "warning").slice(0, 4).map((a, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
                      background: "rgba(107,138,158,0.03)", borderRadius: 14,
                      border: "1px solid rgba(107,138,158,0.1)"
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6B8A9E", marginTop: 6, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 12.5, color: "#3E2723", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{a.text}</p>
                        {a.time && <span style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, display: "block" }}>{a.time}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Disclaimer Learn More Modal */}
      {showDisclaimerModal && (
        <>
          <div className="fadein" onClick={() => setShowDisclaimerModal(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 100,
            backdropFilter: "blur(4px)"
          }} />
          <div className="fadein" style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 101, width: isMobile ? "92%" : 480,
            background: "#FFF8F0", borderRadius: 24, padding: isMobile ? 24 : 32,
            boxShadow: "0 16px 48px rgba(62,39,35,0.2)", border: "1px solid rgba(93,64,55,0.1)",
            maxHeight: "80vh", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "rgba(107,138,158,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Info size={20} color="#5B7FA5" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3E2723" }}>About Anvaya Observations</div>
                  <div style={{ fontSize: 11, color: "#8D6E63", marginTop: 2 }}>How our system works</div>
                </div>
              </div>
              <button onClick={() => setShowDisclaimerModal(false)} style={{
                background: "rgba(93,64,55,0.06)", border: "none", borderRadius: 8,
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}>
                <X size={16} color="#5D4037" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#3E2723", marginBottom: 6 }}>What Anvaya tracks</div>
                <p style={{ fontSize: 12, color: "#555", lineHeight: 1.7, margin: 0 }}>
                  Anvaya observes <strong>behavioral trends</strong> — not biological vitals. Our system analyzes patterns in voice recordings and video interactions to provide objective observations about communication patterns, acoustic characteristics, facial movement patterns, and interaction engagement.
                </p>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#3E2723", marginBottom: 6 }}>What Anvaya does NOT do</div>
                <p style={{ fontSize: 12, color: "#555", lineHeight: 1.7, margin: 0 }}>
                  Anvaya does not measure blood pressure, heart rate, oxygen levels, or any clinical biomarkers. It does not diagnose medical conditions, prescribe treatments, or replace professional medical monitoring. Scores and labels represent AI-observed patterns compared to your family member's own baseline — not clinical standards.
                </p>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#3E2723", marginBottom: 6 }}>How to use these observations</div>
                <p style={{ fontSize: 12, color: "#555", lineHeight: 1.7, margin: 0 }}>
                  Use Anvaya's observations as conversation starters and awareness tools. If you notice sustained changes in patterns, consider scheduling a check-in with your family member or consulting a healthcare professional for further evaluation.
                </p>
              </div>

              <div style={{
                padding: "14px 16px", borderRadius: 14,
                background: "rgba(107,138,158,0.06)", border: "1px solid rgba(107,138,158,0.1)"
              }}>
                <p style={{ fontSize: 11, color: "#5B7FA5", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                  Anvaya is a companionship and wellness observation tool. This application does not provide medical advice, diagnoses, or treatment. Insights are based on automated analysis of visual and audio patterns and should not be used as a substitute for professional medical monitoring or clinical judgment. Anvaya is not a regulated medical device.
                </p>
              </div>
            </div>

            <button onClick={() => setShowDisclaimerModal(false)} style={{
              width: "100%", marginTop: 20, padding: "12px 20px", borderRadius: 14,
              border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #5D4037, #8D6E63)", color: "#FFF8F0",
              fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(93,64,55,0.2)"
            }}>
              I Understand
            </button>
          </div>
        </>
      )}

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
            <button key={item.id} onClick={() => setNavWithMark(item.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              border: "none", background: "transparent", cursor: "pointer", padding: "0 6px",
              color: nav === item.id ? "#3E2723" : "#9CA3AF", transition: "color .2s",
              position: "relative",
            }}>
              {item.icon}
              <span style={{ fontSize: 9, fontWeight: nav === item.id ? 700 : 400 }}>{item.label}</span>
              {item.id === "memories" && unreadCount > 0 && nav !== "memories" && (
                <span style={{
                  position: "absolute", top: -6, right: -6,
                  background: "linear-gradient(135deg, #E8403F, #C62828)", color: "#FFF", fontSize: 8, fontWeight: 700,
                  borderRadius: 100, display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 6px", boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
                }}>
                  {unreadHearts > 0 && <span style={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Heart size={8} fill="#FFF" stroke="none" />{unreadHearts}
                  </span>}
                  {unreadComments > 0 && <span style={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <MessageCircle size={8} fill="#FFF" stroke="none" />{unreadComments}
                  </span>}
                </span>
              )}
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

      {/* Video Player Modal */}
      {activeVideoUrl && (
        <div onClick={() => setActiveVideoUrl(null)} style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeUp .2s ease both"
        }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "90%", maxWidth: 640 }}>
            <button onClick={() => setActiveVideoUrl(null)} style={{
              position: "absolute", top: -44, right: 0, background: "rgba(255,255,255,0.15)",
              border: "none", borderRadius: 100, width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <X size={18} color="#fff" />
            </button>
            <video
              src={activeVideoUrl}
              controls
              autoPlay
              style={{ width: "100%", borderRadius: 16, maxHeight: "80vh", background: "#000" }}
            />
          </div>
        </div>
      )}

      {/* Reaction Recorder Modal */}
      <ReactionRecorder
        open={reactionOpen}
        onClose={() => setReactionOpen(false)}
        memoryId={reactionMemoryId}
        memoryTitle={reactionMemoryTitle}
        profileId={profileId}
        parentName={parentProfile?.full_name?.split(" ")[0] || "Amma"}
      />
    </div>
  );
}
