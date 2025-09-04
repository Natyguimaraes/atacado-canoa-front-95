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
    // Pega a chave pública de teste (sempre usar teste para desenvolvimento)
    const publicKey = Deno.env.get('MERCADO_PAGO_PUBLIC_KEY_TEST') || Deno.env.get('MERCADO_PAGO_PUBLIC_KEY');

    if (!publicKey) {
      throw new Error("Chave pública do Mercado Pago não configurada.");
    }

    return new Response(JSON.stringify({ 
      publicKey: publicKey,
      environment: 'test' 
    }), {
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