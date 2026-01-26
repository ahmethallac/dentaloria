import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star, MapPin, Phone, Clock, Award, Users } from "lucide-react";

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
  onClick
}: ClinicCardProps) => {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-medium hover:-translate-y-2 bg-card/80 backdrop-blur-sm border-border/50 cursor-pointer h-full flex flex-col" onClick={onClick}>
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isVerified && (
            <Badge variant="secondary" className="bg-medical-green text-white border-0">
              <Award className="w-3 h-3 mr-1" />
              Doğrulanmış
            </Badge>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
          <Star className="w-4 h-4 fill-trust-gold text-trust-gold" />
          <span className="text-sm font-semibold">{rating}</span>
          <span className="text-xs text-muted-foreground">({reviewCount})</span>
        </div>

        {/* Price Range */}
        <div className="absolute bottom-3 right-3">
          <Badge variant="outline" className="bg-white/90 text-primary border-primary/30">
            {priceRange}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 md:p-6 flex-1 flex flex-col">
        {/* Clinic Name */}
        <h3 className="text-base md:text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-1">
          {name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="text-xs md:text-sm line-clamp-1">{location}, {city}, {country}</span>
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1 md:gap-2 mb-4">
          {specialties.slice(0, 2).map((specialty, index) => (
            <Badge key={index} variant="secondary" className="text-[10px] md:text-xs line-clamp-1">
              {specialty}
            </Badge>
          ))}
          {specialties.length > 2 && (
            <Badge variant="outline" className="text-[10px] md:text-xs">
              +{specialties.length - 2}
            </Badge>
          )}
        </div>

        {/* Stats - push to bottom */}
        <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm mt-auto">
          <div className="flex items-center gap-1 md:gap-2">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
            <span className="text-muted-foreground truncate">{experience} yıl</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Users className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
            <span className="text-muted-foreground truncate">{patientCount}+ hasta</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 md:p-6 pt-0 space-x-2 md:space-x-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 group-hover:border-primary group-hover:text-primary transition-colors duration-300 text-xs md:text-sm"
        >
          <Phone className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">İletişim</span>
          <span className="sm:hidden">Ara</span>
        </Button>
        <Link to={`/clinic/${id}`} className="flex-1">
          <Button 
            size="sm" 
            className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 text-xs md:text-sm"
          >
            <span className="hidden sm:inline">Detayları Gör</span>
            <span className="sm:hidden">Detay</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};