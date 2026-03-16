import { useState, useEffect } from "react";
import CarePartnerDashboard, { carePartnerStyles } from "@/components/care-partner/CarePartnerDashboard";
import SafetyConsentModal from "@/components/care-partner/SafetyConsentModal";
import { useProfile } from "@/hooks/useProfile";

export default function ChildApp() {
  const { profile } = useProfile();
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    if (profile) {
      setTermsAccepted(profile.has_accepted_terms === true);
    }
  }, [profile]);

  const needsConsent = profile && termsAccepted === false;

  return (
    <div style={{ width: "100%", height: "100dvh", overflow: "hidden", position: "relative" }}>
      <style>{carePartnerStyles}</style>

      {/* Dashboard always renders but is blurred when consent is needed */}
      <div style={{
        width: "100%",
        height: "100%",
        filter: needsConsent ? "blur(8px)" : "none",
        pointerEvents: needsConsent ? "none" : "auto",
        transition: "filter .3s ease",
      }}>
        <CarePartnerDashboard profileId={profile?.id} />
      </div>

      {needsConsent && profile && (
        <SafetyConsentModal
          userId={profile.id}
          onAccepted={() => setTermsAccepted(true)}
        />
      )}
    </div>
  );
}