import { useState, useEffect } from "react";
import { Download, Share, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1A0F0A 0%, #2C1810 50%, #3E2723 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 24px",
      fontFamily: "'DM Sans', sans-serif",
      color: "#FFF8F0",
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "radial-gradient(circle at 40% 35%,#E8C9A0 0%,#D4A574 30%,#C68B59 55%,#8D6E63 80%,#5D4037 100%)",
        marginBottom: 32,
        boxShadow: "0 0 50px 12px rgba(198,139,89,.25)",
      }} />

      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 600, marginBottom: 12, textAlign: "center" }}>
        Install Anvaya
      </h1>
      <p style={{ fontSize: 18, opacity: 0.7, marginBottom: 40, textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
        Add Anvaya to your home screen for quick access — just like a regular app.
      </p>

      {isInstalled ? (
        <div style={{
          background: "rgba(76,175,80,.15)", border: "2px solid rgba(76,175,80,.4)",
          borderRadius: 20, padding: "20px 32px", fontSize: 19, fontWeight: 500,
        }}>
          ✅ Anvaya is installed!
        </div>
      ) : deferredPrompt ? (
        <button onClick={handleInstall} style={{
          background: "linear-gradient(135deg,#C68B59,#8D6E63)",
          color: "#FFF8F0", border: "none", borderRadius: 20,
          padding: "18px 40px", fontSize: 20, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 8px 24px rgba(198,139,89,.35)",
        }}>
          <Download size={24} /> Install Anvaya
        </button>
      ) : isIOS ? (
        <div style={{
          background: "rgba(255,248,240,.08)", borderRadius: 20,
          padding: "24px 28px", maxWidth: 340, textAlign: "center",
        }}>
          <Share size={28} style={{ marginBottom: 16, opacity: 0.8 }} />
          <p style={{ fontSize: 18, lineHeight: 1.7, marginBottom: 0 }}>
            Tap the <strong>Share</strong> button <Share size={16} style={{ verticalAlign: "middle" }} /> in Safari, then tap <strong>"Add to Home Screen"</strong>.
          </p>
        </div>
      ) : (
        <div style={{
          background: "rgba(255,248,240,.08)", borderRadius: 20,
          padding: "24px 28px", maxWidth: 340, textAlign: "center",
        }}>
          <Smartphone size={28} style={{ marginBottom: 16, opacity: 0.8 }} />
          <p style={{ fontSize: 18, lineHeight: 1.7, marginBottom: 0 }}>
            Open the browser menu (⋮) and tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
          </p>
        </div>
      )}

      <a href="/" style={{
        marginTop: 40, color: "#C68B59", fontSize: 17,
        textDecoration: "none", opacity: 0.8,
      }}>
        ← Back to Anvaya
      </a>
    </div>
  );
}
