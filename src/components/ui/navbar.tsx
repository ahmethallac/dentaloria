import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, LogOut, Building2, LayoutDashboard, Globe, ChevronDown } from "lucide-react";
import { Button } from "./button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { Avatar, AvatarFallback } from "./avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./sheet";
import { SITE_LOCALES } from "@/i18n/siteLocales";
import { withLocalePrefix } from "@/lib/localePath";
import { LOCALE_CHOICE_KEY } from "@/components/i18n/GeoRedirectGate";

interface NavLinkDef {
  to?: string;
  href?: string;
  /** Section on the home page, e.g. "#destinations". */
  hash?: string;
  key: string;
}

// Order and membership follow the Figma header (node 2:412). "Destinations"
// and "How It Works" have no route of their own — they target sections on the
// home page, so they are plain anchors that resolve from any page.
const NAV_LINK_DEFS: NavLinkDef[] = [
  { to: "/", key: "nav.home" },
  { to: "/clinic-listing", key: "nav.clinics" },
  { to: "/treatments", key: "nav.treatments" },
  { hash: "#destinations", key: "nav.destinations" },
  { to: "/about-us", key: "nav.aboutUs" },
  { hash: "#how-it-works", key: "nav.howItWorks" },
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

const NavLink = ({
  to,
  href,
  label,
  onClick,
  className,
}: {
  to?: string;
  href?: string;
  label: string;
  onClick?: () => void;
  className: string;
}) =>
  to ? (
    <Link to={to} onClick={onClick} className={className}>
      {label}
    </Link>
  ) : (
    <a href={href} onClick={onClick} className={className}>
      {label}
    </a>
  );

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const location = useLocation();

  useEffect(() => {
    // Hysteresis (enter "scrolled" past 40px, only exit once back under 8px)
    // instead of a single shared threshold — the navbar's own height change
    // when `scrolled` flips shifts the page's layout by a few pixels, which
    // otherwise pushes scrollY back across a single threshold and makes the
    // header flicker on/off in a feedback loop right around that point.
    // On top of that, a short settle delay means the state only commits
    // once scrolling has actually paused, so residual momentum/rubber-band
    // scroll (common on trackpads and touchscreens even when the finger/
    // mouse looks perfectly still) can never flip it back and forth while
    // the page is mid-transition.
    let settleTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const SETTLE_MS = 120;

    const commit = () => {
      setScrolled((prev) => (prev ? window.scrollY > 8 : window.scrollY > 40));
    };

    const onScroll = () => {
      if (settleTimeoutId) clearTimeout(settleTimeoutId);
      settleTimeoutId = setTimeout(commit, SETTLE_MS);
    };

    commit();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (settleTimeoutId) clearTimeout(settleTimeoutId);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate(withLocalePrefix("/", lang));
  };

  const closeMobile = () => setMobileOpen(false);
  const displayName = profile?.full_name || user?.email || "";
  const linkClass =
    "text-sm font-normal text-nav-muted hover:text-primary transition-colors duration-200 whitespace-nowrap";
  const mobileLinkClass =
    "px-4 py-3 rounded-xl text-base font-medium text-foreground/80 hover:bg-primary/8 hover:text-primary transition-colors";

  // Strips the current locale prefix (if any) off the path, so we can
  // rebuild it with a different locale prefix when switching languages.
  const pathWithoutLocale = (() => {
    if (!lang) return location.pathname;
    const stripped = location.pathname.replace(new RegExp(`^/${lang}`), "");
    return stripped === "" ? "/" : stripped;
  })();

  const switchLocale = (code: string) => {
    localStorage.setItem(LOCALE_CHOICE_KEY, code);
    navigate(withLocalePrefix(pathWithoutLocale, code === "en" ? undefined : code) + location.search);
  };

  const currentLocale = SITE_LOCALES.find((l) => l.code === (lang || "en"));

  const LanguageSwitcher = ({ mobile, compact }: { mobile?: boolean; compact?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={compact ? t("nav.language") : undefined}
          className={
            mobile
              ? "flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-foreground/80 hover:bg-primary/8 hover:text-primary transition-colors w-full"
              : compact
                ? "flex h-9 shrink-0 items-center gap-1 rounded-lg px-1 text-nav-muted transition-colors hover:bg-primary/8 hover:text-primary"
                : "flex items-center gap-1.5 text-sm font-normal text-nav-muted hover:text-primary transition-colors duration-200"
          }
        >
          <Globe className="h-4 w-4 shrink-0" />
          {compact ? (
            <span className="text-xs font-medium uppercase">{currentLocale?.code}</span>
          ) : (
            <span>{currentLocale?.label}</span>
          )}
          {!mobile && <ChevronDown className="h-3 w-3 shrink-0" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mobile ? "start" : "end"}>
        {SITE_LOCALES.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => switchLocale(l.code)}>
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl shadow-md shadow-primary/5"
          : "bg-gradient-to-b from-background/95 to-background/75 backdrop-blur-md"
      }`}
      style={{
        WebkitMaskImage: "linear-gradient(to bottom, black 88%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, black 88%, transparent 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1264px] px-5 sm:px-0">
        <div
          data-fid="header.bar"
          className={`flex items-center justify-between transition-all duration-300 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
          {/* Logo */}
          <Link to={withLocalePrefix("/", lang)} className="flex items-center shrink-0">
            <img
              src="/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png"
              alt="Dentaloria"
              data-fid="header.logo"
              className={`w-auto transition-all duration-300 ${scrolled ? "h-5 md:h-7" : "h-5 md:h-8"}`}
            />
          </Link>

          {/* Desktop Navigation */}
          <div data-fid="header.nav" className="hidden md:flex items-center gap-10">
            {NAV_LINK_DEFS.map((link) => (
              <NavLink
                key={link.key}
                to={link.to ? withLocalePrefix(link.to, lang) : undefined}
                href={link.hash ? withLocalePrefix("/", lang) + link.hash : link.href}
                label={t(link.key)}
                className={linkClass}
              />
            ))}
          </div>

          {/* Right Section: Auth */}
          <div data-fid="header.actions" className="hidden md:flex items-center gap-5">
            <LanguageSwitcher />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-primary/8 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium max-w-[140px] truncate">{displayName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(withLocalePrefix("/dashboard", lang))}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {t("nav.dashboard")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                data-fid="header.cta"
                onClick={() => navigate(withLocalePrefix("/auth", lang))}
                className="h-11 w-40 rounded-xl bg-primary px-0 text-sm font-medium text-primary-foreground shadow-sm transition-colors duration-200 hover:bg-primary/90"
              >
                {t("nav.registerClinic")}
              </Button>
            )}
          </div>

          {/* Mobile: language, the register CTA, then the drawer trigger.
              The six nav links cannot fit at 375px, so they stay in the sheet;
              everything else the desktop header shows is here. */}
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSwitcher compact />
            {!user && (
              <Button
                onClick={() => navigate(withLocalePrefix("/auth", lang))}
                className="h-9 shrink-0 rounded-lg bg-primary px-2 text-[11px] font-semibold leading-none text-primary-foreground hover:bg-primary/90"
              >
                {t("nav.registerClinic")}
              </Button>
            )}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-80 flex flex-col p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex items-center px-6 py-5 border-b border-border">
                  <img
                    src="/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png"
                    alt="Dentaloria"
                    className="h-8 w-auto"
                  />
                </div>
                <div className="flex flex-col px-3 py-4 gap-1">
                  {NAV_LINK_DEFS.map((link) => (
                    <NavLink
                      key={link.key}
                      to={link.to ? withLocalePrefix(link.to, lang) : undefined}
                      href={link.href}
                      label={t(link.key)}
                      onClick={closeMobile}
                      className={mobileLinkClass}
                    />
                  ))}
                  <LanguageSwitcher mobile />
                </div>
                <div className="mt-auto px-6 py-5 border-t border-border">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">{displayName}</span>
                      </div>
                      <Button
                        onClick={() => {
                          navigate(withLocalePrefix("/dashboard", lang));
                          closeMobile();
                        }}
                        variant="outline"
                        className="w-full rounded-full"
                      >
                        {t("nav.dashboard")}
                      </Button>
                      <Button
                        onClick={() => {
                          handleSignOut();
                          closeMobile();
                        }}
                        variant="ghost"
                        className="w-full rounded-full"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t("nav.signOut")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        navigate(withLocalePrefix("/auth", lang));
                        closeMobile();
                      }}
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-5 rounded-full shadow-md shadow-primary/20"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      {t("nav.registerClinic")}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
