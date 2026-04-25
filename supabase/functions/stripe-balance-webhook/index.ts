import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid payload", { status: 400 });
    }

    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = event.data.object;
    const meta = session.metadata || {};
    if (meta.type !== "balance_topup") {
      // Not for us — acknowledge and skip
      return new Response(JSON.stringify({ ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clinicId = meta.clinic_id;
    const amountCents = parseInt(meta.amount_cents, 10);
    const intent = session.payment_intent || session.id;

    if (!clinicId || !amountCents || amountCents <= 0) {
      console.error("stripe-balance-webhook: bad metadata", meta);
      return new Response("Bad metadata", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.rpc("credit_balance_topup", {
      p_clinic: clinicId,
      p_amount_cents: amountCents,
      p_intent: intent,
    });

    if (error) {
      console.error("credit_balance_topup error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `Credited €${(amountCents / 100).toFixed(2)} to clinic ${clinicId}`,
      data
    );

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("stripe-balance-webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
