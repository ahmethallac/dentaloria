import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Temporary fallback for development - remove this when Supabase is properly connected
const isDevelopment = !supabaseUrl || !supabaseAnonKey

if (isDevelopment) {
  console.warn('Supabase environment variables not found. Using mock mode.')
}

export const supabase = isDevelopment 
  ? null 
  : createClient(supabaseUrl, supabaseAnonKey)

// Database types
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

export interface Profile {
  id: string
  updated_at: string
  username?: string
  full_name?: string
  avatar_url?: string
  user_type: 'patient' | 'clinic_admin'
}

export interface Clinic {
  id: string
  name: string
  description?: string
  address?: string
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
  owner_id: string
  cities?: City
  clinic_images?: ClinicImage[]
  clinic_treatments?: ClinicTreatment[]
  doctors?: Doctor[]
}

export interface ClinicImage {
  id: string
  clinic_id: string
  image_url: string
  is_primary: boolean
  alt_text?: string
  created_at: string
}

export interface ClinicTreatment {
  id: string
  clinic_id: string
  treatment_id: string
  price_from?: number
  price_to?: number
  currency: string
  duration_minutes?: number
  description?: string
  is_active: boolean
  created_at: string
  treatments?: Treatment
}

export interface Doctor {
  id: string
  clinic_id: string
  name: string
  title?: string
  specialization?: string
  experience_years?: number
  education?: string
  languages?: string[]
  image_url?: string
  bio?: string
  is_active: boolean
  created_at: string
}

export interface Review {
  id: string
  clinic_id: string
  user_id: string
  rating: number
  title?: string
  comment?: string
  treatment_id?: string
  is_verified: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
  treatments?: Treatment
}

export interface ContactRequest {
  id: string
  clinic_id: string
  user_id?: string
  name: string
  email: string
  phone?: string
  message: string
  treatment_interest?: string
  status: 'pending' | 'contacted' | 'completed'
  created_at: string
}

export interface Booking {
  id: string
  clinic_id: string
  user_id: string
  doctor_id?: string
  treatment_id?: string
  appointment_date?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  created_at: string
  updated_at: string
  clinics?: Clinic
  doctors?: Doctor
  treatments?: Treatment
}