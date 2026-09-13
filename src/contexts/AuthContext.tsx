import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
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
  // Whose session is loaded right now. Supabase re-emits SIGNED_IN and
  // TOKEN_REFRESHED for the SAME user whenever the browser tab regains focus;
  // treating that as a fresh sign-in flipped `loading` on, which unmounted
  // every guarded page (admin, clinic panel) and threw away what was on
  // screen — it looked exactly like the page reloading.
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(async (user) => {
      userIdRef.current = user?.id ?? null
      setUser(user)
      if (user) {
        const role = await getCurrentUserRole()
        console.log('[AuthContext] Initial role fetched:', role, 'for user:', user.id)
        setUserRole(role)
      }
      setLoading(false)
    })

    // Listen for auth changes - NO ASYNC in callback to prevent deadlock
    const { data: { subscription } } = onAuthStateChange((authUser, event) => {
      if (authUser && authUser.id === userIdRef.current) {
        // Same person. Only a real profile change is worth refetching, and
        // even that happens quietly, without the loading screen.
        if (event === 'USER_UPDATED') {
          setTimeout(async () => setUser(await getCurrentUser()), 0)
        }
        return
      }
      userIdRef.current = authUser?.id ?? null
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
      // NOTE: clinic_admins used to be force-signed-out here until their
      // application was approved. Admin approval now only gates whether the
      // clinic's page goes live publicly — it no longer blocks the clinic
      // admin from signing in and using their own panel/onboarding wizard.
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