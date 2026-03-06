import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
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
        title: "Error",
        description: "Failed to load clinics.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePublishClinic = async (clinicId: string) => {
    setPublishingClinicId(clinicId)
    
    try {
      const result = await publishClinic(clinicId)
      
      if (result.emailVerificationRequired) {
        toast({
          title: "Email verification required",
          description: "Please verify your email address before publishing your clinic. Check your inbox for a verification email.",
          variant: "destructive"
        })
        return
      }
      
      if (result.success) {
        toast({
          title: "Success!",
          description: "Your clinic has been published successfully."
        })
        
        // Refresh clinics list
        await loadUserClinics()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish clinic",
        variant: "destructive"
      })
    } finally {
      setPublishingClinicId(null)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}</h1>
          <p className="text-muted-foreground mt-2">
            {profile?.user_type === 'clinic_admin' ? 'Clinic Management Panel' : 'Patient Dashboard'}
          </p>
        </div>

        {profile?.user_type === 'clinic_admin' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">My Clinics</h2>
              <Button onClick={() => navigate('/add-clinic')}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Clinic
              </Button>
            </div>

            {clinics.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">You haven't added any clinics yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by adding your first clinic
                  </p>
                  <Button onClick={() => navigate('/add-clinic')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add My First Clinic
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {clinics.map((clinic) => (
                  <Card key={clinic.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          {clinic.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {clinic.is_published ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              Draft
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {clinic.address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!clinic.is_published && (
                        <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            This clinic is saved as draft. Click "Publish" to make it visible to patients.
                          </p>
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{clinic.rating || 0}</span>
                          <span className="text-muted-foreground">
                            ({clinic.review_count || 0} reviews)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {clinic.patient_count || 0} patients
                        </div>
                        <div>
                          {clinic.experience_years || 0} years experience
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {!clinic.is_published && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handlePublishClinic(clinic.id)}
                            disabled={publishingClinicId === clinic.id}
                          >
                            {publishingClinicId === clinic.id ? 'Publishing...' : 'Publish'}
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/clinic/${clinic.id}`)}
                          disabled={!clinic.is_published}
                          title={!clinic.is_published ? "Publish clinic first to view public page" : ""}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/clinic/${clinic.id}/panel`)}
                        >
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
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Explore Clinics</CardTitle>
                  <CardDescription>Find the best clinics</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/clinic-listing')} className="w-full">
                    View Clinics
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Treatments</CardTitle>
                  <CardDescription>Explore treatment options</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Treatments
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Appointments</CardTitle>
                  <CardDescription>Manage your appointments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Appointments
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