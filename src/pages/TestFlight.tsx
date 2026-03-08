import { useState, useRef } from "react";

const PASSWORD = "anvaya2026";

export default function TestFlight() {
  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === PASSWORD) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFile({ url, name: f.name });
  };

  const container: React.CSSProperties = {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
    fontFamily: "'DM Sans', sans-serif",
    padding: 24,
  };

  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 36,
    textAlign: "center",
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

  const btnStyle: React.CSSProperties = {
    padding: "14px 28px",
    borderRadius: 16,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg,#C68B59,#8D6E63)",
    color: "#FFF8F0",
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: "0 8px 28px rgba(198,139,89,.35)",
    width: "100%",
    marginTop: 12,
  };

  if (!unlocked) {
    return (
      <div style={container}>
        <div style={card}>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#F9F9F7", fontWeight: 600, marginBottom: 8 }}>
            Anvaya Test Build
          </h1>
          <p style={{ color: "rgba(249,249,247,.45)", fontSize: 13, marginBottom: 24 }}>Enter password to access</p>
          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Password" style={inputStyle} autoFocus />
            {error && <p style={{ color: "#fca5a5", fontSize: 12 }}>{error}</p>}
            <button type="submit" style={btnStyle}>Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={card}>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#F9F9F7", fontWeight: 600, marginBottom: 8 }}>
          Anvaya Test Build
        </h1>
        <p style={{ color: "rgba(249,249,247,.45)", fontSize: 13, marginBottom: 24 }}>Upload or download the IPA file</p>

        <input ref={fileRef} type="file" accept=".ipa" onChange={handleUpload} style={{ display: "none" }} />

        <button onClick={() => fileRef.current?.click()} style={{ ...btnStyle, background: "rgba(249,249,247,.08)", boxShadow: "none", border: "1px solid rgba(255,255,255,.15)" }}>
          📁 Select IPA File
        </button>

        {file && (
          <div style={{ marginTop: 24, padding: 20, borderRadius: 16, background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)" }}>
            <p style={{ color: "#34D399", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{file.name}</p>
            <p style={{ color: "rgba(249,249,247,.4)", fontSize: 11, marginBottom: 16 }}>Ready to download</p>
            <a href={file.url} download={file.name} style={{ ...btnStyle, display: "inline-block", textDecoration: "none", textAlign: "center" }}>
              ⬇ Download IPA
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
