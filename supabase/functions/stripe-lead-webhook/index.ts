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
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    // In production, verify webhook signature
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    let event;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response('Invalid payload', { status: 400 });
    }

    if (event.type !== 'checkout.session.completed') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const session = event.data.object;
    const { clinic_id, contact_request_ids, user_id } = session.metadata || {};

    if (!clinic_id || !contact_request_ids) {
      console.error('Missing metadata in webhook');
      return new Response('Missing metadata', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const leadIds = JSON.parse(contact_request_ids);
    const amountPerLead = Math.round((session.amount_total || 0) / leadIds.length);

    // Insert lead purchases
    const purchases = leadIds.map((id: string) => ({
      clinic_id,
      contact_request_id: id,
      stripe_payment_intent_id: session.payment_intent || session.id,
      amount_cents: amountPerLead,
    }));

    const { error: insertError } = await supabase
      .from('lead_purchases')
      .insert(purchases);

    if (insertError) {
      console.error('Error inserting lead purchases:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to record purchases' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully unlocked ${leadIds.length} leads for clinic ${clinic_id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
