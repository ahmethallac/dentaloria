import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Upload, FileText, CheckCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp, user, loading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard')
    }
  }, [user, loading, navigate])

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    clinicName: '',
    email: '',
    password: '',
    confirmPassword: '',
    taxCertificate: null as File | null,
    healthTourismDoc: null as File | null,
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signIn(loginForm.email, loginForm.password)
      toast({ title: "Success!", description: "Logged in successfully." })
      navigate('/dashboard')
    } catch (error: any) {
      toast({ title: "Login Error", description: error.message || "An error occurred during login.", variant: "destructive" })
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
      toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" })
      return
    }
    if (!signupForm.taxCertificate || !signupForm.healthTourismDoc) {
      toast({ title: "Error", description: "Please upload both required documents.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      // 1. Sign up the user
      await signUp(signupForm.email, signupForm.password, signupForm.clinicName, 'clinic_admin')
      
      // 2. Auto-login
      await signIn(signupForm.email, signupForm.password)

      // 3. Get user for file uploads
      const { data: { user: newUser } } = await supabase.auth.getUser()
      if (!newUser) throw new Error('Registration failed')

      // 4. Get a default city_id
      const { data: defaultCity } = await supabase.from('cities').select('id').limit(1).single()
      const cityId = defaultCity?.id || 'a21f2467-a997-445e-8379-dfada7b12c09'

      // 5. Create the clinic (pending approval)
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: signupForm.clinicName.toUpperCase(),
          email: signupForm.email,
          user_id: newUser.id,
          city_id: cityId,
          is_published: false,
          approval_status: 'pending'
        })
        .select()
        .single()

      if (clinicError) throw clinicError

      // 5. Upload documents
      const uploadDoc = async (file: File, docType: string) => {
        const filePath = `${newUser.id}/${clinicData.id}/${docType}-${Date.now()}.${file.name.split('.').pop()}`
        const { error } = await supabase.storage.from('clinic-documents').upload(filePath, file)
        if (error) throw error
        return filePath
      }

      const [taxUrl, healthUrl] = await Promise.all([
        uploadDoc(signupForm.taxCertificate!, 'tax-certificate'),
        uploadDoc(signupForm.healthTourismDoc!, 'health-tourism-doc'),
      ])

      // 6. Create approval record
      const { error: approvalError } = await supabase
        .from('clinic_approvals')
        .insert({
          clinic_id: clinicData.id,
          status: 'pending',
          tax_certificate_url: taxUrl,
          health_tourism_doc_url: healthUrl,
        })

      if (approvalError) throw approvalError

      // 7. Send approval request email (via edge function)
      await supabase.functions.invoke('send-approval-request', {
        body: {
          clinicId: clinicData.id,
          clinicName: signupForm.clinicName.toUpperCase(),
          clinicEmail: signupForm.email,
        }
      })

      toast({
        title: "Registration Successful!",
        description: "Your clinic registration is pending approval. You'll be notified once reviewed."
      })

      navigate('/dashboard')
    } catch (error: any) {
      console.error('Signup error:', error)
      toast({ title: "Registration Error", description: error.message || "An error occurred.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Dentaloria</CardTitle>
          <CardDescription>
            Sign in or register your dental clinic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register Clinic</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="clinic@example.com" value={loginForm.email} onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-clinic">Clinic Name</Label>
                  <Input id="signup-clinic" placeholder="DENTAL CLINIC NAME" value={signupForm.clinicName} onChange={(e) => setSignupForm(prev => ({ ...prev, clinicName: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="clinic@example.com" value={signupForm.email} onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={signupForm.password} onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" placeholder="••••••••" value={signupForm.confirmPassword} onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))} required />
                </div>

                {/* Document Uploads */}
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Required Documents</p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tax-cert" className="text-sm flex items-center gap-2">
                      {signupForm.taxCertificate ? <CheckCircle className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4" />}
                      Tax Certificate
                    </Label>
                    <Input 
                      id="tax-cert" 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png" 
                      onChange={(e) => setSignupForm(prev => ({ ...prev, taxCertificate: e.target.files?.[0] || null }))} 
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="health-doc" className="text-sm flex items-center gap-2">
                      {signupForm.healthTourismDoc ? <CheckCircle className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4" />}
                      Health Tourism Authorization
                    </Label>
                    <Input 
                      id="health-doc" 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png" 
                      onChange={(e) => setSignupForm(prev => ({ ...prev, healthTourismDoc: e.target.files?.[0] || null }))} 
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    By registering, you confirm that you represent a dental clinic. Your registration will be reviewed before activation.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register Clinic
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Auth
