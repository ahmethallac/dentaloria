import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Star,
  Shield,
  Award
} from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-primary/5 to-primary-light/5 border-t border-border/50">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div>
              <img 
                src="/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png" 
                alt="Dentaloria" 
                className="h-10 mb-4"
              />
              <p className="text-muted-foreground leading-relaxed">
                Türkiye'nin en güvenilir diş kliniği karşılaştırma platformu. 
                En iyi tedaviyi en uygun fiyata bulmanızı sağlıyoruz.
              </p>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-medical-green" />
                <span>Güvenli Platform</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-trust-gold" />
                <span>Doğrulanmış Klinikler</span>
              </div>
            </div>

            {/* Social Media */}
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary">
                <Facebook className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary">
                <Twitter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary">
                <Instagram className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary">
                <Linkedin className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Hızlı Linkler</h3>
            <ul className="space-y-3">
              {[
                "Ana Sayfa",
                "Klinikler",
                "Tedavi Türleri",
                "Fiyat Karşılaştırma",
                "Hasta Yorumları",
                "Blog",
                "SSS"
              ].map((link) => (
                <li key={link}>
                  <a 
                    href="#" 
                    className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Popüler Tedaviler</h3>
            <ul className="space-y-3">
              {[
                "İmplant Tedavisi",
                "Diş Beyazlatma",
                "Ortodonti",
                "Vener Kaplama",
                "Diş Çekimi",
                "Kanal Tedavisi",
                "Protez Diş"
              ].map((service) => (
                <li key={service}>
                  <a 
                    href="#" 
                    className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline"
                  >
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">İletişim</h3>
            
            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">+90 (212) 123 45 67</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">info@dentaloria.com</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <span className="text-muted-foreground">
                  Levent Mahallesi<br />
                  Büyükdere Caddesi No:123<br />
                  Şişli, İstanbul
                </span>
              </div>
            </div>

            {/* Newsletter */}
            <div className="space-y-3">
              <h4 className="font-medium">Bültenimize Abone Olun</h4>
              <div className="flex gap-2">
                <Input 
                  placeholder="E-posta adresiniz" 
                  className="flex-1 bg-background/70 border-border/50 focus:border-primary"
                />
                <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                  Abone Ol
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                En yeni kampanya ve fırsatlardan haberdar olun.
              </p>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © 2024 Dentaloria. Tüm hakları saklıdır.
          </div>
          
          <div className="flex flex-wrap gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Gizlilik Politikası
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Kullanım Şartları
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Çerez Politikası
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              KVKK
            </a>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4 fill-trust-gold text-trust-gold" />
            <span>Trustpilot ile güvence altında</span>
          </div>
        </div>
      </div>
    </footer>
  );
};