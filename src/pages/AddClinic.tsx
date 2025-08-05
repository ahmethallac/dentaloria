import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import { getCountries, getCities, getTreatmentCategories, getTreatments, createClinic } from '@/lib/services'
import type { Country, City, TreatmentCategory, Treatment } from '@/lib/services'

const AddClinic = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [treatmentCategories, setTreatmentCategories] = useState<TreatmentCategory[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    countryId: '',
    cityId: '',
    experienceYears: '',
    patientCount: ''
  })

  useEffect(() => {
    if (!user || profile?.user_type !== 'clinic_admin') {
      navigate('/auth')
      return
    }

    loadData()
  }, [user, profile, navigate])

  const loadData = async () => {
    try {
      const [countriesData, categoriesData] = await Promise.all([
        getCountries(),
        getTreatmentCategories()
      ])
      setCountries(countriesData)
      setTreatmentCategories(categoriesData)
    } catch (error) {
      toast({
        title: "Hata",
        description: "Veriler yüklenirken hata oluştu.",
        variant: "destructive"
      })
    }
  }

  const handleCountryChange = async (countryId: string) => {
    setFormData(prev => ({ ...prev, countryId, cityId: '' }))
    try {
      const citiesData = await getCities(countryId)
      setCities(citiesData)
    } catch (error) {
      toast({
        title: "Hata",
        description: "Şehirler yüklenirken hata oluştu.",
        variant: "destructive"
      })
    }
  }

  const handleCategoryChange = async (categoryId: string) => {
    try {
      const treatmentsData = await getTreatments(categoryId)
      setTreatments(treatmentsData)
    } catch (error) {
      toast({
        title: "Hata",
        description: "Tedaviler yüklenirken hata oluştu.",
        variant: "destructive"
      })
    }
  }

  const handleTreatmentToggle = (treatmentId: string) => {
    setSelectedTreatments(prev => 
      prev.includes(treatmentId)
        ? prev.filter(id => id !== treatmentId)
        : [...prev, treatmentId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.countryId || !formData.cityId) {
      toast({
        title: "Hata",
        description: "Lütfen ülke ve şehir seçin.",
        variant: "destructive"
      })
      return
    }

    if (selectedTreatments.length === 0) {
      toast({
        title: "Hata",
        description: "Lütfen en az bir tedavi seçin.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const clinicData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        city_id: formData.cityId,
        experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        patient_count: formData.patientCount ? parseInt(formData.patientCount) : null,
        user_id: user!.id,
        is_verified: false,
        is_featured: false
      }

      await createClinic(clinicData)

      toast({
        title: "Başarılı!",
        description: "Kliniğiniz başarıyla eklendi."
      })

      navigate('/dashboard')
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Klinik eklenirken hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || profile?.user_type !== 'clinic_admin') return null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard'a Dön
          </Button>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Yeni Klinik Ekle</CardTitle>
            <CardDescription>
              Kliniğinizin bilgilerini doldurun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Klinik Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ülke *</Label>
                  <Select onValueChange={handleCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ülke seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Şehir *</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, cityId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Şehir seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experience">Deneyim (Yıl)</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, experienceYears: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patients">Hasta Sayısı</Label>
                  <Input
                    id="patients"
                    type="number"
                    min="0"
                    value={formData.patientCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientCount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Tedavi Kategorisi Seçin</Label>
                <Select onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatmentCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {treatments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tedaviler *</Label>
                    <div className="grid gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                      {treatments.map((treatment) => (
                        <div key={treatment.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={treatment.id}
                            checked={selectedTreatments.includes(treatment.id)}
                            onCheckedChange={() => handleTreatmentToggle(treatment.id)}
                          />
                          <Label htmlFor={treatment.id} className="text-sm">
                            {treatment.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Klinik Ekle
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AddClinic