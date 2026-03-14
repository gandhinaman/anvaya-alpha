import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Video, Play, Pause, RotateCcw, Send, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildMediaRecorder } from "@/lib/mediaRecorder";

// ─── WAVEFORM VISUALIZER ──────────────────────────────────────────────────────
function LiveWaveform({ analyserRef }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      if (!analyserRef.current) return;
      const bufLen = analyserRef.current.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyserRef.current.getByteTimeDomainData(data);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#C68B59";
      ctx.beginPath();
      const sliceW = W / bufLen;
      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 128.0;
        const y = (v * H) / 2;
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * sliceW, y);
      }
      ctx.stroke();
    };
    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={64}
      style={{ width: "100%", maxWidth: 320, height: 64, borderRadius: 12, background: "rgba(93,64,55,0.06)" }}
    />
  );
}

// ─── COUNTDOWN OVERLAY ────────────────────────────────────────────────────────
function Countdown({ onDone }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n <= 0) { onDone(); return; }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(62,39,35,0.6)", borderRadius: 20,
    }}>
      <span style={{
        fontSize: 72, fontWeight: 800, color: "#FFF8F0",
        fontFamily: "'DM Sans',sans-serif",
        animation: "fadeIn .3s ease",
        textShadow: "0 4px 24px rgba(0,0,0,.4)",
      }}>{n}</span>
    </div>
  );
}

// ─── SENT ANIMATION ───────────────────────────────────────────────────────────
function SentAnimation({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 16, padding: 40,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "linear-gradient(135deg, #C68B59, #8D6E63)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeUp .5s ease",
        boxShadow: "0 8px 32px rgba(198,139,89,.35)",
      }}>
        <Check size={36} color="#FFF8F0" strokeWidth={3} />
      </div>
      <div style={{
        fontSize: 18, fontWeight: 700, color: "#3E2723",
        fontFamily: "'Cormorant Garamond',serif",
        animation: "fadeUp .5s ease .2s both",
      }}>
        Reaction sent! 💛
      </div>
      <div style={{
        fontSize: 13, color: "#8D6E63",
        animation: "fadeUp .5s ease .35s both",
      }}>
        They'll love hearing from you
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ReactionRecorder({ open, onClose, memoryId, memoryTitle, profileId, parentName }) {
  const [mode, setMode] = useState("audio"); // audio | video
  const [phase, setPhase] = useState("idle"); // idle | countdown | recording | review | sending | sent
  const [timer, setTimer] = useState(0);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const playbackRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setPhase("idle");
      setTimer(0);
      setBlob(null);
      setPreviewUrl(null);
      setMode("audio");
      setPlaying(false);
    }
  }, [open]);

  // Timer
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setTimer(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Auto-stop at max duration
  useEffect(() => {
    const maxDuration = mode === "video" ? 30 : 60;
    if (phase === "recording" && timer >= maxDuration) {
      stopRecording();
    }
  }, [timer, phase, mode]);

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setTimer(0);
    setBlob(null);
    setPreviewUrl(null);
  }, []);

  const beginRecording = useCallback(async () => {
    try {
      const constraints = mode === "video"
        ? { video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: true }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Video preview
      if (mode === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      // Audio analyser for waveform
      const AC = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AC();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Pick supported mimeType
      const mimeType = mode === "video"
        ? (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm")
        : (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm");

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blobType = mode === "video" ? "video/webm" : "audio/webm";
        const b = new Blob(chunksRef.current, { type: blobType });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setPreviewUrl(url);
        setPhase("review");
        // Cleanup stream
        stream.getTracks().forEach(t => t.stop());
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        analyserRef.current = null;
      };

      recorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
    } catch (err) {
      console.error("Recording start error:", err);
      alert("Could not access camera/microphone. Please check permissions.");
      setPhase("idle");
    }
  }, [mode]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const reRecord = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setTimer(0);
    setPlaying(false);
    startCountdown();
  }, [previewUrl, startCountdown]);

  const sendReaction = useCallback(async () => {
    if (!blob || !memoryId || !profileId) return;
    setPhase("sending");

    try {
      const ext = "webm";
      const prefix = mode === "video" ? "reaction_video" : "reaction_audio";
      const path = `${profileId}/${prefix}_${Date.now()}.${ext}`;
      const contentType = mode === "video" ? "video/webm" : "audio/webm";

      const { data, error: uploadError } = await supabase.storage
        .from("memories")
        .upload(path, blob, { contentType });

      if (uploadError) {
        console.error("Reaction upload error:", uploadError);
        alert("Upload failed. Please try again.");
        setPhase("review");
        return;
      }

      const { data: urlData } = supabase.storage.from("memories").getPublicUrl(data.path);
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", profileId).maybeSingle();

      const { error: insertError } = await supabase.from("memory_comments").insert({
        memory_id: memoryId,
        user_id: profileId,
        comment: mode === "video"
          ? `🎥 Video reaction to "${memoryTitle || "your story"}"`
          : `🎤 Voice reaction to "${memoryTitle || "your story"}"`,
        media_url: urlData.publicUrl,
        media_type: mode === "video" ? "video" : "audio",
        author_name: prof?.full_name || "Care Partner",
      });

      if (insertError) {
        console.error("Reaction comment insert error:", insertError);
        alert("Could not send reaction. Please try again.");
        setPhase("review");
        return;
      }

      setPhase("sent");
    } catch (err) {
      console.error("Reaction send error:", err);
      alert("Something went wrong. Please try again.");
      setPhase("review");
    }
  }, [blob, memoryId, profileId, mode, memoryTitle]);

  const togglePlayback = useCallback(() => {
    if (!playbackRef.current) return;
    if (playing) {
      playbackRef.current.pause();
      setPlaying(false);
    } else {
      playbackRef.current.play();
      setPlaying(true);
    }
  }, [playing]);

  const handleClose = useCallback(() => {
    // Cleanup
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  }, [onClose, previewUrl]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        backdropFilter: "blur(6px)", zIndex: 200,
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 201, width: "min(92vw, 440px)",
        background: "#FFF8F0", borderRadius: 24,
        boxShadow: "0 20px 60px rgba(62,39,35,0.25), 0 0 0 1px rgba(93,64,55,0.08)",
        overflow: "hidden",
        animation: "fadeUp .35s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          background: "linear-gradient(135deg, rgba(198,139,89,0.08), rgba(93,64,55,0.04))",
          borderBottom: "1px solid rgba(93,64,55,0.08)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#3E2723", marginBottom: 4 }}>
                React to this Story
              </div>
              <div style={{
                fontSize: 12, color: "#8D6E63", fontStyle: "italic",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                Reacting to: {memoryTitle || "A shared memory"}
              </div>
            </div>
            <button onClick={handleClose} style={{
              width: 32, height: 32, borderRadius: 10, border: "none",
              background: "rgba(93,64,55,0.08)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <X size={16} color="#5D4037" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px 20px", position: "relative", minHeight: 260 }}>

          {/* Sent Animation */}
          {phase === "sent" && (
            <SentAnimation onDone={handleClose} />
          )}

          {/* Idle + Mode Toggle */}
          {phase === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              {/* Mode toggle */}
              <div style={{
                display: "flex", borderRadius: 14, overflow: "hidden",
                border: "1.5px solid rgba(93,64,55,0.12)", background: "rgba(93,64,55,0.03)",
              }}>
                <button onClick={() => setMode("audio")} style={{
                  padding: "10px 24px", border: "none", cursor: "pointer",
                  background: mode === "audio" ? "linear-gradient(135deg, #C68B59, #8D6E63)" : "transparent",
                  color: mode === "audio" ? "#FFF8F0" : "#5D4037",
                  fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                  transition: "all .2s",
                }}>
                  <Mic size={15} /> Audio
                </button>
                <button onClick={() => setMode("video")} style={{
                  padding: "10px 24px", border: "none", cursor: "pointer",
                  background: mode === "video" ? "linear-gradient(135deg, #5D4037, #8D6E63)" : "transparent",
                  color: mode === "video" ? "#FFF8F0" : "#5D4037",
                  fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                  transition: "all .2s",
                }}>
                  <Video size={15} /> Video
                </button>
              </div>

              <div style={{ textAlign: "center", color: "#8D6E63", fontSize: 13, lineHeight: 1.5 }}>
                {mode === "video"
                  ? `Record a video reaction for ${parentName || "Amma"} (up to 30s)`
                  : `Record a voice reaction for ${parentName || "Amma"} (up to 60s)`}
              </div>

              {/* Record button */}
              <button onClick={startCountdown} style={{
                width: 80, height: 80, borderRadius: "50%",
                background: mode === "video"
                  ? "linear-gradient(135deg, #5D4037, #8D6E63)"
                  : "linear-gradient(135deg, #C68B59, #8D6E63)",
                border: "4px solid rgba(93,64,55,0.12)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 28px rgba(198,139,89,0.3)",
                transition: "transform .15s",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {mode === "video" ? <Video size={28} color="#FFF8F0" /> : <Mic size={28} color="#FFF8F0" />}
              </button>
              <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: -8 }}>Tap to start recording</span>
            </div>
          )}

          {/* Countdown */}
          {phase === "countdown" && (
            <div style={{ position: "relative", minHeight: 200 }}>
              {mode === "video" && (
                <video
                  ref={videoPreviewRef}
                  muted
                  playsInline
                  style={{
                    width: "100%", height: 200, objectFit: "cover",
                    borderRadius: 16, background: "#1a0f0a",
                  }}
                />
              )}
              <Countdown onDone={beginRecording} />
            </div>
          )}

          {/* Recording */}
          {phase === "recording" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              {mode === "video" ? (
                <video
                  ref={videoPreviewRef}
                  muted
                  playsInline
                  style={{
                    width: "100%", height: 220, objectFit: "cover",
                    borderRadius: 16, border: "2px solid rgba(220,38,38,0.3)",
                  }}
                />
              ) : (
                <LiveWaveform analyserRef={analyserRef} />
              )}

              {/* Timer + recording indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", background: "#DC2626",
                  animation: "callPulse 1.5s ease infinite",
                }} />
                <span style={{ fontSize: 22, fontWeight: 700, color: "#3E2723", fontFamily: "'DM Sans',sans-serif" }}>
                  {fmt(timer)}
                </span>
              </div>

              {/* Stop button */}
              <button onClick={stopRecording} style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#DC2626", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 20px rgba(220,38,38,0.35)",
              }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, background: "#FFF8F0" }} />
              </button>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>Tap to stop</span>
            </div>
          )}

          {/* Review */}
          {phase === "review" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#3E2723", marginBottom: 4 }}>
                Review your reaction
              </div>

              {mode === "video" && previewUrl ? (
                <video
                  ref={playbackRef}
                  src={previewUrl}
                  playsInline
                  onEnded={() => setPlaying(false)}
                  style={{
                    width: "100%", height: 200, objectFit: "cover",
                    borderRadius: 16, border: "1.5px solid rgba(93,64,55,0.12)", background: "#1a0f0a",
                  }}
                />
              ) : previewUrl ? (
                <audio
                  ref={playbackRef}
                  src={previewUrl}
                  onEnded={() => setPlaying(false)}
                  style={{ display: "none" }}
                />
              ) : null}

              {/* Playback controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={togglePlayback} style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg, #C68B59, #8D6E63)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(198,139,89,0.3)",
                }}>
                  {playing ? <Pause size={20} color="#FFF8F0" /> : <Play size={20} color="#FFF8F0" />}
                </button>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#3E2723" }}>{fmt(timer)}</span>
              </div>

              {/* Mode tag + waveform placeholder for audio */}
              {mode === "audio" && (
                <div style={{
                  width: "100%", padding: "12px 16px", borderRadius: 14,
                  background: "rgba(198,139,89,0.06)", border: "1px solid rgba(198,139,89,0.12)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <Mic size={16} color="#C68B59" />
                  <span style={{ fontSize: 13, color: "#5D4037", fontWeight: 500 }}>
                    Voice reaction • {fmt(timer)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button onClick={reRecord} style={{
                  padding: "11px 22px", borderRadius: 14,
                  border: "1.5px solid rgba(93,64,55,0.15)", background: "rgba(93,64,55,0.04)",
                  color: "#5D4037", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <RotateCcw size={14} /> Re-record
                </button>
                <button onClick={sendReaction} style={{
                  padding: "11px 28px", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg, #C68B59, #8D6E63)",
                  color: "#FFF8F0", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 4px 16px rgba(198,139,89,0.35)",
                }}>
                  <Send size={14} /> Send Reaction
                </button>
              </div>
            </div>
          )}

          {/* Sending spinner */}
          {phase === "sending" && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 14, padding: 40,
            }}>
              <div style={{
                width: 44, height: 44, border: "3px solid rgba(198,139,89,0.2)",
                borderTopColor: "#C68B59", borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
              <span style={{ fontSize: 14, color: "#5D4037", fontWeight: 500 }}>Sending your reaction…</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
