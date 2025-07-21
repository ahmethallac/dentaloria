import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Search, User, Heart, Phone } from "lucide-react";
import { useState } from "react";

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png" 
              alt="Dentaloria" 
              className="h-8"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-foreground hover:text-primary transition-colors duration-300 font-medium">
              Ana Sayfa
            </a>
            <a href="#" className="text-foreground hover:text-primary transition-colors duration-300 font-medium">
              Klinikler
            </a>
            <a href="#" className="text-foreground hover:text-primary transition-colors duration-300 font-medium">
              Tedaviler
            </a>
            <a href="#" className="text-foreground hover:text-primary transition-colors duration-300 font-medium">
              Hakkımızda
            </a>
            <a href="#" className="text-foreground hover:text-primary transition-colors duration-300 font-medium">
              İletişim
            </a>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
              <Search className="w-4 h-4 mr-2" />
              Ara
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
              <Heart className="w-4 h-4 mr-2" />
              Favoriler
            </Button>
            <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/5">
              <User className="w-4 h-4 mr-2" />
              Giriş Yap
            </Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90">
              <Phone className="w-4 h-4 mr-2" />
              Klinik Ekle
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border/50 animate-fade-in">
            <div className="container mx-auto px-4 py-6 space-y-4">
              <a href="#" className="block text-foreground hover:text-primary transition-colors duration-300 font-medium py-2">
                Ana Sayfa
              </a>
              <a href="#" className="block text-foreground hover:text-primary transition-colors duration-300 font-medium py-2">
                Klinikler
              </a>
              <a href="#" className="block text-foreground hover:text-primary transition-colors duration-300 font-medium py-2">
                Tedaviler
              </a>
              <a href="#" className="block text-foreground hover:text-primary transition-colors duration-300 font-medium py-2">
                Hakkımızda
              </a>
              <a href="#" className="block text-foreground hover:text-primary transition-colors duration-300 font-medium py-2">
                İletişim
              </a>
              
              <div className="pt-4 border-t border-border/50 space-y-3">
                <Button variant="outline" size="sm" className="w-full border-primary/30">
                  <User className="w-4 h-4 mr-2" />
                  Giriş Yap
                </Button>
                <Button size="sm" className="w-full bg-gradient-primary hover:opacity-90">
                  <Phone className="w-4 h-4 mr-2" />
                  Klinik Ekle
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Promotional Banner */}
      <div className="bg-gradient-primary text-white text-center py-2 text-sm">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            YENİ
          </Badge>
          <span>Ücretsiz danışmanlık için hemen başvurun! 🦷</span>
        </div>
      </div>
    </nav>
  );
};