import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Star } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-light/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 text-center space-y-8 animate-fade-in">
        {/* Logo and Title */}
        <div className="space-y-4">
          <img 
            src="/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png" 
            alt="Dentaloria" 
            className="h-16 mx-auto animate-scale-in"
          />
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-slide-up">
            Compare The Best
            <br />
            Dental Clinics
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Find the most suitable dental clinic for you based on price, quality and patient reviews. 
            Connect directly with trusted clinics.
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-medium border border-border/50">
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search treatment type..."
                  className="pl-10 h-12 bg-background/70 border-border/50 focus:border-primary transition-all duration-300"
                />
              </div>
              
              <Select>
                <SelectTrigger className="h-12 bg-background/70 border-border/50 focus:border-primary">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="istanbul">Istanbul</SelectItem>
                  <SelectItem value="ankara">Ankara</SelectItem>
                  <SelectItem value="izmir">Izmir</SelectItem>
                  <SelectItem value="antalya">Antalya</SelectItem>
                  <SelectItem value="bursa">Bursa</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="h-12 bg-background/70 border-border/50 focus:border-primary">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="turkey">Turkey</SelectItem>
                  <SelectItem value="cyprus">Cyprus</SelectItem>
                  <SelectItem value="albania">Albania</SelectItem>
                  <SelectItem value="bulgaria">Bulgaria</SelectItem>
                </SelectContent>
              </Select>

              <Button size="lg" className="h-12 bg-gradient-primary hover:opacity-90 transition-all duration-300 transform hover:scale-105">
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Trusted Clinics</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">10K+</div>
                <div className="text-sm text-muted-foreground">Happy Patients</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-3xl font-bold text-trust-gold">4.8</span>
                  <Star className="h-6 w-6 fill-trust-gold text-trust-gold" />
                </div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="text-center space-y-3 p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Location-Based Search</h3>
            <p className="text-muted-foreground text-sm">Find quality clinics closest to you</p>
          </div>

          <div className="text-center space-y-3 p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Real Patient Reviews</h3>
            <p className="text-muted-foreground text-sm">Verified reviews with Trustpilot integration</p>
          </div>

          <div className="text-center space-y-3 p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
              <Search className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Detailed Comparison</h3>
            <p className="text-muted-foreground text-sm">Compare prices, quality and services</p>
          </div>
        </div>
      </div>
    </section>
  );
};