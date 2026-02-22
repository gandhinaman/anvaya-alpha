import { GuardianDashboard, fontStyle } from "@/components/AnvayaApp";
import { useProfile } from "@/hooks/useProfile";

export default function ChildApp() {
  const { profile } = useProfile();

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
      <style>{fontStyle}</style>
      <GuardianDashboard profileId={profile?.id} />
    </div>
  );
}
