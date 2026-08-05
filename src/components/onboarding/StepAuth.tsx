import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withLocalePrefix } from "@/lib/localePath";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.63H1.29A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.29 5.37l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

interface Props {
  lang?: string;
  onAuthenticated: () => void;
}

export default function StepAuth({ lang, onAuthenticated }: Props) {
  const { t } = useTranslation("registerClinic");
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: t("errors.title"), description: t("errors.passwordMismatch"), variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: t("errors.title"), description: t("errors.passwordTooShort"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-clinic", {
        body: { mode: "password", email, password },
      });

      if (error || (data as any)?.error) {
        let serverMessage: string | undefined = (data as any)?.error;
        if (!serverMessage && error?.context?.json) {
          try {
            const body = await error.context.json();
            serverMessage = body?.error;
          } catch {
            // response body wasn't JSON — fall through to the generic message
          }
        }
        if (serverMessage === "email_already_registered") {
          serverMessage = t("errors.emailAlreadyRegistered");
        }
        throw new Error(serverMessage || error?.message || t("errors.registrationFailed"));
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      onAuthenticated();
    } catch (err: any) {
      toast({ title: t("errors.registrationErrorTitle"), description: err.message || t("errors.genericError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      // Scopes the post-redirect clinic_admin role grant to sessions that
      // actually came through this signup button — an unrelated already
      // logged-in user (a patient, an admin) landing on /register-clinic
      // must never get clinic_admin auto-granted just by visiting the page.
      sessionStorage.setItem("clinic_onboarding_oauth", "1");
      const redirectTo = `${window.location.origin}${withLocalePrefix("/register-clinic", lang)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // Browser navigates away to Google now; nothing else to do here.
    } catch (err: any) {
      sessionStorage.removeItem("clinic_onboarding_oauth");
      toast({ title: t("errors.registrationErrorTitle"), description: err.message || t("errors.genericError"), variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("auth.title")}</CardTitle>
        <CardDescription>{t("auth.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-2"
          onClick={handleGoogle}
          disabled={googleLoading || submitting}
        >
          {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
          {t("auth.continueWithGoogle")}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("auth.orDivider")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">{t("auth.confirmPasswordLabel")}</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={submitting || googleLoading}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.submitButton")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.alreadyHaveAccount")} <Link to={withLocalePrefix("/auth", lang)} className="text-primary hover:underline">{t("auth.signIn")}</Link>
        </p>
      </CardContent>
    </Card>
  );
}
