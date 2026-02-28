import GuardianDashboard, { guardianStyles } from "@/components/guardian/GuardianDashboard";
import { useProfile } from "@/hooks/useProfile";

export default function ChildApp() {
  const { profile } = useProfile();

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
      <style>{guardianStyles}</style>
      <GuardianDashboard profileId={profile?.id} />
    </div>
  );
}
