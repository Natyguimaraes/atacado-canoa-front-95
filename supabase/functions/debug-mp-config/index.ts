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
    console.log('=== DEBUG MP CONFIG ===')
    
    // Check all available environment variables
    const allEnvs = {
      MERCADO_PAGO_PUBLIC_KEY: Deno.env.get('MERCADO_PAGO_PUBLIC_KEY'),
      MERCADO_PAGO_PUBLIC_KEY_TEST: Deno.env.get('MERCADO_PAGO_PUBLIC_KEY_TEST'),
      MERCADO_PAGO_PUBLIC_KEY_PROD: Deno.env.get('MERCADO_PAGO_PUBLIC_KEY_PROD'),
      MERCADO_PAGO_ACCESS_TOKEN: Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN'),
      MERCADO_PAGO_ACCESS_TOKEN_TEST: Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST'),
      MERCADO_PAGO_ACCESS_TOKEN_PROD: Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD'),
    }
    
    console.log('Available environment variables:')
    for (const [key, value] of Object.entries(allEnvs)) {
      console.log(`${key}: ${value ? `${value.substring(0, 20)}...` : 'NOT SET'}`)
    }
    
    // Use fallback logic
    const publicKey = allEnvs.MERCADO_PAGO_PUBLIC_KEY_TEST || allEnvs.MERCADO_PAGO_PUBLIC_KEY
    const accessToken = allEnvs.MERCADO_PAGO_ACCESS_TOKEN_TEST || allEnvs.MERCADO_PAGO_ACCESS_TOKEN
    
    if (!publicKey) {
      throw new Error('No public key found in any environment variable')
    }
    
    if (!accessToken) {
      throw new Error('No access token found in any environment variable')
    }

    return new Response(
      JSON.stringify({
        publicKey,
        accessToken,
        environment: 'test',
        debug: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in debug-mp-config:', error)
    return new Response(
      JSON.stringify({
        error: 'Error getting Mercado Pago configuration',
        details: error.message,
        debug: true
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})