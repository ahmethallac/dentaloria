import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { withLocalePrefix } from '@/lib/localePath'

const ResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()
  const { lang } = useParams()
  const { t } = useTranslation('auth')
  const { toast } = useToast()

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event Supabase emits when the user
    // lands on this page via a recovery email link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoverySession(true)
      }
    })

    // Also check existing session in case the event fired before mount.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const hash = window.location.hash || ''
      const isRecovery = hash.includes('type=recovery') || !!session
      setHasRecoverySession((prev) => prev ?? (isRecovery && !!session))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast({ title: t('resetPassword.errorTitle'), description: t('resetPassword.tooShort'), variant: "destructive" })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: t('resetPassword.errorTitle'), description: t('resetPassword.mismatch'), variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      toast({ title: t('resetPassword.successTitle'), description: t('resetPassword.successDesc') })
      await supabase.auth.signOut()
      navigate(withLocalePrefix('/auth', lang), { replace: true })
    } catch (error: any) {
      toast({ title: t('resetPassword.errorTitle'), description: error.message || t('resetPassword.genericError'), variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t('resetPassword.title')}</CardTitle>
          <CardDescription>
            {hasRecoverySession === false
              ? t('resetPassword.invalidLink')
              : t('resetPassword.enterNew')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRecoverySession === false ? (
            <Button className="w-full" onClick={() => navigate(withLocalePrefix('/auth', lang), { replace: true })}>
              {t('resetPassword.backToSignIn')}
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('resetPassword.newPasswordLabel')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">{t('resetPassword.confirmPasswordLabel')}</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || hasRecoverySession === null}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('resetPassword.updateButton')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate(withLocalePrefix('/auth', lang), { replace: true })}
              >
                {t('resetPassword.backToSignIn')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
