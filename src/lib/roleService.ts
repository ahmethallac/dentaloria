import { supabase } from '@/integrations/supabase/client'

export type AppRole = 'patient' | 'clinic_admin' | 'admin' | 'sub_admin'

export interface UserRole {
  id: string
  user_id: string
  role: AppRole
  created_at: string
  created_by?: string
}

// Role management functions
export const getUserRoles = async (userId: string): Promise<UserRole[]> => {
  if (!supabase) {
    throw new Error('Database not available. Please connect Supabase.');
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

export const getCurrentUserRole = async (): Promise<AppRole | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_current_user_role')
  
  if (error) {
    console.error('Failed to get user role:', error)
    return null
  }
  
  return data as AppRole
}

export const hasRole = async (userId: string, role: AppRole): Promise<boolean> => {
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: role as any
  })

  if (error) {
    console.error('Failed to check role:', error)
    return false
  }

  return data === true
}

export const addUserRole = async (userId: string, role: AppRole): Promise<UserRole> => {
  if (!supabase) {
    throw new Error('Database not available. Please connect Supabase.');
  }

  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: role as any,
      created_by: user?.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const removeUserRole = async (userId: string, role: AppRole): Promise<void> => {
  if (!supabase) {
    throw new Error('Database not available. Please connect Supabase.');
  }

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role)

  if (error) throw error
}

// Utility functions for common role checks
export const isClinicAdmin = async (userId: string): Promise<boolean> => {
  return hasRole(userId, 'clinic_admin')
}

export const isAdmin = async (userId: string): Promise<boolean> => {
  return hasRole(userId, 'admin')
}

export const isCurrentUserClinicAdmin = async (): Promise<boolean> => {
  const role = await getCurrentUserRole()
  return role === 'clinic_admin' || role === 'admin' || role === 'sub_admin'
}

export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const role = await getCurrentUserRole()
  return role === 'admin' || role === 'sub_admin'
}