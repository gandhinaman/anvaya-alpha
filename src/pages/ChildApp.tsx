import { GuardianDashboard, fontStyle } from "@/components/AnvayaApp";

export default function ChildApp() {
  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
      <style>{fontStyle}</style>
      <GuardianDashboard />
    </div>
  );
}
