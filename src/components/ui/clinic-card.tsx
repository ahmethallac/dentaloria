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
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-medium hover:-translate-y-2 bg-card/80 backdrop-blur-sm border-border/50 cursor-pointer" onClick={onClick}>
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

      <CardContent className="p-6">
        {/* Clinic Name */}
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">
          {name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{location}, {city}, {country}</span>
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-2 mb-4">
          {specialties.slice(0, 3).map((specialty, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {specialty}
            </Badge>
          ))}
          {specialties.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{specialties.length - 3} daha
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{experience} yıl deneyim</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{patientCount}+ hasta</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 space-x-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 group-hover:border-primary group-hover:text-primary transition-colors duration-300"
        >
          <Phone className="w-4 h-4 mr-2" />
          İletişim
        </Button>
        <Link to={`/clinic/${id}`} className="flex-1">
          <Button 
            size="sm" 
            className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300"
          >
            Detayları Gör
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};