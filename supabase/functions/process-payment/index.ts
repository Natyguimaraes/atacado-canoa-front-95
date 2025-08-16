import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paymentData = await req.json();
    
    console.log('=== PROCESS PAYMENT ===');
    console.log('Dados recebidos:', JSON.stringify({
      ...paymentData,
      token: paymentData.token ? '***TOKEN***' : undefined
    }, null, 2));

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!accessToken) {
      console.error('Access Token não configurado');
      throw new Error('Access Token do Mercado Pago não configurado');
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Configurações Supabase faltando');
      throw new Error('Configurações do Supabase não encontradas');
    }

    console.log('Tokens configurados OK');

    // Enviar para MP
    console.log('Enviando para MP API...');
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(paymentData),
    });

    console.log('MP Response status:', response.status);

    const result = await response.json();
    console.log('MP Response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('Erro do MP:', result);
      throw new Error(`MP Error: ${JSON.stringify(result)}`);
    }

    // Salvar no banco
    console.log('Salvando no banco...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Metadata para PIX ou cartão
    let metadata = null;
    if (paymentData.payment_method_id === 'pix' && result.point_of_interaction) {
      metadata = {
        qrCodeBase64: result.point_of_interaction.transaction_data.qr_code_base64,
        qrCode: result.point_of_interaction.transaction_data.qr_code,
        expirationDate: result.date_of_expiration
      };
    } else if (paymentData.token) {
      metadata = {
        cardId: paymentData.token
      };
    }

    const { data: paymentRecord, error: dbError } = await supabase
      .from('payments')
      .insert({
        user_id: paymentData.user_id,
        order_id: paymentData.order_id,
        method: paymentData.payment_method_id === 'pix' ? 'PIX' : 'CARD',
        status: result.status?.toUpperCase() || 'PENDING',
        amount: paymentData.transaction_amount,
        provider: 'MERCADO_PAGO',
        external_id: result.id.toString(),
        metadata: metadata,
        paid_at: result.status === 'approved' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro no banco:', dbError);
    } else {
      console.log('Salvo no banco:', paymentRecord?.id);
    }

    // Resposta
    let responseData = {
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      transaction_amount: result.transaction_amount,
      payment_method_id: result.payment_method_id,
    };

    // PIX específico
    if (paymentData.payment_method_id === 'pix' && result.point_of_interaction) {
      responseData = {
        ...responseData,
        pix_qr_code: result.point_of_interaction.transaction_data.qr_code,
        pix_qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
      };
    }

    console.log('Retornando:', responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERRO COMPLETO ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});