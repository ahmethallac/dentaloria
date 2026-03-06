import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp, user, loading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && user) navigate('/add-clinic')
  }, [user, loading, navigate])

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', userType: 'clinic_admin' as const
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signIn(loginForm.email, loginForm.password)
      toast({ title: "Welcome back!", description: "Logged in successfully." })
      navigate('/add-clinic')
    } catch (error: any) {
      toast({ title: "Login Error", description: error.message || "An error occurred.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" })
      return
    }
    if (signupForm.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      await signUp(signupForm.email, signupForm.password, signupForm.fullName, signupForm.userType)
      await signIn(signupForm.email, signupForm.password)
      toast({ title: "Account created!", description: "You are now logged in." })
      setTimeout(() => {
        toast({ title: "Verify your email", description: "Check your inbox to verify your account." })
      }, 1000)
    } catch (error: any) {
      toast({ title: "Registration Error", description: error.message || "An error occurred.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <Card className="border-border/50 shadow-[var(--shadow-card)]">
          <CardHeader className="text-center pb-2">
            <img src="/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png" alt="Dentaloria" className="h-7 mx-auto mb-4" />
            <CardTitle className="text-xl font-bold">Welcome to Dentaloria</CardTitle>
            <CardDescription className="text-sm">
              Sign in to manage your clinic or create a new account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-5">
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="login" className="text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm">Email</Label>
                    <Input id="login-email" type="email" placeholder="you@example.com" value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))} required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm">Password</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} required className="h-10" />
                  </div>
                  <Button type="submit" className="w-full h-10 bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                    <Input id="signup-name" placeholder="Dr. John Smith" value={signupForm.fullName}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, fullName: e.target.value }))} required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">Email</Label>
                    <Input id="signup-email" type="email" placeholder="clinic@example.com" value={signupForm.email}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))} required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">Password</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={signupForm.password}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))} required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm">Confirm Password</Label>
                    <Input id="confirm-password" type="password" placeholder="••••••••" value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))} required className="h-10" />
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      This platform is for dental clinics. By registering, you confirm that you represent a dental clinic.
                    </p>
                  </div>
                  <Button type="submit" className="w-full h-10 bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Auth
