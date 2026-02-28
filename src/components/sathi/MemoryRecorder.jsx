import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Mic, Video, Square, Check, X, Loader, RefreshCw } from "lucide-react";
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

export default function MemoryRecorder({ open, onClose, lang = "en", userId, linkedName }) {
  const [phase, setPhase] = useState("idle"); // idle | recording | processing | success | error
  const [recordingMode, setRecordingMode] = useState(null); // "audio" | "video"
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
  const videoPreviewRef = useRef(null);

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
          body: JSON.stringify({ text, lang }),
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

  useEffect(() => {
    if (!open) {
      stopEverything();
      if (promptAudioRef.current) {
        promptAudioRef.current.pause();
        promptAudioRef.current = null;
      }
      setIsSpeakingPrompt(false);
      setPhase("idle");
      setRecordingMode(null);
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

  // Connect video preview after the video element renders
  useEffect(() => {
    if (phase === "recording" && recordingMode === "video" && videoPreviewRef.current && streamRef.current) {
      videoPreviewRef.current.srcObject = streamRef.current;
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [phase, recordingMode]);

  const startRecording = useCallback(async (mode) => {
    try {
      const constraints = mode === "video"
        ? { audio: true, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const mimeType = mode === "video"
        ? (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm")
        : (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm");

      const recorder = new MediaRecorder(stream, { mimeType });

      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = () => {};

      recorder.start(250);
      mediaRecorder.current = recorder;
      setRecordingMode(mode);
      setPhase("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      setPhase("error");
      setErrorMsg(
        lang === "hi"
          ? (mode === "video"
            ? "कैमरा/माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में एक्सेस दें।"
            : "माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन एक्सेस दें।")
          : (mode === "video"
            ? "Camera/microphone permission was denied. Please allow access in your browser settings."
            : "Microphone permission was denied. Please allow microphone access in your browser settings.")
      );
    }
  }, [lang]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") return;

    clearInterval(timerRef.current);
    const duration = seconds;
    const mode = recordingMode;

    await new Promise((resolve) => {
      mediaRecorder.current.onstop = resolve;
      mediaRecorder.current.stop();
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const isVideo = mode === "video";
    const blobType = isVideo ? "video/webm" : "audio/webm";
    const blob = new Blob(chunks.current, { type: blobType });
    setPhase("processing");

    try {
      const ext = isVideo ? "webm" : "webm";
      const prefix = isVideo ? "video" : "audio";
      const fileName = `${userId}/${prefix}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("memories")
        .upload(fileName, blob, { contentType: blobType });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("memories")
        .getPublicUrl(fileName);

      const mediaUrl = urlData.publicUrl;

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
            userId,
            audioUrl: mediaUrl,
            durationSeconds: duration,
            promptQuestion: currentPrompt,
            mediaType: isVideo ? "video" : "audio",
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
  }, [seconds, userId, lang, recordingMode, currentPrompt]);

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
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        gap: 20,
      }}
    >
      {/* Close button */}
      <button
        onClick={() => { stopEverything(); onClose(); }}
        aria-label={lang === "hi" ? "बंद करें" : "Close"}
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          width: 54,
          height: 54,
          borderRadius: 16,
          border: "2.5px solid rgba(255,100,100,.55)",
          background: "rgba(220,38,38,.22)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 210,
          boxShadow: "0 4px 18px rgba(220,38,38,.3)",
        }}
      >
        <X size={28} color="#fca5a5" strokeWidth={3} />
      </button>

      {/* ── IDLE: Prompt + two recording buttons ── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", animation: "fadeUp .5s ease both", maxWidth: 340 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "rgba(217,119,6,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              border: "2px solid rgba(217,119,6,.3)",
            }}
          >
            <Mic size={38} color="#d97706" />
          </div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 30,
              color: "#FFF8F0",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            {lang === "hi" ? "यादें रिकॉर्ड करें" : "Record a Memory"}
          </div>

          {/* Prompt question */}
          <div style={{
            background: "rgba(217,119,6,.1)",
            border: "1.5px solid rgba(217,119,6,.25)",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 10,
            position: "relative",
          }}>
            <p style={{
              color: "#FFF8F0",
              fontSize: 18,
              fontWeight: 500,
              lineHeight: 1.5,
              fontStyle: "italic",
              fontFamily: "'Cormorant Garamond',serif",
              margin: 0,
              paddingRight: 36,
            }}>
              "{currentPrompt}"
            </p>
            <button
              onClick={shufflePrompt}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(217,119,6,.2)",
                border: "1px solid rgba(217,119,6,.35)",
                borderRadius: 10,
                width: 38,
                height: 38,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={lang === "hi" ? "अगला सवाल" : "Next question"}
            >
              <RefreshCw size={18} color="#d97706" />
            </button>
          </div>

          <p style={{ color: "rgba(255,248,240,.5)", fontSize: 15, lineHeight: 1.6, marginBottom: 22 }}>
            {lang === "hi"
              ? "इस सवाल का जवाब दें, या कुछ भी बोलें। साथी सुन रहा है।"
              : "Answer this prompt, or share anything on your mind. Sathi is listening."}
          </p>

          {/* Two recording buttons */}
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <button
              onClick={() => startRecording("audio")}
              style={{
                flex: 1,
                padding: "20px 10px",
                borderRadius: 18,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg,#C68B59,#A1724A)",
                color: "#FFF8F0",
                fontSize: 18,
                fontWeight: 700,
                boxShadow: "0 8px 28px rgba(198,139,89,.35)",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Mic size={28} />
              {lang === "hi" ? "ऑडियो" : "Audio"}
            </button>
            <button
              onClick={() => startRecording("video")}
              style={{
                flex: 1,
                padding: "20px 10px",
                borderRadius: 18,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg,#5D4037,#3E2723)",
                color: "#FFF8F0",
                fontSize: 18,
                fontWeight: 700,
                boxShadow: "0 8px 28px rgba(93,64,55,.35)",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Video size={28} />
              {lang === "hi" ? "वीडियो" : "Video"}
            </button>
          </div>
        </div>
      )}

      {/* ── RECORDING: Live timer + stop ── */}
      {phase === "recording" && (
        <div style={{ textAlign: "center", animation: "fadeUp .4s ease both", maxWidth: 380, width: "100%" }}>
          {/* Video preview when recording video */}
          {recordingMode === "video" && (
            <div style={{
              width: "100%",
              maxWidth: 320,
              margin: "0 auto 18px",
              borderRadius: 20,
              overflow: "hidden",
              border: "2.5px solid rgba(79,70,229,.45)",
              boxShadow: "0 8px 32px rgba(79,70,229,.25)",
              aspectRatio: "4/3",
              background: "#000",
            }}>
              <video
                ref={videoPreviewRef}
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
            </div>
          )}

          {/* Pulsing record indicator (audio only) */}
          {recordingMode === "audio" && (
            <div
              style={{
                width: 110,
                height: 110,
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
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#d97706",
                  boxShadow: "0 0 24px rgba(217,119,6,.6)",
                }}
              />
            </div>
          )}

          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 48,
              color: "#F9F9F7",
              fontWeight: 300,
              letterSpacing: "0.08em",
              marginBottom: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTime(seconds)}
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: recordingMode === "video" ? "#818CF8" : "#d97706",
              boxShadow: `0 0 10px ${recordingMode === "video" ? "rgba(129,140,248,.6)" : "rgba(217,119,6,.6)"}`,
              animation: "breathe 1.5s ease-in-out infinite",
            }} />
            <p style={{ color: "rgba(249,249,247,.5)", fontSize: 16, margin: 0 }}>
              {recordingMode === "video"
                ? (lang === "hi" ? "वीडियो रिकॉर्डिंग… बोलते रहें" : "Video recording… keep speaking")
                : (lang === "hi" ? "ऑडियो रिकॉर्डिंग… बोलते रहें" : "Audio recording… keep speaking")}
            </p>
          </div>

          <button
            onClick={stopRecording}
            style={{
              width: "100%",
              padding: "20px",
              borderRadius: 18,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg,#dc2626,#b91c1c)",
              color: "#F9F9F7",
              fontSize: 20,
              fontWeight: 700,
              boxShadow: "0 8px 28px rgba(220,38,38,.3)",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 16,
            }}
          >
            <Square size={18} fill="#F9F9F7" />
            {lang === "hi" ? "रिकॉर्डिंग बंद करें" : "Stop Recording"}
          </button>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {phase === "processing" && (
        <div style={{ textAlign: "center", animation: "fadeUp .4s ease both" }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Loader
              size={42}
              color="#d97706"
              style={{ animation: "spin 1.2s linear infinite" }}
            />
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 26,
              color: "#F9F9F7",
              fontWeight: 400,
              marginBottom: 6,
            }}
          >
            {lang === "hi" ? "आपकी यादें सहेज रहे हैं…" : "Processing your memory…"}
          </div>
          <p style={{ color: "rgba(249,249,247,.5)", fontSize: 15, lineHeight: 1.6 }}>
            {lang === "hi"
              ? "साथी आपकी कहानी को समझ रहा है"
              : "Sathi is understanding your story"}
          </p>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {phase === "success" && (
        <div style={{ textAlign: "center", animation: "fadeUp .4s ease both", maxWidth: 340 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(5,150,105,.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              border: "2px solid rgba(5,150,105,.4)",
            }}
          >
            <Check size={36} color="#059669" />
          </div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 28,
              color: "#F9F9F7",
              fontWeight: 400,
              marginBottom: 6,
            }}
          >
            {lang === "hi" ? "याद सहेज ली गई!" : "Memory saved!"}
          </div>
          {savedTitle && (
            <div
              style={{
                fontSize: 16,
                color: "#d97706",
                fontWeight: 600,
                marginBottom: 8,
                padding: "6px 14px",
                borderRadius: 100,
                background: "rgba(217,119,6,.12)",
                display: "inline-block",
              }}
            >
              "{savedTitle}"
            </div>
          )}
          <p style={{ color: "rgba(249,249,247,.5)", fontSize: 16, lineHeight: 1.6, marginTop: 6 }}>
            {lang === "hi"
              ? `${linkedName||"Guardian"} इसे सुन सकेगा।`
              : `${linkedName||"Your guardian"} will be able to ${recordingMode === "video" ? "watch" : "hear"} this.`}
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "20px",
              borderRadius: 16,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg,#059669,#065f46)",
              color: "#F9F9F7",
              fontSize: 18,
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
        <div style={{ textAlign: "center", animation: "fadeUp .4s ease both", maxWidth: 340 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: "rgba(220,38,38,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              border: "2px solid rgba(220,38,38,.3)",
            }}
          >
            <Mic size={30} color="#fca5a5" />
          </div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 26,
              color: "#F9F9F7",
              fontWeight: 400,
              marginBottom: 8,
            }}
          >
            {lang === "hi" ? "कुछ गड़बड़ हो गई" : "Something went wrong"}
          </div>
          <p style={{ color: "rgba(249,249,247,.5)", fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
            {errorMsg}
          </p>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button
              onClick={() => { setPhase("idle"); setRecordingMode(null); setErrorMsg(""); }}
              style={{
                flex: 1,
                padding: "18px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg,#d97706,#B45309)",
                color: "#F9F9F7",
                fontSize: 17,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {lang === "hi" ? "पुनः प्रयास" : "Try Again"}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "18px 24px",
                borderRadius: 14,
                border: "2px solid rgba(255,255,255,.2)",
                background: "transparent",
                color: "rgba(249,249,247,.65)",
                fontSize: 17,
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
