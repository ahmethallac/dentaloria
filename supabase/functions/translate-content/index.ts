// Translates a piece of clinic-authored text (or small HTML fragment) into
// all 6 non-English site locales in a single OpenAI call. Called once at
// save/sync time (ClinicInfoTab, ClinicDoctorsManager, fetch-google-rating
// callers) — never during a visitor's page load — so translation latency
// never affects anyone browsing the site.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOCALE_NAMES: Record<string, string> = {
  tr: 'Turkish',
  ro: 'Romanian',
  pl: 'Polish',
  ru: 'Russian',
  de: 'German',
  fr: 'French',
}

// The rich-text editor only ever produces these tags with no attributes
// (see src/lib/sanitizeHtml.ts) — kept in sync here so the tag-count safety
// check below is meaningful.
const ALLOWED_HTML_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li']

interface RequestBody {
  text: string
  isHtml?: boolean
  targetLocales?: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, isHtml, targetLocales } = (await req.json()) as RequestBody

    if (!text?.trim()) {
      return new Response(JSON.stringify({ translations: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

    const locales = targetLocales?.length ? targetLocales : Object.keys(LOCALE_NAMES)
    const localeList = locales.map((l) => `"${l}" (${LOCALE_NAMES[l] || l})`).join(', ')

    const systemPrompt = isHtml
      ? `You are a professional translator for a dental clinic marketplace. Translate the given HTML fragment into each requested language. ` +
        `The HTML only ever uses these tags: ${ALLOWED_HTML_TAGS.join(', ')}, with no attributes. ` +
        `Preserve every tag exactly as-is and in the same structure — translate ONLY the text content between tags, never add, remove, or alter tags. ` +
        `Respond with strict JSON only: {"<localeCode>": "<translated HTML>", ...}, one key per requested locale, no extra commentary.`
      : `You are a professional translator for a dental clinic marketplace. Translate the given text into each requested language, ` +
        `preserving tone and meaning appropriate for a medical/dental context. ` +
        `Respond with strict JSON only: {"<localeCode>": "<translation>", ...}, one key per requested locale, no extra commentary.`

    const userPrompt = `Target languages: ${localeList}\n\nText:\n${text}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('OpenAI error:', res.status, body)
      throw new Error(`OpenAI error ${res.status}`)
    }

    const data = await res.json()
    let translations: Record<string, string> = {}
    try {
      translations = JSON.parse(data.choices[0].message.content)
    } catch (parseErr) {
      console.error('Failed to parse OpenAI response as JSON:', parseErr)
      throw new Error('Malformed translation response')
    }

    // Safety net for HTML content: if a locale's translated tag count
    // doesn't match the original, drop that locale's result rather than
    // risk storing mangled markup — the caller falls back to the original
    // English text for that locale until a future save succeeds cleanly.
    if (isHtml) {
      const originalTagCount = (text.match(/<[^>]+>/g) || []).length
      for (const loc of Object.keys(translations)) {
        const tagCount = (translations[loc].match(/<[^>]+>/g) || []).length
        if (tagCount !== originalTagCount) {
          console.error(`Dropping ${loc} translation: tag count mismatch (${tagCount} vs ${originalTagCount})`)
          delete translations[loc]
        }
      }
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('translate-content error:', e)
    return new Response(JSON.stringify({ error: 'Translation failed', translations: {} }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
