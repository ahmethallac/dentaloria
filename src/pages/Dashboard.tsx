import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getUserClinics } from '@/lib/services'
import type { Clinic } from '@/lib/services'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { withLocalePrefix } from '@/lib/localePath'

const Dashboard = () => {
  const { user, profile, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { lang } = useParams()
  const { t } = useTranslation('dashboard')
  const { toast } = useToast()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate(withLocalePrefix('/auth', lang), { replace: true })
      return
    }

    console.log('[Dashboard] Role resolved:', userRole)

    if (userRole === 'admin' || userRole === 'sub_admin') {
      navigate(withLocalePrefix('/admin', lang), { replace: true })
      return
    }

    loadData()
  }, [user, authLoading, userRole])

  const loadData = async () => {
    if (!user) return
    try {
      const userClinics = await getUserClinics(user.id)
      setClinics(userClinics)

      // Check approval status for first clinic
      if (userClinics.length > 0) {
        const clinic = userClinics[0]
        setApprovalStatus((clinic as any).approval_status || 'pending')

        // If approved, redirect directly to clinic panel
        if ((clinic as any).approval_status === 'approved') {
          navigate(withLocalePrefix(`/clinic/${clinic.id}/panel`, lang))
          return
        }
      }
    } catch (e: any) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const clinic = clinics[0]

  // No clinic associated — should not normally happen since registration is clinic-first.
  if (!clinic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">{t('noClinic.title')}</h2>
            <p className="text-muted-foreground">
              {t('noClinic.description')}
            </p>
            <Button onClick={() => navigate(withLocalePrefix('/register-clinic', lang))} className="w-full">
              {t('noClinic.cta')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show approval status
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Building2 className="w-12 h-12 mx-auto text-primary mb-2" />
          <CardTitle>{(clinic as any).display_name || clinic.name}</CardTitle>
          <CardDescription>{t('status.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {approvalStatus === 'pending' && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center space-y-2">
              <Clock className="w-10 h-10 text-yellow-500 mx-auto" />
              <h3 className="font-semibold text-yellow-600">{t('status.pendingTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('status.pendingDesc')}
              </p>
            </div>
          )}
          {approvalStatus === 'rejected' && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center space-y-2">
              <XCircle className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="font-semibold text-red-600">{t('status.rejectedTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('status.rejectedDesc')}
              </p>
            </div>
          )}
          {approvalStatus === 'approved' && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <h3 className="font-semibold text-green-600">{t('status.approvedTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('status.approvedDesc')}</p>
              <Button onClick={() => navigate(withLocalePrefix(`/clinic/${clinic.id}/panel`, lang))} className="w-full mt-2">
                {t('status.goToPanel')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
