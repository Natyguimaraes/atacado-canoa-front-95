// supabase/functions/process-payment/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getAccessToken } from '../_shared/environment.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderData, paymentMethod, paymentData, idempotencyKey } = await req.json();

    if (!orderData || !paymentMethod || !paymentData || !idempotencyKey) {
      throw new Error("Dados da requisição incompletos.");
    }
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accessToken = getAccessToken();
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentData),
    });

    const mpResult = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error("Erro do Mercado Pago:", mpResult);
      throw new Error(mpResult.message || 'Erro ao processar pagamento no MP.');
    }

    const paymentStatus = mpResult.status.toUpperCase();
    console.log(`Pagamento criado no MP com ID ${mpResult.id} e status ${paymentStatus}`);
    
    // **CORREÇÃO CRÍTICA**: Salva o `payment_method` real vindo do Mercado Pago
    // Para cartão, isso será 'CREDIT_CARD', e não o genérico 'CARD'
    const finalPaymentMethod = mpResult.payment_method_id.toUpperCase();

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.user_id,
        items: orderData.items,
        total_amount: orderData.total_amount,
        status: paymentStatus,
        payment_method: finalPaymentMethod, // Salva o método correto
        shipping_address: orderData.shipping_address,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_cpf: orderData.customer_cpf,
      })
      .select('id')
      .single();

    if (orderError) {
      console.error("Erro ao salvar pedido:", orderError);
      throw new Error('Falha ao registrar o pedido no banco de dados.');
    }

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: orderData.user_id,
      order_id: newOrder.id,
      external_id: mpResult.id.toString(), // GARANTE QUE O ID EXTERNO SEJA SALVO
      status: paymentStatus,
      amount: mpResult.transaction_amount,
      method: finalPaymentMethod, // Salva o método correto também aqui
      metadata: {
        qr_code_base64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64,
        qr_code: mpResult.point_of_interaction?.transaction_data?.qr_code,
        expiration_date: mpResult.date_of_expiration,
      },
    });

    if (paymentError) {
      console.error("Erro ao salvar pagamento:", paymentError);
      throw new Error('Falha ao registrar o pagamento no banco de dados.');
    }

    console.log(`Pedido ${newOrder.id} e Pagamento associado foram criados com status ${paymentStatus}.`);

    return new Response(JSON.stringify({
      paymentId: mpResult.id,
      status: mpResult.status,
      orderId: newOrder.id,
      qrCode: mpResult.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro fatal no processamento do pagamento:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});