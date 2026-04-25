
-- 1. Drop old billing system (with CASCADE for dependent trigger)
DROP FUNCTION IF EXISTS public.create_default_billing_settings() CASCADE;
DROP TABLE IF EXISTS public.clinic_billing_settings CASCADE;

-- 2. Create clinic_balances
CREATE TABLE public.clinic_balances (
  clinic_id uuid PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can read their own balance"
ON public.clinic_balances
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_balances.clinic_id AND c.user_id = auth.uid()));

CREATE POLICY "Admins can manage all balances"
ON public.clinic_balances
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.clinic_balances (clinic_id, balance_cents)
SELECT id, 0 FROM public.clinics
ON CONFLICT (clinic_id) DO NOTHING;

-- 3. balance_transactions ledger
CREATE TABLE public.balance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('topup','lead_charge','adjustment','refund')),
  amount_cents integer NOT NULL,
  balance_after_cents integer NOT NULL,
  contact_request_id uuid REFERENCES public.contact_requests(id),
  stripe_payment_intent_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_balance_tx_clinic_created ON public.balance_transactions (clinic_id, created_at DESC);

ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners can read their own transactions"
ON public.balance_transactions
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = balance_transactions.clinic_id AND c.user_id = auth.uid()));

CREATE POLICY "Admins can manage all transactions"
ON public.balance_transactions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Auto-create balance row for new clinics
CREATE OR REPLACE FUNCTION public.ensure_clinic_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.clinic_balances (clinic_id, balance_cents)
  VALUES (NEW.id, 0) ON CONFLICT (clinic_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER ensure_clinic_balance_trigger
AFTER INSERT ON public.clinics
FOR EACH ROW EXECUTE FUNCTION public.ensure_clinic_balance();

-- 5. Auto-charge on new contact_request
CREATE OR REPLACE FUNCTION public.auto_charge_lead_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
  v_price constant integer := 2500;
BEGIN
  SELECT balance_cents INTO v_balance
  FROM public.clinic_balances
  WHERE clinic_id = NEW.clinic_id FOR UPDATE;

  IF v_balance IS NULL THEN
    INSERT INTO public.clinic_balances (clinic_id, balance_cents)
    VALUES (NEW.clinic_id, 0) ON CONFLICT (clinic_id) DO NOTHING;
    v_balance := 0;
  END IF;

  IF v_balance >= v_price THEN
    v_new_balance := v_balance - v_price;
    UPDATE public.clinic_balances
    SET balance_cents = v_new_balance, updated_at = now()
    WHERE clinic_id = NEW.clinic_id;

    INSERT INTO public.lead_purchases (clinic_id, contact_request_id, stripe_payment_intent_id, amount_cents)
    VALUES (NEW.clinic_id, NEW.id, 'balance', v_price);

    INSERT INTO public.balance_transactions (clinic_id, type, amount_cents, balance_after_cents, contact_request_id, note)
    VALUES (NEW.clinic_id, 'lead_charge', -v_price, v_new_balance, NEW.id, 'Auto-charged on lead arrival');
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER auto_charge_lead_trigger
AFTER INSERT ON public.contact_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_charge_lead_on_insert();

-- 6. RPC: manual unlock from balance
CREATE OR REPLACE FUNCTION public.debit_balance_for_lead(p_clinic uuid, p_request uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
  v_price constant integer := 2500;
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.clinics WHERE id = p_clinic;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM 1 FROM public.contact_requests WHERE id = p_request AND clinic_id = p_clinic;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead does not belong to this clinic'; END IF;

  IF EXISTS (SELECT 1 FROM public.lead_purchases WHERE clinic_id = p_clinic AND contact_request_id = p_request) THEN
    RAISE EXCEPTION 'Lead already unlocked';
  END IF;

  SELECT balance_cents INTO v_balance
  FROM public.clinic_balances WHERE clinic_id = p_clinic FOR UPDATE;

  IF v_balance IS NULL OR v_balance < v_price THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  v_new_balance := v_balance - v_price;
  UPDATE public.clinic_balances SET balance_cents = v_new_balance, updated_at = now()
  WHERE clinic_id = p_clinic;

  INSERT INTO public.lead_purchases (clinic_id, contact_request_id, stripe_payment_intent_id, amount_cents)
  VALUES (p_clinic, p_request, 'balance', v_price);

  INSERT INTO public.balance_transactions (clinic_id, type, amount_cents, balance_after_cents, contact_request_id, note)
  VALUES (p_clinic, 'lead_charge', -v_price, v_new_balance, p_request, 'Manual unlock');

  RETURN json_build_object('success', true, 'balance_cents', v_new_balance);
END; $$;

-- 7. RPC: credit top-up (called by webhook)
CREATE OR REPLACE FUNCTION public.credit_balance_topup(p_clinic uuid, p_amount_cents integer, p_intent text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  IF p_amount_cents <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  IF p_intent IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.balance_transactions
    WHERE stripe_payment_intent_id = p_intent AND type = 'topup'
  ) THEN
    SELECT balance_cents INTO v_balance FROM public.clinic_balances WHERE clinic_id = p_clinic;
    RETURN json_build_object('success', true, 'duplicate', true, 'balance_cents', v_balance);
  END IF;

  INSERT INTO public.clinic_balances (clinic_id, balance_cents)
  VALUES (p_clinic, 0) ON CONFLICT (clinic_id) DO NOTHING;

  SELECT balance_cents INTO v_balance
  FROM public.clinic_balances WHERE clinic_id = p_clinic FOR UPDATE;

  v_new_balance := v_balance + p_amount_cents;
  UPDATE public.clinic_balances SET balance_cents = v_new_balance, updated_at = now()
  WHERE clinic_id = p_clinic;

  INSERT INTO public.balance_transactions (clinic_id, type, amount_cents, balance_after_cents, stripe_payment_intent_id, note)
  VALUES (p_clinic, 'topup', p_amount_cents, v_new_balance, p_intent, 'Stripe top-up');

  RETURN json_build_object('success', true, 'balance_cents', v_new_balance);
END; $$;

-- 8. balance_cents on clinics_public for sort
ALTER TABLE public.clinics_public ADD COLUMN IF NOT EXISTS balance_cents integer NOT NULL DEFAULT 0;

UPDATE public.clinics_public cp
SET balance_cents = COALESCE(cb.balance_cents, 0)
FROM public.clinic_balances cb
WHERE cb.clinic_id = cp.id;

-- 9. Update sync_clinics_public to include balance_cents
CREATE OR REPLACE FUNCTION public.sync_clinics_public()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance integer;
BEGIN
  IF tg_op = 'DELETE' THEN
    DELETE FROM public.clinics_public WHERE id = old.id;
    RETURN old;
  END IF;

  IF new.is_published = true
     AND new.deleted_at IS NULL
     AND new.approval_status = 'approved'
     AND new.page_status = 'live' THEN

    SELECT COALESCE(balance_cents, 0) INTO v_balance
    FROM public.clinic_balances WHERE clinic_id = new.id;

    INSERT INTO public.clinics_public (
      id, city_id, rating, review_count, is_verified, is_featured, created_at,
      experience_years, patient_count, latitude, longitude, trustpilot_rating,
      website, name, description, address, balance_cents
    ) VALUES (
      new.id, new.city_id, new.rating, new.review_count, new.is_verified, new.is_featured, new.created_at,
      new.experience_years, new.patient_count, new.latitude, new.longitude, new.trustpilot_rating,
      new.website, COALESCE(new.display_name, new.name), new.description, new.address, COALESCE(v_balance, 0)
    )
    ON CONFLICT (id) DO UPDATE SET
      city_id = excluded.city_id, rating = excluded.rating, review_count = excluded.review_count,
      is_verified = excluded.is_verified, is_featured = excluded.is_featured, created_at = excluded.created_at,
      experience_years = excluded.experience_years, patient_count = excluded.patient_count,
      latitude = excluded.latitude, longitude = excluded.longitude, trustpilot_rating = excluded.trustpilot_rating,
      website = excluded.website, name = excluded.name, description = excluded.description,
      address = excluded.address, balance_cents = excluded.balance_cents;
  ELSE
    DELETE FROM public.clinics_public WHERE id = new.id;
  END IF;

  RETURN new;
END; $$;

-- 10. Sync balance changes into clinics_public.balance_cents
CREATE OR REPLACE FUNCTION public.sync_balance_to_public()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.clinics_public SET balance_cents = NEW.balance_cents WHERE id = NEW.clinic_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER sync_balance_to_public_trigger
AFTER INSERT OR UPDATE OF balance_cents ON public.clinic_balances
FOR EACH ROW EXECUTE FUNCTION public.sync_balance_to_public();
