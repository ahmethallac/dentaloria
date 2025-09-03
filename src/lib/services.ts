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
  is_published?: boolean
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

export interface ContactRequest {
  id: string
  clinic_id: string
  name: string
  email: string
  phone?: string
  message?: string
  status: string
  source?: string
  notes?: string
  created_at: string
  updated_at: string
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
  // Use clinics_public view for public access
  let query = supabase
    .from('clinics_public')
    .select('*', { count: 'exact' })
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false })
    .order('review_count', { ascending: false })
  
  // Apply filters
  if (filters?.cityId) {
    query = query.eq('city_id', filters.cityId)
  }
  
  if (filters?.countryId) {
    // For country filtering, we need to join with cities
    const { data: citiesInCountry } = await supabase
      .from('cities')
      .select('id')
      .eq('country_id', filters.countryId)
    
    if (citiesInCountry && citiesInCountry.length > 0) {
      const cityIds = citiesInCountry.map(c => c.id)
      query = query.in('city_id', cityIds)
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
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
  
  const { data: clinicsData, error, count } = await query
  
  if (error) throw error
  
  // If no clinics found, return empty result
  if (!clinicsData || clinicsData.length === 0) {
    return { clinics: [], total: count || 0 }
  }
  
  // Fetch related data separately
  const clinicIds = clinicsData.map(c => c.id)
  
  // Fetch cities with countries
  const { data: cities } = await supabase
    .from('cities')
    .select(`
      *,
      countries (*)
    `)
    .in('id', clinicsData.map(c => c.city_id).filter(Boolean))
  
  // Fetch clinic images
  const { data: images } = await supabase
    .from('clinic_images')
    .select('*')
    .in('clinic_id', clinicIds)
  
  // Fetch clinic treatments with treatment details
  const { data: treatments } = await supabase
    .from('clinic_treatments')
    .select(`
      *,
      treatments (
        *,
        treatment_categories (*)
      )
    `)
    .in('clinic_id', clinicIds)
  
  // Fetch doctors
  const { data: doctors } = await supabase
    .from('doctors')
    .select('*')
    .in('clinic_id', clinicIds)
  
  // Combine data
  const enrichedClinics = clinicsData.map(clinic => ({
    ...clinic,
    cities: cities?.find(c => c.id === clinic.city_id),
    clinic_images: images?.filter(img => img.clinic_id === clinic.id) || [],
    clinic_treatments: treatments?.filter(t => t.clinic_id === clinic.id) || [],
    doctors: doctors?.filter(d => d.clinic_id === clinic.id) || []
  }))
  
  return {
    clinics: enrichedClinics,
    total: count || 0
  }
}

export const getClinicByIdPrivate = async (id: string): Promise<Clinic | null> => {
  if (!supabase) {
    throw new Error('Database not available. Please connect Supabase.');
  }

  const { data, error } = await supabase
    .from('clinics')
    .select(`
      *,
      cities (
        name,
        countries (
          name
        )
      ),
      clinic_images (
        id,
        image_url,
        is_primary
      ),
      clinic_treatments (
        id,
        treatment_id,
        starting_price_euro,
        treatments (
          name,
          description
        )
      ),
      doctors (
        id,
        name,
        title,
        experience_years,
        profile_image_url
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching clinic by ID (private):', error);
    throw error;
  }

  return data as Clinic;
};

export const getClinicById = async (id: string): Promise<Clinic | null> => {
  // First try to get basic clinic data from public view
  const { data: clinicData, error } = await supabase
    .from('clinics_public')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  
  if (error) throw error
  if (!clinicData) return null
  
  // Fetch related data separately
  const [citiesData, imagesData, treatmentsData, doctorsData] = await Promise.all([
    // Fetch city with country
    supabase
      .from('cities')
      .select(`
        *,
        countries (*)
      `)
      .eq('id', clinicData.city_id)
      .maybeSingle(),
    
    // Fetch clinic images
    supabase
      .from('clinic_images')
      .select('*')
      .eq('clinic_id', id),
    
    // Fetch clinic treatments with treatment details
    supabase
      .from('clinic_treatments')
      .select(`
        *,
        treatments (
          *,
          treatment_categories (*)
        )
      `)
      .eq('clinic_id', id),
    
    // Fetch doctors
    supabase
      .from('doctors')
      .select('*')
      .eq('clinic_id', id)
  ])
  
  // Combine all data
  const enrichedClinic = {
    ...clinicData,
    cities: citiesData.data,
    clinic_images: imagesData.data || [],
    clinic_treatments: treatmentsData.data || [],
    doctors: doctorsData.data || []
  }
  
  return enrichedClinic
}

export const getFeaturedClinics = async (limit: number = 6): Promise<Clinic[]> => {
  // Use clinics_public view for public access
  const { data: clinicsData, error } = await supabase
    .from('clinics_public')
    .select('*')
    .eq('is_featured', true)
    .order('rating', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  if (!clinicsData || clinicsData.length === 0) return []
  
  // Fetch related data separately
  const clinicIds = clinicsData.map(c => c.id)
  
  const [citiesData, imagesData, treatmentsData] = await Promise.all([
    // Fetch cities with countries
    supabase
      .from('cities')
      .select(`
        *,
        countries (*)
      `)
      .in('id', clinicsData.map(c => c.city_id).filter(Boolean)),
    
    // Fetch clinic images
    supabase
      .from('clinic_images')
      .select('*')
      .in('clinic_id', clinicIds),
    
    // Fetch clinic treatments with treatment details
    supabase
      .from('clinic_treatments')
      .select(`
        *,
        treatments (
          *,
          treatment_categories (*)
        )
      `)
      .in('clinic_id', clinicIds)
  ])
  
  // Combine data
  const enrichedClinics = clinicsData.map(clinic => ({
    ...clinic,
    cities: citiesData.data?.find(c => c.id === clinic.city_id),
    clinic_images: imagesData.data?.filter(img => img.clinic_id === clinic.id) || [],
    clinic_treatments: treatmentsData.data?.filter(t => t.clinic_id === clinic.id) || []
  }))
  
  return enrichedClinics
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
export const getClinicReviews = async (clinicId: string, page: number = 1, limit: number = 10): Promise<{ reviews: any[], total: number }> => {
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

export const createReview = async (review: any): Promise<any> => {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Contact Requests
export const createContactRequest = async (
  request: Omit<ContactRequest, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: string }
): Promise<void> => {
  if (!supabase) {
    throw new Error('Database not available. Please connect Supabase.');
  }

  // Use secure edge function for contact requests with built-in abuse prevention
  const { data, error } = await supabase.functions.invoke('contact-clinic', {
    body: {
      clinicId: request.clinic_id,
      name: request.name,
      email: request.email,
      phone: request.phone,
      treatment: request.source,
      message: request.message
    }
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
}


// Klinik başvurularını listeleme (filtre + sayfalama)
export const getContactRequests = async (
  clinicId: string,
  opts?: { status?: 'new' | 'contacted' | 'completed' | 'all'; q?: string; page?: number; limit?: number }
): Promise<{ requests: ContactRequest[]; total: number }> => {
  const page = opts?.page ?? 1
  const limit = opts?.limit ?? 10
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('contact_requests')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.status && opts.status !== 'all') {
    query = query.eq('status', opts.status)
  }

  if (opts?.q && opts.q.trim().length > 0) {
    const q = opts.q.trim()
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    requests: data || [],
    total: count || 0
  }
}

// Başvuru güncelleme (durum, notlar vs.)
export const updateContactRequest = async (
  id: string,
  updates: Partial<Pick<ContactRequest, 'status' | 'notes'>>
): Promise<ContactRequest> => {
  const { data, error } = await supabase
    .from('contact_requests')
    .update({ ...updates })
    .eq('id', id)
    .select('*')
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
export const getPopularTreatments = async (limit: number = 10): Promise<any[]> => {
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
  // Use clinics_public view for public access
  const { data: clinicsData, error } = await supabase
    .from('clinics_public')
    .select('*')
    .gte('review_count', 5) // Only clinics with at least 5 reviews
    .order('rating', { ascending: false })
    .order('review_count', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  if (!clinicsData || clinicsData.length === 0) return []
  
  // Fetch related data separately
  const clinicIds = clinicsData.map(c => c.id)
  
  const [citiesData, imagesData] = await Promise.all([
    // Fetch cities with countries
    supabase
      .from('cities')
      .select(`
        *,
        countries (*)
      `)
      .in('id', clinicsData.map(c => c.city_id).filter(Boolean)),
    
    // Fetch clinic images
    supabase
      .from('clinic_images')
      .select('*')
      .in('clinic_id', clinicIds)
  ])
  
  // Combine data
  const enrichedClinics = clinicsData.map(clinic => ({
    ...clinic,
    cities: citiesData.data?.find(c => c.id === clinic.city_id),
    clinic_images: imagesData.data?.filter(img => img.clinic_id === clinic.id) || []
  }))
  
  return enrichedClinics
}

// Publish clinic with email verification check
export const publishClinic = async (clinicId: string): Promise<{ success: boolean; emailVerificationRequired?: boolean }> => {
  // Check if user's email is verified
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    throw new Error('User not authenticated')
  }
  
  // Check email verification status
  if (!user.email_confirmed_at) {
    return { success: false, emailVerificationRequired: true }
  }
  
  // Update clinic to published
  const { error } = await supabase
    .from('clinics')
    .update({ is_published: true })
    .eq('id', clinicId)
    .eq('user_id', user.id) // Ensure user owns this clinic
  
  if (error) throw error
  
  return { success: true }
}
