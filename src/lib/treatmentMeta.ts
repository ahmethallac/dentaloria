import {
  Gem,
  Sun,
  Scissors,
  Smile,
  SmilePlus,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import allOn4Image from "@/assets/treatments/all-on-4.jpeg";
import allOn6Image from "@/assets/treatments/all-on-6.webp";
import singleImplantImage from "@/assets/treatments/single-implant.jpeg";
import compositeBondingImage from "@/assets/treatments/composite-bonding.webp";
import laminateVeneerImage from "@/assets/treatments/laminate-veneer.webp";
import zirconiumCrownImage from "@/assets/treatments/zirconium-crown.jpeg";

// Only treatments Ahmet gave a real photo for get a photo treatment anywhere
// in the app (homepage showcase, dedicated Treatments page) — everything
// else stays a normal filterable/searchable/priceable treatment, just shown
// with a relevant icon instead of a photo.
export const HOMEPAGE_SHOWCASE_TREATMENTS = [
  "All-on-4 Dental Implants",
  "All-on-6 Dental Implants",
  "Single Tooth Implant",
  "Composite Bonding",
  "Laminate Veneer",
  "Zirconium Crown",
];

// Real photos representing each treatment category, shown inside the circle
// avatars. The implant/bonding/veneer/crown photos are the exact ones Ahmet
// picked; whitening/braces/wisdom stay as the previously-verified
// free-license Unsplash photos.
const TREATMENT_IMAGES = {
  allOn4: allOn4Image,
  allOn6: allOn6Image,
  singleImplant: singleImplantImage,
  bonding: compositeBondingImage,
  laminateVeneer: laminateVeneerImage,
  zirconiumCrown: zirconiumCrownImage,
  whitening: "https://images.unsplash.com/photo-1677026010083-78ec7f1b84ed?w=200&h=200&fit=crop&q=80",
  porcelainVeneer: "https://images.unsplash.com/photo-1660737217679-6ddd9768654a?w=200&h=200&fit=crop&q=80",
  invisalign: "https://images.unsplash.com/photo-1694675236489-d73651370688?w=200&h=200&fit=crop&q=80",
  braces: "https://images.unsplash.com/photo-1598256989809-394fa4f6cd26?w=200&h=200&fit=crop&q=80",
  wisdom: "https://images.unsplash.com/photo-1522849696084-818b29dfe210?w=200&h=200&fit=crop&q=80",
} as const;

// Helper function to get a treatment-specific real photo
export const getTreatmentImage = (treatmentName: string): string => {
  const name = treatmentName.toLowerCase();

  if (name.includes('invisalign') || name.includes('aligner')) return TREATMENT_IMAGES.invisalign;
  if (name.includes('brace') || name.includes('orthodontic')) return TREATMENT_IMAGES.braces;
  if (name.includes('all-on-4')) return TREATMENT_IMAGES.allOn4;
  if (name.includes('all-on-6')) return TREATMENT_IMAGES.allOn6;
  if (name.includes('single tooth') || name.includes('single implant')) return TREATMENT_IMAGES.singleImplant;
  if (name.includes('implant')) return TREATMENT_IMAGES.allOn4;
  if (name.includes('whitening') || name.includes('bleach')) return TREATMENT_IMAGES.whitening;
  if (name.includes('laminate')) return TREATMENT_IMAGES.laminateVeneer;
  if (name.includes('veneer') || name.includes('smile') || name.includes('makeover')) return TREATMENT_IMAGES.porcelainVeneer;
  if (name.includes('zirconium') || name.includes('crown') || name.includes('cap') || name.includes('filling') || name.includes('restoration')) return TREATMENT_IMAGES.zirconiumCrown;
  if (name.includes('wisdom') || name.includes('extraction') || name.includes('removal')) return TREATMENT_IMAGES.wisdom;
  if (name.includes('bonding') || name.includes('root canal') || name.includes('endodontic')) return TREATMENT_IMAGES.bonding;
  if (name.includes('cleaning') || name.includes('hygiene') || name.includes('prophylaxis')) return TREATMENT_IMAGES.whitening;

  // Default for anything else
  return TREATMENT_IMAGES.zirconiumCrown;
};

// Icon shown for treatments that don't have a real photo (see
// HOMEPAGE_SHOWCASE_TREATMENTS above) — keyword-matched the same way as
// getTreatmentImage so any future treatment added to the DB gets a sensible
// icon automatically, with no code change required.
export const getTreatmentIcon = (treatmentName: string): LucideIcon => {
  const name = treatmentName.toLowerCase();

  if (name.includes('whitening') || name.includes('bleach')) return Sun;
  if (name.includes('wisdom') || name.includes('extraction') || name.includes('removal') || name.includes('surgery')) return Scissors;
  if (name.includes('invisalign') || name.includes('aligner')) return SmilePlus;
  if (name.includes('brace') || name.includes('orthodontic')) return Smile;
  if (name.includes('veneer') || name.includes('crown') || name.includes('makeover')) return Gem;

  return Sparkles;
};
