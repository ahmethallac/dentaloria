import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, LogOut, Building2, LayoutDashboard, Globe } from "lucide-react";
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
  key: string;
}

const NAV_LINK_DEFS: NavLinkDef[] = [
  { to: "/", key: "nav.home" },
  { to: "/clinic-listing", key: "nav.clinics" },
  { to: "/clinic", key: "nav.featuredClinic" },
  { href: "#treatments", key: "nav.treatments" },
  { href: "#about", key: "nav.aboutUs" },
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
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate(withLocalePrefix("/", lang));
  };

  const closeMobile = () => setMobileOpen(false);
  const displayName = profile?.full_name || user?.email || "";
  const linkClass =
    "px-4 py-2 rounded-full text-sm font-medium text-foreground/70 hover:text-primary hover:bg-primary/8 transition-colors duration-200";
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

  const LanguageSwitcher = ({ mobile }: { mobile?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={
            mobile
              ? "flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-foreground/80 hover:bg-primary/8 hover:text-primary transition-colors w-full"
              : "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-foreground/70 hover:text-primary hover:bg-primary/8 transition-colors duration-200"
          }
        >
          <Globe className="w-4 h-4" />
          <span>{currentLocale?.flag} {currentLocale?.label}</span>
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
      <div className="container mx-auto px-6">
        <div
          className={`flex items-center justify-between transition-all duration-300 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
          {/* Logo */}
          <Link to={withLocalePrefix("/", lang)} className="flex items-center shrink-0">
            <img
              src="/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png"
              alt="Dentaloria"
              className={`w-auto transition-all duration-300 ${scrolled ? "h-8" : "h-10"}`}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINK_DEFS.map((link) => (
              <NavLink
                key={link.key}
                to={link.to ? withLocalePrefix(link.to, lang) : undefined}
                href={link.href}
                label={t(link.key)}
                className={linkClass}
              />
            ))}
          </div>

          {/* Right Section: Auth */}
          <div className="hidden md:flex items-center gap-2">
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
                onClick={() => navigate(withLocalePrefix("/auth", lang))}
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 rounded-full shadow-md shadow-primary/20 transition-all duration-300"
              >
                <Building2 className="w-4 h-4 mr-2" />
                {t("nav.registerClinic")}
              </Button>
            )}
          </div>

          {/* Mobile: hamburger opens a slide-in drawer */}
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
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
