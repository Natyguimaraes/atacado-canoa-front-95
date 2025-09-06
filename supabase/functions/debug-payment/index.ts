import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('=== PROCESS PAYMENT DEBUG START ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Read and log request body
    const bodyText = await req.text()
    console.log('Raw body:', bodyText)
    
    let requestBody
    try {
      requestBody = JSON.parse(bodyText)
      console.log('Parsed body keys:', Object.keys(requestBody))
      console.log('OrderData present:', !!requestBody.orderData)
      console.log('PaymentMethod:', requestBody.paymentMethod)
      console.log('PaymentData present:', !!requestBody.paymentData)
    } catch (e) {
      console.error('JSON parse error:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: e.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { orderData, paymentMethod, paymentData } = requestBody

    // Validate required data
    if (!orderData) {
      console.error('Missing orderData')
      return new Response(
        JSON.stringify({ error: 'Missing orderData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!paymentMethod) {
      console.error('Missing paymentMethod')
      return new Response(
        JSON.stringify({ error: 'Missing paymentMethod' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check orderData structure
    console.log('OrderData structure:')
    console.log('- user_id:', orderData.user_id)
    console.log('- total_amount:', orderData.total_amount)
    console.log('- customer_email:', orderData.customer_email)
    console.log('- customer_name:', orderData.customer_name)

    if (!orderData.user_id) {
      console.error('Missing user_id in orderData')
      return new Response(
        JSON.stringify({ error: 'Missing user_id in orderData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!orderData.total_amount) {
      console.error('Missing total_amount in orderData')
      return new Response(
        JSON.stringify({ error: 'Missing total_amount in orderData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test Supabase connection
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('Testing Supabase connection...')
    const { data: testQuery, error: testError } = await supabase
      .from('payments')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('Supabase connection error:', testError)
      return new Response(
        JSON.stringify({ error: 'Database connection failed', details: testError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Supabase connection OK')

    // Test Mercado Pago credentials
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST') || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    console.log('MP Access Token present:', !!accessToken)
    console.log('MP Access Token prefix:', accessToken?.substring(0, 10))

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago access token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get idempotency key from headers
    const idempotencyKey = req.headers.get('x-idempotency-key')
    console.log('Idempotency key:', idempotencyKey)

    // Create minimal test payment
    const testPayload = {
      transaction_amount: parseFloat(orderData.total_amount.toString()),
      description: `Test payment - ${orderData.order_id || 'no-order-id'}`,
      payment_method_id: 'pix',
      payer: {
        email: orderData.customer_email || orderData.shipping_data?.email || 'test@test.com',
        first_name: orderData.customer_name?.split(' ')[0] || orderData.shipping_data?.fullName?.split(' ')[0] || 'Test',
        last_name: orderData.customer_name?.split(' ').slice(1).join(' ') || orderData.shipping_data?.fullName?.split(' ').slice(1).join(' ') || 'User'
      }
    }

    console.log('Test payment payload:', testPayload)

    // Prepare headers for Mercado Pago
    const mpHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    // Add idempotency key if present
    if (idempotencyKey) {
      mpHeaders['X-Idempotency-Key'] = idempotencyKey
      console.log('Adding X-Idempotency-Key to MP request:', idempotencyKey)
    }

    console.log('MP Headers:', mpHeaders)

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: mpHeaders,
      body: JSON.stringify(testPayload),
    })

    console.log('MP Response status:', mpResponse.status)
    const mpResult = await mpResponse.json()
    console.log('MP Response body:', mpResult)

    if (!mpResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Mercado Pago API error',
          details: mpResult,
          payload: testPayload
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        debug: 'All tests passed',
        mp_id: mpResult.id,
        mp_status: mpResult.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected server error',
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})