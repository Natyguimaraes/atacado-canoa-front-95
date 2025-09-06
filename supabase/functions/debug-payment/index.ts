import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('=== SIMPLE PAYMENT PROCESS ===')
    
    const requestBody = await req.json()
    const { orderData, paymentMethod, paymentData } = requestBody

    console.log('Payment method:', paymentMethod)
    console.log('User ID:', orderData?.user_id)
    console.log('Amount:', orderData?.total_amount)

    // Validate basic data
    if (!orderData?.user_id || !orderData?.total_amount || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST') || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build payment payload
    const paymentPayload = {
      transaction_amount: parseFloat(orderData.total_amount.toString()),
      description: `Pedido - ${Date.now()}`,
      payer: {
        email: orderData.shipping_data?.email || 'test@test.com',
        first_name: orderData.shipping_data?.fullName?.split(' ')[0] || 'Test',
        last_name: orderData.shipping_data?.fullName?.split(' ').slice(1).join(' ') || 'User',
        identification: {
          type: 'CPF',
          number: orderData.shipping_data?.cpf?.replace(/\D/g, '') || '11111111111'
        }
      }
    }

    // Set payment method
    if (paymentMethod === 'pix') {
      paymentPayload.payment_method_id = 'pix'
    } else if (paymentMethod === 'credit' && paymentData) {
      paymentPayload.token = paymentData.token
      paymentPayload.installments = paymentData.installments || 1
      paymentPayload.payment_method_id = paymentData.payment_method_id
      paymentPayload.issuer_id = paymentData.issuer_id
      console.log('Credit card payment with token')
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare headers
    const mpHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    const idempotencyKey = req.headers.get('x-idempotency-key')
    if (idempotencyKey) {
      mpHeaders['X-Idempotency-Key'] = idempotencyKey
    }

    console.log('Calling Mercado Pago API...')

    // Call Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: mpHeaders,
      body: JSON.stringify(paymentPayload),
    })

    const mpResult = await mpResponse.json()
    console.log('MP Response status:', mpResponse.status)
    console.log('MP Result ID:', mpResult.id)
    console.log('MP Result status:', mpResult.status)

    if (!mpResponse.ok) {
      console.error('MP Error:', mpResult)
      return new Response(
        JSON.stringify({ 
          error: 'Mercado Pago error',
          details: mpResult.message || 'Payment failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save to database
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id: orderData.user_id,
        external_id: mpResult.id?.toString(),
        status: mpResult.status?.toUpperCase(),
        amount: orderData.total_amount,
        method: paymentMethod.toUpperCase(),
        metadata: {
          qr_code_base64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64,
          qr_code: mpResult.point_of_interaction?.transaction_data?.qr_code,
          expiration_date: mpResult.date_of_expiration
        }
      })

    if (insertError) {
      console.error('Database error:', insertError)
      // Continue anyway, don't fail the payment
    }

    console.log('Payment processed successfully')

    return new Response(
      JSON.stringify({
        id: mpResult.id,
        status: mpResult.status,
        metadata: {
          qr_code_base64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64,
          qr_code: mpResult.point_of_interaction?.transaction_data?.qr_code,
          expiration_date: mpResult.date_of_expiration
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})