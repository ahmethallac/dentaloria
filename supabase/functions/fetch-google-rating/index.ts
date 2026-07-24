// Looks up a Google Business rating/review count for a given Places "New" API
// place_id. The Google API key is kept server-side only (never sent to the
// browser) since it has no HTTP-referrer restriction.
//
// Uses the Places API (New) v1 endpoint rather than the legacy Place Details
// API: the legacy API only returns each review pre-translated into a single
// requested `language`, discarding the reviewer's original text entirely.
// The New API's review objects expose both `text` (translated) and
// `originalText` (the reviewer's actual original-language text) — we always
// store the original, then run it through our own translate-content
// pipeline into all 7 site locales at save time.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { placeId } = await req.json()
    if (!placeId || typeof placeId !== 'string') {
      return new Response(JSON.stringify({ error: 'placeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured')
    }

    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,rating,userRatingCount,reviews',
      },
    })
    const data = await res.json()

    if (!res.ok) {
      console.error('Google Places API error:', data)
      return new Response(JSON.stringify({ error: data?.error?.message || 'Google Places API error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Google returns at most 5 reviews per place, chosen by its own
    // relevance algorithm — we only keep the positive ones (4-5 stars) since
    // that's all this app ever displays. Prefer originalText (the reviewer's
    // actual language) over text (Google's own translation), so our own
    // translate-content pipeline works from real source text.
    const reviews = ((data.reviews ?? []) as any[])
      .filter((r) => (r.rating ?? 0) >= 4)
      .map((r) => ({
        authorName: r.authorAttribution?.displayName ?? 'Google user',
        rating: r.rating ?? null,
        text: r.originalText?.text ?? r.text?.text ?? '',
        relativeTimeDescription: r.relativePublishTimeDescription ?? '',
        profilePhotoUrl: r.authorAttribution?.photoUri ?? null,
        time: r.publishTime ? Math.floor(new Date(r.publishTime).getTime() / 1000) : null,
      }))

    return new Response(
      JSON.stringify({
        name: data.displayName?.text ?? null,
        rating: data.rating ?? null,
        reviewCount: data.userRatingCount ?? null,
        reviews,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('fetch-google-rating error:', e)
    return new Response(JSON.stringify({ error: 'Failed to fetch Google rating' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
