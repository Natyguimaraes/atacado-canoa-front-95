// supabase/functions/get-environment-config/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, restrinja para o URL da sua loja
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // A SUPABASE_URL é definida automaticamente no ambiente de produção do Supabase.
    // Se ela existir e não for a URL local, consideramos que é produção.
    const isProduction = Deno.env.get('SUPABASE_URL')?.includes('supabase.co');

    const publicKey = isProduction
      ? Deno.env.get('MERCADO_PAGO_PUBLIC_KEY_PROD')
      : Deno.env.get('MERCADO_PAGO_PUBLIC_KEY_TEST');

    if (!publicKey) {
      throw new Error('Chave pública do Mercado Pago não configurada para o ambiente atual.');
    }

    return new Response(
      JSON.stringify({
        publicKey: publicKey,
        environment: isProduction ? 'production' : 'development',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});