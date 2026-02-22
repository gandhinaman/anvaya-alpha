import { Navigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

export default function RoleRedirect() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F2F4F3",
        fontFamily: "'DM Sans', sans-serif",
        color: "#064E3B",
      }}>
        Loading…
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Redirect parent users who haven't completed onboarding
  if (profile.role === "parent" && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to={profile.role === "child" ? "/guardian" : "/sathi"} replace />;
}
