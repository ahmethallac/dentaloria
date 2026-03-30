import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, Building2 } from "lucide-react";
import { Button } from "./button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { useI18n } from "@/i18n";
export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-xl border-b border-primary/20 shadow-lg shadow-primary/5">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <img 
                src="/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png" 
                alt="Dentaloria" 
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-10">
              <Link to="/" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
                {t('navbar.home')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link to="/clinic-listing" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
                {t('navbar.clinics')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link to="/clinic" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
                {t('navbar.featuredClinic')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <a href="#treatments" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
                {t('navbar.treatments')}
                <span className="absolute -bottom-1 left-0 w-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#about" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
                {t('navbar.about')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </a>
            </div>

            {/* Right Section: Auth */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {profile?.full_name || user.email}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      {t('dashboard')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => navigate('/auth')} 
                  size="lg" 
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold px-8 py-3 rounded-full shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  Register Clinic
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="hover:bg-primary/10"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - OUTSIDE nav to avoid stacking context issues */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
            onClick={closeMobileMenu}
          />
          {/* Menu Content */}
          <div className="md:hidden fixed top-20 left-0 right-0 bottom-0 z-[60] bg-background border-b border-primary/20 shadow-xl animate-fade-in overflow-auto">
            <div className="container mx-auto px-6 py-8 space-y-6">
              <Link to="/" onClick={closeMobileMenu} className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                {t('navbar.home')}
              </Link>
              <Link to="/clinic-listing" onClick={closeMobileMenu} className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                {t('navbar.clinics')}
              </Link>
              <Link to="/clinic" onClick={closeMobileMenu} className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                {t('navbar.featuredClinic')}
              </Link>
              <a href="#treatments" onClick={closeMobileMenu} className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                {t('navbar.treatments')}
              </a>
              <a href="#about" onClick={closeMobileMenu} className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                {t('navbar.about')}
              </a>

              <div className="mt-4 pt-4 border-t border-primary/20">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      {profile?.full_name || user.email}
                    </div>
                    <Button onClick={() => { navigate('/dashboard'); closeMobileMenu(); }} variant="outline" className="w-full">
                      {t('dashboard')}
                    </Button>
                    <Button onClick={() => { handleSignOut(); closeMobileMenu(); }} variant="ghost" className="w-full">
                      {t('signOut')}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => { navigate('/auth'); closeMobileMenu(); }} 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-4 rounded-full shadow-lg shadow-primary/25"
                  >
                    <Building2 className="w-5 h-5 mr-2" />
                    Register Clinic
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};