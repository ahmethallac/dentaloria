import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })

  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'patient' as 'patient' | 'clinic_admin'
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signIn(loginForm.email, loginForm.password)
      toast({
        title: "Başarılı!",
        description: "Giriş yapıldı."
      })
      navigate('/')
    } catch (error: any) {
      toast({
        title: "Giriş Hatası",
        description: error.message || "Giriş yapılırken bir hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor.",
        variant: "destructive"
      })
      return
    }

    if (signupForm.password.length < 6) {
      toast({
        title: "Hata", 
        description: "Şifre en az 6 karakter olmalıdır.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      await signUp(signupForm.email, signupForm.password, signupForm.fullName, signupForm.userType)
      toast({
        title: "Başarılı!",
        description: "Hesabınız oluşturuldu. Giriş yapabilirsiniz."
      })
      // Reset form
      setSignupForm({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        userType: 'patient'
      })
    } catch (error: any) {
      toast({
        title: "Kayıt Hatası",
        description: error.message || "Kayıt olurken bir hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Medical Tourism</CardTitle>
          <CardDescription>
            Hesabınıza giriş yapın veya yeni hesap oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Giriş Yap</TabsTrigger>
              <TabsTrigger value="signup">Kayıt Ol</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Şifre</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Giriş Yap
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Ad Soyad</Label>
                  <Input
                    id="signup-name"
                    placeholder="Ad Soyad"
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Şifre</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Şifre Tekrar</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label>Hesap Türü</Label>
                  <RadioGroup
                    value={signupForm.userType}
                    onValueChange={(value: 'patient' | 'clinic_admin') => 
                      setSignupForm(prev => ({ ...prev, userType: value }))
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="patient" id="patient" />
                      <Label htmlFor="patient">Hasta</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="clinic_admin" id="clinic_admin" />
                      <Label htmlFor="clinic_admin">Klinik Sahibi</Label>
                    </div>
                  </RadioGroup>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kayıt Ol
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