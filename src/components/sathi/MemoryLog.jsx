import { useState, useEffect, useRef } from "react";
import { X, BookOpen, MessageCircle, ChevronDown, ChevronUp, Play, Pause, Trash2, Search, Mic, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TONE_EMOJI = { joyful: "😊", nostalgic: "🌅", peaceful: "🕊️", concerned: "😟" };

const CATEGORIES = [
  { id: "all", label: "All", labelHi: "सभी", emoji: "📚" },
  { id: "joyful", label: "Joyful", labelHi: "खुशी", emoji: "😊" },
  { id: "nostalgic", label: "Nostalgic", labelHi: "यादें", emoji: "🌅" },
  { id: "peaceful", label: "Peaceful", labelHi: "शांत", emoji: "🕊️" },
  { id: "concerned", label: "Concerned", labelHi: "चिंता", emoji: "😟" },
];

function CommentInput({ memoryId, userId, lang }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef(null);

  const send = async (mediaUrl = null, mediaType = null) => {
    if (!text.trim() && !mediaUrl) return;
    setSending(true);
    try {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      const { error } = await supabase.from("memory_comments").insert({
        memory_id: memoryId, user_id: userId,
        comment: text.trim() || (mediaType === "audio" ? "🎤 Voice reply" : "Reply"),
        media_url: mediaUrl, media_type: mediaType,
        author_name: prof?.full_name || (lang === "en" ? "You" : "आप"),
      }).select();
      if (error) {
        console.error("Comment insert failed:", error);
        alert("Could not send comment. Please try again.");
        return;
      }
      setText("");
    } catch (e) { console.error("Comment error:", e); alert("Could not send comment."); }
    finally { setSending(false); }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const path = `comment_audio_${Date.now()}.webm`;
        const { data } = await supabase.storage.from("memories").upload(path, blob);
        if (data) {
          const { data: urlData } = supabase.storage.from("memories").getPublicUrl(data.path);
          await send(urlData.publicUrl, "audio");
        }
        setRecording(false);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) { console.error("Rec error:", e); }
  };

  const stopRec = () => { if (recRef.current?.state === "recording") recRef.current.stop(); };

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,248,240,.06)", paddingTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
      <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
        placeholder={lang === "en" ? "Reply…" : "जवाब दें…"}
        style={{
          flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,248,240,.12)",
          background: "rgba(255,248,240,.08)", fontSize: 13, color: "#FFF8F0", outline: "none",
          fontFamily: "'DM Sans',sans-serif",
        }}
      />
      {recording ? (
        <button onClick={stopRec} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(220,38,38,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Pause size={14} color="#FFF8F0" />
        </button>
      ) : (
        <button onClick={startRec} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,248,240,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mic size={14} color="rgba(255,248,240,.6)" />
        </button>
      )}
      <button onClick={() => send()} disabled={sending || !text.trim()} style={{
        width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
        background: text.trim() ? "#C68B59" : "rgba(255,248,240,.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: sending || !text.trim() ? 0.4 : 1,
      }}>
        <Send size={14} color="#FFF8F0" />
      </button>
    </div>
  );
}

export default function MemoryLog({ open, onClose, lang = "en", userId }) {
  const [memories, setMemories] = useState([]);
  const [comments, setComments] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [audioEl, setAudioEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

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

  const deleteMemory = async (memoryId) => {
    if (deletingId) return;
    setDeletingId(memoryId);
    try {
      // Delete comments first
      await supabase.from("memory_comments").delete().eq("memory_id", memoryId);
      await supabase.from("memories").delete().eq("id", memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      if (expandedId === memoryId) setExpandedId(null);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  const formatDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  // Filter memories
  const q = searchQuery.toLowerCase();
  const filtered = memories.filter((m) => {
    const matchesFilter = activeFilter === "all" || m.emotional_tone === activeFilter;
    const matchesSearch = !q ||
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.ai_summary && m.ai_summary.toLowerCase().includes(q)) ||
      (m.transcript && m.transcript.toLowerCase().includes(q)) ||
      (m.prompt_question && m.prompt_question.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

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
            {lang === "en" ? "My Memories" : "मेरी यादें"}
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

      <div style={{ padding: "0 16px 6px", color: "rgba(255,248,240,.45)", fontSize: 13 }}>
        {lang === "en" ? "Your stories, preserved forever" : "आपकी कहानियाँ, हमेशा के लिए सहेजी गई"}
      </div>

      {/* Search */}
      <div style={{ padding: "0 16px", marginBottom: 8 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: "rgba(255,248,240,.08)", border: "1px solid rgba(255,248,240,.12)",
          borderRadius: 14,
        }}>
          <Search size={16} color="rgba(255,248,240,.4)" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "en" ? "Search memories..." : "यादें खोजें..."}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 14, color: "#FFF8F0", fontFamily: "'DM Sans',sans-serif",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
              <X size={14} color="rgba(255,248,240,.4)" />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: "0 16px 12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              style={{
                padding: "7px 16px", borderRadius: 100, border: "none", cursor: "pointer",
                background: activeFilter === cat.id ? "#C68B59" : "rgba(255,248,240,.08)",
                color: activeFilter === cat.id ? "#FFF8F0" : "rgba(255,248,240,.55)",
                fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all .2s",
              }}
            >
              <span>{cat.emoji}</span>
              {lang === "hi" ? cat.labelHi : cat.label}
            </button>
          ))}
        </div>
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
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 60, color: "rgba(255,248,240,.4)", fontSize: 15 }}>
            {lang === "en" ? "No memories match your filter" : "कोई यादें इस फ़िल्टर से मेल नहीं खातीं"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            {filtered.map((m) => {
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
                        {m.emotional_tone && (
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 100,
                            background: "rgba(198,139,89,.15)", color: "#D4A574", fontWeight: 600,
                          }}>
                            {m.emotional_tone}
                          </span>
                        )}
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
                      {/* Prompt question */}
                      {m.prompt_question && (
                        <div style={{
                          marginTop: 14, padding: "10px 14px", borderRadius: 12,
                          background: "rgba(198,139,89,.1)", border: "1px solid rgba(198,139,89,.2)",
                        }}>
                          <div style={{ fontSize: 10, color: "rgba(255,248,240,.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                            {lang === "en" ? "Question" : "सवाल"}
                          </div>
                          <p style={{ color: "#D4A574", fontSize: 14, fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>
                            "{m.prompt_question}"
                          </p>
                        </div>
                      )}

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

                      {/* Comments from family */}
                      {memComments.length > 0 && (
                        <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,248,240,.06)", paddingTop: 12 }}>
                          <div style={{ fontSize: 11, color: "rgba(255,248,240,.35)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5 }}>
                            <MessageCircle size={12} />
                            {lang === "en" ? "Comments from family" : "परिवार की टिप्पणियाँ"}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {memComments.map((c) => (
                              <div key={c.id} style={{ background: "rgba(198,139,89,.1)", border: "1px solid rgba(198,139,89,.15)", borderRadius: 12, padding: "10px 13px" }}>
                                {c.author_name && (
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#D4A574", marginBottom: 4 }}>{c.author_name}</div>
                                )}
                                {c.media_url && c.media_type === "audio" && (
                                  <div style={{ marginBottom: 6 }}>
                                    <button onClick={() => togglePlay(c.media_url, `cmt-${c.id}`)} style={{
                                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
                                      background: playingId === `cmt-${c.id}` ? "rgba(93,64,55,.25)" : "rgba(255,248,240,.06)",
                                      border: "1px solid rgba(255,248,240,.1)", color: "rgba(255,248,240,.6)", fontSize: 12, cursor: "pointer",
                                    }}>
                                      {playingId === `cmt-${c.id}` ? <Pause size={12} /> : <Play size={12} />}
                                      {lang === "en" ? "Voice reply" : "ऑडियो जवाब"}
                                    </button>
                                  </div>
                                )}
                                {c.media_url && c.media_type === "video" && (
                                  <div style={{ borderRadius: 8, overflow: "hidden", maxWidth: 200, marginBottom: 6 }}>
                                    <video src={c.media_url} controls playsInline style={{ width: "100%", display: "block" }} />
                                  </div>
                                )}
                                <p style={{ color: "rgba(255,248,240,.75)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{c.comment}</p>
                                <div style={{ fontSize: 10, color: "rgba(255,248,240,.3)", marginTop: 5 }}>{formatDate(c.created_at)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comment input for senior */}
                      <CommentInput memoryId={m.id} userId={userId} lang={lang} />

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          if (window.confirm(lang === "en" ? "Delete this memory? This cannot be undone." : "क्या आप इस याद को हटाना चाहते हैं? यह वापस नहीं आएगी।")) {
                            deleteMemory(m.id);
                          }
                        }}
                        disabled={deletingId === m.id}
                        style={{
                          marginTop: 16, display: "flex", alignItems: "center", gap: 8,
                          padding: "10px 16px", borderRadius: 12,
                          background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.25)",
                          color: "#fca5a5", fontSize: 13, fontWeight: 500, cursor: "pointer",
                          opacity: deletingId === m.id ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={14} />
                        {deletingId === m.id
                          ? (lang === "en" ? "Deleting…" : "हटा रहे हैं…")
                          : (lang === "en" ? "Delete memory" : "याद हटाएं")}
                      </button>
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
