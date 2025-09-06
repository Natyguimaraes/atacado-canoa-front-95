import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Função para gerar uma chave de idempotência no servidor
const generateIdempotencyKey = (userId: string, orderData: any): string => {
  const dataString = JSON.stringify(orderData);
  const timestamp = Math.floor(Date.now() / 60000); // Janela de 1 minuto
  return `${userId}-${timestamp}-${btoa(dataString).slice(0, 32)}`;
};

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
    console.log('=== PROCESS PAYMENT ===')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderData, paymentMethod, paymentData } = requestBody;
    
    // Validação dos dados recebidos
    if (!orderData || !paymentMethod) {
      console.error('Missing required data:', { orderData: !!orderData, paymentMethod: !!paymentMethod });
      return new Response(
        JSON.stringify({ error: 'Missing required payment data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Gera uma chave de idempotência se não for fornecida
    const idempotencyKey = req.headers.get('x-idempotency-key') || generateIdempotencyKey(orderData.user_id, orderData);

    console.log('Processing payment:', { 
      userId: orderData.user_id, 
      method: paymentMethod, 
      amount: orderData.total_amount 
    });

    // Verificar idempotência se a chave for fornecida
    if (idempotencyKey) {
      const { data: existingPayment, error: idempotencyError } = await supabase
        .from('payment_idempotency')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (idempotencyError) {
        console.error('Erro ao verificar idempotência:', idempotencyError);
      } else if (existingPayment) {
        console.log('Payment already processed:', existingPayment.external_id);
        return new Response(
          JSON.stringify({
            id: existingPayment.external_id,
            status: 'duplicate',
            message: 'Pagamento já processado'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determinar token do Mercado Pago baseado no ambiente
    const hostname = req.headers.get('origin') || '';
    const isProduction = hostname.includes('atacado-canoa-front-95.vercel.app');
    
    const accessToken = isProduction 
      ? Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD')
      : (Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST') || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN'));

    console.log('Using environment:', isProduction ? 'production' : 'test');

    if (!accessToken) {
      console.error('Missing Mercado Pago token for environment:', isProduction ? 'production' : 'test');
      return new Response(
        JSON.stringify({ error: 'Token do Mercado Pago não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar pagamento no Mercado Pago
    const paymentPayload: any = {
      transaction_amount: orderData.total_amount,
      description: `Pedido #${orderData.order_id}`,
      payment_method_id: paymentMethod === 'pix' ? 'pix' : paymentData?.payment_method_id,
      payer: {
        email: orderData.customer_email,
        first_name: orderData.customer_name?.split(' ')[0] || '',
        last_name: orderData.customer_name?.split(' ').slice(1).join(' ') || '',
        identification: {
          type: 'CPF',
          number: orderData.customer_cpf?.replace(/\D/g, '') || ''
        }
      }
    };

    if (paymentMethod === 'credit' && paymentData) {
      paymentPayload.token = paymentData.token;
      paymentPayload.installments = paymentData.installments;
      paymentPayload.issuer_id = paymentData.issuer_id;
    }

    console.log('Sending payment to Mercado Pago:', {
      amount: paymentPayload.transaction_amount,
      method: paymentMethod,
      email: paymentPayload.payer.email
    });

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpResult = await mpResponse.json();

    console.log('Mercado Pago response status:', mpResponse.status);
    console.log('Mercado Pago result:', { id: mpResult.id, status: mpResult.status });

    if (!mpResponse.ok) {
      console.error('Erro do Mercado Pago:', mpResult);
      return new Response(
        JSON.stringify({ 
          error: mpResult.message || 'Erro ao processar pagamento' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salvar pagamento no banco
    const paymentInsertData = {
      user_id: orderData.user_id,
      external_id: mpResult.id?.toString(),
      status: mpResult.status,
      amount: orderData.total_amount,
      method: paymentMethod.toUpperCase(),
      metadata: {
        qr_code_base64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64,
        qr_code: mpResult.point_of_interaction?.transaction_data?.qr_code,
        expiration_date: mpResult.date_of_expiration
      }
    };

    console.log('Inserting payment data:', { 
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
        JSON.stringify({ error: 'Erro ao salvar dados do pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Payment saved to database successfully');
    }

    // Salvar chave de idempotência
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
    );

  } catch (error: any) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})