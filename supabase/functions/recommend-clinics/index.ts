import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    let targetCityId: string | null = null;
    if (excludeId) {
      const { data: excluded } = await supabase
        .from("clinics_public")
        .select("city_id")
        .eq("id", excludeId)
        .maybeSingle();
      targetCityId = excluded?.city_id || null;
    }

    const pickedIds = new Set<string>();
    if (excludeId) pickedIds.add(excludeId);

    // Helper to fetch candidates with optional balance filter and city filter
    const fetchCandidates = async (opts: {
      cityId?: string | null;
      requireBalance?: boolean;
      limit: number;
    }) => {
      let q = supabase
        .from("clinics_public")
        .select("id, name, balance_cents")
        .limit(opts.limit * 3); // fetch a larger pool for randomization

      if (opts.requireBalance) {
        q = q.gt("balance_cents", 0);
      }

      if (opts.cityId) {
        q = q.eq("city_id", opts.cityId);
      }

      if (pickedIds.size > 0) {
        q = q.not("id", "in", `(${Array.from(pickedIds).join(",")})`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    };

    // Random pick helper
    const randomPick = (pool: any[], count: number) => {
      const copy = pool.slice();
      const picks: typeof pool = [];
      while (picks.length < count && copy.length > 0) {
        const i = Math.floor(Math.random() * copy.length);
        picks.push(copy.splice(i, 1)[0]);
      }
      return picks;
    };

    // 1. Try same-city clinics with balance
    const sameCityBalance = targetCityId
      ? await fetchCandidates({ cityId: targetCityId, requireBalance: true, limit: 3 })
      : [];
    const sameCityPicks = randomPick(sameCityBalance, 3);
    sameCityPicks.forEach((c) => pickedIds.add(c.id));

    // 2. If fewer than 3, fill globally with balance
    if (sameCityPicks.length < 3) {
      const needed = 3 - sameCityPicks.length;
      const globalBalance = await fetchCandidates({ requireBalance: true, limit: needed });
      const globalPicks = randomPick(globalBalance, needed);
      globalPicks.forEach((c) => pickedIds.add(c.id));
      sameCityPicks.push(...globalPicks);
    }

    // 3. Safety net: if still fewer than 3, fall back to any published clinic
    // so the popup never appears empty when real clinics exist.
    if (sameCityPicks.length < 3) {
      const needed = 3 - sameCityPicks.length;
      const fallback = await fetchCandidates({ requireBalance: false, limit: needed });
      const fallbackPicks = randomPick(fallback, needed);
      fallbackPicks.forEach((c) => pickedIds.add(c.id));
      sameCityPicks.push(...fallbackPicks);
    }

    const picks = sameCityPicks;

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
