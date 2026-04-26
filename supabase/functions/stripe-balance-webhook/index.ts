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
    const intent = session.payment_intent || session.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (meta.type === "balance_topup") {
      const clinicId = meta.clinic_id;
      const amountCents = parseInt(meta.amount_cents, 10);
      if (!clinicId || !amountCents || amountCents <= 0) {
        console.error("balance_topup bad metadata", meta);
        return new Response("Bad metadata", { status: 400 });
      }

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

      await logRedemption(supabase, meta, "balance_topup", session.id);
      console.log(`Credited €${(amountCents / 100).toFixed(2)} to clinic ${clinicId}`, data);

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (meta.type === "direct_lead_purchase") {
      const clinicId = meta.clinic_id;
      const requestIds = String(meta.request_ids || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!clinicId || requestIds.length === 0) {
        console.error("direct_lead_purchase bad metadata", meta);
        return new Response("Bad metadata", { status: 400 });
      }

      let unlocked = 0;
      for (const id of requestIds) {
        const { error } = await supabase.rpc("mark_lead_purchased", {
          p_clinic: clinicId,
          p_request: id,
          p_intent: intent,
          p_amount_cents: 2500,
        });
        if (error) {
          console.error("mark_lead_purchased error", id, error.message);
        } else {
          unlocked++;
        }
      }

      await logRedemption(supabase, meta, "direct_lead_purchase", session.id);

      console.log(`Direct purchase: unlocked ${unlocked}/${requestIds.length} leads for clinic ${clinicId}`);
      return new Response(JSON.stringify({ success: true, unlocked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ignored: true }), {
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

async function logRedemption(
  supabase: any,
  meta: Record<string, string>,
  context: string,
  sessionId: string
) {
  const code = (meta.discount_code || "").trim();
  if (!code) return;
  const amountOff = parseInt(meta.amount_off_cents || "0", 10) || 0;
  const clinicId = meta.clinic_id;
  try {
    await supabase.from("discount_redemptions").insert({
      code,
      clinic_id: clinicId,
      context,
      amount_off_cents: amountOff,
      stripe_session_id: sessionId,
    });
    const { data: row } = await supabase
      .from("discount_codes")
      .select("used_count")
      .eq("code", code)
      .maybeSingle();
    if (row) {
      await supabase
        .from("discount_codes")
        .update({ used_count: (row.used_count ?? 0) + 1 })
        .eq("code", code);
    }
  } catch (e) {
    console.error("logRedemption failed:", (e as Error).message);
  }
}
