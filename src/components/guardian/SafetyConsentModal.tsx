import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Brain, Phone, Info } from "lucide-react";

interface SafetyConsentModalProps {
  userId: string;
  onAccepted: () => void;
}

const pillars = [
  {
    icon: Shield,
    title: "Memory Preservation Tool",
    body: "Anvaya is a memory preservation and social connection platform. It is not a regulated medical device and does not provide medical advice, diagnoses, or treatment.",
  },
  {
    icon: Brain,
    title: "Pattern-Based Insights",
    body: "Behavioral insights are generated through automated AI analysis of audio and video patterns. These observations track emotional trends and interaction engagement, not clinical measurements.",
  },
  {
    icon: Phone,
    title: "Emergency Protocol",
    body: "In any emergency, please contact local emergency services immediately. In India, dial 112 (National Emergency) or 108 (Ambulance).",
  },
];

export default function SafetyConsentModal({ userId, onAccepted }: SafetyConsentModalProps) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ has_accepted_terms: true } as any)
      .eq("id", userId);
    setSaving(false);
    if (!error) onAccepted();
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      background: "rgba(26,15,10,0.7)",
      padding: 16,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 520,
        maxHeight: "90dvh",
        overflowY: "auto",
        background: "rgba(255,255,255,0.07)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 24,
        padding: "32px 28px",
        animation: "fadeUp .45s ease both",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(198,139,89,0.25), rgba(141,110,99,0.2))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}>
            <Info size={28} color="#C68B59" />
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#F9F9F7",
            margin: 0,
          }}>
            Safety &amp; Observation Agreement
          </h2>
          <p style={{
            color: "rgba(249,249,247,0.5)",
            fontSize: 13,
            marginTop: 6,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Please review before accessing the dashboard
          </p>
        </div>

        {/* Pillars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {pillars.map((p) => (
            <div key={p.title} style={{
              display: "flex",
              gap: 14,
              padding: "16px 14px",
              borderRadius: 16,
              background: "rgba(249,249,247,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(198,139,89,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <p.icon size={20} color="#C68B59" />
              </div>
              <div>
                <div style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#E8C9A0",
                  marginBottom: 4,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {p.title}
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: "rgba(249,249,247,0.55)",
                  lineHeight: 1.55,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {p.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkbox */}
        <label style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          cursor: "pointer",
          padding: "14px 12px",
          borderRadius: 14,
          background: checked ? "rgba(198,139,89,0.08)" : "rgba(249,249,247,0.03)",
          border: checked ? "1px solid rgba(198,139,89,0.35)" : "1px solid rgba(255,255,255,0.08)",
          transition: "all .2s",
          marginBottom: 20,
        }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{
              width: 18,
              height: 18,
              marginTop: 2,
              accentColor: "#C68B59",
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: 13,
            color: checked ? "#E8C9A0" : "rgba(249,249,247,0.6)",
            lineHeight: 1.5,
            fontFamily: "'DM Sans', sans-serif",
            transition: "color .2s",
          }}>
            I understand that Anvaya provides behavioral observations and not medical diagnoses.
          </span>
        </label>

        {/* Button */}
        <button
          onClick={handleAccept}
          disabled={!checked || saving}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 16,
            border: "none",
            cursor: !checked || saving ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg, #C68B59, #8D6E63)",
            color: "#FFF8F0",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 8px 28px rgba(198,139,89,0.35)",
            opacity: !checked || saving ? 0.45 : 1,
            transition: "opacity .2s",
          }}
        >
          {saving ? "Please wait…" : "Enter Dashboard"}
        </button>
      </div>
    </div>
  );
}
