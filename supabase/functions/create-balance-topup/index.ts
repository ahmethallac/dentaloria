import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PACKAGE_AMOUNTS = new Set([5000, 12000, 23000, 44000]);
const MIN_CUSTOM_CENTS = 2500; // €25

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const clinicId = String(body?.clinicId || "");
    const amountCents = Number(body?.amountCents);

    if (!clinicId || !Number.isInteger(amountCents)) {
      return new Response(
        JSON.stringify({ error: "Missing clinicId or amountCents" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isPackage = PACKAGE_AMOUNTS.has(amountCents);
    const isValidCustom = amountCents >= MIN_CUSTOM_CENTS && amountCents <= 1_000_000;
    if (!isPackage && !isValidCustom) {
      return new Response(
        JSON.stringify({
          error: "Amount must be a valid package or at least €25",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify ownership
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .select("id, user_id, name")
      .eq("id", clinicId)
      .maybeSingle();
    if (clinicError || !clinic) {
      return new Response(JSON.stringify({ error: "Clinic not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (clinic.user_id !== userId) {
      // also allow admins
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "sub_admin"])
        .maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment system not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const origin =
      req.headers.get("origin") || "https://dentaloria.lovable.app";
    const leads = Math.floor(amountCents / 2500);

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set(
      "success_url",
      `${origin}/clinic/${clinicId}/panel/balance?topup=success`
    );
    params.set(
      "cancel_url",
      `${origin}/clinic/${clinicId}/panel/balance?topup=cancelled`
    );
    params.set("line_items[0][price_data][currency]", "eur");
    params.set(
      "line_items[0][price_data][product_data][name]",
      `Dentaloria Balance Top-up (${leads} lead${leads === 1 ? "" : "s"})`
    );
    params.set("line_items[0][price_data][unit_amount]", String(amountCents));
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[type]", "balance_topup");
    params.set("metadata[clinic_id]", clinicId);
    params.set("metadata[amount_cents]", String(amountCents));
    params.set("metadata[user_id]", userId);

    const stripeRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );

    const session = await stripeRes.json();
    if (session.error) {
      throw new Error(session.error.message);
    }

    return new Response(
      JSON.stringify({ success: true, url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-balance-topup error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
