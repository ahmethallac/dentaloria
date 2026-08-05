import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getUserClinics, type Clinic } from "@/lib/services";
import { withLocalePrefix } from "@/lib/localePath";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import StepAuth from "@/components/onboarding/StepAuth";
import StepBasics from "@/components/onboarding/StepBasics";
import StepProfile from "@/components/onboarding/StepProfile";
import StepTeamMedia from "@/components/onboarding/StepTeamMedia";
import StepDocuments from "@/components/onboarding/StepDocuments";

type WizardStep = 0 | 1 | 2 | 3 | 4;

// Resumes the wizard where a clinic admin left off, without a dedicated
// progress column: infer it from what's already been saved.
const resumeStep = (clinic: any): WizardStep => {
  const hasProfile = !!(clinic.description || clinic.address || clinic.clinic_treatments?.length);
  const hasTeamMedia = !!(clinic.doctors?.length || clinic.clinic_images?.length);
  if (!hasProfile) return 2;
  if (!hasTeamMedia) return 3;
  return 4;
};

const RegisterClinic = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation("registerClinic");

  const [initializing, setInitializing] = useState(true);
  const [step, setStep] = useState<WizardStep>(0);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [revisionNotes, setRevisionNotes] = useState<string | null>(null);

  const resolveState = useCallback(async () => {
    if (!user) {
      setStep(0);
      setInitializing(false);
      return;
    }
    // Only grant clinic_admin here when this session came back from the
    // "Continue with Google" button in StepAuth (flagged before the
    // redirect) — an unrelated already-authenticated user (patient, admin)
    // landing on this page must never get the role just by visiting it.
    // Password signup already grants the role synchronously in StepAuth.
    if (sessionStorage.getItem("clinic_onboarding_oauth") === "1") {
      sessionStorage.removeItem("clinic_onboarding_oauth");
      try {
        await supabase.functions.invoke("register-clinic", { body: { mode: "oauth" } });
      } catch {
        // non-fatal — surfaced later if the clinic insert fails under RLS
      }
    }
    try {
      const clinics = await getUserClinics(user.id);
      const existing = clinics[0] as any;
      if (!existing) {
        setStep(1);
        setInitializing(false);
        return;
      }
      if (existing.page_status !== "incomplete") {
        navigate(withLocalePrefix(`/clinic/${existing.id}/panel`, lang), { replace: true });
        return;
      }
      setClinicId(existing.id);
      setClinic(existing);
      setRevisionNotes(existing.page_revision_notes || null);
      setStep(resumeStep(existing));
    } catch (e) {
      console.error("Onboarding resume error:", e);
      setStep(1);
    } finally {
      setInitializing(false);
    }
  }, [user, navigate, lang]);

  useEffect(() => {
    if (authLoading) return;
    resolveState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const goToPanel = () => {
    if (clinicId) navigate(withLocalePrefix(`/clinic/${clinicId}/panel`, lang), { replace: true });
  };

  const steps = [t("wizard.stepBasics"), t("wizard.stepProfile"), t("wizard.stepTeam"), t("wizard.stepDocuments")];

  if (authLoading || initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-subtle">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-gradient-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t("wizard.title")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("wizard.subtitle")}</p>
        </div>

        {step > 0 && <OnboardingStepper steps={steps} currentStep={step} />}

        {revisionNotes && step > 0 && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <p className="font-semibold text-destructive text-sm">{t("wizard.revisionsTitle")}</p>
            <p className="text-sm whitespace-pre-wrap mt-1">{revisionNotes}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {step === 0 && <StepAuth lang={lang} onAuthenticated={resolveState} />}

            {step === 1 && (
              <StepBasics
                lang={lang}
                clinicId={clinicId}
                initialClinic={clinic}
                onDone={(id, updated) => {
                  setClinicId(id);
                  setClinic(updated);
                  setStep(2);
                }}
              />
            )}

            {step === 2 && clinicId && (
              <StepProfile clinicId={clinicId} initialClinic={clinic} onBack={() => setStep(1)} onDone={() => setStep(3)} />
            )}

            {step === 3 && clinicId && (
              <StepTeamMedia clinicId={clinicId} initialClinic={clinic} onBack={() => setStep(2)} onDone={() => setStep(4)} />
            )}

            {step === 4 && clinicId && (
              <StepDocuments clinicId={clinicId} onBack={() => setStep(3)} onSubmitted={goToPanel} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RegisterClinic;
