import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== PROCESS PAYMENT START ===');
    
    const body = await req.text();
    console.log('Raw body:', body);
    
    const paymentData = JSON.parse(body);
    console.log('Parsed payment data:', {
      amount: paymentData.transaction_amount,
      method: paymentData.payment_method_id,
      has_token: !!paymentData.token
    });

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('ERRO: Access Token não encontrado');
      return new Response(JSON.stringify({ error: 'Access Token não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Access Token OK');

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(paymentData),
    });

    console.log('MP Payment Status:', mpResponse.status);
    
    const mpResult = await mpResponse.json();
    console.log('MP Payment Result:', mpResult);

    if (!mpResponse.ok) {
      console.error('MP Payment Error:', mpResult);
      return new Response(JSON.stringify({ error: 'MP Payment Error', details: mpResult }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Salvar no banco simplificado
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        console.log('Salvando no banco...');
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let metadata = null;
        if (paymentData.payment_method_id === 'pix' && mpResult.point_of_interaction) {
          metadata = {
            qrCodeBase64: mpResult.point_of_interaction.transaction_data.qr_code_base64,
            qrCode: mpResult.point_of_interaction.transaction_data.qr_code,
          };
        } else if (paymentData.token) {
          metadata = { cardId: paymentData.token };
        }

        await supabase.from('payments').insert({
          user_id: paymentData.user_id,
          order_id: paymentData.order_id,
          method: paymentData.payment_method_id === 'pix' ? 'PIX' : 'CARD',
          status: mpResult.status?.toUpperCase() || 'PENDING',
          amount: paymentData.transaction_amount,
          provider: 'MERCADO_PAGO',
          external_id: mpResult.id.toString(),
          metadata: metadata,
          paid_at: mpResult.status === 'approved' ? new Date().toISOString() : null
        });

        console.log('Salvo no banco com sucesso');
      }
    } catch (dbError) {
      console.error('Erro no banco (não crítico):', dbError);
    }

    // Resposta final
    let result = {
      id: mpResult.id,
      status: mpResult.status,
      status_detail: mpResult.status_detail,
      transaction_amount: mpResult.transaction_amount,
      payment_method_id: mpResult.payment_method_id,
    };

    if (paymentData.payment_method_id === 'pix' && mpResult.point_of_interaction) {
      result = {
        ...result,
        pix_qr_code: mpResult.point_of_interaction.transaction_data.qr_code,
        pix_qr_code_base64: mpResult.point_of_interaction.transaction_data.qr_code_base64,
      };
    }

    console.log('Success! Returning payment result');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ERRO GERAL:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});