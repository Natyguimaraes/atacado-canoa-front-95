import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CardTokenRequest {
  card_number: string;
  security_code: string;
  expiration_month: string;
  expiration_year: string;
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
    
    console.log('Criando token do cartão para:', {
      last_four_digits: cardData.card_number.slice(-4),
      cardholder_name: cardData.cardholder.name
    });

    const publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    if (!publicKey) {
      throw new Error('Public Key do Mercado Pago não configurada');
    }

    // Criar token do cartão via API do Mercado Pago
    const tokenResponse = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...cardData,
        public_key: publicKey
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Erro ao criar token do cartão:', errorData);
      throw new Error(`Erro do Mercado Pago: ${errorData.message || 'Erro ao criar token do cartão'}`);
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