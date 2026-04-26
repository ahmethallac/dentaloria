import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MapPin, Phone, Clock, Award, Users, ArrowRight } from "lucide-react";
import { GoogleRating } from "@/components/ui/google-rating";

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
  location,
  city,
  country,
  rating,
  reviewCount,
  image,
  specialties,
  priceRange,
  experience,
  patientCount,
  isVerified = false,
  onClick,
  variant = "default"
}: ClinicCardProps) => {
  // Compact variant for mobile carousel - horizontal layout
  if (variant === "compact") {
    return (
      <Card 
        className="group overflow-hidden transition-all duration-300 hover:shadow-medium bg-card/80 backdrop-blur-sm border-border/50 cursor-pointer h-full"
        onClick={onClick}
      >
        <div className="flex h-full">
          {/* Image Section - Left side */}
          <div className="relative w-28 shrink-0">
            <img 
              src={image} 
              alt={name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
            
            {/* Rating badge */}
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs">
              <GoogleRating rating={rating} starClassName="w-3 h-3" />
            </div>
          </div>

          {/* Content - Right side */}
          <div className="flex-1 p-3 flex flex-col min-w-0">
            {/* Clinic Name */}
            <h3 className="text-sm font-bold mb-1 line-clamp-1 group-hover:text-primary transition-colors">
              {name}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1 text-muted-foreground mb-2">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="text-xs line-clamp-1">{city}, {country}</span>
            </div>

            {/* Specialty */}
            <div className="mb-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {specialties[0] || "Dental"}
              </Badge>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                {experience} yrs
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-primary" />
                {patientCount}+
              </span>
            </div>

            {/* View button */}
            <Link to={`/clinic/${id}`} className="mt-auto" onClick={(e) => e.stopPropagation()}>
              <Button 
                size="sm" 
                className="w-full h-7 text-xs bg-gradient-primary hover:opacity-90"
              >
                View Details
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Default variant - vertical card layout
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-medium hover:-translate-y-2 bg-card/80 backdrop-blur-sm border-border/50 cursor-pointer h-full flex flex-col" onClick={onClick}>
      {/* Image Section */}
      <div className="relative h-40 md:h-48 overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-2 md:top-3 left-2 md:left-3 flex gap-2">
          {isVerified && (
            <Badge variant="secondary" className="bg-medical-green text-white border-0 text-[10px] md:text-xs">
              <Award className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-white/90 backdrop-blur-sm rounded-lg px-1.5 md:px-2 py-0.5 md:py-1 text-xs md:text-sm">
          <GoogleRating rating={rating} starClassName="w-3 h-3 md:w-4 md:h-4" />
        </div>

        {/* Price Range */}
        <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3">
          <Badge variant="outline" className="bg-white/90 text-primary border-primary/30 text-[10px] md:text-xs">
            {priceRange}
          </Badge>
        </div>
      </div>

      <CardContent className="p-3 md:p-6 flex-1 flex flex-col">
        {/* Clinic Name */}
        <h3 className="text-sm md:text-xl font-bold mb-1 md:mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-1">
          {name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 md:gap-2 text-muted-foreground mb-2 md:mb-3">
          <MapPin className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
          <span className="text-[10px] md:text-sm line-clamp-1">{city}, {country}</span>
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1 mb-2 md:mb-4">
          {specialties.slice(0, 2).map((specialty, index) => (
            <Badge key={index} variant="secondary" className="text-[9px] md:text-xs px-1.5 md:px-2">
              {specialty}
            </Badge>
          ))}
          {specialties.length > 2 && (
            <Badge variant="outline" className="text-[9px] md:text-xs px-1.5">
              +{specialties.length - 2}
            </Badge>
          )}
        </div>

        {/* Stats - push to bottom */}
        <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-sm mt-auto">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">{experience} yrs exp</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">{patientCount}+ patients</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 md:p-6 pt-0 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-8 md:h-9 group-hover:border-primary group-hover:text-primary transition-colors duration-300 text-xs md:text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="w-3 h-3 md:w-4 md:h-4 mr-1" />
          Contact
        </Button>
        <Link to={`/clinic/${id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
          <Button 
            size="sm" 
            className="w-full h-8 md:h-9 bg-gradient-primary hover:opacity-90 transition-all duration-300 text-xs md:text-sm"
          >
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};