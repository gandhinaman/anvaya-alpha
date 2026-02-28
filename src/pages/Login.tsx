import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fontStyle } from "@/components/AnvayaApp";

const inputStyle = {
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

const labelStyle = { fontSize: 11, color: "rgba(249,249,247,.5)", marginBottom: 5, display: "block" as const };

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"parent" | "child">("parent");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetErr) throw resetErr;
        setForgotSuccess(true);
      } else if (mode === "signup") {
        const { error: signupErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role, phone: role === "child" ? phone : undefined },
          },
        });
        if (signupErr) throw signupErr;
        setSignupSuccess(true);
      } else {
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (loginErr) {
          if (loginErr.message?.includes("Email not confirmed")) {
            throw new Error("Please verify your email before signing in. Check your inbox for the confirmation link.");
          }
          throw loginErr;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, onboarding_completed")
            .eq("id", session.user.id)
            .single();
          if (profile?.role === "parent" && !profile?.onboarding_completed) {
            navigate("/onboarding", { replace: true });
          } else {
            navigate(profile?.role === "child" ? "/guardian" : "/sathi", { replace: true });
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResendMsg("Verification email resent!");
    } catch (err: any) {
      setResendMsg(err.message || "Failed to resend. Please wait and try again.");
    } finally {
      setResending(false);
    }
  };

  const switchMode = (newMode: "login" | "signup" | "forgot") => {
    setMode(newMode);
    setError("");
    setSignupSuccess(false);
    setForgotSuccess(false);
    setResendMsg("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
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
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Join Anvaya" : "Reset Password"}
          </h1>
          <p style={{ color: "rgba(249,249,247,.45)", fontSize: 13, marginTop: 6 }}>
            {mode === "login"
              ? "Sign in to continue"
              : mode === "signup"
              ? "Create your account"
              : "We'll send you a reset link"}
          </p>
        </div>

        {/* Signup success */}
        {signupSuccess ? (
          <SuccessCard
            title="Check your email"
            description={<>We sent a confirmation link to <strong style={{ color: "#F9F9F7" }}>{email}</strong>. Click the link to verify your account, then come back to sign in.</>}
            onBack={() => switchMode("login")}
            onResend={handleResend}
            resending={resending}
            resendMsg={resendMsg}
          />
        ) : forgotSuccess ? (
          <SuccessCard
            title="Reset link sent"
            description={<>Check <strong style={{ color: "#F9F9F7" }}>{email}</strong> for a password reset link.</>}
            onBack={() => switchMode("login")}
          />
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>I am a…</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["parent", "child"] as const).map(r => (
                      <button key={r} type="button" onClick={() => setRole(r)} style={{
                        flex: 1, padding: "11px", borderRadius: 12,
                        border: role === r ? "1.5px solid rgba(5,150,105,0.7)" : "1px solid rgba(255,255,255,.12)",
                        background: role === r ? "rgba(5,150,105,0.15)" : "rgba(249,249,247,.04)",
                        color: role === r ? "#34D399" : "rgba(249,249,247,.5)",
                        fontSize: 13, fontWeight: role === r ? 600 : 400, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize", transition: "all .2s",
                      }}>
                        {r === "parent" ? "🙏 Caregiver" : "👤 Child"}
                      </button>
                    ))}
                  </div>
                </div>
                {role === "child" && (
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={inputStyle} />
                    <div style={{ fontSize: 10, color: "rgba(249,249,247,.35)", marginTop: 4 }}>Your parent can call you directly from the app</div>
                  </div>
                )}
              </>
            )}

            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
            </div>

            {mode !== "forgot" && (
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
            )}

            {mode === "login" && (
              <div style={{ textAlign: "right", marginTop: -6 }}>
                <button type="button" onClick={() => switchMode("forgot")} style={{
                  background: "transparent", border: "none", color: "rgba(249,249,247,.4)",
                  fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div style={{
                padding: "10px 12px", borderRadius: 12,
                background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.25)",
                color: "#fca5a5", fontSize: 12,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "15px", borderRadius: 16, border: "none",
              cursor: loading ? "wait" : "pointer",
              background: "linear-gradient(135deg,#C68B59,#8D6E63)",
              color: "#FFF8F0", fontSize: 15, fontWeight: 700,
              boxShadow: "0 8px 28px rgba(198,139,89,.35)",
              fontFamily: "'DM Sans', sans-serif",
              opacity: loading ? 0.7 : 1, transition: "opacity .2s", marginTop: 4,
            }}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </button>

            <div style={{ textAlign: "center", marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
              {mode === "login" && (
                <button type="button" onClick={() => switchMode("signup")} style={linkBtnStyle}>
                  Don't have an account? Sign up
                </button>
              )}
              {mode === "signup" && (
                <button type="button" onClick={() => switchMode("login")} style={linkBtnStyle}>
                  Already have an account? Sign in
                </button>
              )}
              {mode === "forgot" && (
                <button type="button" onClick={() => switchMode("login")} style={linkBtnStyle}>
                  ← Back to sign in
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const linkBtnStyle: React.CSSProperties = {
  background: "transparent", border: "none", color: "rgba(249,249,247,.45)",
  fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

function SuccessCard({ title, description, onBack, onResend, resending, resendMsg }: {
  title: string;
  description: React.ReactNode;
  onBack: () => void;
  onResend?: () => void;
  resending?: boolean;
  resendMsg?: string;
}) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0", animation: "fadeUp .4s ease both" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "rgba(5,150,105,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 14px",
      }}>
        <span style={{ fontSize: 24, color: "#34D399" }}>✓</span>
      </div>
      <p style={{ color: "#F9F9F7", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</p>
      <p style={{ color: "rgba(249,249,247,.5)", fontSize: 12, lineHeight: 1.6 }}>{description}</p>

      {onResend && (
        <button onClick={onResend} disabled={resending} style={{
          marginTop: 14, background: "transparent",
          border: "1px solid rgba(255,255,255,.15)",
          color: "rgba(249,249,247,.6)", padding: "8px 20px",
          borderRadius: 100, cursor: resending ? "wait" : "pointer",
          fontSize: 12, fontFamily: "'DM Sans', sans-serif",
          opacity: resending ? 0.6 : 1,
        }}>
          {resending ? "Sending…" : "Resend verification email"}
        </button>
      )}

      {resendMsg && (
        <p style={{ marginTop: 8, fontSize: 11, color: resendMsg.includes("resent") ? "#34D399" : "#fca5a5" }}>
          {resendMsg}
        </p>
      )}

      <button onClick={onBack} style={{
        marginTop: 14, background: "transparent", border: "1px solid rgba(255,255,255,.15)",
        color: "rgba(249,249,247,.6)", padding: "10px 24px",
        borderRadius: 100, cursor: "pointer", fontSize: 13,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Back to sign in
      </button>
    </div>
  );
}
