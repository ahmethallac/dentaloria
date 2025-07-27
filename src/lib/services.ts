import { supabase } from './supabase'
import type { 
  Clinic, 
  Country, 
  City, 
  Treatment, 
  TreatmentCategory, 
  Review, 
  ContactRequest,
  ClinicTreatment,
  Doctor 
} from './supabase'

// Mock data for when Supabase is not connected
const mockCountries: Country[] = [
  { id: '1', name: 'Turkey', code: 'TR', flag_url: '🇹🇷', created_at: new Date().toISOString() },
  { id: '2', name: 'Thailand', code: 'TH', flag_url: '🇹🇭', created_at: new Date().toISOString() },
  { id: '3', name: 'Mexico', code: 'MX', flag_url: '🇲🇽', created_at: new Date().toISOString() },
  { id: '4', name: 'India', code: 'IN', flag_url: '🇮🇳', created_at: new Date().toISOString() },
]

const mockCities: City[] = [
  { id: '1', name: 'Istanbul', country_id: '1', created_at: new Date().toISOString() },
  { id: '2', name: 'Antalya', country_id: '1', created_at: new Date().toISOString() },
  { id: '3', name: 'Bangkok', country_id: '2', created_at: new Date().toISOString() },
  { id: '4', name: 'Phuket', country_id: '2', created_at: new Date().toISOString() },
]

const mockTreatmentCategories: TreatmentCategory[] = [
  { id: '1', name: 'Dental', description: 'Dental treatments', icon: 'Tooth', created_at: new Date().toISOString() },
  { id: '2', name: 'Hair Transplant', description: 'Hair restoration', icon: 'Scissors', created_at: new Date().toISOString() },
  { id: '3', name: 'Plastic Surgery', description: 'Cosmetic surgery', icon: 'Sparkles', created_at: new Date().toISOString() },
]

const mockTreatments: Treatment[] = [
  { id: '1', name: 'Dental Implants', category_id: '1', description: 'Tooth replacement', created_at: new Date().toISOString() },
  { id: '2', name: 'Veneers', category_id: '1', description: 'Cosmetic enhancement', created_at: new Date().toISOString() },
  { id: '3', name: 'FUE Hair Transplant', category_id: '2', description: 'Hair restoration', created_at: new Date().toISOString() },
]

const mockClinics: Clinic[] = [
  {
    id: '1',
    name: 'Smile Center Turkey',
    description: 'Premium dental clinic in Turkey',
    address: 'Istanbul, Turkey',
    city_id: '1',
    phone: '+90 555 123 4567',
    email: 'info@smilecenter.com',
    website: 'www.smilecenter.com',
    rating: 4.8,
    review_count: 245,
    is_verified: true,
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_id: 'owner1',
    cities: { id: '1', name: 'Istanbul', country_id: '1', created_at: new Date().toISOString() },
    clinic_images: [{
      id: '1',
      clinic_id: '1',
      image_url: '/placeholder.jpg',
      is_primary: true,
      created_at: new Date().toISOString()
    }],
    clinic_treatments: [{
      id: '1',
      clinic_id: '1',
      treatment_id: '1',
      price_from: 3500,
      price_to: 5000,
      currency: 'EUR',
      duration_minutes: 120,
      is_active: true,
      created_at: new Date().toISOString(),
      treatments: mockTreatments[0]
    }]
  }
]

// Countries and Cities
export const getCountries = async (): Promise<Country[]> => {
  if (!supabase) {
    // Return mock data when Supabase is not connected
    return mockCountries;
  }
  
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

export const getCities = async (countryId?: string): Promise<City[]> => {
  if (!supabase) {
    // Return mock data when Supabase is not connected
    let cities = mockCities;
    if (countryId) {
      cities = cities.filter(city => city.country_id === countryId);
    }
    return cities;
  }
  
  let query = supabase
    .from('cities')
    .select(`
      *,
      countries (*)
    `)
    .order('name')
  
  if (countryId) {
    query = query.eq('country_id', countryId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Treatment Categories and Treatments
export const getTreatmentCategories = async (): Promise<TreatmentCategory[]> => {
  if (!supabase) {
    return mockTreatmentCategories;
  }
  
  const { data, error } = await supabase
    .from('treatment_categories')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

export const getTreatments = async (categoryId?: string): Promise<Treatment[]> => {
  if (!supabase) {
    let treatments = mockTreatments;
    if (categoryId) {
      treatments = treatments.filter(treatment => treatment.category_id === categoryId);
    }
    return treatments;
  }
  
  let query = supabase
    .from('treatments')
    .select(`
      *,
      treatment_categories (*)
    `)
    .order('name')
  
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Clinics
export const getClinics = async (filters?: {
  cityId?: string
  countryId?: string
  treatmentId?: string
  searchQuery?: string
  page?: number
  limit?: number
}): Promise<{ clinics: Clinic[], total: number }> => {
  if (!supabase) {
    // Return mock data when Supabase is not connected
    let filteredClinics = [...mockClinics];
    
    // Apply basic filtering for mock data
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredClinics = filteredClinics.filter(clinic => 
        clinic.name.toLowerCase().includes(query) ||
        (clinic.description && clinic.description.toLowerCase().includes(query))
      );
    }
    
    return {
      clinics: filteredClinics,
      total: filteredClinics.length
    };
  }
  
  let query = supabase
    .from('clinics')
    .select(`
      *,
      cities (
        *,
        countries (*)
      ),
      clinic_images (*),
      clinic_treatments (
        *,
        treatments (
          *,
          treatment_categories (*)
        )
      ),
      doctors (*)
    `, { count: 'exact' })
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false })
    .order('review_count', { ascending: false })
  
  // Apply filters
  if (filters?.cityId) {
    query = query.eq('city_id', filters.cityId)
  }
  
  if (filters?.countryId) {
    query = query.eq('cities.country_id', filters.countryId)
  }
  
  if (filters?.treatmentId) {
    query = query.eq('clinic_treatments.treatment_id', filters.treatmentId)
  }
  
  if (filters?.searchQuery) {
    query = query.or(`name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`)
  }
  
  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 12
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  query = query.range(from, to)
  
  const { data, error, count } = await query
  
  if (error) throw error
  
  return {
    clinics: data || [],
    total: count || 0
  }
}

export const getClinicById = async (id: string): Promise<Clinic | null> => {
  if (!supabase) {
    return mockClinics.find(clinic => clinic.id === id) || null;
  }
  
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      *,
      cities (
        *,
        countries (*)
      ),
      clinic_images (*),
      clinic_treatments (
        *,
        treatments (
          *,
          treatment_categories (*)
        )
      ),
      doctors (*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export const getFeaturedClinics = async (limit: number = 6): Promise<Clinic[]> => {
  if (!supabase) {
    return mockClinics.filter(clinic => clinic.is_featured).slice(0, limit);
  }
  
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      *,
      cities (
        *,
        countries (*)
      ),
      clinic_images (*),
      clinic_treatments (
        *,
        treatments (
          *,
          treatment_categories (*)
        )
      )
    `)
    .eq('is_featured', true)
    .order('rating', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

// Reviews
export const getClinicReviews = async (clinicId: string, page: number = 1, limit: number = 10): Promise<{ reviews: Review[], total: number }> => {
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, error, count } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles (*),
      treatments (*)
    `, { count: 'exact' })
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .range(from, to)
  
  if (error) throw error
  
  return {
    reviews: data || [],
    total: count || 0
  }
}

export const createReview = async (review: Omit<Review, 'id' | 'created_at' | 'updated_at'>): Promise<Review> => {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select(`
      *,
      profiles (*),
      treatments (*)
    `)
    .single()
  
  if (error) throw error
  return data
}

// Contact Requests
export const createContactRequest = async (request: Omit<ContactRequest, 'id' | 'created_at'>): Promise<ContactRequest> => {
  const { data, error } = await supabase
    .from('contact_requests')
    .insert(request)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Clinic Management (for clinic owners)
export const createClinic = async (clinic: Omit<Clinic, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count'>): Promise<Clinic> => {
  const { data, error } = await supabase
    .from('clinics')
    .insert(clinic)
    .select(`
      *,
      cities (
        *,
        countries (*)
      )
    `)
    .single()
  
  if (error) throw error
  return data
}

export const updateClinic = async (id: string, updates: Partial<Clinic>): Promise<Clinic> => {
  const { data, error } = await supabase
    .from('clinics')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      cities (
        *,
        countries (*)
      )
    `)
    .single()
  
  if (error) throw error
  return data
}

export const getUserClinics = async (userId: string): Promise<Clinic[]> => {
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      *,
      cities (
        *,
        countries (*)
      ),
      clinic_images (*),
      clinic_treatments (
        *,
        treatments (*)
      )
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Analytics and Stats
export const getPopularTreatments = async (limit: number = 10): Promise<Treatment[]> => {
  const { data, error } = await supabase
    .from('treatments')
    .select(`
      *,
      treatment_categories (*),
      clinic_treatments (count)
    `)
    .order('clinic_treatments.count', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

export const getTopRatedClinics = async (limit: number = 10): Promise<Clinic[]> => {
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      *,
      cities (
        *,
        countries (*)
      ),
      clinic_images (*)
    `)
    .gte('review_count', 5) // Only clinics with at least 5 reviews
    .order('rating', { ascending: false })
    .order('review_count', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}