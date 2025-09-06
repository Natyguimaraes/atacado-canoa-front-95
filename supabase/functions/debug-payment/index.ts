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

    // Create payment payload based on method
    let paymentPayload: any = {
      transaction_amount: parseFloat(orderData.total_amount.toString()),
      description: `Pedido - ${orderData.order_id || Date.now()}`,
      payer: {
        email: orderData.shipping_data?.email || orderData.customer_email || 'test@test.com',
        first_name: orderData.shipping_data?.fullName?.split(' ')[0] || orderData.customer_name?.split(' ')[0] || 'Test',
        last_name: orderData.shipping_data?.fullName?.split(' ').slice(1).join(' ') || orderData.customer_name?.split(' ').slice(1).join(' ') || 'User',
        identification: {
          type: 'CPF',
          number: orderData.shipping_data?.cpf?.replace(/\D/g, '') || orderData.customer_cpf?.replace(/\D/g, '') || '11111111111'
        }
      }
    }

    if (paymentMethod === 'pix') {
      paymentPayload.payment_method_id = 'pix'
    } else if (paymentMethod === 'credit' && paymentData) {
      // Para cartão de crédito, usar os dados do token
      paymentPayload.token = paymentData.token
      paymentPayload.installments = paymentData.installments || 1
      paymentPayload.payment_method_id = paymentData.payment_method_id
      paymentPayload.issuer_id = paymentData.issuer_id
      
      console.log('Credit card payment detected')
      console.log('Payment method ID:', paymentData.payment_method_id)
      console.log('Installments:', paymentData.installments)
      console.log('Token present:', !!paymentData.token)
    } else {
      console.error('Invalid payment method or missing payment data')
      return new Response(
        JSON.stringify({ error: 'Invalid payment method or missing payment data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Payment payload:', {
      ...paymentPayload,
      token: paymentPayload.token ? '[HIDDEN]' : undefined
    })

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
      body: JSON.stringify(paymentPayload),
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

    console.log('Payment created successfully in MP:', mpResult.id)

    // Salvar pagamento no banco
    const paymentInsertData = {
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
    };

    console.log('Inserting payment into database:', { 
      user_id: paymentInsertData.user_id, 
      external_id: paymentInsertData.external_id, 
      status: paymentInsertData.status 
    });

    const { data: insertedPayment, error: insertError } = await supabase
      .from('payments')
      .insert(paymentInsertData)
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao salvar pagamento:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar dados do pagamento', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment saved to database successfully');

    // Salvar chave de idempotência se presente
    if (idempotencyKey) {
      const { error: idempotencyInsertError } = await supabase
        .from('payment_idempotency')
        .insert({
          idempotency_key: idempotencyKey,
          user_id: orderData.user_id,
          external_id: mpResult.id?.toString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      
      if (idempotencyInsertError) {
        console.error('Erro ao salvar idempotência:', idempotencyInsertError);
      } else {
        console.log('Idempotency key saved successfully');
      }
    }

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