import {
  Plane,
  Hotel,
  UserRound,
  Map,
  ShieldCheck,
  CreditCard,
  Pill,
  Salad,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export interface LanguageMeta {
  code: string;
  name: string;
  flag: string; // Unicode flag emoji
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "ro", name: "Romanian", flag: "🇷🇴" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
];

export const getLanguage = (code: string): LanguageMeta | undefined =>
  LANGUAGES.find((l) => l.code === code);

export interface FacilityMeta {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const FACILITIES: FacilityMeta[] = [
  { key: "airport_transfer", label: "Airport Transfer", icon: Plane },
  { key: "hotel_accommodation", label: "Hotel Accommodation", icon: Hotel },
  { key: "patient_coordinator", label: "Personal Patient Coordinator", icon: UserRound },
  { key: "city_tours", label: "City Tours", icon: Map },
  { key: "insurance", label: "Insurance", icon: ShieldCheck },
  { key: "installment_plan", label: "Installment Payment Plan", icon: CreditCard },
  { key: "medication_supply", label: "Medication & Medical Supplies", icon: Pill },
  { key: "dietitian", label: "Dietitian", icon: Salad },
  { key: "local_sim", label: "Local SIM Card Support", icon: Smartphone },
];

export const getFacility = (key: string): FacilityMeta | undefined =>
  FACILITIES.find((f) => f.key === key);

// For listing cards: prioritize hotel + airport transfer first, then keep stored order.
export const sortFacilitiesForCard = (keys: string[]): string[] => {
  const priority = ["hotel_accommodation", "airport_transfer"];
  const head = priority.filter((k) => keys.includes(k));
  const tail = keys.filter((k) => !priority.includes(k));
  return [...head, ...tail];
};
