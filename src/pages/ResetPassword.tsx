import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fontStyle } from "@/components/AnvayaApp";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 14,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(249,249,247,.06)", color: "#F9F9F7",
    fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,#022c22 0%,#064E3B 40%,#065f46 70%,#0a3f34 100%)",
      fontFamily: "'DM Sans', sans-serif", padding: 20,
    }}>
      <style>{fontStyle}</style>
      <div style={{
        width: "100%", maxWidth: 400,
        background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 36,
        animation: "fadeUp .5s ease both",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond',serif", fontSize: 13,
            color: "rgba(249,249,247,.38)", letterSpacing: "0.3em", fontWeight: 300,
          }}>ANVAYA</div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond',serif", fontSize: 32,
            color: "#F9F9F7", fontWeight: 600, marginTop: 4,
          }}>Set New Password</h1>
        </div>

        {success ? (
          <div style={{ textAlign: "center", animation: "fadeUp .4s ease both" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(5,150,105,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
            }}>
              <span style={{ fontSize: 24, color: "#34D399" }}>✓</span>
            </div>
            <p style={{ color: "#F9F9F7", fontSize: 15, fontWeight: 600 }}>Password updated!</p>
            <p style={{ color: "rgba(249,249,247,.5)", fontSize: 12, marginTop: 6 }}>Redirecting to sign in…</p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center", color: "rgba(249,249,247,.5)", fontSize: 13 }}>
            <p>Invalid or expired reset link.</p>
            <button onClick={() => navigate("/login")} style={{
              marginTop: 16, background: "transparent",
              border: "1px solid rgba(255,255,255,.15)",
              color: "rgba(249,249,247,.6)", padding: "10px 24px",
              borderRadius: 100, cursor: "pointer", fontSize: 13,
            }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "rgba(249,249,247,.5)", marginBottom: 5, display: "block" }}>New Password</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "rgba(249,249,247,.5)", marginBottom: 5, display: "block" }}>Confirm Password</label>
              <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            {error && (
              <div style={{
                padding: "10px 12px", borderRadius: 12,
                background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.25)",
                color: "#fca5a5", fontSize: 12,
              }}>{error}</div>
            )}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "15px", borderRadius: 16, border: "none",
              cursor: loading ? "wait" : "pointer",
              background: "linear-gradient(135deg,#059669,#065f46)",
              color: "#F9F9F7", fontSize: 15, fontWeight: 700,
              boxShadow: "0 8px 28px rgba(5,150,105,.35)",
              fontFamily: "'DM Sans', sans-serif",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
