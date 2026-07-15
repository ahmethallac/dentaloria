import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, LogOut, Building2, LayoutDashboard } from "lucide-react";
import { Button } from "./button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { Avatar, AvatarFallback } from "./avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./sheet";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/clinic-listing", label: "Clinics" },
  { to: "/clinic", label: "Featured Clinic" },
  { href: "#treatments", label: "Treatments" },
  { href: "#about", label: "About Us" },
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
  link,
  onClick,
  className,
}: {
  link: (typeof NAV_LINKS)[number];
  onClick?: () => void;
  className: string;
}) =>
  link.to ? (
    <Link to={link.to} onClick={onClick} className={className}>
      {link.label}
    </Link>
  ) : (
    <a href={link.href} onClick={onClick} className={className}>
      {link.label}
    </a>
  );

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);
  const displayName = profile?.full_name || user?.email || "";
  const linkClass =
    "px-4 py-2 rounded-full text-sm font-medium text-foreground/70 hover:text-primary hover:bg-primary/8 transition-colors duration-200";
  const mobileLinkClass =
    "px-4 py-3 rounded-xl text-base font-medium text-foreground/80 hover:bg-primary/8 hover:text-primary transition-colors";

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl shadow-md shadow-primary/5"
          : "bg-background/70 backdrop-blur-md"
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
          <Link to="/" className="flex items-center shrink-0">
            <img
              src="/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png"
              alt="Dentaloria"
              className={`w-auto transition-all duration-300 ${scrolled ? "h-8" : "h-10"}`}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.label} link={link} className={linkClass} />
            ))}
          </div>

          {/* Right Section: Auth */}
          <div className="hidden md:flex items-center gap-3">
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
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 rounded-full shadow-md shadow-primary/20 transition-all duration-300"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Register Clinic
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
                  {NAV_LINKS.map((link) => (
                    <NavLink key={link.label} link={link} onClick={closeMobile} className={mobileLinkClass} />
                  ))}
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
                          navigate("/dashboard");
                          closeMobile();
                        }}
                        variant="outline"
                        className="w-full rounded-full"
                      >
                        Dashboard
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
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        navigate("/auth");
                        closeMobile();
                      }}
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-5 rounded-full shadow-md shadow-primary/20"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Register Clinic
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
