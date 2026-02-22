import { SathiScreen, fontStyle } from "@/components/AnvayaApp";
import { useProfile } from "@/hooks/useProfile";

export default function ParentApp() {
  const { profile } = useProfile();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#022c22 0%,#064E3B 40%,#065f46 70%,#0a3f34 100%)" }}>
      <style>{fontStyle}</style>
      <SathiScreen userId={profile?.id} />
    </div>
  );
}
