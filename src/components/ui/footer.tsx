import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, Star, Shield, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { getPopularTreatments } from "@/lib/services";
export const Footer = () => {
  const [popularTreatments, setPopularTreatments] = useState<any[]>([]);
  useEffect(() => {
    getPopularTreatments(7)
      .then(setPopularTreatments)
      .catch((e) => console.error('Failed to load popular treatments', e));
  }, []);
  return <footer className="bg-gradient-to-br from-primary/5 to-primary-light/5 border-t border-border/50">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div>
              <img src="/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png" alt="Dentaloria" className="h-10 mb-4" />
              <p className="text-muted-foreground leading-relaxed">
                Turkey's most trusted dental clinic comparison platform. 
                We help you find the best treatment at the most affordable price.
              </p>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-medical-green" />
                <span>Secure Platform</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-trust-gold" />
                <span>Verified Clinics</span>
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
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <a href="/" className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline">
                  Home
                </a>
              </li>
              <li>
                <a href="/clinic-listing" className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline">
                  Clinics
                </a>
              </li>
              <li>
                <a href="/clinic" className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline">
                  Featured Clinic
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Popular Treatments</h3>
            <ul className="space-y-3">
              {popularTreatments.map((t) => (
                <li key={t.id}>
                  <a href={`/clinic-listing?treatment=${encodeURIComponent(t.id)}`} className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline">
                    {t.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Contact</h3>
            
            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                
                
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">info@dentaloria.com</span>
              </div>
              <div className="flex items-start gap-3">
                
                
              </div>
            </div>

            {/* Newsletter */}
            <div className="space-y-3">
              <h4 className="font-medium">Subscribe to Our Newsletter</h4>
              <div className="flex gap-2">
                <Input placeholder="Your email address" className="flex-1 bg-background/70 border-border/50 focus:border-primary" />
                <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                  Subscribe
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Stay informed about the latest campaigns and opportunities.
              </p>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">HALLAC HEALTH TOURISM TRAVEL AGENCY All rights reserved 2025

        </div>
          
          <div className="flex flex-wrap gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Terms of Service
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Cookie Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              GDPR
            </a>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4 fill-trust-gold text-trust-gold" />
            <span>Secured with Trustpilot</span>
          </div>
        </div>
      </div>
    </footer>;
};