import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fontStyle } from "@/components/AnvayaApp";

const HEALTH_OPTIONS = [
  "Diabetes", "Hypertension", "Heart Disease", "Arthritis",
  "Asthma / COPD", "Vision Problems", "Hearing Loss",
  "Memory Concerns", "Joint Pain", "Thyroid", "None"
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
  { value: "te", label: "తెలుగు (Telugu)" },
  { value: "bn", label: "বাংলা (Bengali)" },
  { value: "mr", label: "मराठी (Marathi)" },
  { value: "gu", label: "ગુજરાતી (Gujarati)" },
  { value: "kn", label: "ಕನ್ನಡ (Kannada)" },
];

const containerStyle: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(160deg,#022c22 0%,#064E3B 40%,#065f46 70%,#0a3f34 100%)",
  fontFamily: "'DM Sans', sans-serif",
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 24,
  padding: 36,
  animation: "fadeUp .5s ease both",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(249,249,247,.5)",
  marginBottom: 6,
  display: "block",
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(249,249,247,.06)",
  color: "#F9F9F7",
  fontSize: 14,
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [language, setLanguage] = useState("en");
  const [healthIssues, setHealthIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleHealth = (item: string) => {
    if (item === "None") {
      setHealthIssues(healthIssues.includes("None") ? [] : ["None"]);
      return;
    }
    setHealthIssues(prev =>
      prev.filter(h => h !== "None").includes(item)
        ? prev.filter(h => h !== item)
        : [...prev.filter(h => h !== "None"), item]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          age: age ? parseInt(age) : null,
          language,
          health_issues: healthIssues,
          onboarding_completed: true,
        })
        .eq("id", session.user.id);

      if (updateErr) throw updateErr;
      navigate("/sathi", { replace: true });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const canNext = step === 0 ? !!age : step === 1 ? !!language : healthIssues.length > 0;

  const steps = [
    // Step 0: Age
    <div key="age" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 40 }}>🙏</span>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: "#F9F9F7", fontWeight: 600, marginTop: 8 }}>
          Welcome to Anvaya
        </h2>
        <p style={{ color: "rgba(249,249,247,.45)", fontSize: 13, marginTop: 4 }}>
          Let's personalize your experience
        </p>
      </div>
      <div>
        <label style={labelStyle}>How old are you?</label>
        <input
          type="number"
          min={40}
          max={120}
          value={age}
          onChange={e => setAge(e.target.value)}
          placeholder="e.g. 68"
          style={inputStyle}
        />
      </div>
    </div>,

    // Step 1: Language
    <div key="lang" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 40 }}>🗣️</span>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: "#F9F9F7", fontWeight: 600, marginTop: 8 }}>
          Preferred Language
        </h2>
        <p style={{ color: "rgba(249,249,247,.45)", fontSize: 13, marginTop: 4 }}>
          Ava will talk to you in this language
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {LANGUAGES.map(l => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLanguage(l.value)}
            style={{
              padding: "13px 10px",
              borderRadius: 14,
              border: language === l.value ? "1.5px solid rgba(5,150,105,0.7)" : "1px solid rgba(255,255,255,.12)",
              background: language === l.value ? "rgba(5,150,105,0.15)" : "rgba(249,249,247,.04)",
              color: language === l.value ? "#34D399" : "rgba(249,249,247,.6)",
              fontSize: 13,
              fontWeight: language === l.value ? 600 : 400,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all .2s",
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Health
    <div key="health" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 40 }}>💊</span>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: "#F9F9F7", fontWeight: 600, marginTop: 8 }}>
          Health Conditions
        </h2>
        <p style={{ color: "rgba(249,249,247,.45)", fontSize: 13, marginTop: 4 }}>
          Select any that apply — helps Ava care for you better
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {HEALTH_OPTIONS.map(h => {
          const selected = healthIssues.includes(h);
          return (
            <button
              key={h}
              type="button"
              onClick={() => toggleHealth(h)}
              style={{
                padding: "9px 16px",
                borderRadius: 100,
                border: selected ? "1.5px solid rgba(5,150,105,0.7)" : "1px solid rgba(255,255,255,.12)",
                background: selected ? "rgba(5,150,105,0.15)" : "rgba(249,249,247,.04)",
                color: selected ? "#34D399" : "rgba(249,249,247,.6)",
                fontSize: 13,
                fontWeight: selected ? 600 : 400,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all .2s",
              }}
            >
              {h}
            </button>
          );
        })}
      </div>
    </div>,
  ];

  return (
    <div style={containerStyle}>
      <style>{fontStyle}</style>
      <div style={cardStyle}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 100,
                background: i <= step ? "rgba(5,150,105,0.7)" : "rgba(255,255,255,.12)",
                transition: "background .3s",
              }}
            />
          ))}
        </div>

        {steps[step]}

        {error && (
          <div style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(220,38,38,0.12)",
            border: "1px solid rgba(220,38,38,0.25)",
            color: "#fca5a5",
            fontSize: 12,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.15)",
                background: "transparent",
                color: "rgba(249,249,247,.6)",
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={step < 2 ? () => setStep(s => s + 1) : handleFinish}
            disabled={!canNext || saving}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 16,
              border: "none",
              cursor: !canNext || saving ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg,#059669,#065f46)",
              color: "#F9F9F7",
              fontSize: 15,
              fontWeight: 700,
              boxShadow: "0 8px 28px rgba(5,150,105,.35)",
              fontFamily: "'DM Sans', sans-serif",
              opacity: !canNext || saving ? 0.5 : 1,
              transition: "opacity .2s",
            }}
          >
            {saving ? "Saving…" : step < 2 ? "Next" : "Get Started"}
          </button>
        </div>
      </div>
    </div>
  );
}
