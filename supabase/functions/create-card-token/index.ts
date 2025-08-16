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
    const cardData = await req.json();
    
    console.log('=== CREATE CARD TOKEN ===');
    console.log('Dados recebidos:', JSON.stringify(cardData, null, 2));

    const publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    if (!publicKey) {
      console.error('Public Key não configurada');
      throw new Error('Public Key do Mercado Pago não configurada');
    }

    console.log('Public Key encontrada');

    // Preparar dados para MP
    const requestBody = {
      card_number: cardData.card_number,
      security_code: cardData.security_code,
      expiration_month: cardData.expiration_month,
      expiration_year: cardData.expiration_year,
      cardholder: {
        name: cardData.cardholder.name,
        identification: {
          type: cardData.cardholder.identification.type,
          number: cardData.cardholder.identification.number
        }
      },
      public_key: publicKey
    };

    console.log('Enviando para MP:', JSON.stringify({
      ...requestBody,
      card_number: '**** **** **** ' + requestBody.card_number.slice(-4),
      public_key: publicKey.substring(0, 10) + '...'
    }, null, 2));

    const response = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('MP Response status:', response.status);

    const result = await response.json();
    console.log('MP Response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('Erro do MP:', result);
      throw new Error(`MP Error: ${JSON.stringify(result)}`);
    }

    const returnData = {
      id: result.id,
      payment_method_id: result.payment_method_id,
      first_six_digits: result.first_six_digits,
      last_four_digits: result.last_four_digits
    };

    console.log('Retornando:', returnData);

    return new Response(JSON.stringify(returnData), {
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