import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let excludeId: string | null = null;
    if (req.method === "GET") {
      excludeId = url.searchParams.get("excludeClinicId");
    } else {
      const body = await req.json().catch(() => ({}));
      excludeId = body?.excludeClinicId || null;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let q = supabase
      .from("clinics_public")
      .select("id, name, balance_cents")
      .gt("balance_cents", 0)
      .limit(50);
    if (excludeId) q = q.neq("id", excludeId);

    const { data: candidates, error } = await q;
    if (error) throw error;

    // Random pick 3
    const pool = (candidates || []).slice();
    const picks: typeof pool = [];
    while (picks.length < 3 && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(i, 1)[0]);
    }

    if (picks.length === 0) {
      return new Response(JSON.stringify({ clinics: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch a primary image per clinic
    const ids = picks.map((c) => c.id);
    const { data: images } = await supabase
      .from("clinic_images")
      .select("clinic_id, image_url, is_primary")
      .in("clinic_id", ids);

    const imgByClinic = new Map<string, string>();
    for (const img of images || []) {
      if (!imgByClinic.has(img.clinic_id) || img.is_primary) {
        imgByClinic.set(img.clinic_id, img.image_url);
      }
    }

    const result = picks.map((c) => ({
      id: c.id,
      name: c.name,
      image_url: imgByClinic.get(c.id) || null,
    }));

    return new Response(JSON.stringify({ clinics: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("recommend-clinics error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
