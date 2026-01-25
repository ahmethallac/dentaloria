import { useQuery } from "@tanstack/react-query";
import { getClinics } from "@/lib/services";

// Import clinic images as defaults
import clinic1 from "@/assets/clinic-1.jpg";
import clinic2 from "@/assets/clinic-2.jpg";
import clinic3 from "@/assets/clinic-3.jpg";
import clinic4 from "@/assets/clinic-4.jpg";
import clinic5 from "@/assets/clinic-5.jpg";
import clinic6 from "@/assets/clinic-6.jpg";
import clinic7 from "@/assets/clinic-7.jpg";
import clinic8 from "@/assets/clinic-8.jpg";
import clinic9 from "@/assets/clinic-9.jpg";
import clinic10 from "@/assets/clinic-10.jpg";

const defaultImages = [clinic1, clinic2, clinic3, clinic4, clinic5, clinic6, clinic7, clinic8, clinic9, clinic10];

interface UseClinicSearchParams {
  treatmentId?: string;
  countryId?: string;
  cityId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

// Helper to check if a string is a valid UUID
const isUUID = (val: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val);

export function useClinicSearch({
  treatmentId,
  countryId,
  cityId,
  page = 1,
  limit = 12,
  enabled = true,
}: UseClinicSearchParams) {
  // Don't query if we have non-UUID filter values (URL contains names that haven't been resolved yet)
  const hasValidFilters = 
    (!countryId || countryId === "all" || isUUID(countryId)) &&
    (!cityId || cityId === "all" || isUUID(cityId)) &&
    (!treatmentId || treatmentId === "all" || isUUID(treatmentId));

  return useQuery({
    queryKey: [
      "clinics",
      {
        treatmentId: treatmentId === "all" ? undefined : treatmentId,
        countryId: countryId === "all" ? undefined : countryId,
        cityId: cityId === "all" ? undefined : cityId,
        page,
        limit,
      },
    ],
    queryFn: async () => {
      const filters: {
        treatmentId?: string;
        countryId?: string;
        cityId?: string;
        page: number;
        limit: number;
      } = { page, limit };

      if (treatmentId && treatmentId !== "all") {
        filters.treatmentId = treatmentId;
      }
      if (countryId && countryId !== "all") {
        filters.countryId = countryId;
      }
      if (cityId && cityId !== "all") {
        filters.cityId = cityId;
      }

      const { clinics, total } = await getClinics(filters);

      // Add default images to clinics without images
      const clinicsWithImages = clinics.map((clinic, index) => ({
        ...clinic,
        clinic_images: clinic.clinic_images?.length
          ? clinic.clinic_images
          : [
              {
                id: `default-${clinic.id}`,
                clinic_id: clinic.id,
                image_url: defaultImages[index % defaultImages.length],
                is_primary: true,
                created_at: clinic.created_at,
              },
            ],
      }));

      return { clinics: clinicsWithImages, total };
    },
    enabled: enabled && hasValidFilters,
    staleTime: 5 * 60 * 1000, // 5 minutes - use cached data without refetching
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory
    placeholderData: (previousData) => previousData, // Keep showing previous results while loading new ones
  });
}
