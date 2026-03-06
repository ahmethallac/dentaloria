import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from '@/components/ui/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X, Plus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { optimizeClinicImages, optimizeDoctorImages } from '@/lib/imageUtils'

interface Country { id: string; name: string; code: string }
interface City { id: string; name: string; country_id: string }
interface Treatment { id: string; name: string; category_id: string; min_price: number; max_price: number }
interface SelectedTreatment { treatment_id: string; name: string; starting_price_euro: number }
interface Doctor { title: string; name: string; experience_years: number; profile_image: File | null; profile_image_url?: string }

const AddClinic = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')

  const [formData, setFormData] = useState({
    name: '', description: '', address: '', phone: '', email: '', website: '', trustpilot_url: '', city_id: ''
  })
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinicImages, setClinicImages] = useState<File[]>([])
  const [doctorForm, setDoctorForm] = useState<Doctor>({ title: '', name: '', experience_years: 0, profile_image: null })

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))
  }

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    fetchInitialData()
  }, [user, navigate])

  const fetchInitialData = async () => {
    try {
      const { data: countriesData } = await supabase.from('countries').select('*').order('name')
      const { data: treatmentsData } = await supabase.from('treatments').select('*').order('name')
      if (countriesData) setCountries(countriesData)
      if (treatmentsData) setTreatments(treatmentsData)
    } catch (error) { console.error('Error fetching data:', error) }
  }

  const handleCountryChange = async (countryId: string) => {
    setSelectedCountryId(countryId)
    setFormData(prev => ({ ...prev, city_id: '' }))
    const { data: citiesData } = await supabase.from('cities').select('*').eq('country_id', countryId).order('name')
    if (citiesData) setCities(citiesData)
  }

  const handleTreatmentToggle = (treatment: Treatment, checked: boolean) => {
    if (checked) {
      setSelectedTreatments(prev => [...prev, { treatment_id: treatment.id, name: treatment.name, starting_price_euro: treatment.min_price }])
    } else {
      setSelectedTreatments(prev => prev.filter(t => t.treatment_id !== treatment.id))
    }
  }

  const updateTreatmentPrice = (treatmentId: string, price: number) => {
    setSelectedTreatments(prev => prev.map(t => t.treatment_id === treatmentId ? { ...t, starting_price_euro: price } : t))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + clinicImages.length > 10) {
      toast({ title: "Error", description: "Maximum 10 images allowed", variant: "destructive" }); return
    }
    try {
      const optimizedFiles = await optimizeClinicImages(files)
      setClinicImages(prev => [...prev, ...optimizedFiles])
    } catch {
      setClinicImages(prev => [...prev, ...files])
    }
  }

  const removeImage = (index: number) => setClinicImages(prev => prev.filter((_, i) => i !== index))

  const addDoctor = async () => {
    if (!doctorForm.title || !doctorForm.name || !doctorForm.experience_years || !doctorForm.profile_image) {
      toast({ title: "Error", description: "Please fill all doctor fields including profile image", variant: "destructive" }); return
    }
    try {
      const optimizedImage = await optimizeDoctorImages([doctorForm.profile_image])
      setDoctors(prev => [...prev, { ...doctorForm, profile_image: optimizedImage[0] }])
    } catch {
      setDoctors(prev => [...prev, { ...doctorForm }])
    }
    setDoctorForm({ title: '', name: '', experience_years: 0, profile_image: null })
  }

  const removeDoctor = (index: number) => setDoctors(prev => prev.filter((_, i) => i !== index))

  const uploadImage = async (file: File, bucket: string, path: string) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) { toast({ title: "Error", description: "You must be logged in.", variant: "destructive" }); navigate('/auth'); return }
    if (selectedTreatments.length === 0) { toast({ title: "Error", description: "Select at least one treatment", variant: "destructive" }); return }
    if (clinicImages.length === 0) { toast({ title: "Error", description: "Upload at least one image", variant: "destructive" }); return }
    if (doctors.length === 0) { toast({ title: "Error", description: "Add at least one doctor", variant: "destructive" }); return }

    setIsLoading(true); setUploadProgress(0)
    try {
      setCurrentStep('Creating clinic...'); setUploadProgress(10)
      const { data: clinicData, error: clinicError } = await supabase.from('clinics').insert({ ...formData, user_id: user.id, is_published: false }).select().single()
      if (clinicError) throw clinicError
      const clinicId = clinicData.id

      setCurrentStep('Uploading images...'); setUploadProgress(25)
      const imgData = await Promise.all(clinicImages.map(async (file, i) => {
        const url = await uploadImage(file, 'clinic-images', `${clinicId}/${Date.now()}-${i}-${file.name}`)
        return { clinic_id: clinicId, image_url: url, is_primary: i === 0 }
      }))
      setUploadProgress(45)

      setCurrentStep('Processing doctors...')
      const docsWithImages = await Promise.all(doctors.map(async (doc) => {
        if (doc.profile_image) {
          const url = await uploadImage(doc.profile_image, 'doctor-images', `${clinicId}/doctors/${Date.now()}-${doc.profile_image.name}`)
          return { ...doc, profile_image_url: url }
        }
        return { ...doc, profile_image_url: '' }
      }))
      setUploadProgress(65)

      setCurrentStep('Saving data...')
      if (imgData.length > 0) { const { error } = await supabase.from('clinic_images').insert(imgData); if (error) throw error }
      setUploadProgress(75)
      const treatmentData = selectedTreatments.map(t => ({ clinic_id: clinicId, treatment_id: t.treatment_id, starting_price_euro: t.starting_price_euro }))
      if (treatmentData.length > 0) { const { error } = await supabase.from('clinic_treatments').insert(treatmentData); if (error) throw error }
      setUploadProgress(85)
      const doctorData = docsWithImages.map(d => ({ clinic_id: clinicId, title: d.title, name: d.name, experience_years: d.experience_years, profile_image_url: d.profile_image_url }))
      if (doctorData.length > 0) { const { error } = await supabase.from('doctors').insert(doctorData); if (error) throw error }
      setUploadProgress(100)

      toast({ title: "Success!", description: "Clinic saved as draft." })
      navigate('/dashboard')
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create clinic", variant: "destructive" })
    } finally { setIsLoading(false); setUploadProgress(0); setCurrentStep('') }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Add Your Dental Clinic</h1>
            <p className="text-sm text-muted-foreground mt-1">Fill out the details about your clinic</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <Card className="border-border/50">
              <CardHeader className="pb-4"><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Clinic Name *</Label>
                    <Input value={formData.name} onChange={handleNameChange} placeholder="CLINIC NAME" required className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Email *</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Phone</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Website</Label>
                    <Input value={formData.website} onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))} placeholder="https://..." className="h-10" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-sm">Trustpilot URL</Label>
                    <Input value={formData.trustpilot_url} onChange={(e) => setFormData(prev => ({ ...prev, trustpilot_url: e.target.value }))} placeholder="https://trustpilot.com/..." className="h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Address</Label>
                  <Textarea value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="border-border/50">
              <CardHeader className="pb-4"><CardTitle className="text-base">Location</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Country *</Label>
                    <Select onValueChange={handleCountryChange}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>{countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">City *</Label>
                    <Select onValueChange={(v) => setFormData(prev => ({ ...prev, city_id: v }))} disabled={!selectedCountryId}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card className="border-border/50">
              <CardHeader className="pb-4"><CardTitle className="text-base">Clinic Images *</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Upload horizontal images. Auto-resized for best display.</p>
                <Input type="file" multiple accept="image/*" onChange={handleImageUpload} className="cursor-pointer h-10" />
                {clinicImages.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {clinicImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img src={URL.createObjectURL(file)} alt={`Clinic ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
                        <Button type="button" variant="destructive" size="icon"
                          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Treatments */}
            <Card className="border-border/50">
              <CardHeader className="pb-4"><CardTitle className="text-base">Treatments & Pricing *</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground mb-2">Select treatments and set starting prices in EUR</p>
                {treatments.map((treatment) => {
                  const selected = selectedTreatments.find(t => t.treatment_id === treatment.id)
                  return (
                    <div key={treatment.id} className="flex items-center gap-3 p-3 border border-border/50 rounded-lg">
                      <Checkbox checked={!!selected} onCheckedChange={(c) => handleTreatmentToggle(treatment, c as boolean)} />
                      <Label className="flex-1 text-sm">{treatment.name}</Label>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">EUR:</Label>
                          <Input type="number" min="0" step="0.01" value={selected.starting_price_euro}
                            onChange={(e) => updateTreatmentPrice(treatment.id, parseFloat(e.target.value) || 0)} className="w-24 h-8 text-sm" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Doctors */}
            <Card className="border-border/50">
              <CardHeader className="pb-4"><CardTitle className="text-base">Dental Doctors *</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <h4 className="text-sm font-medium">Add Doctor</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Title</Label>
                      <Select onValueChange={(v) => setDoctorForm(prev => ({ ...prev, title: v }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dr.">Dr.</SelectItem>
                          <SelectItem value="Prof. Dr.">Prof. Dr.</SelectItem>
                          <SelectItem value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full Name</Label>
                      <Input value={doctorForm.name} onChange={(e) => setDoctorForm(prev => ({ ...prev, name: e.target.value }))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Experience (Years)</Label>
                      <Input type="number" min="0" value={doctorForm.experience_years}
                        onChange={(e) => setDoctorForm(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Profile Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setDoctorForm(prev => ({ ...prev, profile_image: e.target.files?.[0] || null }))} className="h-9" />
                    </div>
                  </div>
                  <Button type="button" onClick={addDoctor} size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Doctor
                  </Button>
                </div>
                {doctors.length > 0 && (
                  <div className="space-y-2">
                    {doctors.map((doctor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {doctor.profile_image && (
                            <img src={URL.createObjectURL(doctor.profile_image)} alt={doctor.name} className="w-10 h-10 rounded-full object-cover" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{doctor.title} {doctor.name}</p>
                            <p className="text-xs text-muted-foreground">{doctor.experience_years} years experience</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDoctor(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
              <div className="flex flex-col items-end gap-2">
                {isLoading && (
                  <div className="w-48 space-y-1">
                    <div className="flex justify-between text-xs"><span>{currentStep}</span><span>{uploadProgress}%</span></div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Clinic
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddClinic
