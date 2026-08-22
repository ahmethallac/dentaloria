import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ChevronDown, Facebook, Instagram, Linkedin, Lock, Mail, SendHorizontal, Twitter, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPopularTreatments, type Treatment } from "@/lib/services";
import { withLocalePrefix } from "@/lib/localePath";

/*
 * Desktop reference node 2:10, mobile reference node 1:10.
 *
 * Same five blocks either way; on mobile the three link columns collapse into
 * accordions, as the mobile design shows (each header carries a chevron).
 * The newsletter is deliberately NOT collapsible — the reference draws a
 * chevron beside its heading but still shows the email field open beneath it,
 * and burying a signup field behind a tap costs more than it saves.
 *
 * The card marks are rendered as type rather than brand artwork: shipping
 * Visa/Mastercard logos means shipping their assets under their brand rules.
 * Swap in licensed SVGs when you have them.
 */

const SOCIALS = [
  { icon: Facebook, label: "Facebook" },
  { icon: Instagram, label: "Instagram" },
  { icon: Youtube, label: "YouTube" },
  { icon: Linkedin, label: "LinkedIn" },
] as const;

const FooterLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <li>
    <a
      href={href}
      className="text-sm text-primary-foreground/65 transition-colors hover:text-primary-foreground"
    >
      {children}
    </a>
  </li>
);

/** Collapsible below lg, a plain column at lg and up. */
const FooterColumn = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10 py-4 lg:border-0 lg:py-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`footer-${id}`}
        className="flex w-full items-center justify-between text-left lg:pointer-events-none lg:mb-4"
      >
        <span className="text-sm font-semibold text-primary-foreground">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-primary-foreground/65 transition-transform lg:hidden ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <ul id={`footer-${id}`} className={`space-y-2.5 pt-3 lg:block lg:pt-0 ${open ? "block" : "hidden"}`}>
        {children}
      </ul>
    </div>
  );
};

export const Footer = () => {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const [popularTreatments, setPopularTreatments] = useState<Treatment[]>([]);

  useEffect(() => {
    getPopularTreatments(7)
      .then(setPopularTreatments)
      .catch((e) => console.error("Failed to load popular treatments", e));
  }, []);

  const p = (path: string) => withLocalePrefix(path, lang);

  return (
    <footer className="bg-stats-navy px-5 pt-12 sm:px-8 lg:pt-14">
      <div className="mx-auto w-full max-w-[1264px]">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr] lg:gap-10">
          {/* Brand */}
          <div className="pb-6 lg:pb-0">
            <div className="text-xl font-bold text-primary-foreground">dentaloria</div>
            <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-primary-foreground/65">
              {t("footer.tagline")}
            </p>
            <div className="mt-6 flex gap-5">
              {SOCIALS.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="text-primary-foreground/65 transition-colors hover:text-primary-foreground"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn id="explore" title={t("footer.explore")}>
            <FooterLink href={p("/clinic-listing")}>{t("footer.clinics")}</FooterLink>
            <FooterLink href={p("/treatments")}>{t("nav.treatments")}</FooterLink>
            <FooterLink href={`${p("/")}#destinations`}>{t("nav.destinations")}</FooterLink>
            <FooterLink href={`${p("/")}#how-it-works`}>{t("nav.howItWorks")}</FooterLink>
            <FooterLink href={p("/about-us")}>{t("nav.aboutUs")}</FooterLink>
            <FooterLink href={p("/clinic")}>{t("footer.featuredClinic")}</FooterLink>
          </FooterColumn>

          <FooterColumn id="treatments" title={t("footer.popularTreatments")}>
            {popularTreatments.map((treatment) => (
              <FooterLink
                key={treatment.id}
                href={p(`/clinic-listing?treatment=${encodeURIComponent(treatment.id)}`)}
              >
                {treatment.name}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn id="support" title={t("footer.support")}>
            <FooterLink href={p("/about-us")}>{t("footer.helpCenter")}</FooterLink>
            <FooterLink href="#">{t("footer.privacyPolicy")}</FooterLink>
            <FooterLink href="#">{t("footer.termsOfService")}</FooterLink>
            <FooterLink href="#">{t("footer.cookiePolicy")}</FooterLink>
            <FooterLink href="#">{t("footer.gdpr")}</FooterLink>
          </FooterColumn>

          {/* Newsletter — stays open on every width */}
          <div className="py-6 lg:py-0">
            <h3 className="mb-4 text-sm font-semibold text-primary-foreground">
              {t("footer.newsletterHeading")}
            </h3>
            <p className="text-sm leading-relaxed text-primary-foreground/65">
              {t("footer.newsletterNote")}
            </p>

            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => e.preventDefault()}
              aria-label={t("footer.newsletterHeading")}
            >
              <label htmlFor="footer-email" className="sr-only">
                {t("footer.newsletterPlaceholder")}
              </label>
              <Input
                id="footer-email"
                type="email"
                placeholder={t("footer.newsletterPlaceholder")}
                className="h-12 flex-1 rounded-xl border-white/20 bg-white/10 text-sm text-primary-foreground placeholder:text-primary-foreground/45 focus-visible:ring-primary"
              />
              <Button
                type="submit"
                aria-label={t("footer.subscribe")}
                className="h-12 w-12 shrink-0 rounded-xl bg-primary p-0 hover:bg-primary/90"
              >
                <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>

            <p className="mt-4 flex items-center gap-2 text-sm text-primary-foreground/65">
              <Mail className="h-4 w-4" aria-hidden="true" />
              info@dentaloria.com
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-white/10 py-6 lg:mt-12 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs leading-relaxed text-primary-foreground/55">
            {t("footer.designedBy")}
            <br />
            {t("footer.rightsReserved")}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-primary-foreground/55">{t("footer.weAccept")}</span>
            {["VISA", "Mastercard", "AMEX"].map((brand) => (
              <span
                key={brand}
                className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary-foreground/80"
              >
                {brand}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground/80">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("footer.sslSecured")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
