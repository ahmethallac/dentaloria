import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, FileText, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface Country { id: string; name: string; code: string }
interface City { id: string; name: string; country_id: string }

const RegisterClinic = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [countryId, setCountryId] = useState('')

  const [form, setForm] = useState({
    clinicName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cityId: '',
    address: '',
    phone: '',
    website: '',
    description: '',
    taxCertificate: null as File | null,
    healthTourismDoc: null as File | null,
    agree: false,
  })

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: ct }] = await Promise.all([
        supabase.from('countries').select('*').order('name'),
        supabase.from('cities').select('*').order('name'),
      ])
      setCountries(c || [])
      setCities(ct || [])
    })()
  }, [])

  const filteredCities = countryId ? cities.filter(c => c.country_id === countryId) : []

  const upd = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' }); return
    }
    if (form.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' }); return
    }
    if (!form.taxCertificate || !form.healthTourismDoc) {
      toast({ title: 'Error', description: 'Please upload both required documents.', variant: 'destructive' }); return
    }
    if (!form.agree) {
      toast({ title: 'Error', description: 'Please accept the terms.', variant: 'destructive' }); return
    }

    setSubmitting(true)
    try {
      // Upload documents to private bucket using a temp folder keyed by email hash + timestamp
      const folder = `pending/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const uploadDoc = async (file: File, name: string) => {
        const ext = file.name.split('.').pop()
        const path = `${folder}/${name}-${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('clinic-documents').upload(path, file)
        if (error) throw error
        return path
      }

      const [taxUrl, healthUrl] = await Promise.all([
        uploadDoc(form.taxCertificate!, 'tax-certificate'),
        uploadDoc(form.healthTourismDoc!, 'health-tourism-doc'),
      ])

      const { data, error } = await supabase.functions.invoke('register-clinic', {
        body: {
          email: form.email,
          password: form.password,
          clinicName: form.clinicName,
          cityId: form.cityId,
          address: form.address,
          phone: form.phone,
          website: form.website || null,
          description: form.description || null,
          taxCertificateUrl: taxUrl,
          healthTourismDocUrl: healthUrl,
        },
      })

      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Registration failed')
      }

      setSubmitted(true)
    } catch (err: any) {
      toast({ title: 'Registration Error', description: err.message || 'An error occurred.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Clock className="w-12 h-12 mx-auto text-primary mb-2" />
            <CardTitle>Registration Submitted</CardTitle>
            <CardDescription>Awaiting Super Admin approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Thank you for registering your clinic. Our team will review your submission and documents.
              You'll be able to sign in once your clinic is approved.
            </p>
            <Button className="w-full" onClick={() => navigate('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Register Your Clinic</CardTitle>
            <CardDescription>
              One account = one clinic. Provide your clinic details to apply for listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/80">Account</h3>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={form.password} onChange={(e) => upd('password', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input id="confirm" type="password" value={form.confirmPassword} onChange={(e) => upd('confirmPassword', e.target.value)} required />
                  </div>
                </div>
              </div>

              {/* Clinic */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/80">Clinic</h3>
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Clinic Name</Label>
                  <Input id="clinicName" value={form.clinicName} onChange={(e) => upd('clinicName', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={countryId} onValueChange={(v) => { setCountryId(v); upd('cityId', '') }}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select value={form.cityId} onValueChange={(v) => upd('cityId', v)} disabled={!countryId}>
                      <SelectTrigger><SelectValue placeholder={countryId ? 'Select city' : 'Select country first'} /></SelectTrigger>
                      <SelectContent>
                        {filteredCities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={form.address} onChange={(e) => upd('address', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => upd('phone', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website (optional)</Label>
                    <Input id="website" value={form.website} onChange={(e) => upd('website', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea id="description" rows={3} value={form.description} onChange={(e) => upd('description', e.target.value)} />
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-semibold">Required Documents</h3>
                <div className="space-y-2">
                  <Label htmlFor="tax" className="text-sm flex items-center gap-2">
                    {form.taxCertificate ? <CheckCircle className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4" />}
                    Tax Certificate
                  </Label>
                  <Input id="tax" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => upd('taxCertificate', e.target.files?.[0] || null)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="health" className="text-sm flex items-center gap-2">
                    {form.healthTourismDoc ? <CheckCircle className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4" />}
                    Health Tourism Authorization
                  </Label>
                  <Input id="health" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => upd('healthTourismDoc', e.target.files?.[0] || null)} required />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="agree" checked={form.agree} onCheckedChange={(v) => upd('agree', !!v)} />
                <Label htmlFor="agree" className="text-sm text-muted-foreground leading-snug">
                  I confirm I represent this clinic and the documents provided are authentic. The registration will be reviewed by Dentaloria before activation.
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Clinic
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already approved? <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default RegisterClinic
