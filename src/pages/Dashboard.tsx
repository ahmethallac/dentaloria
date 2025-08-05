import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Building2, Users, Star, MapPin } from 'lucide-react'
import { getUserClinics } from '@/lib/services'
import type { Clinic } from '@/lib/services'
import { useToast } from '@/hooks/use-toast'

const Dashboard = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }

    if (profile?.user_type === 'clinic_admin') {
      loadUserClinics()
    } else {
      setLoading(false)
    }
  }, [user, profile, navigate])

  const loadUserClinics = async () => {
    if (!user) return
    
    try {
      const userClinics = await getUserClinics(user.id)
      setClinics(userClinics)
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Klinikler yüklenirken hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Hoş Geldiniz, {profile?.full_name}</h1>
          <p className="text-muted-foreground mt-2">
            {profile?.user_type === 'clinic_admin' ? 'Klinik Yönetim Paneli' : 'Hasta Paneli'}
          </p>
        </div>

        {profile?.user_type === 'clinic_admin' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Kliniklerim</h2>
              <Button onClick={() => navigate('/add-clinic')}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Klinik Ekle
              </Button>
            </div>

            {clinics.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Henüz klinik eklememişsiniz</h3>
                  <p className="text-muted-foreground mb-4">
                    İlk kliniğinizi ekleyerek başlayın
                  </p>
                  <Button onClick={() => navigate('/add-clinic')}>
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Kliniğimi Ekle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {clinics.map((clinic) => (
                  <Card key={clinic.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {clinic.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {clinic.address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{clinic.rating || 0}</span>
                          <span className="text-muted-foreground">
                            ({clinic.review_count || 0} değerlendirme)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {clinic.patient_count || 0} hasta
                        </div>
                        <div>
                          {clinic.experience_years || 0} yıl deneyim
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/clinic/${clinic.id}`)}
                        >
                          Görüntüle
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/clinic/${clinic.id}/panel`)}
                        >
                          Yönet
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Klinikleri Keşfet</CardTitle>
                  <CardDescription>En iyi klinikleri bulun</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/clinic-listing')} className="w-full">
                    Klinikleri Görüntüle
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tedaviler</CardTitle>
                  <CardDescription>Tedavi seçeneklerini inceleyin</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Tedavileri Görüntüle
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Randevularım</CardTitle>
                  <CardDescription>Randevularınızı yönetin</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Randevular
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard