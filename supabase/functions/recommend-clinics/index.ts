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

    // "Same language" means the languages actually spoken by the clinic the
    // patient just applied to (clinics_public.languages), not the site's UI
    // locale (en/tr) — those are unrelated concepts.
    let targetCityId: string | null = null;
    let targetLanguages: string[] = [];
    if (excludeId) {
      const { data: excluded } = await supabase
        .from("clinics_public")
        .select("city_id, languages")
        .eq("id", excludeId)
        .maybeSingle();
      targetCityId = excluded?.city_id || null;
      targetLanguages = Array.isArray(excluded?.languages) ? excluded.languages : [];
    }

    const pickedIds = new Set<string>();
    if (excludeId) pickedIds.add(excludeId);

    const fetchCandidates = async (opts: {
      cityId?: string | null;
      requireLanguage?: boolean;
      requireBalance?: boolean;
      limit: number;
    }) => {
      let q = supabase
        .from("clinics_public")
        .select("id, name, slug, rating, languages, city_id, balance_cents")
        .limit(Math.max(opts.limit * 4, 12));

      if (opts.requireBalance) q = q.gt("balance_cents", 0);
      if (opts.cityId) q = q.eq("city_id", opts.cityId);
      if (opts.requireLanguage) q = q.overlaps("languages", targetLanguages);

      if (pickedIds.size > 0) {
        q = q.not("id", "in", `(${Array.from(pickedIds).join(",")})`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    };

    const randomPick = (pool: any[], count: number) => {
      const copy = pool.slice();
      const picks: any[] = [];
      while (picks.length < count && copy.length > 0) {
        const i = Math.floor(Math.random() * copy.length);
        picks.push(copy.splice(i, 1)[0]);
      }
      return picks;
    };

    const picks: any[] = [];

    // Tier 1: same city + same language + balance
    // (only meaningful if the applied-to clinic actually has languages set)
    if (targetCityId && targetLanguages.length > 0) {
      const t1 = await fetchCandidates({
        cityId: targetCityId,
        requireLanguage: true,
        requireBalance: true,
        limit: 3,
      });
      const p1 = randomPick(t1, 3 - picks.length);
      p1.forEach((c) => pickedIds.add(c.id));
      picks.push(...p1);
    }

    // Tier 2: same language (any city) + balance
    if (picks.length < 3 && targetLanguages.length > 0) {
      const t2 = await fetchCandidates({
        requireLanguage: true,
        requireBalance: true,
        limit: 3 - picks.length,
      });
      const p2 = randomPick(t2, 3 - picks.length);
      p2.forEach((c) => pickedIds.add(c.id));
      picks.push(...p2);
    }

    // Tier 3: last-resort safety net — any published clinic
    if (picks.length < 3) {
      const t3 = await fetchCandidates({ limit: 3 - picks.length });
      const p3 = randomPick(t3, 3 - picks.length);
      p3.forEach((c) => pickedIds.add(c.id));
      picks.push(...p3);
    }

    if (picks.length === 0) {
      return new Response(JSON.stringify({ clinics: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = picks.map((c) => c.id);
    const cityIds = Array.from(new Set(picks.map((c) => c.city_id).filter(Boolean)));

    const [{ data: images }, { data: cities }] = await Promise.all([
      supabase
        .from("clinic_images")
        .select("clinic_id, image_url, is_primary")
        .in("clinic_id", ids),
      cityIds.length > 0
        ? supabase.from("cities").select("id, name, slug").in("id", cityIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const imgByClinic = new Map<string, string>();
    for (const img of images || []) {
      if (!imgByClinic.has(img.clinic_id) || img.is_primary) {
        imgByClinic.set(img.clinic_id, img.image_url);
      }
    }
    const cityById = new Map<string, { name: string; slug: string }>();
    for (const c of cities || []) cityById.set(c.id, { name: c.name, slug: c.slug });

    const result = picks.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image_url: imgByClinic.get(c.id) || null,
      rating: c.rating ?? null,
      city: c.city_id ? cityById.get(c.city_id)?.name || null : null,
      citySlug: c.city_id ? cityById.get(c.city_id)?.slug || null : null,
      languages: Array.isArray(c.languages) ? c.languages : [],
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
