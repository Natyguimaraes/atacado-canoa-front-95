// supabase/functions/get-mp-public-key/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Detectar ambiente baseado na URL
    const isDevelopment = req.url.includes('localhost') || req.url.includes('127.0.0.1');
    const environment = isDevelopment ? 'test' : 'production';
    
    console.log(`Detectado ambiente: ${environment}`);
    
    // Buscar chave pública baseada no ambiente
    const publicKeyVar = environment === 'test' 
      ? 'MERCADO_PAGO_PUBLIC_KEY_TEST' 
      : 'MERCADO_PAGO_PUBLIC_KEY_PROD';
    
    let publicKey = Deno.env.get(publicKeyVar);
    
    // Fallback para chaves genéricas se as específicas não existirem
    if (!publicKey) {
      publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');
    }
    
    if (!publicKey) {
      console.error(`Chave pública não encontrada. Tentativas: ${publicKeyVar}, MERCADO_PAGO_PUBLIC_KEY`);
      
      // Retornar chave de teste padrão para desenvolvimento
      if (environment === 'test') {
        publicKey = 'TEST-e8b1e12a-4c90-4c95-8b1e-12a4c904c95c'; // Chave de exemplo para desenvolvimento
        console.log('Usando chave de teste padrão para desenvolvimento');
      } else {
        throw new Error('Chave pública do Mercado Pago não configurada para o ambiente atual.');
      }
    }

    console.log(`Chave pública encontrada para ambiente ${environment}: ${publicKey.substring(0, 10)}...`);

    return new Response(
      JSON.stringify({
        publicKey: publicKey,
        environment: environment,
      }),
      {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro ao buscar chave pública:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});