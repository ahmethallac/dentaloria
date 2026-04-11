import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Upload, X, Plus, Camera } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { optimizeClinicImages, optimizeDoctorImages } from '@/lib/imageUtils'
import ImageCropDialog from '@/components/ui/ImageCropDialog'

interface Country {
  id: string
  name: string
  code: string
}

interface City {
  id: string
  name: string
  country_id: string
}

interface Treatment {
  id: string
  name: string
  category_id: string
  min_price: number
  max_price: number
}

interface SelectedTreatment {
  treatment_id: string
  name: string
  starting_price_euro: number
}

interface Doctor {
  title: string
  name: string
  experience_years: number
  profile_image: File | null
  profile_image_url?: string
}

const AddClinic = () => {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    trustpilot_url: '',
    city_id: ''
  })

  // Separate state for country selection (used only for city filtering)
  const [selectedCountryId, setSelectedCountryId] = useState('')

  // Data states
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinicImages, setClinicImages] = useState<File[]>([])
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [currentCropFile, setCurrentCropFile] = useState<File | null>(null)
  // Doctor form state
  const [doctorForm, setDoctorForm] = useState<Doctor>({
    title: '',
    name: '',
    experience_years: 0,
    profile_image: null
  })

  // Auto uppercase clinic name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))
  }

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      navigate('/auth')
      return
    }

    if (userRole === 'admin' || userRole === 'sub_admin') {
      console.log('[AddClinic] Admin detected, redirecting to /admin')
      navigate('/admin', { replace: true })
      return
    }
    
    fetchInitialData()
  }, [user, userRole, authLoading, navigate])

  const fetchInitialData = async () => {
    try {
      // Fetch countries
      const { data: countriesData } = await supabase
        .from('countries')
        .select('*')
        .order('name')

      // Fetch treatments
      const { data: treatmentsData } = await supabase
        .from('treatments')
        .select('*')
        .order('name')

      if (countriesData) setCountries(countriesData)
      if (treatmentsData) setTreatments(treatmentsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleCountryChange = async (countryId: string) => {
    setSelectedCountryId(countryId)
    setFormData(prev => ({ ...prev, city_id: '' }))
    
    // Fetch cities for selected country
    const { data: citiesData } = await supabase
      .from('cities')
      .select('*')
      .eq('country_id', countryId)
      .order('name')

    if (citiesData) setCities(citiesData)
  }

  const handleTreatmentToggle = (treatment: Treatment, checked: boolean) => {
    if (checked) {
      const newTreatment: SelectedTreatment = {
        treatment_id: treatment.id,
        name: treatment.name,
        starting_price_euro: treatment.min_price
      }
      setSelectedTreatments(prev => [...prev, newTreatment])
    } else {
      setSelectedTreatments(prev => prev.filter(t => t.treatment_id !== treatment.id))
    }
  }

  const updateTreatmentPrice = (treatmentId: string, price: number) => {
    setSelectedTreatments(prev =>
      prev.map(t =>
        t.treatment_id === treatmentId
          ? { ...t, starting_price_euro: price }
          : t
      )
    )
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + clinicImages.length > 10) {
      toast({
        title: "Error",
        description: "Maximum 10 images allowed",
        variant: "destructive"
      })
      return
    }
    // Queue files for cropping one by one
    setCropQueue(files.slice(1))
    setCurrentCropFile(files[0] || null)
    e.target.value = ''
  }

  const handleCropConfirm = (croppedFile: File) => {
    setClinicImages(prev => [...prev, croppedFile])
    // Process next in queue
    if (cropQueue.length > 0) {
      setCurrentCropFile(cropQueue[0])
      setCropQueue(prev => prev.slice(1))
    } else {
      setCurrentCropFile(null)
    }
  }

  const handleCropCancel = () => {
    if (cropQueue.length > 0) {
      setCurrentCropFile(cropQueue[0])
      setCropQueue(prev => prev.slice(1))
    } else {
      setCurrentCropFile(null)
    }
  }

  const removeImage = (index: number) => {
    setClinicImages(prev => prev.filter((_, i) => i !== index))
  }

  const addDoctor = async () => {
    if (!doctorForm.title || !doctorForm.name || !doctorForm.experience_years || !doctorForm.profile_image) {
      toast({
        title: "Error",
        description: "Please fill all doctor fields including profile image",
        variant: "destructive"
      })
      return
    }

    try {
      // Optimize doctor image
      const optimizedImage = await optimizeDoctorImages([doctorForm.profile_image])
      const optimizedDoctor = { ...doctorForm, profile_image: optimizedImage[0] }
      
      setDoctors(prev => [...prev, optimizedDoctor])
      setDoctorForm({
        title: '',
        name: '',
        experience_years: 0,
        profile_image: null
      })
      
      toast({
        title: "Success",
        description: "Doctor added with optimized image"
      })
    } catch (error) {
      console.error('Error optimizing doctor image:', error)
      setDoctors(prev => [...prev, { ...doctorForm }])
      setDoctorForm({
        title: '',
        name: '',
        experience_years: 0,
        profile_image: null
      })
    }
  }

  const removeDoctor = (index: number) => {
    setDoctors(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImage = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Authentication validation
    if (!user || !user.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a clinic. Please sign in and try again.",
        variant: "destructive"
      })
      navigate('/auth')
      return
    }

    // Validation
    if (selectedTreatments.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one treatment with pricing",
        variant: "destructive"
      })
      return
    }

    if (clinicImages.length === 0) {
      toast({
        title: "Error", 
        description: "Please upload at least one clinic image",
        variant: "destructive"
      })
      return
    }

    if (doctors.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one doctor",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setUploadProgress(0)

    try {
      // Step 1: Create clinic
      setCurrentStep('Creating clinic...')
      setUploadProgress(10)
      
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          ...formData,
          user_id: user?.id,
          is_published: false // Save as draft by default
        })
        .select()
        .single()

      if (clinicError) throw clinicError
      const clinicId = clinicData.id

      // Step 2: Upload clinic images in parallel
      setCurrentStep('Uploading clinic images...')
      setUploadProgress(25)
      
      const clinicImagePromises = clinicImages.map(async (file, i) => {
        const fileName = `${clinicId}/${Date.now()}-${i}-${file.name}`
        const imageUrl = await uploadImage(file, 'clinic-images', fileName)
        return {
          clinic_id: clinicId,
          image_url: imageUrl,
          is_primary: i === 0
        }
      })
      
      const clinicImageData = await Promise.all(clinicImagePromises)
      setUploadProgress(45)

      // Step 3: Upload doctor images in parallel
      setCurrentStep('Processing doctor profiles...')
      
      const doctorImagePromises = doctors.map(async (doctor) => {
        if (doctor.profile_image) {
          const fileName = `${clinicId}/doctors/${Date.now()}-${doctor.profile_image.name}`
          const imageUrl = await uploadImage(doctor.profile_image, 'doctor-images', fileName)
          return { ...doctor, profile_image_url: imageUrl }
        }
        return { ...doctor, profile_image_url: '' }
      })
      
      const doctorsWithImages = await Promise.all(doctorImagePromises)
      setUploadProgress(65)

      // Step 4: Batch insert clinic images
      setCurrentStep('Saving clinic images...')
      
      if (clinicImageData.length > 0) {
        const { error: imageError } = await supabase
          .from('clinic_images')
          .insert(clinicImageData)
        
        if (imageError) throw imageError
      }
      setUploadProgress(75)

      // Step 5: Batch insert treatments
      setCurrentStep('Adding treatments...')
      
      const treatmentData = selectedTreatments.map(treatment => ({
        clinic_id: clinicId,
        treatment_id: treatment.treatment_id,
        starting_price_euro: treatment.starting_price_euro
      }))
      
      if (treatmentData.length > 0) {
        const { error: treatmentError } = await supabase
          .from('clinic_treatments')
          .insert(treatmentData)
        
        if (treatmentError) throw treatmentError
      }
      setUploadProgress(85)

      // Step 6: Batch insert doctors
      setCurrentStep('Adding doctors...')
      
      const doctorData = doctorsWithImages.map(doctor => ({
        clinic_id: clinicId,
        title: doctor.title,
        name: doctor.name,
        experience_years: doctor.experience_years,
        profile_image_url: doctor.profile_image_url
      }))
      
      if (doctorData.length > 0) {
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert(doctorData)
        
        if (doctorError) throw doctorError
      }
      setUploadProgress(100)

      toast({
        title: "Success!",
        description: "Clinic saved as draft. You can publish it when ready."
      })

      navigate('/dashboard')
    } catch (error: any) {
      console.error('Error creating clinic:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create clinic",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
      setCurrentStep('')
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Add Your Dental Clinic</CardTitle>
            <p className="text-muted-foreground">
              Fill out the information about your dental clinic
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Clinic Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={handleNameChange}
                      placeholder="DENTAL CLINIC NAME"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trustpilot">Trustpilot URL</Label>
                    <Input
                      id="trustpilot"
                      value={formData.trustpilot_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, trustpilot_url: e.target.value }))}
                      placeholder="https://trustpilot.com/..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Select onValueChange={handleCountryChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
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
                    <Label>City *</Label>
                    <Select 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, city_id: value }))}
                      disabled={!selectedCountryId}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
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
              </div>

              {/* Clinic Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Clinic Images *</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Upload horizontal images for best display. Images will be automatically resized to fit.
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                </div>
                {clinicImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {clinicImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Clinic ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Treatments */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Treatments & Pricing *</h3>
                <p className="text-sm text-muted-foreground">
                  Select treatments and set starting prices in EUR
                </p>
                <div className="space-y-3">
                  {treatments.map((treatment) => {
                    const selected = selectedTreatments.find(t => t.treatment_id === treatment.id)
                    return (
                      <div key={treatment.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <Checkbox
                          checked={!!selected}
                          onCheckedChange={(checked) => handleTreatmentToggle(treatment, checked as boolean)}
                        />
                        <div className="flex-1">
                          <Label className="font-medium">{treatment.name}</Label>
                        </div>
                        {selected && (
                          <div className="flex items-center space-x-2">
                            <Label className="text-sm">Starting price (EUR):</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selected.starting_price_euro}
                              onChange={(e) => updateTreatmentPrice(treatment.id, parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Doctors */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dental Doctors *</h3>
                
                {/* Add Doctor Form */}
                <Card className="p-4 bg-muted">
                  <h4 className="font-medium mb-3">Add Doctor</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Select onValueChange={(value) => setDoctorForm(prev => ({ ...prev, title: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select title" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dr.">Dr.</SelectItem>
                          <SelectItem value="Prof. Dr.">Prof. Dr.</SelectItem>
                          <SelectItem value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={doctorForm.name}
                        onChange={(e) => setDoctorForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Doctor full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Experience (Years)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={doctorForm.experience_years}
                        onChange={(e) => setDoctorForm(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Profile Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setDoctorForm(prev => ({ ...prev, profile_image: e.target.files?.[0] || null }))}
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addDoctor} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Doctor
                  </Button>
                </Card>

                {/* Added Doctors List */}
                {doctors.length > 0 && (
                  <div className="space-y-2">
                    {doctors.map((doctor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {doctor.profile_image && (
                            <img
                              src={URL.createObjectURL(doctor.profile_image)}
                              alt={doctor.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{doctor.title} {doctor.name}</p>
                            <p className="text-sm text-muted-foreground">{doctor.experience_years} years experience</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeDoctor(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
                <div className="flex flex-col items-end space-y-2">
                  {isLoading && (
                    <div className="w-full max-w-xs space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{currentStep}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Clinic
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AddClinic