import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { getUserClinics } from '@/lib/services'
import { withLocalePrefix } from '@/lib/localePath'

// Pure traffic-cop page: no clinic yet or profile still incomplete → the
// onboarding wizard; otherwise straight into the clinic panel. Admin review
// (approval_status) only ever gates public visibility, never this redirect —
// clinic admins can use their panel while an application is pending.
const Dashboard = () => {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { lang } = useParams()
  const { t } = useTranslation('dashboard')
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate(withLocalePrefix('/auth', lang), { replace: true })
      return
    }

    if (userRole === 'admin' || userRole === 'sub_admin') {
      navigate(withLocalePrefix('/admin', lang), { replace: true })
      return
    }

    (async () => {
      try {
        const userClinics = await getUserClinics(user.id)
        const clinic = userClinics[0]
        if (!clinic || (clinic as any).page_status === 'incomplete') {
          navigate(withLocalePrefix('/register-clinic', lang), { replace: true })
          return
        }
        navigate(withLocalePrefix(`/clinic/${clinic.id}/panel`, lang), { replace: true })
      } catch (e) {
        console.error('Dashboard load error:', e)
        setLoadError(true)
      }
    })()
  }, [user, authLoading, userRole])

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        {t('loadError')}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}

export default Dashboard
