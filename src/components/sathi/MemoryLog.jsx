import { useState, useEffect } from "react";
import { X, BookOpen, MessageCircle, ChevronDown, ChevronUp, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TONE_EMOJI = { joyful: "😊", nostalgic: "🌅", peaceful: "🕊️", concerned: "😟" };

export default function MemoryLog({ open, onClose, lang = "en", userId }) {
  const [memories, setMemories] = useState([]);
  const [comments, setComments] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [audioEl, setAudioEl] = useState(null);

  useEffect(() => {
    if (!open || !userId) return;
    const load = async () => {
      setLoading(true);
      const { data: mems } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setMemories(mems || []);

      if (mems?.length) {
        const ids = mems.map((m) => m.id);
        const { data: cmts } = await supabase
          .from("memory_comments")
          .select("*")
          .in("memory_id", ids)
          .order("created_at", { ascending: true });

        const grouped = {};
        (cmts || []).forEach((c) => {
          if (!grouped[c.memory_id]) grouped[c.memory_id] = [];
          grouped[c.memory_id].push(c);
        });
        setComments(grouped);
      }
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel("memory-log-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "memory_comments" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "memories" }, () => load())
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [open, userId]);

  const togglePlay = (url, id) => {
    if (playingId === id && audioEl) {
      audioEl.pause();
      setPlayingId(null);
      return;
    }
    if (audioEl) audioEl.pause();
    const a = new Audio(url);
    a.play();
    a.onended = () => setPlayingId(null);
    setAudioEl(a);
    setPlayingId(id);
  };

  if (!open) return null;

  const formatDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div
      className="fadein"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BookOpen size={22} color="#C68B59" />
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#FFF8F0", fontWeight: 600 }}>
            {lang === "en" ? "Memory Log" : "यादों की डायरी"}
          </span>
        </div>
        <button
          onClick={() => { if (audioEl) audioEl.pause(); onClose(); }}
          style={{
            width: 54, height: 54, borderRadius: 16,
            border: "2.5px solid rgba(255,100,100,.55)",
            background: "rgba(220,38,38,.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 18px rgba(220,38,38,.3)", cursor: "pointer",
          }}
        >
          <X size={28} color="#FFF8F0" strokeWidth={3} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", marginTop: 60, color: "rgba(255,248,240,.5)", fontSize: 15 }}>
            {lang === "en" ? "Loading memories…" : "यादें लोड हो रही हैं…"}
          </div>
        ) : memories.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 60, color: "rgba(255,248,240,.4)", fontSize: 15 }}>
            {lang === "en" ? "No memories recorded yet. Tap 'Record a Memory' to get started!" : "अभी कोई यादें नहीं हैं। 'यादें रिकॉर्ड करें' दबाएं!"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            {memories.map((m) => {
              const isExpanded = expandedId === m.id;
              const memComments = comments[m.id] || [];
              return (
                <div
                  key={m.id}
                  style={{
                    background: "rgba(255,248,240,.07)",
                    border: "1px solid rgba(255,248,240,.1)",
                    borderRadius: 18, overflow: "hidden",
                    transition: "all .3s",
                  }}
                >
                  {/* Card header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    style={{
                      width: "100%", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
                      background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: "rgba(198,139,89,.2)", border: "1.5px solid rgba(198,139,89,.3)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                    }}>
                      {TONE_EMOJI[m.emotional_tone] || "📝"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#FFF8F0", fontSize: 17, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.title || (lang === "en" ? "A shared memory" : "एक याद")}
                      </div>
                      <div style={{ color: "rgba(255,248,240,.5)", fontSize: 14, marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{formatDate(m.created_at)}</span>
                        {memComments.length > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#D4A574" }}>
                            <MessageCircle size={13} /> {memComments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} color="rgba(255,248,240,.5)" /> : <ChevronDown size={20} color="rgba(255,248,240,.5)" />}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,248,240,.06)" }}>
                      {/* Summary */}
                      {m.ai_summary && (
                        <p style={{ color: "rgba(255,248,240,.75)", fontSize: 16, lineHeight: 1.7, marginTop: 14, fontStyle: "italic" }}>
                          "{m.ai_summary}"
                        </p>
                      )}

                      {/* Media playback */}
                      {m.audio_url && (
                        m.audio_url.includes("video_") ? (
                          <div style={{
                            marginTop: 10, borderRadius: 14, overflow: "hidden",
                            border: "1.5px solid rgba(141,110,99,.3)",
                            maxWidth: 300,
                          }}>
                            <video
                              src={m.audio_url}
                              controls
                              playsInline
                              style={{ width: "100%", display: "block", borderRadius: 12 }}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => togglePlay(m.audio_url, m.id)}
                            style={{
                              marginTop: 10, display: "flex", alignItems: "center", gap: 8,
                              padding: "8px 14px", borderRadius: 10,
                              background: playingId === m.id ? "rgba(93,64,55,.25)" : "rgba(255,248,240,.06)",
                              border: playingId === m.id ? "1.5px solid rgba(93,64,55,.4)" : "1.5px solid rgba(255,248,240,.1)",
                              color: playingId === m.id ? "#D4A574" : "rgba(255,248,240,.5)",
                              fontSize: 13, fontWeight: 500, cursor: "pointer",
                            }}
                          >
                            {playingId === m.id ? <Pause size={15} /> : <Play size={15} />}
                            {playingId === m.id
                              ? (lang === "en" ? "Pause" : "रोकें")
                              : (lang === "en" ? "Play recording" : "रिकॉर्डिंग सुनें")}
                          </button>
                        )
                      )}

                      {/* Transcript */}
                      {m.transcript && m.transcript !== "[Audio recording - transcription unavailable]" && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, color: "rgba(255,248,240,.35)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            {lang === "en" ? "Transcript" : "प्रतिलेख"}
                          </div>
                          <p style={{ color: "rgba(255,248,240,.55)", fontSize: 13, lineHeight: 1.6 }}>
                            {m.transcript}
                          </p>
                        </div>
                      )}

                      {/* Comments from child */}
                      {memComments.length > 0 && (
                        <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,248,240,.06)", paddingTop: 12 }}>
                          <div style={{ fontSize: 11, color: "rgba(255,248,240,.35)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5 }}>
                            <MessageCircle size={12} />
                            {lang === "en" ? "Comments from family" : "परिवार की टिप्पणियाँ"}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {memComments.map((c) => (
                              <div
                                key={c.id}
                                style={{
                                  background: "rgba(198,139,89,.1)",
                                  border: "1px solid rgba(198,139,89,.15)",
                                  borderRadius: 12, padding: "10px 13px",
                                }}
                              >
                                <p style={{ color: "rgba(255,248,240,.75)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                                  {c.comment}
                                </p>
                                <div style={{ fontSize: 10, color: "rgba(255,248,240,.3)", marginTop: 5 }}>
                                  {formatDate(c.created_at)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
