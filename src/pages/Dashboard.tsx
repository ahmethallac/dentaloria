import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/ui/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Users, Star, MapPin, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { getUserClinics, publishClinic } from '@/lib/services'
import type { Clinic } from '@/lib/services'
import { useToast } from '@/hooks/use-toast'

const Dashboard = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [publishingClinicId, setPublishingClinicId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    if (profile?.user_type === 'clinic_admin') { loadUserClinics() } else { setLoading(false) }
  }, [user, profile, navigate])

  const loadUserClinics = async () => {
    if (!user) return
    try {
      const userClinics = await getUserClinics(user.id)
      setClinics(userClinics)
    } catch {
      toast({ title: "Error", description: "Failed to load clinics.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handlePublishClinic = async (clinicId: string) => {
    setPublishingClinicId(clinicId)
    try {
      const result = await publishClinic(clinicId)
      if (result.emailVerificationRequired) {
        toast({ title: "Email verification required", description: "Please verify your email before publishing.", variant: "destructive" })
        return
      }
      if (result.success) {
        toast({ title: "Published!", description: "Your clinic is now live." })
        await loadUserClinics()
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to publish clinic", variant: "destructive" })
    } finally {
      setPublishingClinicId(null)
    }
  }

  if (!user) return null
  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.user_type === 'clinic_admin' ? 'Manage your clinics and applications' : 'Your patient dashboard'}
          </p>
        </div>

        {profile?.user_type === 'clinic_admin' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">My Clinics</h2>
              <Button onClick={() => navigate('/add-clinic')} size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Clinic
              </Button>
            </div>

            {clinics.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No clinics yet</h3>
                  <p className="text-sm text-muted-foreground mb-5">Add your first clinic to get started</p>
                  <Button onClick={() => navigate('/add-clinic')} className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add My First Clinic
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {clinics.map((clinic) => (
                  <Card key={clinic.id} className="hover:shadow-[var(--shadow-card-hover)] transition-all border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="line-clamp-1">{clinic.name}</span>
                        </CardTitle>
                        {clinic.is_published ? (
                          <Badge className="bg-[hsl(var(--medical-green))]/10 text-[hsl(var(--medical-green))] border-0 shrink-0">
                            <Eye className="w-3 h-3 mr-1" /> Live
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            <EyeOff className="w-3 h-3 mr-1" /> Draft
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <MapPin className="w-3 h-3" /> {clinic.address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {!clinic.is_published && (
                        <div className="mb-3 p-2.5 bg-muted rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">Draft — publish to make it visible to patients.</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-[hsl(var(--trust-gold))] text-[hsl(var(--trust-gold))]" />
                          {clinic.rating || 0} ({clinic.review_count || 0})
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {clinic.patient_count || 0}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {!clinic.is_published && (
                          <Button size="sm" className="flex-1 h-8 bg-primary hover:bg-primary/90 text-xs"
                            onClick={() => handlePublishClinic(clinic.id)} disabled={publishingClinicId === clinic.id}>
                            {publishingClinicId === clinic.id ? 'Publishing...' : 'Publish'}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                          onClick={() => navigate(`/clinic/${clinic.id}`)} disabled={!clinic.is_published}>
                          View
                        </Button>
                        <Button size="sm" className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
                          onClick={() => navigate(`/clinic/${clinic.id}/panel`)}>
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: "Explore Clinics", desc: "Browse all clinics", action: () => navigate('/clinic-listing'), label: "Browse" },
              { title: "Treatments", desc: "Explore treatment options", action: () => navigate('/clinic-listing'), label: "View", variant: "outline" as const },
              { title: "My Appointments", desc: "Manage your bookings", action: () => {}, label: "Coming Soon", variant: "outline" as const },
            ].map((card) => (
              <Card key={card.title} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="text-sm">{card.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={card.action} variant={card.variant || "default"} className="w-full h-9 text-sm">
                    {card.label}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
