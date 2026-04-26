
-- Discount codes table
CREATE TABLE public.discount_codes (
  code text PRIMARY KEY,
  percent_off integer NOT NULL CHECK (percent_off >= 0 AND percent_off <= 100),
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all codes
CREATE POLICY "Admins manage discount codes"
  ON public.discount_codes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Discount redemptions audit table
CREATE TABLE public.discount_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  clinic_id uuid NOT NULL,
  context text NOT NULL,
  amount_off_cents integer NOT NULL DEFAULT 0,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all redemptions"
  ON public.discount_redemptions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clinic owners read own redemptions"
  ON public.discount_redemptions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id = discount_redemptions.clinic_id AND c.user_id = auth.uid()
  ));

-- Validate a discount code and compute the discounted total
CREATE OR REPLACE FUNCTION public.validate_discount_code(p_code text, p_amount_cents integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := upper(trim(p_code));
  v_row public.discount_codes%ROWTYPE;
  v_amount_off integer;
  v_final integer;
BEGIN
  IF v_code = '' OR p_amount_cents IS NULL OR p_amount_cents < 0 THEN
    RETURN json_build_object('valid', false, 'reason', 'invalid_input');
  END IF;

  SELECT * INTO v_row FROM public.discount_codes WHERE code = v_code;
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF NOT v_row.is_active THEN
    RETURN json_build_object('valid', false, 'reason', 'inactive');
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'reason', 'expired');
  END IF;
  IF v_row.max_uses IS NOT NULL AND v_row.used_count >= v_row.max_uses THEN
    RETURN json_build_object('valid', false, 'reason', 'max_uses_reached');
  END IF;

  v_amount_off := (p_amount_cents * v_row.percent_off) / 100;
  v_final := GREATEST(0, p_amount_cents - v_amount_off);

  RETURN json_build_object(
    'valid', true,
    'code', v_row.code,
    'percent_off', v_row.percent_off,
    'amount_off_cents', v_amount_off,
    'final_cents', v_final
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.validate_discount_code(text, integer) TO authenticated, anon;

-- Idempotent unlock of a single lead, used by webhook after direct purchase
CREATE OR REPLACE FUNCTION public.mark_lead_purchased(
  p_clinic uuid, p_request uuid, p_intent text, p_amount_cents integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.lead_purchases
    WHERE clinic_id = p_clinic AND contact_request_id = p_request
  ) THEN
    RETURN json_build_object('success', true, 'duplicate', true);
  END IF;

  PERFORM 1 FROM public.contact_requests WHERE id = p_request AND clinic_id = p_clinic;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead does not belong to clinic';
  END IF;

  INSERT INTO public.lead_purchases (clinic_id, contact_request_id, stripe_payment_intent_id, amount_cents)
  VALUES (p_clinic, p_request, COALESCE(p_intent, 'direct'), COALESCE(p_amount_cents, 2500));

  RETURN json_build_object('success', true);
END; $$;

-- Seed AHMET100
INSERT INTO public.discount_codes (code, percent_off, is_active, max_uses)
VALUES ('AHMET100', 100, true, NULL)
ON CONFLICT (code) DO NOTHING;
