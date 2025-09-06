// supabase/functions/get-installments/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, payment_method_id, issuer_id } = await req.json();

    if (!amount || !payment_method_id || !issuer_id) {
      throw new Error('Parâmetros obrigatórios: amount, payment_method_id, issuer_id');
    }

    // Determina o ambiente baseado na URL do Supabase
    const isProduction = Deno.env.get('SUPABASE_URL')?.includes('supabase.co');
    
    // Usa o Access Token apropriado para o ambiente
    const accessToken = isProduction
      ? Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD')
      : Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST');

    if (!accessToken) {
      throw new Error('Access Token do Mercado Pago não configurado');
    }

    // Busca as opções de parcelamento no Mercado Pago
    const url = `https://api.mercadopago.com/v1/payment_methods/installments?amount=${amount}&payment_method_id=${payment_method_id}&issuer_id=${issuer_id}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro no Mercado Pago:', errorData);
      throw new Error('Erro ao buscar opções de parcelamento');
    }

    const installmentsData = await response.json();
    
    return new Response(JSON.stringify({
      installments: installmentsData[0]?.payer_costs || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Erro na função get-installments:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      installments: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});