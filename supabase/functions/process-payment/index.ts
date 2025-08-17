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
    console.log('=== PROCESS PAYMENT v3 ===');
    
    const data = await req.json();
    console.log('Payment data received:', {
      amount: data.transaction_amount,
      method: data.payment_method_id,
      has_token: !!data.token,
      full_data: JSON.stringify(data, null, 2)
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
    
    // Remover campos que o MP não aceita
    const { user_id, order_id, ...cleanData } = data;
    
    console.log('Clean data to send to MP:', JSON.stringify(cleanData, null, 2));
    console.log('Access token starts with:', accessToken.substring(0, 15) + '...');
    
    // Chamar Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(cleanData),
    });

    const result = await response.json();
    console.log('MP payment response status:', response.status);
    console.log('MP payment response headers:', Object.fromEntries(response.headers.entries()));
    console.log('MP payment response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.log('MP payment error, returning detailed error');
      
      // Log detalhado do erro
      if (result.message === 'internal_error') {
        console.log('MERCADO PAGO INTERNAL ERROR DETECTED');
        console.log('Possible causes:');
        console.log('1. Access token invalid or expired');
        console.log('2. Request format not accepted');
        console.log('3. MP service temporarily unavailable');
        console.log('4. Account configuration issue');
        
        // Verificar se há details no erro
        if (result.cause && Array.isArray(result.cause)) {
          console.log('Error causes:', JSON.stringify(result.cause, null, 2));
        }
      }
      
      const errorBody = {
        error: 'Mercado Pago payment error', 
        mp_error: result,
        status: response.status,
        statusText: response.statusText,
        request_data: cleanData // Adicionar dados da request para debug
      };
      console.log('Payment error details:', JSON.stringify(errorBody, null, 2));
      return new Response(JSON.stringify(errorBody), { 
        status: 200, // Mudando para 200 para que o frontend receba os detalhes
        headers 
      });
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