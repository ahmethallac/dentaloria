// Looks up a Google Business rating/review count for a given Places "New" API
// place_id. The Google API key is kept server-side only (never sent to the
// browser) since it has no HTTP-referrer restriction.

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

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data)
      return new Response(JSON.stringify({ error: data.error_message || data.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Google returns at most 5 reviews per place, chosen by its own
    // relevance algorithm — we only keep the positive ones (4-5 stars) since
    // that's all this app ever displays.
    const reviews = ((data.result.reviews ?? []) as any[])
      .filter((r) => (r.rating ?? 0) >= 4)
      .map((r) => ({
        authorName: r.author_name ?? 'Google user',
        rating: r.rating ?? null,
        text: r.text ?? '',
        relativeTimeDescription: r.relative_time_description ?? '',
        profilePhotoUrl: r.profile_photo_url ?? null,
        time: r.time ?? null,
      }))

    return new Response(
      JSON.stringify({
        name: data.result.name ?? null,
        rating: data.result.rating ?? null,
        reviewCount: data.result.user_ratings_total ?? null,
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
