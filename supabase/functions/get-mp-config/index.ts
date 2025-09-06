import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== GET MP CONFIG ===')
    
    // Parse body only for POST requests
    let environment = 'test'
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        environment = body.environment || 'test'
      } catch (e) {
        console.log('No body or invalid JSON, using default environment:', environment)
      }
    }
    console.log('Environment requested:', environment)

    // Get the appropriate keys based on environment
    let publicKey: string
    let accessToken: string

    if (environment === 'production') {
      publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY_PROD')!
      accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD')!
      console.log('Using production credentials')
    } else {
      publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY')!
      accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
      console.log('Using test credentials')
    }

    if (!publicKey) {
      console.error(`Missing public key for ${environment} environment`)
      throw new Error(`Missing public key for ${environment} environment`)
    }

    if (!accessToken) {
      console.error(`Missing access token for ${environment} environment`)
      throw new Error(`Missing access token for ${environment} environment`)
    }

    console.log('Public key found:', publicKey.substring(0, 20) + '...')
    console.log('Access token found:', accessToken.substring(0, 20) + '...')

    return new Response(
      JSON.stringify({
        publicKey,
        accessToken,
        environment
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in get-mp-config:', error)
    return new Response(
      JSON.stringify({
        error: 'Error getting Mercado Pago configuration',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})