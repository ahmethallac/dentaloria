/**
 * The beta-phase discount code (100% off), auto-applied on the balance
 * top-up and lead-purchase screens so nobody has to type it in. See
 * supabase/migrations/20260914130000_seed_beta100_discount.sql — deactivate
 * the code there to end the free period; both screens fall back to normal
 * pricing on their own if the lookup fails or the code is off.
 */
export const BETA_DISCOUNT_CODE = "BETA100";
