import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, Building2, ChevronDown } from "lucide-react";
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
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <img 
                src="/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png" 
                alt="Dentaloria" 
                className="h-7 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <Link to="/" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                {t('navbar.home')}
              </Link>
              <Link to="/clinic-listing" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                {t('navbar.clinics')}
              </Link>
              <Link to="/clinic" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                {t('navbar.featuredClinic')}
              </Link>
            </div>

            {/* Right Section */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 text-sm font-medium">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="max-w-[120px] truncate">{profile?.full_name || user.email}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      {t('dashboard')}
                    </DropdownMenuItem>
                    {profile?.user_type === 'clinic_admin' && (
                      <DropdownMenuItem onClick={() => navigate('/add-clinic')}>
                        {t('addClinic')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => navigate('/auth')} 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 rounded-lg shadow-sm"
                >
                  {t('auth.signIn')}
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="h-9 w-9"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 z-[55] bg-foreground/20 backdrop-blur-sm"
            onClick={closeMobileMenu}
          />
          <div className="md:hidden fixed top-16 left-0 right-0 bottom-0 z-[60] bg-background border-t border-border overflow-auto">
            <div className="container mx-auto px-6 py-6 space-y-1">
              <Link to="/" onClick={closeMobileMenu} className="block px-4 py-3 text-foreground hover:bg-muted rounded-lg font-medium transition-colors">
                {t('navbar.home')}
              </Link>
              <Link to="/clinic-listing" onClick={closeMobileMenu} className="block px-4 py-3 text-foreground hover:bg-muted rounded-lg font-medium transition-colors">
                {t('navbar.clinics')}
              </Link>
              <Link to="/clinic" onClick={closeMobileMenu} className="block px-4 py-3 text-foreground hover:bg-muted rounded-lg font-medium transition-colors">
                {t('navbar.featuredClinic')}
              </Link>

              <div className="pt-4 mt-4 border-t border-border">
                {user ? (
                  <div className="space-y-1">
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      {profile?.full_name || user.email}
                    </div>
                    <button onClick={() => { navigate('/dashboard'); closeMobileMenu(); }} className="block w-full text-left px-4 py-3 text-foreground hover:bg-muted rounded-lg font-medium transition-colors">
                      {t('dashboard')}
                    </button>
                    {profile?.user_type === 'clinic_admin' && (
                      <button onClick={() => { navigate('/add-clinic'); closeMobileMenu(); }} className="block w-full text-left px-4 py-3 text-foreground hover:bg-muted rounded-lg font-medium transition-colors">
                        {t('addClinic')}
                      </button>
                    )}
                    <button onClick={() => { handleSignOut(); closeMobileMenu(); }} className="block w-full text-left px-4 py-3 text-destructive hover:bg-destructive/5 rounded-lg font-medium transition-colors">
                      {t('signOut')}
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => { navigate('/auth'); closeMobileMenu(); }} 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg"
                  >
                    {t('auth.signIn')}
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
