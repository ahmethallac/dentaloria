import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { clinicId, contactRequestIds } = await req.json();

    if (!clinicId || !contactRequestIds?.length) {
      return new Response(JSON.stringify({ error: 'Missing clinicId or contactRequestIds' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user owns this clinic
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, user_id')
      .eq('id', clinicId)
      .eq('user_id', userId)
      .single();

    if (clinicError || !clinic) {
      return new Response(JSON.stringify({ error: 'Clinic not found or access denied' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check billing settings
    const { data: billing } = await supabaseAdmin
      .from('clinic_billing_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();

    const isFree = billing?.billing_type === 'free';

    // Filter out already purchased leads
    const { data: existingPurchases } = await supabaseAdmin
      .from('lead_purchases')
      .select('contact_request_id')
      .eq('clinic_id', clinicId)
      .in('contact_request_id', contactRequestIds);

    const alreadyPurchased = new Set(existingPurchases?.map(p => p.contact_request_id) || []);
    const newLeadIds = contactRequestIds.filter((id: string) => !alreadyPurchased.has(id));

    if (newLeadIds.length === 0) {
      return new Response(JSON.stringify({ error: 'All selected leads are already purchased' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (isFree) {
      // Free clinic - insert purchases with $0
      const purchases = newLeadIds.map((id: string) => ({
        clinic_id: clinicId,
        contact_request_id: id,
        stripe_payment_intent_id: 'free',
        amount_cents: 0,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('lead_purchases')
        .insert(purchases);

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ 
        success: true, 
        free: true, 
        purchasedCount: newLeadIds.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Paid clinic - create Stripe checkout
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Payment system not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const pricePerLead = billing?.price_per_lead_cents || 2500;
    const totalAmount = pricePerLead * newLeadIds.length;

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': `https://dentaloria.lovable.app/clinic/${clinicId}/panel?payment=success`,
        'cancel_url': `https://dentaloria.lovable.app/clinic/${clinicId}/panel?payment=cancelled`,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `Patient Lead Access (${newLeadIds.length} leads)`,
        'line_items[0][price_data][unit_amount]': String(pricePerLead),
        'line_items[0][quantity]': String(newLeadIds.length),
        'metadata[clinic_id]': clinicId,
        'metadata[contact_request_ids]': JSON.stringify(newLeadIds),
        'metadata[user_id]': userId,
      }),
    });

    const session = await stripeResponse.json();

    if (session.error) {
      throw new Error(session.error.message);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      url: session.url,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in create-lead-checkout:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
