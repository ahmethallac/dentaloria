
-- 1. Add approval_status to clinics table
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- 2. Create clinic_approvals table
CREATE TABLE public.clinic_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  tax_certificate_url text,
  health_tourism_doc_url text,
  approval_token text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can read their own approvals"
  ON public.clinic_approvals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinics WHERE clinics.id = clinic_approvals.clinic_id AND clinics.user_id = auth.uid()));

CREATE POLICY "Admins can manage all approvals"
  ON public.clinic_approvals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert approvals for their clinics"
  ON public.clinic_approvals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clinics WHERE clinics.id = clinic_approvals.clinic_id AND clinics.user_id = auth.uid()));

-- 3. Create lead_purchases table
CREATE TABLE public.lead_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  contact_request_id uuid REFERENCES public.contact_requests(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id text,
  amount_cents integer NOT NULL DEFAULT 0,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, contact_request_id)
);

ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can read their own purchases"
  ON public.lead_purchases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinics WHERE clinics.id = lead_purchases.clinic_id AND clinics.user_id = auth.uid()));

CREATE POLICY "Admins can manage all purchases"
  ON public.lead_purchases FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 4. Create clinic_billing_settings table
CREATE TABLE public.clinic_billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL UNIQUE,
  billing_type text NOT NULL DEFAULT 'paid',
  price_per_lead_cents integer NOT NULL DEFAULT 2500,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_billing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can read their own billing settings"
  ON public.clinic_billing_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clinics WHERE clinics.id = clinic_billing_settings.clinic_id AND clinics.user_id = auth.uid()));

CREATE POLICY "Admins can manage all billing settings"
  ON public.clinic_billing_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 5. Create private storage bucket for clinic documents
INSERT INTO storage.buckets (id, name, public) VALUES ('clinic-documents', 'clinic-documents', false);

-- 6. Storage RLS policies for clinic-documents bucket
CREATE POLICY "Authenticated users can upload clinic documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic-documents');

CREATE POLICY "Users can read their own clinic documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'clinic-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin')));

-- 7. Admin RLS for clinics table (admins can read/update all clinics)
CREATE POLICY "Admins can read all clinics"
  ON public.clinics FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all clinics"
  ON public.clinics FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 8. Admin RLS for contact_requests (admins can read all)
CREATE POLICY "Admins can read all contact requests"
  ON public.contact_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 9. Create default billing settings when a clinic is created
CREATE OR REPLACE FUNCTION public.create_default_billing_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.clinic_billing_settings (clinic_id, billing_type, price_per_lead_cents)
  VALUES (NEW.id, 'paid', 2500);
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_billing_settings_on_clinic_insert
  AFTER INSERT ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_billing_settings();
