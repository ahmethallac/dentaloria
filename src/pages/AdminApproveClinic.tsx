import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, AlertCircle, FileText } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const AdminApproveClinic = () => {
  const [searchParams] = useSearchParams()
  const { t } = useTranslation('admin')
  const clinicId = searchParams.get('id')
  const token = searchParams.get('token')
  const initialAction = searchParams.get('action')

  const [clinic, setClinic] = useState<any>(null)
  const [approval, setApproval] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; status: string; message: string } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (!clinicId || !token) return
    loadClinicInfo()
  }, [clinicId, token])

  const loadClinicInfo = async () => {
    try {
      // Use edge function to get clinic info (no auth needed, uses token)
      const { data, error } = await supabase.functions.invoke('clinic-approval-action', {
        body: { clinicId, token, action: 'info' }
      })

      // Even if it fails with "invalid action", we'll handle it
      // Just load what we can from the URL params
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      return
    }

    setProcessing(true)
    try {
      const { data, error } = await supabase.functions.invoke('clinic-approval-action', {
        body: {
          clinicId,
          token,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined
        }
      })

      if (error) throw error

      if (data?.error) {
        setResult({ success: false, status: 'error', message: data.error })
      } else {
        setResult({
          success: true,
          status: data.status,
          message: action === 'approve'
            ? t('approveClinic.approvedMessage', { name: data.clinicName || t('approveClinic.defaultClinicName') })
            : t('approveClinic.rejectedMessage', { name: data.clinicName || t('approveClinic.defaultClinicName') })
        })
      }
    } catch (e: any) {
      setResult({ success: false, status: 'error', message: e.message || t('approveClinic.genericErrorMessage') })
    } finally {
      setProcessing(false)
    }
  }

  if (!clinicId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">{t('approveClinic.invalidLinkTitle')}</p>
            <p className="text-muted-foreground mt-2">{t('approveClinic.invalidLinkDesc')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            {result.success ? (
              result.status === 'approved' ? (
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              )
            ) : (
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-bold mb-2">
              {result.success ? (result.status === 'approved' ? t('approveClinic.approvedTitle') : t('approveClinic.rejectedTitle')) : t('approveClinic.errorTitle')}
            </h2>
            <p className="text-muted-foreground">{result.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('approveClinic.title')}
          </CardTitle>
          <CardDescription>{t('approveClinic.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm"><strong>{t('approveClinic.clinicIdLabel')}</strong> {clinicId}</p>
            <Badge variant="outline">{t('approveClinic.pendingReview')}</Badge>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => handleAction('approve')}
              disabled={processing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {t('approveClinic.approve')}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <Label>{t('approveClinic.rejectionReasonLabel')}</Label>
            <Textarea
              placeholder={t('approveClinic.rejectionPlaceholder')}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => handleAction('reject')}
              disabled={processing || !rejectionReason.trim()}
              variant="destructive"
              className="w-full"
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              {t('approveClinic.reject')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminApproveClinic
