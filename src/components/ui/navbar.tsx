import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Building2 } from "lucide-react";
import { useState } from "react";

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-xl border-b border-primary/20 shadow-lg shadow-primary/5">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src="/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png" 
              alt="Dentaloria" 
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            <Link to="/" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
              Ana Sayfa
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link to="/clinic-listing" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
              Klinikler
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <a href="#treatments" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
              Tedaviler
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#about" className="relative text-foreground/80 hover:text-primary transition-all duration-300 font-medium text-lg group">
              Hakkımızda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
          </div>

          {/* Desktop Action */}
          <div className="hidden md:flex items-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold px-8 py-3 rounded-full shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
            >
              <Building2 className="w-5 h-5 mr-2" />
              Klinik Girişi
            </Button>
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

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-background/98 backdrop-blur-xl border-b border-primary/20 shadow-xl animate-fade-in">
            <div className="container mx-auto px-6 py-8 space-y-6">
              <Link to="/" className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                Ana Sayfa
              </Link>
              <Link to="/clinic-listing" className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                Klinikler
              </Link>
              <a href="#treatments" className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                Tedaviler
              </a>
              <a href="#about" className="block text-foreground/80 hover:text-primary transition-colors duration-300 font-medium text-lg py-3">
                Hakkımızda
              </a>
              
              <div className="pt-6 border-t border-primary/20">
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-4 rounded-full shadow-lg shadow-primary/25"
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  Klinik Girişi
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};