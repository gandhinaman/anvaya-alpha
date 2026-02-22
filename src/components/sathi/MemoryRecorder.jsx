import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Mic, Square, Check, X, Loader, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PROMPTS_EN = [
  "What's your happiest childhood memory?",
  "Tell us about a meal your mother used to make.",
  "What's the best advice someone gave you?",
  "Describe a place you loved visiting as a child.",
  "What's a family tradition you cherish?",
  "Tell us about the day you got married.",
  "What song always makes you smile?",
  "Who was your closest friend growing up?",
  "What's something you're really proud of?",
  "Tell us about a festival you'll never forget.",
];

const PROMPTS_HI = [
  "आपकी सबसे खुशी की बचपन की याद क्या है?",
  "अपनी माँ के हाथ का कोई खाना बताइए।",
  "किसी ने आपको सबसे अच्छी सलाह क्या दी?",
  "बचपन में आप कहाँ जाना सबसे ज़्यादा पसंद करते थे?",
  "कोई पारिवारिक परंपरा बताइए जो आपको प्रिय है।",
  "अपनी शादी के दिन के बारे में बताइए।",
  "कौन सा गाना सुनकर आप हमेशा मुस्कुराते हैं?",
  "बड़े होते हुए आपका सबसे करीबी दोस्त कौन था?",
  "किस बात पर आपको सबसे ज़्यादा गर्व है?",
  "कोई त्योहार बताइए जो आप कभी नहीं भूलेंगे।",
];

export default function MemoryRecorder({ open, onClose, lang = "en", userId }) {
  const [phase, setPhase] = useState("idle"); // idle | recording | processing | success | error
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * PROMPTS_EN.length));
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const promptAudioRef = useRef(null);

  const currentPrompt = useMemo(() => {
    const prompts = lang === "hi" ? PROMPTS_HI : PROMPTS_EN;
    return prompts[promptIndex % prompts.length];
  }, [lang, promptIndex]);

  const speakWithBrowserFallback = useCallback((text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeakingPrompt(false);
    utterance.onerror = () => setIsSpeakingPrompt(false);
    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const speakPrompt = useCallback(async (text) => {
    try {
      setIsSpeakingPrompt(true);
      // Stop any previous prompt audio
      if (promptAudioRef.current) {
        promptAudioRef.current.pause();
        promptAudioRef.current = null;
      }
      window.speechSynthesis.cancel();

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        console.error("TTS failed, using browser voice:", response.status);
        speakWithBrowserFallback(text);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      promptAudioRef.current = audio;
      audio.onended = () => setIsSpeakingPrompt(false);
      audio.onerror = () => {
        setIsSpeakingPrompt(false);
        speakWithBrowserFallback(text);
      };
      await audio.play();
    } catch (err) {
      console.error("Prompt TTS error, falling back to browser:", err);
      speakWithBrowserFallback(text);
    }
  }, [speakWithBrowserFallback]);

  // Read prompt aloud when component opens
  useEffect(() => {
    if (open && phase === "idle") {
      speakPrompt(currentPrompt);
    }
  }, [open]);

  const shufflePrompt = () => {
    const newIndex = (promptIndex + 1) % PROMPTS_EN.length;
    setPromptIndex(newIndex);
    const prompts = lang === "hi" ? PROMPTS_HI : PROMPTS_EN;
    speakPrompt(prompts[newIndex]);
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) {
      stopEverything();
      if (promptAudioRef.current) {
        promptAudioRef.current.pause();
        promptAudioRef.current = null;
      }
      setIsSpeakingPrompt(false);
      setPhase("idle");
      setSeconds(0);
      setErrorMsg("");
      setSavedTitle("");
    }
  }, [open]);

  const stopEverything = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        // handled by stopRecording
      };

      recorder.start(250); // collect in 250ms chunks
      mediaRecorder.current = recorder;
      setPhase("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
      setPhase("error");
      setErrorMsg(
        lang === "hi"
          ? "माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन एक्सेस दें।"
          : "Microphone permission was denied. Please allow microphone access in your browser settings."
      );
    }
  }, [lang]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") return;

    clearInterval(timerRef.current);
    const duration = seconds;

    // Wait for final data
    await new Promise((resolve) => {
      mediaRecorder.current.onstop = resolve;
      mediaRecorder.current.stop();
    });

    // Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const blob = new Blob(chunks.current, { type: "audio/webm" });
    setPhase("processing");

    try {
      // Upload to storage
      const fileName = `${userId}/${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from("memories")
        .upload(fileName, blob, { contentType: "audio/webm" });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("memories")
        .getPublicUrl(fileName);

      const audioUrl = urlData.publicUrl;

      // Convert blob to base64
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // Call process-memory edge function
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/process-memory`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            audioBase64: base64,
            userId,
            audioUrl,
            durationSeconds: duration,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Processing failed");
      }

      const result = await res.json();
      setSavedTitle(result.title || "Your Memory");
      setPhase("success");
    } catch (err) {
      console.error("Processing error:", err);
      setPhase("error");
      setErrorMsg(
        lang === "hi"
          ? "यादों को सहेजने में समस्या हुई। कृपया पुनः प्रयास करें।"
          : "There was a problem saving your memory. Please try again."
      );
    }
  }, [seconds, userId, lang]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
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
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 20,
        borderRadius: "inherit",
      }}
    >
      {/* Close button */}
      <button
        onClick={() => {
          stopEverything();
          onClose();
        }}
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(255,255,255,.06)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 5,
        }}
      >
        <X size={16} color="rgba(249,249,247,.6)" />
      </button>

      {/* ── IDLE: Start prompt ── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", animation: "fadeUp .5s ease both" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(217,119,6,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              border: "1px solid rgba(217,119,6,.25)",
            }}
          >
            <Mic size={32} color="#d97706" />
          </div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 26,
              color: "#F9F9F7",
              fontWeight: 400,
              marginBottom: 6,
            }}
          >
           {lang === "hi" ? "यादें रिकॉर्ड करें" : "Record a Memory"}
          </div>

          {/* Prompt question */}
          <div style={{
            background: "rgba(217,119,6,.08)",
            border: "1px solid rgba(217,119,6,.2)",
            borderRadius: 16,
            padding: "14px 18px",
            marginBottom: 8,
            position: "relative",
          }}>
            <p style={{
              color: "#F9F9F7",
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.5,
              fontStyle: "italic",
              fontFamily: "'Cormorant Garamond',serif",
              margin: 0,
            }}>
              "{currentPrompt}"
            </p>
            <button
              onClick={shufflePrompt}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(217,119,6,.15)",
                border: "1px solid rgba(217,119,6,.25)",
                borderRadius: 8,
                width: 28,
                height: 28,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={lang === "hi" ? "अगला सवाल" : "Next question"}
            >
              <RefreshCw size={13} color="#d97706" />
            </button>
          </div>

          <p style={{ color: "rgba(249,249,247,.4)", fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
            {lang === "hi"
              ? "इस सवाल का जवाब दें, या कुछ भी बोलें। साथी सुन रहा है।"
              : "Answer this prompt, or share anything on your mind. Sathi is listening."}
          </p>
          <button
            onClick={startRecording}
            style={{
              width: "100%",
              padding: "17px",
              borderRadius: 18,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg,#d97706,#B45309)",
              color: "#F9F9F7",
              fontSize: 16,
              fontWeight: 700,
              boxShadow: "0 8px 28px rgba(217,119,6,.35)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {lang === "hi" ? "🎙 रिकॉर्डिंग शुरू करें" : "🎙 Start Recording"}
           </button>
        </div>
      )}

      {/* ── RECORDING: Live timer + stop ── */}
      {phase === "recording" && (
        <div style={{ textAlign: "center", animation: "fadeUp .4s ease both" }}>
          {/* Pulsing record indicator */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(217,119,6,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              border: "2px solid rgba(217,119,6,.4)",
              animation: "breathe 2s ease-in-out infinite",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#d97706",
                boxShadow: "0 0 20px rgba(217,119,6,.6)",
              }}
            />
          </div>

          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 36,
              color: "#F9F9F7",
              fontWeight: 300,
              letterSpacing: "0.08em",
              marginBottom: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTime(seconds)}
          </div>
          <p style={{ color: "rgba(249,249,247,.4)", fontSize: 12, marginBottom: 28 }}>
            {lang === "hi" ? "रिकॉर्डिंग… बोलते रहें" : "Recording… keep speaking"}
          </p>

          <button
            onClick={stopRecording}
            style={{
              width: "100%",
              padding: "17px",
              borderRadius: 18,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg,#dc2626,#b91c1c)",
              color: "#F9F9F7",
              fontSize: 16,
              fontWeight: 700,
              boxShadow: "0 8px 28px rgba(220,38,38,.3)",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Square size={14} fill="#F9F9F7" />
            {lang === "hi" ? "रिकॉर्डिंग बंद करें" : "Stop Recording"}
          </button>
        </div>
      )}

      {/* ── PROCESSING: Loading state ── */}
      {phase === "processing" && (
        <div style={{ textAlign: "center", animation: "fadeUp .4s ease both" }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Loader
              size={36}
              color="#d97706"
              style={{
                animation: "spin 1.2s linear infinite",
              }}
            />
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 22,
              color: "#F9F9F7",
              fontWeight: 400,
              marginBottom: 6,
            }}
          >
            {lang === "hi" ? "आपकी यादें सहेज रहे हैं…" : "Processing your memory…"}
          </div>
          <p style={{ color: "rgba(249,249,247,.4)", fontSize: 12, lineHeight: 1.6 }}>
            {lang === "hi"
              ? "साथी आपकी कहानी को समझ रहा है"
              : "Sathi is understanding your story"}
          </p>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {phase === "success" && (
        <div style={{ textAlign: "center", animation: "fadeUp .4s ease both" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(5,150,105,.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              border: "1px solid rgba(5,150,105,.35)",
            }}
          >
            <Check size={30} color="#059669" />
          </div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 24,
              color: "#F9F9F7",
              fontWeight: 400,
              marginBottom: 4,
            }}
          >
            {lang === "hi" ? "याद सहेज ली गई!" : "Memory saved!"}
          </div>
          {savedTitle && (
            <div
              style={{
                fontSize: 13,
                color: "#d97706",
                fontWeight: 600,
                marginBottom: 8,
                padding: "4px 12px",
                borderRadius: 100,
                background: "rgba(217,119,6,.1)",
                display: "inline-block",
              }}
            >
              "{savedTitle}"
            </div>
          )}
          <p style={{ color: "rgba(249,249,247,.5)", fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>
            {lang === "hi"
              ? "रोहन इसे सुन सकेगा।"
              : "Rohan will be able to hear this."}
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "15px",
              borderRadius: 16,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg,#059669,#065f46)",
              color: "#F9F9F7",
              fontSize: 15,
              fontWeight: 700,
              boxShadow: "0 8px 28px rgba(5,150,105,.35)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {lang === "hi" ? "ठीक है" : "Done"}
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {phase === "error" && (
        <div style={{ textAlign: "center", animation: "fadeUp .4s ease both" }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "rgba(220,38,38,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              border: "1px solid rgba(220,38,38,.25)",
            }}
          >
            <Mic size={26} color="#fca5a5" />
          </div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 22,
              color: "#F9F9F7",
              fontWeight: 400,
              marginBottom: 8,
            }}
          >
            {lang === "hi" ? "कुछ गड़बड़ हो गई" : "Something went wrong"}
          </div>
          <p style={{ color: "rgba(249,249,247,.5)", fontSize: 12, lineHeight: 1.6, marginBottom: 20, maxWidth: 280 }}>
            {errorMsg}
          </p>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button
              onClick={() => {
                setPhase("idle");
                setErrorMsg("");
              }}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg,#d97706,#B45309)",
                color: "#F9F9F7",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {lang === "hi" ? "पुनः प्रयास" : "Try Again"}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "13px 20px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.15)",
                background: "transparent",
                color: "rgba(249,249,247,.5)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {lang === "hi" ? "बंद करें" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
