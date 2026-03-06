import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Clock, Award, Users, ArrowRight } from "lucide-react";

interface ClinicCardProps {
  id: string;
  name: string;
  location: string;
  city: string;
  country: string;
  rating: number;
  reviewCount: number;
  image: string;
  specialties: string[];
  priceRange: string;
  experience: number;
  patientCount: number;
  isVerified?: boolean;
  onClick?: () => void;
  variant?: "default" | "compact";
}

export const ClinicCard = ({
  id,
  name,
  city,
  country,
  rating,
  reviewCount,
  image,
  specialties,
  experience,
  patientCount,
  isVerified = false,
  onClick,
  variant = "default"
}: ClinicCardProps) => {
  if (variant === "compact") {
    return (
      <Card 
        className="group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] cursor-pointer h-full border-border/50"
        onClick={onClick}
      >
        <div className="flex h-full">
          <div className="relative w-28 shrink-0">
            <img src={image} alt={name} className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-[hsl(var(--trust-gold))] text-[hsl(var(--trust-gold))]" />
              <span className="text-xs font-semibold">{rating}</span>
            </div>
          </div>
          <div className="flex-1 p-3 flex flex-col min-w-0">
            <h3 className="text-sm font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">{name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground mb-1.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="text-xs line-clamp-1">{city}, {country}</span>
            </div>
            {specialties[0] && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 w-fit mb-auto">{specialties[0]}</Badge>
            )}
            <Link to={`/clinic/${id}`} className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" className="w-full h-7 text-xs bg-primary hover:bg-primary/90">
                View Details
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 cursor-pointer h-full flex flex-col border-border/50" onClick={onClick}>
      <div className="relative h-44 overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
        
        {isVerified && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-[hsl(var(--medical-green))] text-primary-foreground border-0 text-xs">
              <Award className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-[hsl(var(--trust-gold))] text-[hsl(var(--trust-gold))]" />
          <span className="text-xs font-semibold">{rating}</span>
          <span className="text-[10px] text-muted-foreground">({reviewCount})</span>
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">{name}</h3>
        <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs line-clamp-1">{city}, {country}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {specialties.slice(0, 2).map((specialty, index) => (
            <Badge key={index} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">{specialty}</Badge>
          ))}
          {specialties.length > 2 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-normal">+{specialties.length - 2}</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary" />
            {experience} yrs
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            {patientCount}+
          </span>
        </div>

        <Link to={`/clinic/${id}`} className="w-full" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" className="w-full h-9 text-sm bg-primary hover:bg-primary/90">
            View Details
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
