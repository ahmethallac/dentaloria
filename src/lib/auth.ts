import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from './supabase'

export interface AuthUser extends User {
  profile?: Profile
}

// Auth functions
export const signUp = async (email: string, password: string, fullName: string, userType: 'patient' | 'clinic_admin' = 'patient') => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        user_type: userType
      }
    }
  })
  
  if (error) throw error
  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) return null
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return {
    ...user,
    profile
  }
}

export const updateProfile = async (updates: Partial<Profile>) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Auth state management
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser()
      callback(user)
    } else {
      callback(null)
    }
  })
}