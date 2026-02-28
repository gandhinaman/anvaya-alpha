import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff, Send, MessageCircle, Volume2, Check, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUGGESTED_EN = [
  "Tell me a story",
  "Remind me of my medicines",
  "I'm feeling lonely",
  "What's good for joint pain?",
];
const SUGGESTED_HI = [
  "मुझे एक कहानी सुनाओ",
  "मेरी दवाइयाँ याद दिलाओ",
  "मैं अकेला महसूस कर रहा हूँ",
  "जोड़ों के दर्द के लिए क्या अच्छा है?",
];

const GREETING_EN = "How can I help you? Type or speak now.";
const GREETING_HI = "मैं आपकी कैसे मदद कर सकता हूँ? लिखें या बोलें।";

// Inline medication action buttons shown when Sathi mentions medicines
function MedActionButtons({ userId, lang }) {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase.from("medications").select("*").eq("user_id", userId)
      .then(({ data }) => { if (data) setMeds(data); setLoading(false); });
  }, [userId]);

  const toggleMed = async (med) => {
    const newTaken = !med.taken_today;
    const now = new Date().toISOString();
    await supabase.from("medications")
      .update({ taken_today: newTaken, last_taken: newTaken ? now : null })
      .eq("id", med.id);
    if (newTaken) {
      await supabase.from("health_events").insert({
        user_id: userId, event_type: "medication_taken",
        value: { medication_name: med.name, medication_id: med.id },
      });
    }
    const { data } = await supabase.from("medications").select("*").eq("user_id", userId);
    if (data) setMeds(data);
  };

  if (loading || meds.length === 0) return null;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 4, marginTop: 4,
      padding: "10px 12px", background: "rgba(255,248,240,.05)",
      borderRadius: 14, border: "1px solid rgba(255,248,240,.08)"
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,248,240,.4)", fontWeight: 600, marginBottom: 2 }}>
        <Pill size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
        {lang === "en" ? "Quick actions:" : "त्वरित कार्रवाई:"}
      </div>
      {meds.map(med => (
        <button key={med.id} onClick={() => toggleMed(med)} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: med.taken_today ? "rgba(102,187,106,.12)" : "rgba(255,248,240,.06)",
          border: `1px solid ${med.taken_today ? "rgba(102,187,106,.25)" : "rgba(255,248,240,.1)"}`,
          borderRadius: 10, cursor: "pointer", width: "100%", textAlign: "left", transition: "all .3s"
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: med.taken_today ? "rgba(102,187,106,.2)" : "rgba(255,248,240,.08)",
            border: `1.5px solid ${med.taken_today ? "#66BB6A" : "rgba(255,248,240,.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {med.taken_today && <Check size={13} color="#66BB6A" strokeWidth={3} />}
          </div>
          <span style={{
            flex: 1, color: med.taken_today ? "rgba(255,248,240,.45)" : "#FFF8F0",
            fontSize: 14, fontWeight: 600,
            textDecoration: med.taken_today ? "line-through" : "none"
          }}>{med.name}{med.dose ? ` (${med.dose})` : ""}</span>
          <span style={{ fontSize: 10, color: med.taken_today ? "#66BB6A" : "rgba(255,248,240,.3)", fontWeight: 600 }}>
            {med.taken_today ? "✓" : (lang === "en" ? "Take" : "लें")}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function SathiChat({ open, onClose, lang = "en", userId, initialMessage, onInitialMessageConsumed }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(-1);
  const scrollRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const pendingSendRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const suggested = lang === "hi" ? SUGGESTED_HI : SUGGESTED_EN;
  const greeting = lang === "hi" ? GREETING_HI : GREETING_EN;

  // Load today's conversation history when chat opens
  useEffect(() => {
    if (open && userId) {
      loadConversationHistory();
    } else if (open && !userId) {
      // No userId yet — still show greeting so initialMessage can fire
      setMessages([{ role: "assistant", content: greeting }]);
    }
    if (!open) {
      stopListening();
      stopTTS();
    }
  }, [open, userId]);

  const stopTTS = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setSpeakingIdx(-1);
  }, []);

  const loadConversationHistory = async () => {
    setLoadingHistory(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("conversations")
        .select("messages")
        .eq("user_id", userId)
        .gte("created_at", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        setMessages([{ role: "assistant", content: greeting }]);
        speakText(greeting);
      }
    } catch {
      setMessages([{ role: "assistant", content: greeting }]);
      speakText(greeting);
    } finally {
      setLoadingHistory(false);
    }
  };

  const speakText = async (text, idx = -1) => {
    stopTTS();
    setSpeakingIdx(idx);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ text, lang }),
        }
      );

      if (!res.ok) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
        utterance.rate = 0.95;
        utterance.onend = () => setSpeakingIdx(-1);
        window.speechSynthesis.speak(utterance);
        return;
      }

      const audio = new Audio();
      ttsAudioRef.current = audio;
      audio.onended = () => setSpeakingIdx(-1);
      audio.onerror = () => setSpeakingIdx(-1);

      // Stream audio via MediaSource (Chrome/Android) or blob fallback (iOS/Safari)
      if (window.MediaSource && MediaSource.isTypeSupported('audio/mpeg')) {
        const mediaSource = new MediaSource();
        audio.src = URL.createObjectURL(mediaSource);
        mediaSource.addEventListener('sourceopen', async () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            const reader = res.body.getReader();
            let started = false;
            const pump = async () => {
              const { done, value } = await reader.read();
              if (done) {
                if (mediaSource.readyState === 'open') mediaSource.endOfStream();
                return;
              }
              sourceBuffer.appendBuffer(value);
              if (!started) {
                started = true;
                audio.play().catch(() => setSpeakingIdx(-1));
              }
              sourceBuffer.addEventListener('updateend', pump, { once: true });
            };
            pump();
          } catch { setSpeakingIdx(-1); }
        }, { once: true });
      } else {
        // iOS/Safari fallback
        const blob = await res.blob();
        audio.src = URL.createObjectURL(blob);
        audio.play().catch(() => setSpeakingIdx(-1));
      }
    } catch {
      setSpeakingIdx(-1);
    }
  };

  // ─── VOICE INPUT (Web Speech API with WAV fallback) ───
  const speechRecRef = useRef(null);
  const wavRecorderRef = useRef(null);

  const startListening = useCallback(async () => {
    stopTTS();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;
        speechRecRef.current = recognition;

        let finalTranscript = "";

        recognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            else interim += event.results[i][0].transcript;
          }
          setInput(finalTranscript || interim || "");
        };

        recognition.onend = () => {
          speechRecRef.current = null;
          setIsListening(false);
          if (finalTranscript.trim()) {
            pendingSendRef.current = finalTranscript.trim();
            setInput("");
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          speechRecRef.current = null;
          if (event.error === "not-allowed" || event.error === "permission-denied") {
            setIsListening(false);
            setInput("");
          } else {
            // Fall back to WAV recording
            startWavFallbackChat();
          }
        };

        recognition.start();
        setIsListening(true);
        return;
      } catch {
        // Fall through to WAV fallback
      }
    }

    // WAV fallback for mobile PWA / unsupported browsers
    startWavFallbackChat();
  }, [lang, stopTTS]);

  const startWavFallbackChat = useCallback(async () => {
    try {
      const { startWavRecording } = await import("@/lib/wavRecorder.js");
      const recorder = await startWavRecording();
      wavRecorderRef.current = recorder;
      setIsListening(true);
      setInput(lang === "hi" ? "बोलिए… फिर माइक दबाएं" : "Speak… tap mic when done");

      // Auto-stop after 10s
      setTimeout(() => {
        if (wavRecorderRef.current) stopListeningWav();
      }, 10000);
    } catch (err) {
      console.error("WAV recording error:", err);
      setIsListening(false);
    }
  }, [lang]);

  const stopListeningWav = useCallback(async () => {
    if (!wavRecorderRef.current) return;
    const { base64, byteLength } = wavRecorderRef.current.stop();
    wavRecorderRef.current = null;
    setIsListening(false);

    if (byteLength < 5000) { setInput(""); return; }

    setInput(lang === "hi" ? "प्रोसेस हो रहा है…" : "Processing…");
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sarvam-stt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({ audioBase64: base64, contentType: "audio/wav", languageCode: lang === "hi" ? "hi-IN" : "en-IN" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "STT failed");
      if (data.transcript?.trim()) {
        pendingSendRef.current = data.transcript.trim();
        setInput("");
      } else {
        setInput("");
      }
    } catch (err) {
      console.error("Sarvam STT error:", err);
      setInput("");
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    if (speechRecRef.current) {
      try { speechRecRef.current.stop(); } catch {}
      speechRecRef.current = null;
    }
    if (wavRecorderRef.current) {
      stopListeningWav();
      return;
    }
    setIsListening(false);
  }, [stopListeningWav]);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // Auto-send initial message from search bar
  const initialSentRef = useRef(false);
  const initialMessageRef = useRef(null);
  
  // Track the initialMessage prop
  useEffect(() => {
    if (initialMessage) {
      initialMessageRef.current = initialMessage;
      initialSentRef.current = false;
    }
  }, [initialMessage]);

  useEffect(() => {
    if (open && initialMessageRef.current && !streaming && !loadingHistory && messages.length > 0 && !initialSentRef.current) {
      initialSentRef.current = true;
      const msg = initialMessageRef.current;
      initialMessageRef.current = null;
      // Use requestAnimationFrame to ensure React state is flushed
      requestAnimationFrame(() => {
        sendMessage(msg);
        if (onInitialMessageConsumed) onInitialMessageConsumed();
      });
    }
    if (!open) {
      initialSentRef.current = false;
      initialMessageRef.current = null;
    }
  }, [open, streaming, loadingHistory, messages.length]);

  // Process pending voice sends
  useEffect(() => {
    if (pendingSendRef.current && !streaming) {
      const text = pendingSendRef.current;
      pendingSendRef.current = null;
      sendMessage(text);
    }
  });

  const sendMessage = async (text) => {
    if (!text.trim() || streaming) return;

    const userMsg = { role: "user", content: text.trim() };
    const newMessages = [...messagesRef.current, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const messagesForAI = newMessages.filter((m, i) => {
        if (i === 0 && m.role === "assistant" && (m.content === GREETING_EN || m.content === GREETING_HI)) {
          return false;
        }
        return true;
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            messages: messagesForAI.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            userId,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.text,
                  };
                }
                return updated;
              });
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content:
              lang === "hi"
                ? "क्षमा करें, कुछ गड़बड़ हो गई। कृपया फिर से प्रयास करें।"
                : "I'm sorry, something went wrong. Please try again.",
          };
        }
        return updated;
      });
      console.error("Chat error:", err);
    } finally {
      setStreaming(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fadein"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px 12px",
          borderBottom: "1px solid rgba(255,248,240,.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#5D4037",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(93,64,55,0.35)",
            }}
          >
            <MessageCircle size={16} color="#FFF8F0" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 18,
                color: "#FFF8F0",
                fontWeight: 600,
              }}
            >
              {lang === "hi" ? "आवा" : "Ava"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,248,240,.4)" }}>
              {lang === "hi" ? "आपका AI साथी" : "Your AI companion"}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            border: "2.5px solid rgba(255,100,100,.55)",
            background: "rgba(220,38,38,.22)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 18px rgba(220,38,38,.3)",
          }}
        >
          <X size={28} color="#fca5a5" strokeWidth={3} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="scr"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loadingHistory && (
          <div style={{ textAlign: "center", padding: 20, color: "rgba(255,248,240,.4)", fontSize: 12 }}>
            {lang === "hi" ? "बातचीत लोड हो रही है…" : "Loading conversation…"}
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 16,
              padding: "20px 0",
              animation: "fadeUp .5s ease both",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(255,248,240,.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageCircle size={22} color="rgba(255,248,240,.3)" />
            </div>
            <p
              style={{
                color: "rgba(255,248,240,.35)",
                fontSize: 13,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {lang === "hi"
                ? "आवा से कुछ भी पूछें…"
                : "Ask Ava anything…"}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                justifyContent: "center",
                maxWidth: 300,
              }}
            >
              {suggested.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: "7px 13px",
                    borderRadius: 100,
                    border: "1px solid rgba(255,248,240,.12)",
                    background: "rgba(255,248,240,.06)",
                    color: "rgba(255,248,240,.6)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all .2s",
                    animation: `fadeUp .4s ease ${0.1 + i * 0.08}s both`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          // Detect medication-related assistant messages
          const isMedMsg = msg.role === "assistant" && !streaming &&
            /medicine|medication|दवा|गोली|tablet|pill|taken.*med|med.*remind|दवाइ/i.test(msg.content);

          return (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "fadeUp .3s ease both",
            }}
          >
            <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius:
                    msg.role === "user"
                      ? "20px 20px 6px 20px"
                      : "20px 20px 20px 6px",
                  background:
                    msg.role === "user"
                      ? "rgba(93,64,55,.35)"
                      : "rgba(255,248,240,.08)",
                  border:
                    msg.role === "user"
                      ? "1px solid rgba(93,64,55,.4)"
                      : "1px solid rgba(255,248,240,.08)",
                  color: "#FFF8F0",
                  fontSize: 17,
                  lineHeight: 1.7,
                }}
              >
                {msg.content}
                {msg.role === "assistant" && msg.content === "" && streaming && (
                  <span style={{ display: "inline-flex", gap: 3 }}>
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "rgba(255,248,240,.5)",
                          display: "inline-block",
                          animation: `fadeIn .4s ease ${d * 0.15}s infinite alternate`,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>

              {/* Inline medication action buttons */}
              {isMedMsg && (
                <MedActionButtons userId={userId} lang={lang} />
              )}

              {/* Read aloud button for assistant messages with content */}
              {msg.role === "assistant" && msg.content && !streaming && (
                <button
                  onClick={() => {
                    if (speakingIdx === i) {
                      stopTTS();
                    } else {
                      speakText(msg.content, i);
                    }
                  }}
                  style={{
                    alignSelf: "flex-start",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    borderRadius: 12,
                    border: speakingIdx === i
                      ? "2px solid rgba(93,64,55,.5)"
                      : "2px solid rgba(255,248,240,.15)",
                    background: speakingIdx === i
                      ? "rgba(93,64,55,.25)"
                      : "rgba(255,248,240,.06)",
                    color: speakingIdx === i
                      ? "#D4A574"
                      : "rgba(255,248,240,.55)",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all .2s",
                  }}
                >
                  <Volume2 size={20} />
                  {speakingIdx === i
                    ? (lang === "hi" ? "रोकें" : "Stop")
                    : (lang === "hi" ? "सुनें" : "Read aloud")
                  }
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: "12px 14px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,248,240,.08)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <button
          onClick={toggleVoice}
          disabled={streaming}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            border: isListening
              ? "2.5px solid rgba(220,38,38,.5)"
              : "1.5px solid rgba(255,248,240,.15)",
            background: isListening
              ? "rgba(220,38,38,.2)"
              : "rgba(255,248,240,.08)",
            cursor: streaming ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all .2s",
            boxShadow: isListening ? "0 0 16px rgba(220,38,38,.3)" : "none",
            animation: isListening ? "breathe 1.5s ease-in-out infinite" : "none",
          }}
        >
          {isListening
            ? <MicOff size={24} color="#fca5a5" />
            : <Mic size={24} color="rgba(255,248,240,.6)" />
          }
        </button>

        <div
          style={{
            flex: 1,
            background: "rgba(255,248,240,.06)",
            border: isListening
              ? "1.5px solid rgba(220,38,38,.3)"
              : "1px solid rgba(255,248,240,.12)",
            borderRadius: 16,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={
              isListening
                ? (lang === "hi" ? "सुन रहा हूँ… बोलें" : "Listening… speak now")
                : (lang === "hi" ? "कुछ भी पूछें…" : "Ask anything…")
            }
            disabled={streaming}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#FFF8F0",
              fontSize: 17,
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            border: "none",
            background:
              input.trim() && !streaming
                ? "linear-gradient(135deg,#5D4037,#6D4C41)"
                : "rgba(255,248,240,.06)",
            cursor: input.trim() && !streaming ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all .2s",
            boxShadow:
              input.trim() && !streaming
                ? "0 4px 14px rgba(93,64,55,0.35)"
                : "none",
          }}
        >
          <Send
            size={20}
            color={
              input.trim() && !streaming
                ? "#FFF8F0"
                : "rgba(255,248,240,.3)"
            }
          />
        </button>
      </div>
    </div>
  );
}
