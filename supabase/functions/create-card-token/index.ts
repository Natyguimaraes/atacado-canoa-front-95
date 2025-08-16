import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CardTokenRequest {
  card_number: string;
  security_code: string;
  expiration_month: number;
  expiration_year: number;
  cardholder: {
    name: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cardData: CardTokenRequest = await req.json();
    
    console.log('Dados recebidos para token:', {
      card_number_length: cardData.card_number?.length,
      has_cardholder: !!cardData.cardholder,
      cardholder_name: cardData.cardholder?.name,
      expiration_month: cardData.expiration_month,
      expiration_year: cardData.expiration_year,
      identification_type: cardData.cardholder?.identification?.type
    });

    const publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    if (!publicKey) {
      throw new Error('Public Key do Mercado Pago não configurada');
    }

    console.log('Public Key encontrada:', publicKey.substring(0, 10) + '...');

    // Criar token do cartão via API do Mercado Pago
    const requestBody = {
      card_number: cardData.card_number,
      security_code: cardData.security_code,
      expiration_month: cardData.expiration_month,
      expiration_year: cardData.expiration_year,
      cardholder: cardData.cardholder,
      public_key: publicKey
    };

    console.log('Enviando dados para MP:', {
      card_number_length: requestBody.card_number.length,
      expiration_month: requestBody.expiration_month,
      expiration_year: requestBody.expiration_year,
      cardholder_name: requestBody.cardholder.name
    });

    const tokenResponse = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Erro detalhado do Mercado Pago:', JSON.stringify(errorData, null, 2));
      throw new Error(`Erro do Mercado Pago: ${JSON.stringify(errorData)}`);
    }

    const tokenResult = await tokenResponse.json();
    
    console.log('Token do cartão criado:', {
      id: tokenResult.id,
      first_six_digits: tokenResult.first_six_digits,
      last_four_digits: tokenResult.last_four_digits,
      payment_method_id: tokenResult.payment_method_id
    });

    return new Response(JSON.stringify({
      id: tokenResult.id,
      payment_method_id: tokenResult.payment_method_id,
      first_six_digits: tokenResult.first_six_digits,
      last_four_digits: tokenResult.last_four_digits
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao criar token do cartão:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});