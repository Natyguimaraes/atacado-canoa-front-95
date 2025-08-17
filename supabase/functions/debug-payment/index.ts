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
    console.log('=== DEBUG PAYMENT ===');
    
    // Verificar se as secrets estão disponíveis
    const publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    console.log('Public key available:', !!publicKey);
    console.log('Access token available:', !!accessToken);
    
    if (publicKey) {
      console.log('Public key length:', publicKey.length);
      console.log('Public key starts with:', publicKey.substring(0, 10) + '...');
    }
    
    if (accessToken) {
      console.log('Access token length:', accessToken.length);
      console.log('Access token starts with:', accessToken.substring(0, 10) + '...');
    }

    // Teste básico de conectividade com MP
    console.log('Testing MP connectivity...');
    
    const testResponse = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('MP test response status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.log('MP test error:', errorText);
      
      return new Response(JSON.stringify({
        error: 'MP connection test failed',
        status: testResponse.status,
        response: errorText,
        publicKeyAvailable: !!publicKey,
        accessTokenAvailable: !!accessToken
      }), { headers });
    }

    const testData = await testResponse.json();
    console.log('MP test success, payment methods count:', testData.length);

    return new Response(JSON.stringify({
      success: true,
      publicKeyAvailable: !!publicKey,
      accessTokenAvailable: !!accessToken,
      paymentMethodsCount: testData.length,
      message: 'Mercado Pago connection successful'
    }), { headers });

  } catch (error) {
    console.error('DEBUG ERROR:', error.message);
    console.error('ERROR STACK:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Debug error',
      message: error.message,
      stack: error.stack
    }), { status: 500, headers });
  }
});