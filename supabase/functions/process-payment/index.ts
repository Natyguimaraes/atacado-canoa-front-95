// supabase/functions/process-payment/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderData, paymentMethod, paymentData, idempotencyKey } = await req.json();

    console.log("=== PROCESS PAYMENT ===");
    console.log("Order data:", JSON.stringify(orderData, null, 2));
    console.log("Payment method:", paymentMethod);

    if (!orderData || !paymentMethod || !idempotencyKey) {
      throw new Error("Dados da requisição incompletos.");
    }
    
    // Para PIX, paymentData pode ser null
    if (paymentMethod === 'credit' && !paymentData) {
      throw new Error("Dados do cartão são obrigatórios para pagamento com cartão.");
    }
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Detectar ambiente baseado na origem da requisição
    const origin = req.headers.get('origin') || '';
    const isProduction = origin.includes('atacado-canoa-front-95.vercel.app') || origin.includes('vercel.app');
    
    const accessToken = isProduction 
      ? Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD') 
      : (Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST') || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN'));
    
    console.log(`Ambiente detectado: ${isProduction ? 'produção' : 'teste'}`);
    
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado para o ambiente atual');
    }

    // Criar payload do pagamento baseado no método
    let finalPaymentData;
    
    if (paymentMethod === 'pix') {
      finalPaymentData = {
        transaction_amount: orderData.total_amount,
        description: `Pedido #${Math.random().toString(36).substr(2, 9)}`,
        payment_method_id: 'pix',
        payer: {
          email: orderData.shipping_data.email,
          first_name: orderData.shipping_data.fullName.split(' ')[0] || '',
          last_name: orderData.shipping_data.fullName.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: orderData.shipping_data.cpf.replace(/\D/g, '')
          }
        }
      };
    } else if (paymentMethod === 'credit' && paymentData) {
      finalPaymentData = {
        transaction_amount: orderData.total_amount,
        description: `Pedido #${Math.random().toString(36).substr(2, 9)}`,
        payment_method_id: paymentData.payment_method_id,
        token: paymentData.token,
        installments: paymentData.installments,
        issuer_id: paymentData.issuer_id,
        payer: {
          email: orderData.shipping_data.email,
          first_name: orderData.shipping_data.fullName.split(' ')[0] || '',
          last_name: orderData.shipping_data.fullName.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: orderData.shipping_data.cpf.replace(/\D/g, '')
          }
        }
      };
    } else {
      throw new Error(`Método de pagamento ${paymentMethod} não suportado ou dados incompletos`);
    }

    console.log("=== PAYMENT DATA FOR MP ===");
    console.log("Final payment data:", JSON.stringify(finalPaymentData, null, 2));
    
    console.log("Calling Mercado Pago API...");
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(finalPaymentData),
    });

    const mpResult = await mpResponse.json();
    console.log("MP Response status:", mpResponse.status);
    console.log("MP Result:", JSON.stringify(mpResult, null, 2));

    if (!mpResponse.ok) {
      console.error("Erro do Mercado Pago:", mpResult);
      throw new Error(mpResult.message || 'Erro ao processar pagamento no MP.');
    }

    const paymentStatus = mpResult.status?.toUpperCase() || 'PENDING';
    console.log(`Pagamento criado no MP com ID ${mpResult.id} e status ${paymentStatus}`);
    
    // Mapear método de pagamento do MP para valores aceitos no DB
    let finalPaymentMethod = 'CREDIT'; // default para cartão
    if (paymentMethod === 'pix') {
      finalPaymentMethod = 'PIX';
    } else if (paymentMethod === 'credit') {
      finalPaymentMethod = 'CREDIT';
    }

    console.log("Creating order...");
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.user_id,
        items: orderData.items,
        total_amount: orderData.total_amount,
        status: paymentStatus === 'APPROVED' ? 'paid' : 'pending',
        payment_method: finalPaymentMethod,
        shipping_data: orderData.shipping_data || {},
      })
      .select('id')
      .single();

    if (orderError) {
      console.error("Erro ao salvar pedido:", orderError);
      throw new Error('Falha ao registrar o pedido no banco de dados.');
    }

    console.log("Order created with ID:", newOrder.id);
    console.log("Creating payment record...");

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: orderData.user_id,
      order_id: newOrder.id,
      external_id: mpResult.id.toString(),
      status: paymentStatus,
      amount: mpResult.transaction_amount || orderData.total_amount,
      method: finalPaymentMethod,
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
      success: true,
      id: mpResult.id,
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