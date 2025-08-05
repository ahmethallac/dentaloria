import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
import { getCurrentUser, onAuthStateChange, signIn, signUp, signOut } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (user) => {
      console.log('Auth state changed:', user)
      if (user) {
        // Get fresh user data with profile
        const freshUser = await getCurrentUser()
        setUser(freshUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signIn(email, password)
      // Don't manually set user here - let onAuthStateChange handle it
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
    } catch (error) {
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    profile: user?.profile || null,
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