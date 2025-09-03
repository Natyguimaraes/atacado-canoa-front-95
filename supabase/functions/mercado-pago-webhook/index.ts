// supabase/functions/mercado-pago-webhook/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Crie o cliente Supabase fora do handler para reutilização
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const notification = await req.json();
    console.log("--> Webhook do Mercado Pago recebido:", JSON.stringify(notification, null, 2));

    // A notificação do Mercado Pago só nos diz o ID do pagamento que mudou.
    if (notification.type === 'payment' && notification.data && notification.data.id) {
      const paymentId = notification.data.id;

      // Com o ID, nós buscamos os detalhes completos do pagamento na API do Mercado Pago.
      const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
      if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar detalhes do pagamento ${paymentId} no Mercado Pago.`);
      }

      const paymentDetails = await response.json();
      console.log("Detalhes completos do pagamento:", JSON.stringify(paymentDetails, null, 2));

      const orderId = paymentDetails.external_reference; // Este é o ID do nosso pedido
      const newStatus = paymentDetails.status?.toUpperCase(); // Ex: APPROVED, REJECTED

      if (orderId && newStatus) {
        // Atualizamos o status na nossa tabela 'orders'
        const { error: orderUpdateError } = await supabaseAdmin
          .from('orders')
          .update({ status: newStatus })
          .eq('id', orderId);

        if (orderUpdateError) {
          throw new Error(`Erro ao atualizar o pedido ${orderId}: ${orderUpdateError.message}`);
        }
        console.log(`Pedido ${orderId} atualizado para o status ${newStatus}.`);

        // Também atualizamos o status na nossa tabela 'payments'
        await supabaseAdmin
          .from('payments')
          .update({ status: newStatus })
          .eq('external_id', paymentId.toString());
      }
    }

    // Respondemos 200 OK para dizer ao Mercado Pago que recebemos a notificação com sucesso.
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error('!!! ERRO NO WEBHOOK !!!:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});