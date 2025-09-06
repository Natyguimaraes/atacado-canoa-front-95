// supabase/functions/mercado-pago-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getAccessToken } from '../_shared/environment.ts';

serve(async (req) => {
  // Lida com a requisição pre-flight do CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log(">>>> [Webhook Início] Notificação recebida:", JSON.stringify(payload, null, 2));

    // Filtra apenas as notificações que nos interessam
    if (payload.type !== 'payment' || payload.action !== 'payment.updated') {
      console.log(`Webhook ignorado: Ação (${payload.action}) ou tipo (${payload.type}) não é relevante.`);
      return new Response("Ação não relevante", { status: 200 });
    }

    const paymentId = payload.data.id;
    if (!paymentId) {
      throw new Error("ID do pagamento não foi encontrado no payload do webhook.");
    }
    console.log(`[Webhook] Processando atualização para o Payment ID do Mercado Pago: ${paymentId}`);

    const accessToken = getAccessToken();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Buscar os detalhes completos do pagamento na API do Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!mpResponse.ok) {
      throw new Error(`Erro ao buscar dados no Mercado Pago (ID: ${paymentId}): ${mpResponse.statusText}`);
    }
    const mpPayment = await mpResponse.json();
    const newStatus = mpPayment.status.toUpperCase();
    const externalId = mpPayment.id.toString();
    console.log(`[Webhook] Status consultado no MP para ${externalId} é: ${newStatus}`);

    // 2. Encontrar nosso registro de pagamento interno usando o ID externo do Mercado Pago
    const { data: existingPayment, error: findError } = await supabase
      .from('payments')
      .select('id, order_id, status')
      .eq('external_id', externalId)
      .single();

    if (findError || !existingPayment) {
      throw new Error(`Pagamento com external_id ${externalId} não foi encontrado em nosso banco de dados.`);
    }
    
    // Otimização: Se o status já estiver correto, não faz nada
    if (existingPayment.status === newStatus) {
        console.log(`[Webhook] Status para pagamento ${existingPayment.id} já está como ${newStatus}. Nenhuma atualização necessária.`);
        return new Response(JSON.stringify({ success: true, message: "Status já estava atualizado." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 3. Atualizar o status do PAGAMENTO em nosso banco
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({ status: newStatus })
      .eq('id', existingPayment.id);

    if (updatePaymentError) {
      throw new Error(`Erro ao atualizar o status do pagamento ${existingPayment.id}: ${updatePaymentError.message}`);
    }
    console.log(`[Webhook] Sucesso ao atualizar Pagamento ${existingPayment.id} para ${newStatus}.`);

    // 4. **AÇÃO CRÍTICA**: Atualizar também o status do PEDIDO correspondente
    if (existingPayment.order_id) {
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', existingPayment.order_id);

      if (updateOrderError) {
        console.error(`[Webhook Alerta] Falha crítica ao sincronizar o pedido ${existingPayment.order_id}:`, updateOrderError.message);
        // Não lançamos um erro fatal aqui, pois o pagamento foi atualizado, mas registramos o alerta.
      } else {
        console.log(`[Webhook] Sucesso ao sincronizar Pedido ${existingPayment.order_id} para ${newStatus}.`);
      }
    } else {
      console.warn(`[Webhook Alerta] O Pagamento ${existingPayment.id} não possui um pedido associado (order_id is null).`);
    }

    console.log("<<<< [Webhook Fim] Processamento da notificação concluído com sucesso.");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("<<<< [Webhook Fim] Erro fatal durante o processamento do webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});