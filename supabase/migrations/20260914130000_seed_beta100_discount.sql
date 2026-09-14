-- Beta-phase discount: 100% off any balance top-up or lead purchase, so
-- "everything is free during beta" is true in the checkout too, not just in
-- copy. Auto-applied client-side (src/lib/betaDiscount.ts) on the balance
-- top-up and lead-purchase screens — nobody has to type a code by hand.
-- Payment stays wired: a clinic can still remove it and pay for real, and
-- disabling it here (is_active = false) is what ends the free period.
INSERT INTO public.discount_codes (code, percent_off, is_active, max_uses)
VALUES ('BETA100', 100, true, NULL)
ON CONFLICT (code) DO UPDATE SET percent_off = 100, is_active = true;
