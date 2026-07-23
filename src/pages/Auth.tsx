import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { withLocalePrefix } from '@/lib/localePath'
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
  const { signIn, signUp, user, userRole, loading } = useAuth()
  const navigate = useNavigate()
  const { lang } = useParams()
  const { t } = useTranslation('auth')
  const { toast } = useToast()

  useEffect(() => {
    if (loading) return
    if (!user) return

    console.log('[Auth] User loaded, role:', userRole)

    if (userRole === 'admin' || userRole === 'sub_admin') {
      console.log('[Auth] Admin/sub_admin detected, redirecting to /admin')
      navigate(withLocalePrefix('/admin', lang), { replace: true })
    } else {
      navigate(withLocalePrefix('/dashboard', lang), { replace: true })
    }
  }, [user, userRole, loading, navigate, lang])

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) return
    setIsLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      toast({
        title: t('forgot.checkInboxTitle'),
        description: t('forgot.checkInboxDesc'),
      })
      setShowForgot(false)
      setForgotEmail('')
    } catch (error: any) {
      toast({
        title: t('forgot.checkInboxTitle'),
        description: t('forgot.checkInboxDesc'),
      })
    } finally {
      setIsLoading(false)
    }
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signIn(loginForm.email, loginForm.password)
      toast({ title: t('login.successTitle'), description: t('login.successDesc') })
    } catch (error: any) {
      toast({ title: t('login.errorTitle'), description: error.message || t('login.errorDescDefault'), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t('cardTitle')}</CardTitle>
          <CardDescription>
            {t('cardDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('tabs.login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('tabs.signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {showForgot ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">{t('forgot.emailLabel')}</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder={t('forgot.emailPlaceholder')}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('forgot.hint')}
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('forgot.sendLink')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowForgot(false)}
                  >
                    {t('forgot.backToSignIn')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('login.emailLabel')}</Label>
                    <Input id="login-email" type="email" placeholder={t('forgot.emailPlaceholder')} value={loginForm.email} onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">{t('login.passwordLabel')}</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginForm.email)
                          setShowForgot(true)
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        {t('login.forgotPassword')}
                      </button>
                    </div>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('login.signIn')}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('signup.description')}
                </p>
                <Button className="w-full" onClick={() => navigate(withLocalePrefix('/register-clinic', lang))}>
                  {t('signup.cta')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Auth
