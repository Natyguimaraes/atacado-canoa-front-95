import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    console.log('=== TESTE BÁSICO ===');
    
    // Teste básico de funcionamento
    const data = await req.json();
    console.log('Data recebida:', data);

    // Verificar env vars
    const publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    console.log('Env vars:', {
      hasPublicKey: !!publicKey,
      hasAccessToken: !!accessToken,
      publicKeyStart: publicKey?.substring(0, 10),
      accessTokenStart: accessToken?.substring(0, 10)
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Edge function está funcionando',
      hasPublicKey: !!publicKey,
      hasAccessToken: !!accessToken,
      receivedData: data
    }), { headers });

  } catch (error) {
    console.error('ERRO NO TESTE:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro no teste',
      message: error.message
    }), { status: 500, headers });
  }
});