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
      environment: data.environment,
      payer_email: data.payer?.email,
      full_data: JSON.stringify(data, null, 2)
    });

    // Get access token based on environment
    const isProduction = data.environment === 'production';
    const accessToken = isProduction 
      ? Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD')
      : Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    console.log('Environment:', data.environment);
    console.log('Using production credentials:', isProduction);
    console.log('Access token exists:', !!accessToken);
    
    if (!accessToken) {
      console.log('ERROR: Access token not found for environment:', data.environment);
      console.log('Available env vars:', Object.keys(Deno.env.toObject()).filter(key => key.includes('MERCADO')));
      return new Response(JSON.stringify({ 
        error: 'Access token not configured',
        environment: data.environment,
        isProduction: isProduction
      }), { status: 400, headers });
    }

    // Validação adicional para produção
    if (!accessToken.startsWith('APP-') && !accessToken.startsWith('TEST-')) {
      console.log('Invalid access token format');
      return new Response(JSON.stringify({ 
        error: 'Invalid access token format' 
      }), { status: 400, headers });
    }

    console.log('Calling MP payments API...');
    
    // Remover campos que o MP não aceita (environment não é um campo válido do MP)
    const { user_id, order_id, environment, ...cleanData } = data;
    
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
        console.log('5. Sandbox account not properly configured');
        console.log('6. Missing required fields in request');
        
        // Log específico para depuração
        console.log('Current access token prefix:', accessToken.substring(0, 20) + '...');
        console.log('Request payload:', JSON.stringify(cleanData, null, 2));
        console.log('MP Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Verificar se há details no erro
        if (result.cause && Array.isArray(result.cause)) {
          console.log('Error causes:', JSON.stringify(result.cause, null, 2));
        }
        
        // Tentar usar credentials diferentes para teste
        if (accessToken.startsWith('TEST-')) {
          console.log('Using TEST credentials - check sandbox account configuration');
          console.log('Ensure the TEST user has proper permissions and account setup');
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