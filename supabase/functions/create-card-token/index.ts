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
    const data = await req.json();
    console.log('Creating card token for:', JSON.stringify(data, null, 2));

    // Get access token (usar sempre TEST para desenvolvimento)
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Access token not configured' }), { 
        status: 400, 
        headers 
      });
    }

    // Call Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log('MP card token response:', result);

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'Mercado Pago error',
        mp_error: result
      }), { status: 500, headers });
    }

    return new Response(JSON.stringify(result), { headers });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
});