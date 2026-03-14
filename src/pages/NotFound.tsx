import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#FFF8F0",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 72,
          fontWeight: 700,
          color: "#C68B59",
          marginBottom: 8,
        }}>404</h1>
        <p style={{ fontSize: 18, color: "rgba(255,248,240,.6)", marginBottom: 24 }}>
          Oops! Page not found
        </p>
        <a href="/" style={{
          display: "inline-block",
          padding: "12px 28px",
          borderRadius: 100,
          background: "linear-gradient(135deg,#C68B59,#8D6E63)",
          color: "#FFF8F0",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          boxShadow: "0 8px 24px rgba(198,139,89,.3)",
        }}>
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;