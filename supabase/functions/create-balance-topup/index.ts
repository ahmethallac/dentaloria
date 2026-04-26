import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PACKAGE_AMOUNTS = new Set([5000, 12000, 23000, 44000]);
const MIN_CUSTOM_CENTS = 2500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const clinicId = String(body?.clinicId || "");
    const amountCents = Number(body?.amountCents);
    const discountCodeRaw = typeof body?.discountCode === "string" ? body.discountCode.trim() : "";

    if (!clinicId || !Number.isInteger(amountCents)) {
      return json({ error: "Missing clinicId or amountCents" }, 400);
    }

    const isPackage = PACKAGE_AMOUNTS.has(amountCents);
    const isValidCustom = amountCents >= MIN_CUSTOM_CENTS && amountCents <= 1_000_000;
    if (!isPackage && !isValidCustom) {
      return json({ error: "Amount must be a valid package or at least €25" }, 400);
    }

    // Verify ownership
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id, user_id, name")
      .eq("id", clinicId)
      .maybeSingle();
    if (!clinic) return json({ error: "Clinic not found" }, 404);
    if (clinic.user_id !== userId) {
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "sub_admin"])
        .maybeSingle();
      if (!roleRow) return json({ error: "Access denied" }, 403);
    }

    let finalCents = amountCents;
    let amountOffCents = 0;
    let discountCode = "";
    if (discountCodeRaw) {
      const { data: validation, error: vErr } = await supabaseAdmin.rpc(
        "validate_discount_code",
        { p_code: discountCodeRaw, p_amount_cents: amountCents }
      );
      if (vErr) throw vErr;
      const v = validation as any;
      if (!v?.valid) {
        return json({ error: `Discount code invalid: ${v?.reason || "unknown"}` }, 400);
      }
      discountCode = v.code;
      amountOffCents = v.amount_off_cents;
      finalCents = v.final_cents;
    }

    // 100% discount → credit balance directly without Stripe
    if (finalCents === 0) {
      const { data, error } = await supabaseAdmin.rpc("credit_balance_topup", {
        p_clinic: clinicId,
        p_amount_cents: amountCents,
        p_intent: discountCode ? `free:${discountCode}:${Date.now()}` : null,
      });
      if (error) throw error;
      if (discountCode) {
        await supabaseAdmin.from("discount_redemptions").insert({
          code: discountCode,
          clinic_id: clinicId,
          context: "balance_topup",
          amount_off_cents: amountOffCents,
          stripe_session_id: null,
        });
        const { data: row } = await supabaseAdmin
          .from("discount_codes")
          .select("used_count")
          .eq("code", discountCode)
          .maybeSingle();
        if (row) {
          await supabaseAdmin
            .from("discount_codes")
            .update({ used_count: (row.used_count ?? 0) + 1 })
            .eq("code", discountCode);
        }
      }
      return json({ success: true, credited: true, data });
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) return json({ error: "Payment system not configured" }, 500);

    const origin = req.headers.get("origin") || "https://dentaloria.lovable.app";
    const leads = Math.floor(amountCents / 2500);

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${origin}/clinic/${clinicId}/panel/balance?topup=success`);
    params.set("cancel_url", `${origin}/clinic/${clinicId}/panel/balance?topup=cancelled`);
    params.set("line_items[0][price_data][currency]", "eur");
    params.set(
      "line_items[0][price_data][product_data][name]",
      `Dentaloria Balance Top-up (${leads} lead${leads === 1 ? "" : "s"})`
    );
    params.set("line_items[0][price_data][unit_amount]", String(finalCents));
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[type]", "balance_topup");
    params.set("metadata[clinic_id]", clinicId);
    params.set("metadata[amount_cents]", String(amountCents));
    params.set("metadata[user_id]", userId);
    params.set("metadata[discount_code]", discountCode);
    params.set("metadata[amount_off_cents]", String(amountOffCents));

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await stripeRes.json();
    if (session.error) throw new Error(session.error.message);

    return json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("create-balance-topup error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
