// @ts-nocheck
import { supabase } from '@/integrations/supabase/client'

// Define types based on our database schema
export interface Country {
  id: string
  name: string
  code: string
  flag_url?: string
  created_at: string
}

export interface City {
  id: string
  name: string
  country_id: string
  created_at: string
  countries?: Country
}

export interface TreatmentCategory {
  id: string
  name: string
  description?: string
  icon?: string
  created_at: string
}

export interface Treatment {
  id: string
  name: string
  category_id: string
  description?: string
  created_at: string
  treatment_categories?: TreatmentCategory
}

interface ClinicImage {
  id: string
  clinic_id: string
  image_url: string
  is_primary: boolean
  created_at: string
}

interface ClinicTreatment {
  id: string
  clinic_id: string
  treatment_id: string
  price_from?: number
  price_to?: number
  currency?: string
  duration_minutes?: number
  is_active: boolean
  created_at: string
  treatments?: Treatment
}

interface Doctor {
  id: string
  clinic_id: string
  name: string
  title?: string
  specialization?: string
  bio?: string
  image_url?: string
  experience_years?: number
  created_at: string
}

export interface Clinic {
  id: string
  name: string
  description?: string
  address: string
  city_id: string
  phone?: string
  email?: string
  website?: string
  rating: number
  review_count: number
  is_verified: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  owner_id?: string
  user_id?: string
  experience_years?: number
  patient_count?: number
  latitude?: number
  longitude?: number
  cities?: City & { countries?: Country }
  clinic_images?: ClinicImage[]
  clinic_treatments?: ClinicTreatment[]
  doctors?: Doctor[]
}

interface Review {
  id: string
  clinic_id: string
  user_id?: string
  treatment_id?: string
  rating: number
  comment?: string
  created_at: string
  updated_at: string
}

interface ContactRequest {
  id: string
  clinic_id: string
  name: string
  email: string
  phone?: string
  message?: string
  created_at: string
}

// Countries and Cities
export const getCountries = async (): Promise<Country[]> => {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

export const getCities = async (countryId?: string): Promise<City[]> => {
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
  const { data, error } = await supabase
    .from('treatment_categories')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

export const getTreatments = async (categoryId?: string): Promise<Treatment[]> => {
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
    // First get clinic IDs that offer this treatment
    const { data: clinicTreatments } = await supabase
      .from('clinic_treatments')
      .select('clinic_id')
      .eq('treatment_id', filters.treatmentId)
    
    if (clinicTreatments && clinicTreatments.length > 0) {
      const clinicIds = clinicTreatments.map(ct => ct.clinic_id)
      query = query.in('id', clinicIds)
    } else {
      // No clinics offer this treatment, return empty result
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
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
    .maybeSingle()
  
  if (error) throw error
  return data
}

export const getFeaturedClinics = async (limit: number = 6): Promise<Clinic[]> => {
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

// Trustpilot integration helper
export const fetchTrustpilotRating = async (trustpilotUrl: string): Promise<number | null> => {
  try {
    // For now, return a mock rating since Trustpilot API requires complex setup
    // In production, you would implement actual Trustpilot API integration
    const mockRating = Math.random() * 2 + 3; // Random rating between 3-5
    return parseFloat(mockRating.toFixed(1));
  } catch (error) {
    console.error('Error fetching Trustpilot rating:', error);
    return null;
  }
};

// Reviews
export const getClinicReviews = async (clinicId: string, page: number = 1, limit: number = 10): Promise<{ reviews: Review[], total: number }> => {
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, error, count } = await supabase
    .from('reviews')
    .select('*', { count: 'exact' })
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
    .select()
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
    .eq('user_id', userId)
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
      treatment_categories (*)
    `)
    .order('created_at', { ascending: false })
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