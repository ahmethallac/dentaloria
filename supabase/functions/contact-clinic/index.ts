import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContactRequest {
  clinicId: string
  name: string
  email: string
  phone?: string
  treatment?: string
  message?: string
}

interface RateLimitCheck {
  allowed: boolean
  retryAfter?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { clinicId, name, email, phone, treatment, message } = await req.json() as ContactRequest
    
    // Get client IP and user agent for rate limiting and abuse prevention
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    console.log(`Contact request from IP: ${clientIP}, User-Agent: ${userAgent}`)

    // Check rate limits (max 5 requests per hour per IP)
    const rateLimitCheck = await checkRateLimit(supabaseClient, clientIP, 'contact_request')
    if (!rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`)
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitCheck.retryAfter 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Basic input validation and sanitization
    if (!clinicId || !name || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clinicId, name, email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check for potential spam patterns
    const spamCheck = checkForSpam(name, email, message || '')
    if (spamCheck.isSpam) {
      console.log(`Potential spam detected: ${spamCheck.reason}`)
      return new Response(
        JSON.stringify({ error: 'Request blocked due to content policy' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Insert contact request with abuse prevention data
    const { data, error } = await supabaseClient
      .from('contact_requests')
      .insert({
        clinic_id: clinicId,
        name: name.slice(0, 100), // Limit field lengths
        email: email.slice(0, 100),
        phone: phone?.slice(0, 50),
        treatment: treatment?.slice(0, 200),
        message: message?.slice(0, 1000),
        ip_address: clientIP,
        user_agent: userAgent.slice(0, 500)
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to submit contact request' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update rate limit counter
    await updateRateLimit(supabaseClient, clientIP, 'contact_request')

    console.log(`Contact request submitted successfully: ${data.id}`)

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing contact request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function checkRateLimit(
  supabase: any, 
  ipAddress: string, 
  action: string
): Promise<RateLimitCheck> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('ip_address', ipAddress)
    .eq('action', action)
    .gte('window_start', oneHourAgo)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Rate limit check error:', error)
    return { allowed: true } // Allow on error to avoid blocking legitimate users
  }

  if (!data) {
    return { allowed: true }
  }

  const maxRequests = 5
  if (data.request_count >= maxRequests) {
    const windowStart = new Date(data.window_start)
    const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000)
    const retryAfter = Math.ceil((windowEnd.getTime() - Date.now()) / 1000)
    
    return { 
      allowed: false, 
      retryAfter: retryAfter > 0 ? retryAfter : 60 
    }
  }

  return { allowed: true }
}

async function updateRateLimit(
  supabase: any,
  ipAddress: string,
  action: string
): Promise<void> {
  const currentHour = new Date()
  currentHour.setMinutes(0, 0, 0)
  
  try {
    const { error } = await supabase
      .from('rate_limits')
      .upsert({
        ip_address: ipAddress,
        action: action,
        window_start: currentHour.toISOString(),
        request_count: 1
      }, {
        onConflict: 'ip_address,action,window_start',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('Rate limit update error:', error)
    }
  } catch (error) {
    console.error('Rate limit update failed:', error)
  }
}

function checkForSpam(name: string, email: string, message: string): { isSpam: boolean, reason?: string } {
  // Check for obvious spam patterns
  const spamPatterns = [
    /viagra|cialis|pharmacy/i,
    /\$\$\$|\bmoney\b.*\bfast\b/i,
    /win.*\b(money|cash|prize)\b/i,
    /click.*here.*now/i,
    /urgent.*respond/i,
    /congratulations.*winner/i
  ]

  const combinedText = `${name} ${email} ${message}`.toLowerCase()
  
  for (const pattern of spamPatterns) {
    if (pattern.test(combinedText)) {
      return { isSpam: true, reason: 'Spam pattern detected' }
    }
  }

  // Check for excessive special characters or URLs
  const specialCharCount = (combinedText.match(/[!@#$%^&*()_+={}\[\]|\\:";'<>?,./]/g) || []).length
  const urlCount = (combinedText.match(/https?:\/\/|www\./g) || []).length
  
  if (specialCharCount > combinedText.length * 0.3) {
    return { isSpam: true, reason: 'Excessive special characters' }
  }
  
  if (urlCount > 2) {
    return { isSpam: true, reason: 'Too many URLs' }
  }

  return { isSpam: false }
}