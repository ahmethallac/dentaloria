// The page a clinic lands on from our outreach mail: their own Dentaloria
// page, already filled in, with Approve / Reject pinned to the bottom of the
// screen on every device.
//
// The approval copy is in the language the admin chose for the invite
// (clinic_approvals.invite_locale), not the URL's: the page content follows
// the site locale, but the buttons the clinic must press have to be in a
// language they read.
//
// It renders the real ClinicDetail rather than a lookalike, so what they
// approve is exactly what goes live. The draft itself is unreadable to the
// anon Postgres role — it is fetched by secret token through the
// clinic-preview edge function and handed to ClinicDetail already loaded.
//
// Approving does not publish. It records consent, then asks them to prove the
// clinic is theirs by verifying a work email; the page goes live only in
// clinic-draft-claim, once that email is confirmed. Anyone forwarded this link
// can press Approve, but only someone who reads the clinic's mail can publish.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { CheckCircle2, ShieldCheck, MailCheck, Loader2, AlertCircle } from "lucide-react";
import ClinicDetail from "./ClinicDetail";

type Phase =
  | "loading"
  | "preview"
  | "rejecting"
  | "rejected"
  | "signup"
  | "checkEmail"
  | "publishing"
  | "published"
  | "gone";

const COPY = {
  tr: {
    bannerTitle: "Bu sayfa sizin için hazırlandı.",
    bannerText: "Henüz yayında değil ve bu bağlantıyı sizden başka kimse görmüyor.",
    barTitle: "Bu sayfayı yayınlayalım mı?",
    barText:
      "Dentaloria, hastaları kliniklerle buluşturan ücretsiz bir karşılaştırma platformudur. Sizin adınıza bu sayfayı hazırladık. Onaylarsanız yayına alırız ve her şeyi kendiniz düzenleyebilirsiniz. Reddederseniz sayfayı ve tüm verileri hemen sileriz.",
    approve: "Onaylıyorum, yayınlansın",
    reject: "Reddediyorum, silin",
    approveShort: "Onayla",
    rejectShort: "Reddet",
    rejectConfirm:
      "Sayfa ve içindeki tüm veriler kalıcı olarak silinecek ve size bir daha yazmayacağız. Emin misiniz?",
    rejectedTitle: "Silindi.",
    rejectedText:
      "Sayfa ve tüm veriler kaldırıldı. Sizi listemizden çıkardık, bir daha bu konuda yazmayacağız. Rahatsızlık için kusura bakmayın.",
    signupTitle: "Son bir adım kaldı",
    signupText:
      "Merak etmeyin, istediğiniz her şeyi düzenleyebileceksiniz. Önce bu kliniğin size ait olduğundan emin olmamız gerekiyor. Lütfen kurumsal e-posta adresinizle kayıt olun.",
    emailLabel: "Kurumsal e-posta adresiniz",
    passwordLabel: "Şifre belirleyin",
    passwordHint: "En az 8 karakter",
    submit: "Kayıt ol ve yayınla",
    expectedDomainHint: (d: string) => `Sitenizde görünen adres: @${d}`,
    checkEmailTitle: "E-postanıza bir bağlantı gönderdik",
    checkEmailText:
      "Gelen kutunuzdaki bağlantıya tıklayın. Tıkladığınız anda sayfanız yayına girecek. Bu sekmeyi kapatabilirsiniz.",
    publishing: "Sayfanız yayına alınıyor…",
    publishedTitle: "Sayfanız yayında!",
    publishedText:
      "Artık dentaloria.com üzerinde görünüyorsunuz. Aşağıdan panele geçip fiyatlarınızı, fotoğraflarınızı ve ekibinizi istediğiniz gibi düzenleyebilirsiniz.",
    edit: "Sayfamı düzenle",
    view: "Sayfamı gör",
    goneTitle: "Bu bağlantı artık geçerli değil",
    goneText:
      "Bağlantının süresi dolmuş veya daha önce yanıtlanmış olabilir. Bizimle info@dentaloria.com adresinden iletişime geçebilirsiniz.",
    consent:
      "Bu sayfadaki içeriğin dentaloria.com'da yayınlanmasına izin veriyorum ve içerikteki görsellerin kullanım haklarına sahip olduğumu beyan ederim.",
    error: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
  },
  en: {
    bannerTitle: "This page was prepared for you.",
    bannerText: "It is not live yet, and nobody but you can see this link.",
    barTitle: "Shall we publish this page?",
    barText:
      "Dentaloria is a free comparison platform that connects patients with clinics. We prepared this page on your behalf. Approve it and we publish it — you can then edit everything yourself. Reject it and we delete the page and all its data immediately.",
    approve: "Approve and publish",
    reject: "Reject and delete",
    approveShort: "Approve",
    rejectShort: "Reject",
    rejectConfirm:
      "The page and all of its data will be permanently deleted, and we will not contact you again. Are you sure?",
    rejectedTitle: "Deleted.",
    rejectedText:
      "The page and all its data have been removed. We have taken you off our list and will not write to you about this again. Sorry for the interruption.",
    signupTitle: "One last step",
    signupText:
      "Don't worry — you will be able to edit everything. First we need to be sure this clinic is yours. Please sign up with your work email address.",
    emailLabel: "Your work email address",
    passwordLabel: "Choose a password",
    passwordHint: "At least 8 characters",
    submit: "Sign up and publish",
    expectedDomainHint: (d: string) => `The address shown on your website: @${d}`,
    checkEmailTitle: "We sent a link to your inbox",
    checkEmailText:
      "Click the link in your inbox. Your page goes live the moment you do. You can close this tab.",
    publishing: "Publishing your page…",
    publishedTitle: "Your page is live!",
    publishedText:
      "You are now listed on dentaloria.com. Open your panel below to edit your prices, photos and team however you like.",
    edit: "Edit my page",
    view: "View my page",
    goneTitle: "This link is no longer valid",
    goneText:
      "It may have expired or already been answered. You can reach us at info@dentaloria.com.",
    consent:
      "I consent to this content being published on dentaloria.com and confirm that I hold the rights to the images it contains.",
    error: "Something went wrong. Please try again.",
  },
};

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background flex flex-col">
    <Navbar />
    <div className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center">
      <div className="max-w-md w-full text-center">{children}</div>
    </div>
    <Footer />
  </div>
);

export default function ClinicDraftPreview() {
  const { token, lang } = useParams();
  const navigate = useNavigate();
  const [inviteLocale, setInviteLocale] = useState<"tr" | "en" | null>(null);
  const c = COPY[inviteLocale ?? (lang === "tr" ? "tr" : "en")];

  const [phase, setPhase] = useState<Phase>("loading");
  const [clinic, setClinic] = useState<any | null>(null);
  const [expectedDomain, setExpectedDomain] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ citySlug: string | null; clinicSlug: string | null; clinicId: string } | null>(null);

  // A draft link that gets forwarded or pasted somewhere public must never end
  // up in a search index, so this page carries its own robots directive.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const fn = useCallback(async (name: string, body: unknown) => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    // A non-2xx from an edge function surfaces here as an error while the JSON
    // body is still what we need to read, so unwrap it rather than throwing.
    if (error && !data) throw error;
    return data as any;
  }, []);

  // Publishing runs here rather than at the click, because the clinic returns
  // from the verification mail into a fresh page load with a session.
  const claim = useCallback(async () => {
    setPhase("publishing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setPhase("checkEmail");

      const res = await supabase.functions.invoke("clinic-draft-claim", {
        body: { token },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = (res.data ?? {}) as any;

      if (payload.state === "published") {
        setPublished({ citySlug: payload.citySlug, clinicSlug: payload.clinicSlug, clinicId: payload.clinicId });
        setPhase("published");
        return;
      }
      // Verified too early, or the mail link was opened in another browser.
      setPhase("checkEmail");
    } catch {
      setPhase("checkEmail");
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fn("clinic-preview", { token });
        if (cancelled) return;

        if (data?.state !== "pending") return setPhase("gone");
        if (data.inviteLocale === "tr" || data.inviteLocale === "en") setInviteLocale(data.inviteLocale);
        setClinic(data.clinic);

        // Only finish the job for someone coming back from the verification
        // mail — which means Approve was already pressed. Without that check
        // any signed-in visitor (an admin opening the draft to look at it)
        // would trigger the claim and get bounced to the mail screen.
        if (data.consentGiven) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email_confirmed_at) return claim();
        }

        setPhase("preview");
      } catch {
        if (!cancelled) setPhase("gone");
      }
    })();
    return () => { cancelled = true; };
  }, [token, fn, claim]);

  const decide = async (action: "approve" | "reject") => {
    setBusy(true);
    setError(null);
    try {
      const data = await fn("clinic-draft-decision", { token, action, consentText: action === "approve" ? c.consent : undefined });
      if (action === "reject") return setPhase("rejected");
      if (data?.expectedDomain) setExpectedDomain(data.expectedDomain);
      setPhase("signup");
    } catch {
      setError(c.error);
    } finally {
      setBusy(false);
    }
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Bring them back to this same link, where the effect above finishes
          // the job by calling claim().
          emailRedirectTo: window.location.href,
          data: { full_name: clinic?.name ?? "", user_type: "clinic_admin" },
        },
      });
      if (signUpError) throw signUpError;
      setPhase("checkEmail");
    } catch (err: any) {
      setError(err?.message ?? c.error);
    } finally {
      setBusy(false);
    }
  };

  const localePrefix = lang ? `/${lang}` : "";

  const draftHeader = useMemo(() => (
    <div className="bg-primary/10 border-b border-primary/30">
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-2 text-sm">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <span><strong>{c.bannerTitle}</strong> {c.bannerText}</span>
      </div>
    </div>
  ), [c]);

  const draftFooter = useMemo(() => (
    <>
      {/* The full explanation stays in the page, above the footer… */}
      <div className="border-t bg-muted/40">
        <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
          <h2 className="text-xl font-bold mb-2">{c.barTitle}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.barText}</p>
        </div>
      </div>

      {/* …while the decision itself is pinned to the bottom of the screen on
          every device, so the clinic always sees what to press. The consent
          line sits right above the buttons it applies to. */}
      <div
        data-fid="draft.bar"
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 shadow-[0_-10px_30px_-12px_rgba(6,32,81,0.25)] backdrop-blur-md"
      >
        <div className="container mx-auto flex max-w-5xl flex-col gap-2.5 px-4 py-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold lg:text-base">{c.barTitle}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground lg:text-xs">{c.consent}</p>
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">
            <Button disabled={busy} onClick={() => decide("approve")} className="h-11 lg:px-6">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              <span className="lg:hidden">{c.approveShort}</span>
              <span className="hidden lg:inline">{c.approve}</span>
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              className="h-11 lg:px-6"
              onClick={() => { if (window.confirm(c.rejectConfirm)) decide("reject"); }}
            >
              <span className="lg:hidden">{c.rejectShort}</span>
              <span className="hidden lg:inline">{c.reject}</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  ), [c, busy, error]);

  if (phase === "loading") {
    return <Centered><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></Centered>;
  }

  if (phase === "gone") {
    return (
      <Centered>
        <AlertCircle className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-xl font-bold mb-2">{c.goneTitle}</h1>
        <p className="text-sm text-muted-foreground">{c.goneText}</p>
      </Centered>
    );
  }

  if (phase === "rejected") {
    return (
      <Centered>
        <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-xl font-bold mb-2">{c.rejectedTitle}</h1>
        <p className="text-sm text-muted-foreground">{c.rejectedText}</p>
      </Centered>
    );
  }

  if (phase === "checkEmail") {
    return (
      <Centered>
        <MailCheck className="w-10 h-10 mx-auto mb-4 text-primary" />
        <h1 className="text-xl font-bold mb-2">{c.checkEmailTitle}</h1>
        <p className="text-sm text-muted-foreground">{c.checkEmailText}</p>
      </Centered>
    );
  }

  if (phase === "publishing") {
    return (
      <Centered>
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{c.publishing}</p>
      </Centered>
    );
  }

  if (phase === "published") {
    return (
      <Centered>
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold mb-2">{c.publishedTitle}</h1>
        <p className="text-sm text-muted-foreground mb-6">{c.publishedText}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate(`${localePrefix}/clinic/${published?.clinicId}/panel`)}>{c.edit}</Button>
          {published?.citySlug && published?.clinicSlug && (
            <Button
              variant="outline"
              onClick={() => navigate(`${localePrefix}/clinic/${published.citySlug}/${published.clinicSlug}`)}
            >
              {c.view}
            </Button>
          )}
        </div>
      </Centered>
    );
  }

  if (phase === "signup") {
    return (
      <Centered>
        <ShieldCheck className="w-10 h-10 mx-auto mb-4 text-primary" />
        <h1 className="text-xl font-bold mb-2">{c.signupTitle}</h1>
        <p className="text-sm text-muted-foreground mb-6">{c.signupText}</p>
        <form onSubmit={submitSignup} className="space-y-4 text-left">
          <div>
            <Label htmlFor="draft-email">{c.emailLabel}</Label>
            <Input
              id="draft-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={expectedDomain ? `you@${expectedDomain}` : undefined}
            />
            {expectedDomain && (
              <p className="text-xs text-muted-foreground mt-1">{c.expectedDomainHint(expectedDomain)}</p>
            )}
          </div>
          <div>
            <Label htmlFor="draft-password">{c.passwordLabel}</Label>
            <Input
              id="draft-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">{c.passwordHint}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {c.submit}
          </Button>
        </form>
      </Centered>
    );
  }

  return <ClinicDetail draftClinic={clinic} draftHeader={draftHeader} draftFooter={draftFooter} />;
}
