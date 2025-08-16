import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, data } = body;

    console.log('Webhook recebido:', { type, data });

    // Verificar se é um webhook de pagamento
    if (type === 'payment') {
      const paymentId = data.id;
      
      if (!paymentId) {
        throw new Error('ID do pagamento não encontrado no webhook');
      }

      // Buscar detalhes do pagamento na API do Mercado Pago
      const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
      if (!accessToken) {
        throw new Error('Token do Mercado Pago não configurado');
      }

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!paymentResponse.ok) {
        throw new Error('Erro ao buscar pagamento na API do Mercado Pago');
      }

      const paymentData = await paymentResponse.json();
      console.log('Dados do pagamento:', {
        id: paymentData.id,
        status: paymentData.status,
        external_reference: paymentData.external_reference
      });

      // Conectar ao Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Configurações do Supabase não encontradas');
      }

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Atualizar status do pagamento no banco de dados
      const { data: payment, error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          status: paymentData.status?.toUpperCase() || 'PENDING',
          paid_at: paymentData.status === 'approved' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('external_id', paymentId.toString())
        .select()
        .single();

      if (paymentUpdateError) {
        console.error('Erro ao atualizar pagamento:', paymentUpdateError);
        throw new Error('Erro ao atualizar pagamento no banco de dados');
      }

      console.log('Pagamento atualizado:', payment);

      // Se pagamento foi aprovado, atualizar status do pedido
      if (paymentData.status === 'approved' && payment.order_id) {
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.order_id);

        if (orderUpdateError) {
          console.error('Erro ao atualizar pedido:', orderUpdateError);
        } else {
          console.log('Pedido atualizado para status "paid"');
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Para outros tipos de webhook, apenas logar
    console.log('Webhook de tipo não tratado:', type);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});