import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRICE_CENTS = 2500;
const EXPIRY_MS = 48 * 60 * 60 * 1000;

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
    const requestIds: string[] = Array.isArray(body?.requestIds)
      ? body.requestIds.filter((x: any) => typeof x === "string")
      : [];
    const discountCodeRaw = typeof body?.discountCode === "string" ? body.discountCode.trim() : "";

    if (!clinicId || requestIds.length === 0) {
      return json({ error: "Missing clinicId or requestIds" }, 400);
    }
    if (requestIds.length > 100) {
      return json({ error: "Too many leads selected" }, 400);
    }

    // Verify ownership (or admin)
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

    // Validate leads: belong to clinic, not already purchased, not expired
    const { data: leads, error: leadsErr } = await supabaseAdmin
      .from("contact_requests")
      .select("id, created_at, clinic_id")
      .in("id", requestIds)
      .eq("clinic_id", clinicId);
    if (leadsErr) throw leadsErr;
    if (!leads || leads.length !== requestIds.length) {
      return json({ error: "Some leads do not belong to this clinic" }, 400);
    }
    const now = Date.now();
    for (const l of leads) {
      if (now - new Date(l.created_at).getTime() > EXPIRY_MS) {
        return json({ error: "One or more leads have expired" }, 400);
      }
    }

    const { data: alreadyPurchased } = await supabaseAdmin
      .from("lead_purchases")
      .select("contact_request_id")
      .eq("clinic_id", clinicId)
      .in("contact_request_id", requestIds);
    if ((alreadyPurchased?.length || 0) > 0) {
      return json({ error: "One or more leads are already unlocked" }, 400);
    }

    const subtotalCents = requestIds.length * PRICE_CENTS;
    let finalCents = subtotalCents;
    let amountOffCents = 0;
    let discountCode = "";

    if (discountCodeRaw) {
      const { data: validation, error: vErr } = await supabaseAdmin.rpc(
        "validate_discount_code",
        { p_code: discountCodeRaw, p_amount_cents: subtotalCents }
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

    // 100% discount → bypass Stripe, unlock immediately
    if (finalCents === 0) {
      for (const id of requestIds) {
        const { error: e } = await supabaseAdmin.rpc("mark_lead_purchased", {
          p_clinic: clinicId,
          p_request: id,
          p_intent: discountCode ? `free:${discountCode}` : "free",
          p_amount_cents: 0,
        });
        if (e) console.error("mark_lead_purchased error", id, e.message);
      }
      if (discountCode) {
        await supabaseAdmin.from("discount_redemptions").insert({
          code: discountCode,
          clinic_id: clinicId,
          context: "direct_lead_purchase",
          amount_off_cents: amountOffCents,
          stripe_session_id: null,
        });
        await supabaseAdmin.rpc("__noop__").catch(() => {});
        // increment used_count
        await supabaseAdmin
          .from("discount_codes")
          .update({ used_count: (await getUsedCount(supabaseAdmin, discountCode)) + 1 })
          .eq("code", discountCode);
      }
      return json({
        success: true,
        freeUnlock: true,
        unlockedCount: requestIds.length,
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) return json({ error: "Payment system not configured" }, 500);

    const origin = req.headers.get("origin") || "https://dentaloria.lovable.app";
    const idsCsv = requestIds.join(",");

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set(
      "success_url",
      `${origin}/clinic/${clinicId}/panel?section=patients&purchase=success`
    );
    params.set(
      "cancel_url",
      `${origin}/clinic/${clinicId}/panel/purchase-leads?ids=${encodeURIComponent(idsCsv)}&purchase=cancelled`
    );
    params.set("line_items[0][price_data][currency]", "eur");
    params.set(
      "line_items[0][price_data][product_data][name]",
      `Dentaloria Lead Purchase (${requestIds.length} lead${requestIds.length === 1 ? "" : "s"})`
    );
    params.set("line_items[0][price_data][unit_amount]", String(finalCents));
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[type]", "direct_lead_purchase");
    params.set("metadata[clinic_id]", clinicId);
    params.set("metadata[user_id]", userId);
    params.set("metadata[request_ids]", idsCsv);
    params.set("metadata[discount_code]", discountCode);
    params.set("metadata[amount_off_cents]", String(amountOffCents));
    params.set("metadata[final_cents]", String(finalCents));

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
    console.error("create-direct-lead-purchase error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUsedCount(client: any, code: string): Promise<number> {
  const { data } = await client.from("discount_codes").select("used_count").eq("code", code).maybeSingle();
  return data?.used_count ?? 0;
}
