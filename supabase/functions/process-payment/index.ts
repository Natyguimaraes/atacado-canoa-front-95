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
    console.log('=== TESTE PROCESS PAYMENT ===');
    
    const data = await req.json();
    console.log('Payment data received:', {
      amount: data.transaction_amount,
      method: data.payment_method_id,
      has_token: !!data.token
    });

    // Verificar access token
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    console.log('Access token exists:', !!accessToken);
    
    if (!accessToken) {
      console.log('Returning error: no access token');
      return new Response(JSON.stringify({ 
        error: 'Access token not configured' 
      }), { status: 400, headers });
    }

    console.log('Calling MP payments API...');
    
    // Chamar Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log('MP payment response status:', response.status);
    console.log('MP payment response:', result);

    if (!response.ok) {
      console.log('MP payment error, returning 400');
      return new Response(JSON.stringify({ 
        error: 'Mercado Pago payment error', 
        mp_error: result 
      }), { status: 400, headers });
    }

    // Resposta básica
    let responseData = {
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      transaction_amount: result.transaction_amount,
      payment_method_id: result.payment_method_id,
    };

    // Para PIX, adicionar QR code
    if (data.payment_method_id === 'pix' && result.point_of_interaction) {
      responseData = {
        ...responseData,
        pix_qr_code: result.point_of_interaction.transaction_data.qr_code,
        pix_qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
      };
    }

    console.log('Success, returning payment result');
    return new Response(JSON.stringify(responseData), { headers });

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