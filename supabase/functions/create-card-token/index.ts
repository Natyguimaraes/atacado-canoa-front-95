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
    console.log('=== CREATE CARD TOKEN v3 ===');
    
    const data = await req.json();
    console.log('Card data received:', {
      has_card_number: !!data.card_number,
      has_security_code: !!data.security_code,
      expiration_month: data.expiration_month,
      expiration_year: data.expiration_year,
      has_cardholder: !!data.cardholder,
      environment: data.environment
    });

    // Get public key based on environment
    const isProduction = data.environment === 'production';
    const publicKey = isProduction 
      ? Deno.env.get('MERCADO_PAGO_PUBLIC_KEY_PROD')
      : Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    
    console.log('Environment:', data.environment);
    console.log('Using production credentials:', isProduction);
    console.log('Public key exists:', !!publicKey);
    console.log('Public key length:', publicKey?.length);
    console.log('Public key starts with:', publicKey?.substring(0, 15) + '...');
    
    if (!publicKey) {
      console.log('ERROR: Public key not configured');
      return new Response(JSON.stringify({ 
        error: 'Public key not configured' 
      }), { status: 400, headers });
    }

    // Validar formato da public key
    if (!publicKey.startsWith('TEST-') && !publicKey.startsWith('APP_USR-')) {
      console.log('ERROR: Invalid public key format');
      return new Response(JSON.stringify({ 
        error: 'Invalid public key format' 
      }), { status: 400, headers });
    }

    // Remover campos que não fazem parte da API do MP
    const { environment, ...cardData } = data; // Remove environment do payload
    
    const payload = {
      card_number: cardData.card_number,
      security_code: cardData.security_code,
      expiration_month: parseInt(cardData.expiration_month),
      expiration_year: parseInt(cardData.expiration_year),
      cardholder: {
        name: cardData.cardholder.name,
        identification: {
          type: cardData.cardholder.identification.type,
          number: cardData.cardholder.identification.number
        }
      }
    };

    console.log('Payload prepared:', {
      card_number: payload.card_number ? '**** **** **** ' + payload.card_number.slice(-4) : 'missing',
      security_code: payload.security_code ? '***' : 'missing',
      expiration_month: payload.expiration_month,
      expiration_year: payload.expiration_year,
      cardholder_name: payload.cardholder.name,
      identification_type: payload.cardholder.identification.type,
      identification_number: payload.cardholder.identification.number ? '*****' + payload.cardholder.identification.number.slice(-3) : 'missing'
    });

    console.log('Calling Mercado Pago API...');
    
    // Usar o método correto - public_key deve ir no Authorization header conforme documentação
    const response = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('MP API response status:', response.status);
    console.log('MP API response headers:', Object.fromEntries(response.headers.entries()));
    console.log('MP API response body:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.log('ERROR: MP API returned error');
      
      // Log detalhado do erro
      if (result.message) {
        console.log('MP Error message:', result.message);
      }
      
      if (result.cause && Array.isArray(result.cause)) {
        console.log('MP Error causes:', JSON.stringify(result.cause, null, 2));
        result.cause.forEach((cause: any, index: number) => {
          console.log(`Cause ${index + 1}:`, {
            code: cause.code,
            description: cause.description
          });
        });
      }

      // Verificar códigos de erro específicos
      if (result.cause?.some((c: any) => c.code === 'E603')) {
        console.log('ERROR E603 DETECTED - Common causes:');
        console.log('1. Invalid public key');
        console.log('2. Public key expired');
        console.log('3. Wrong environment (sandbox vs production)');
        console.log('4. Account not properly configured');
        console.log('Current public key type:', publicKey.startsWith('TEST-') ? 'Sandbox' : 'Production');
      }

      const errorBody = {
        error: 'Mercado Pago error', 
        mp_error: result,
        status: response.status,
        statusText: response.statusText,
        public_key_type: publicKey.startsWith('TEST-') ? 'sandbox' : 'production'
      };
      console.log('Returning error details:', JSON.stringify(errorBody, null, 2));
      return new Response(JSON.stringify(errorBody), { 
        status: 200, // Status 200 para o frontend receber os detalhes
        headers 
      });
    }

    console.log('SUCCESS: Token created successfully');
    const responseData = {
      id: result.id,
      payment_method_id: result.payment_method_id,
      first_six_digits: result.first_six_digits,
      last_four_digits: result.last_four_digits,
      expiration_month: result.expiration_month,
      expiration_year: result.expiration_year,
      cardholder: result.cardholder
    };
    
    console.log('Returning token data:', {
      id: responseData.id,
      payment_method_id: responseData.payment_method_id,
      last_four_digits: responseData.last_four_digits
    });
    
    return new Response(JSON.stringify(responseData), { headers });

  } catch (error) {
    console.error('CATCH ERROR in create-card-token:', error.message);
    console.error('ERROR STACK:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      details: 'Check edge function logs for more details'
    }), { status: 500, headers });
  }
});