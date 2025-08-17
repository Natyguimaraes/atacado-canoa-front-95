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
    console.log('=== CREATE CARD TOKEN START ===');
    
    const body = await req.text();
    console.log('Raw body:', body);
    
    const cardData = JSON.parse(body);
    console.log('Parsed data:', cardData);

    const publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    if (!publicKey) {
      console.error('ERRO: Public Key não encontrada');
      return new Response(JSON.stringify({ error: 'Public Key não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Public Key OK');

    const requestData = {
      card_number: cardData.card_number,
      security_code: cardData.security_code,
      expiration_month: cardData.expiration_month,
      expiration_year: cardData.expiration_year,
      cardholder: cardData.cardholder,
      public_key: publicKey
    };

    console.log('Sending to MP:', {
      card_number: '***' + cardData.card_number.slice(-4),
      expiration_month: cardData.expiration_month,
      expiration_year: cardData.expiration_year,
      cardholder_name: cardData.cardholder?.name
    });

    const mpResponse = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    console.log('MP Status:', mpResponse.status);
    
    const mpResult = await mpResponse.json();
    console.log('MP Result:', mpResult);

    if (!mpResponse.ok) {
      console.error('MP Error:', mpResult);
      return new Response(JSON.stringify({ error: 'MP Error', details: mpResult }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = {
      id: mpResult.id,
      payment_method_id: mpResult.payment_method_id,
      first_six_digits: mpResult.first_six_digits,
      last_four_digits: mpResult.last_four_digits
    };

    console.log('Success! Returning:', result);

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