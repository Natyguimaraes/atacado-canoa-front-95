import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    console.log('=== CREATE CARD TOKEN v2 ===');
    
    const data = await req.json();
    console.log('Data received:', data);

    // Verificar se temos a public key
    const publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    console.log('Public key exists:', !!publicKey);
    
    if (!publicKey) {
      console.log('Returning error: no public key');
      return new Response(JSON.stringify({ 
        error: 'Public key not configured' 
      }), { status: 400, headers });
    }

    // Preparar dados básicos
    const payload = {
      card_number: data.card_number,
      security_code: data.security_code,
      expiration_month: data.expiration_month,
      expiration_year: data.expiration_year,
      cardholder: data.cardholder,
      public_key: publicKey
    };

    console.log('Calling MP API...');
    
    // Chamar Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('MP response status:', response.status);
    console.log('MP response:', result);

    if (!response.ok) {
      console.log('MP error, returning detailed error');
      const errorBody = {
        error: 'Mercado Pago error', 
        mp_error: result,
        status: response.status,
        statusText: response.statusText
      };
      console.log('Error details:', errorBody);
      return new Response(JSON.stringify(errorBody), { 
        status: 200, // Mudando para 200 para que o frontend receba os detalhes
        headers 
      });
    }

    console.log('Success, returning token');
    return new Response(JSON.stringify({
      id: result.id,
      payment_method_id: result.payment_method_id,
      first_six_digits: result.first_six_digits,
      last_four_digits: result.last_four_digits
    }), { headers });

  } catch (error) {
    console.error('CATCH ERROR:', error.message);
    console.error('ERROR STACK:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }), { status: 500, headers });
  }
});