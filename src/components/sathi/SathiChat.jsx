import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff, Send, MessageCircle } from "lucide-react";
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

export default function SathiChat({ open, onClose, lang = "en", userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const suggested = lang === "hi" ? SUGGESTED_HI : SUGGESTED_EN;
  const greeting = lang === "hi" ? GREETING_HI : GREETING_EN;

  // Load today's conversation history when chat opens
  useEffect(() => {
    if (open && userId) {
      loadConversationHistory();
    }
    if (!open) {
      // Cleanup voice on close
      stopListening();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
    }
  }, [open, userId]);

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
        // No history — show greeting
        setMessages([{ role: "assistant", content: greeting }]);
        speakGreeting(greeting);
      }
    } catch {
      // No conversation found for today, show greeting
      setMessages([{ role: "assistant", content: greeting }]);
      speakGreeting(greeting);
    } finally {
      setLoadingHistory(false);
    }
  };

  const speakGreeting = async (text) => {
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
        // Fallback to browser speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.play().catch(() => {});
    } catch {
      // Silent fail
    }
  };

  // ─── VOICE INPUT (Speech-to-Text) ───
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInput(lang === "hi" ? "वॉइस सपोर्ट नहीं है" : "Voice not supported");
      return;
    }

    // Stop any playing TTS
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "hi" ? "hi-IN" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript || interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      // Auto-send if we got speech
      if (finalTranscript.trim()) {
        // Small delay to let state update
        setTimeout(() => {
          sendMessage(finalTranscript.trim());
        }, 100);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    setIsListening(true);
    recognition.start();
  }, [lang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

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

  const sendMessage = async (text) => {
    if (!text.trim() || streaming) return;

    const userMsg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Filter out the initial greeting from messages sent to AI if it matches
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
        position: "absolute",
        inset: 0,
        zIndex: 20,
        background: "rgba(2,18,14,.88)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: "inherit",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px 12px",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
            }}
          >
            <MessageCircle size={16} color="#F9F9F7" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 18,
                color: "#F9F9F7",
                fontWeight: 600,
              }}
            >
              {lang === "hi" ? "साथी" : "Sathi"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(249,249,247,.4)" }}>
              {lang === "hi" ? "आपका AI साथी" : "Your AI companion"}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.06)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} color="rgba(249,249,247,.6)" />
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
          <div style={{ textAlign: "center", padding: 20, color: "rgba(249,249,247,.4)", fontSize: 12 }}>
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
                background: "rgba(249,249,247,.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageCircle size={22} color="rgba(249,249,247,.3)" />
            </div>
            <p
              style={{
                color: "rgba(249,249,247,.35)",
                fontSize: 13,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {lang === "hi"
                ? "साथी से कुछ भी पूछें…"
                : "Ask Sathi anything…"}
            </p>

            {/* Suggested prompts */}
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
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(249,249,247,.06)",
                    color: "rgba(249,249,247,.6)",
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

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "fadeUp .3s ease both",
            }}
          >
            <div
              style={{
                maxWidth: "82%",
                padding: "10px 14px",
                borderRadius:
                  msg.role === "user"
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                background:
                  msg.role === "user"
                    ? "rgba(79,70,229,.35)"
                    : "rgba(249,249,247,.08)",
                border:
                  msg.role === "user"
                    ? "1px solid rgba(79,70,229,.4)"
                    : "1px solid rgba(255,255,255,.08)",
                color: "#F9F9F7",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {msg.content}
              {/* Typing indicator for empty streaming assistant message */}
              {msg.role === "assistant" && msg.content === "" && streaming && (
                <span style={{ display: "inline-flex", gap: 3 }}>
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "rgba(249,249,247,.5)",
                        display: "inline-block",
                        animation: `fadeIn .4s ease ${d * 0.15}s infinite alternate`,
                      }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: "10px 14px",
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,255,255,.08)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <button
          onClick={toggleVoice}
          disabled={streaming}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: isListening
              ? "2px solid rgba(220,38,38,.5)"
              : "1.5px solid rgba(255,255,255,.15)",
            background: isListening
              ? "rgba(220,38,38,.2)"
              : "rgba(249,249,247,.08)",
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
            ? <MicOff size={20} color="#fca5a5" />
            : <Mic size={20} color="rgba(249,249,247,.6)" />
          }
        </button>

        <div
          style={{
            flex: 1,
            background: "rgba(249,249,247,.06)",
            border: isListening
              ? "1.5px solid rgba(220,38,38,.3)"
              : "1px solid rgba(255,255,255,.12)",
            borderRadius: 14,
            padding: "10px 14px",
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
              color: "#F9F9F7",
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: "none",
            background:
              input.trim() && !streaming
                ? "linear-gradient(135deg,#4F46E5,#6366F1)"
                : "rgba(249,249,247,.06)",
            cursor: input.trim() && !streaming ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all .2s",
            boxShadow:
              input.trim() && !streaming
                ? "0 4px 14px rgba(79,70,229,0.35)"
                : "none",
          }}
        >
          <Send
            size={16}
            color={
              input.trim() && !streaming
                ? "#F9F9F7"
                : "rgba(249,249,247,.3)"
            }
          />
        </button>
      </div>
    </div>
  );
}
