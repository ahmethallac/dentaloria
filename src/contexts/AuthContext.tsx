import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
import { getCurrentUser, onAuthStateChange, signIn, signUp, signOut } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'
import { getCurrentUserRole, type AppRole } from '@/lib/roleService'

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  userRole: AppRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, userType?: 'patient' | 'clinic_admin') => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [userRole, setUserRole] = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(async (user) => {
      setUser(user)
      if (user) {
        const role = await getCurrentUserRole()
        console.log('[AuthContext] Initial role fetched:', role, 'for user:', user.id)
        setUserRole(role)
      }
      setLoading(false)
    })

    // Listen for auth changes - NO ASYNC in callback to prevent deadlock
    const { data: { subscription } } = onAuthStateChange((authUser) => {
      console.log('Auth state changed:', authUser)
      if (authUser) {
        // Simple state update - fetch profile separately
        setUser(authUser as AuthUser)
        // Fetch profile and role data separately to avoid deadlock
        // Keep loading true until role is fetched
        setLoading(true)
        setTimeout(async () => {
          const [fullUser, role] = await Promise.all([
            getCurrentUser(),
            getCurrentUserRole()
          ])
          setUser(fullUser)
          setUserRole(role)
          setLoading(false)
        }, 0)
      } else {
        setUser(null)
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signIn(email, password)
      // Pending-approval gate: clinic_admins can only sign in once approved
      const { supabase } = await import('@/integrations/supabase/client')
      const { data: { user: signedIn } } = await supabase.auth.getUser()
      if (signedIn) {
        const { data: roleRow } = await supabase
          .from('user_roles').select('role').eq('user_id', signedIn.id)
        const roles = (roleRow || []).map((r: any) => r.role)
        const isAdmin = roles.includes('admin') || roles.includes('sub_admin')
        if (!isAdmin && roles.includes('clinic_admin')) {
          const { data: clinic } = await supabase
            .from('clinics').select('approval_status, deleted_at')
            .eq('user_id', signedIn.id).maybeSingle()
          if (!clinic || clinic.deleted_at || clinic.approval_status !== 'approved') {
            await signOut()
            throw new Error('Your clinic registration is awaiting Super Admin approval.')
          }
        }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const handleSignUp = async (email: string, password: string, fullName: string, userType: 'patient' | 'clinic_admin' = 'patient') => {
    try {
      await signUp(email, password, fullName, userType)
      // User will be set through the auth state change listener
    } catch (error) {
      throw error
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setUser(null)
      setUserRole(null)
    } catch (error) {
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    profile: user?.profile || null,
    userRole,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}