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