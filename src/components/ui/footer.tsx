import { Separator } from "@/components/ui/separator";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { useEffect, useState } from "react";
import { getPopularTreatments } from "@/lib/services";

export const Footer = () => {
  const [popularTreatments, setPopularTreatments] = useState<any[]>([]);
  useEffect(() => {
    getPopularTreatments(6)
      .then(setPopularTreatments)
      .catch((e) => console.error('Failed to load popular treatments', e));
  }, []);

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <img src="/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png" alt="Dentaloria" className="h-8" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The most trusted dental clinic comparison platform. Find the best treatment at the most affordable price.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { href: "/", label: "Home" },
                { href: "/clinic-listing", label: "Browse Clinics" },
                { href: "/clinic", label: "Featured Clinic" },
              ].map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Treatments */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Popular Treatments</h3>
            <ul className="space-y-2.5">
              {popularTreatments.map((t) => (
                <li key={t.id}>
                  <a href={`/clinic-listing?treatment=${encodeURIComponent(t.name)}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {t.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Stay Updated</h3>
            <p className="text-sm text-muted-foreground">Get the latest news and exclusive offers.</p>
            <div className="flex gap-2">
              <Input placeholder="your@email.com" className="text-sm h-9 bg-background" />
              <Button size="sm" className="h-9 px-3 bg-primary hover:bg-primary/90">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 text-primary" />
              <span>info@dentaloria.com</span>
            </div>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <span>© 2025 HALLAC HEALTH TOURISM TRAVEL AGENCY. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
