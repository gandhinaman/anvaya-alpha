import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fontStyle } from "@/components/AnvayaApp";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"parent" | "child">("parent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signupErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signupErr) throw signupErr;

        if (data.user) {
          const { error: profileErr } = await supabase.from("profiles").insert({
            id: data.user.id,
            full_name: fullName,
            role,
          });
          if (profileErr) throw profileErr;
        }

        setSignupSuccess(true);
      } else {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginErr) throw loginErr;

        // Fetch role and redirect
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          navigate(profile?.role === "child" ? "/guardian" : "/sathi", { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg,#022c22 0%,#064E3B 40%,#065f46 70%,#0a3f34 100%)",
      fontFamily: "'DM Sans', sans-serif",
      padding: 20,
    }}>
      <style>{fontStyle}</style>

      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 24,
        padding: 36,
        animation: "fadeUp .5s ease both",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 13,
            color: "rgba(249,249,247,.38)",
            letterSpacing: "0.3em",
            fontWeight: 300,
          }}>ANVAYA</div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 32,
            color: "#F9F9F7",
            fontWeight: 600,
            marginTop: 4,
          }}>
            {mode === "login" ? "Welcome back" : "Join Anvaya"}
          </h1>
          <p style={{ color: "rgba(249,249,247,.45)", fontSize: 13, marginTop: 6 }}>
            {mode === "login"
              ? "Sign in to continue"
              : "Create your account"}
          </p>
        </div>

        {signupSuccess ? (
          <div style={{
            textAlign: "center",
            padding: "20px 0",
            animation: "fadeUp .4s ease both",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(5,150,105,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
            }}>
              <span style={{ fontSize: 24 }}>✓</span>
            </div>
            <p style={{ color: "#F9F9F7", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              Check your email
            </p>
            <p style={{ color: "rgba(249,249,247,.5)", fontSize: 12, lineHeight: 1.6 }}>
              We sent a confirmation link to <strong style={{ color: "#F9F9F7" }}>{email}</strong>
            </p>
            <button
              onClick={() => { setMode("login"); setSignupSuccess(false); }}
              style={{
                marginTop: 20,
                background: "transparent",
                border: "1px solid rgba(255,255,255,.15)",
                color: "rgba(249,249,247,.6)",
                padding: "10px 24px",
                borderRadius: 100,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: "rgba(249,249,247,.5)", marginBottom: 5, display: "block" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your name"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(249,249,247,.06)",
                      color: "#F9F9F7",
                      fontSize: 14,
                      outline: "none",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "rgba(249,249,247,.5)", marginBottom: 5, display: "block" }}>
                    I am a…
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["parent", "child"] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        style={{
                          flex: 1,
                          padding: "11px",
                          borderRadius: 12,
                          border: role === r
                            ? "1.5px solid rgba(5,150,105,0.7)"
                            : "1px solid rgba(255,255,255,.12)",
                          background: role === r
                            ? "rgba(5,150,105,0.15)"
                            : "rgba(249,249,247,.04)",
                          color: role === r ? "#34D399" : "rgba(249,249,247,.5)",
                          fontSize: 13,
                          fontWeight: role === r ? 600 : 400,
                          cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                          textTransform: "capitalize",
                          transition: "all .2s",
                        }}
                      >
                        {r === "parent" ? "🙏 Parent" : "👤 Child"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: 11, color: "rgba(249,249,247,.5)", marginBottom: 5, display: "block" }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(249,249,247,.06)",
                  color: "#F9F9F7",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: "rgba(249,249,247,.5)", marginBottom: 5, display: "block" }}>
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(249,249,247,.06)",
                  color: "#F9F9F7",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>

            {error && (
              <div style={{
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: 16,
                border: "none",
                cursor: loading ? "wait" : "pointer",
                background: "linear-gradient(135deg,#059669,#065f46)",
                color: "#F9F9F7",
                fontSize: 15,
                fontWeight: 700,
                boxShadow: "0 8px 28px rgba(5,150,105,.35)",
                fontFamily: "'DM Sans', sans-serif",
                opacity: loading ? 0.7 : 1,
                transition: "opacity .2s",
                marginTop: 4,
              }}
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            <div style={{ textAlign: "center", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(249,249,247,.45)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {mode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
