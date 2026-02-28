import { SathiScreen, fontStyle } from "@/components/AnvayaApp";
import { useProfile } from "@/hooks/useProfile";

export default function ParentApp() {
  const { profile } = useProfile();

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)" }}>
      <style>{fontStyle}</style>
      <SathiScreen userId={profile?.id} linkedUserId={profile?.linked_user_id} fullName={profile?.full_name} savedLang={profile?.language} />
    </div>
  );
}
