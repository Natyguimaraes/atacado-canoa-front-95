// supabase/functions/process-payment/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderData, paymentMethod, paymentData } = await req.json();

    if (!orderData || !paymentMethod) {
      throw new Error("Dados do pedido (orderData) ou método de pagamento (paymentMethod) não foram enviados.");
    }
    
    // Determina o ambiente baseado na URL do Supabase
    const isProduction = Deno.env.get('SUPABASE_URL')?.includes('supabase.co');
    
    // Usa o Access Token apropriado para o ambiente
    const accessToken = isProduction
      ? Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD')
      : Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST');

    if (!accessToken) {
      console.error('Tokens disponíveis:', {
        test: !!Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST'),
        main: !!Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN'),
        prod: !!Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD')
      });
      throw new Error("Access Token do Mercado Pago não configurado.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: order, error: orderError } = await supabaseAdmin.from('orders').insert({
      user_id: orderData.user_id,
      items: orderData.items,
      total_amount: orderData.total_amount,
      shipping_data: orderData.shipping_data,
      payment_method: paymentMethod.toUpperCase(),
      status: 'PENDING'
    }).select().single();

    if (orderError) throw new Error(`Erro ao criar o pedido: ${orderError.message}`);
    
    const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercado-pago-webhook`;
    let mercadoPagoPayload;

    // Constrói os objetos 'payer'
    const fullName = orderData.shipping_data?.fullName || 'Cliente Teste';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Sobrenome';
    const userEmail = orderData.shipping_data?.email;

    if (!userEmail) {
      throw new Error("E-mail é obrigatório para processar o pagamento.");
    }

    const pixPayer = {
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        identification: { type: 'CPF', number: '12345678909' }
    };
    
    const cardPayer = {
        email: userEmail,
        identification: { type: 'CPF', number: '12345678909' }
    };

    if (paymentMethod === 'pix') {
      mercadoPagoPayload = {
        transaction_amount: Number(orderData.total_amount),
        description: `Pedido #${order.id}`,
        payment_method_id: 'pix',
        payer: pixPayer,
        external_reference: order.id.toString(),
        notification_url: notificationUrl,
      };
    } else if (paymentMethod === 'credit') {
      if (!paymentData || !paymentData.token) {
        throw new Error("Dados do pagamento com cartão (paymentData) não foram enviados.");
      }
      mercadoPagoPayload = {
        transaction_amount: Number(orderData.total_amount),
        description: `Pedido #${order.id}`,
        token: paymentData.token,
        issuer_id: paymentData.issuer_id,
        payment_method_id: paymentData.payment_method_id,
        installments: paymentData.installments,
        payer: cardPayer,
        external_reference: order.id.toString(),
        notification_url: notificationUrl,
      };
    } else {
      throw new Error("Método de pagamento não suportado.");
    }

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(mercadoPagoPayload),
    });

    const paymentResponse = await response.json();
    if (!response.ok) {
      console.error("Detalhe do erro do Mercado Pago:", paymentResponse);
      throw new Error(`[Mercado Pago] ${paymentResponse.message || 'Erro desconhecido.'}`);
    }

    await supabaseAdmin.from('payments').insert({
      user_id: orderData.user_id,
      order_id: order.id,
      external_id: paymentResponse.id.toString(),
      amount: paymentResponse.transaction_amount,
      method: paymentMethod.toUpperCase(),
      status: paymentResponse.status?.toUpperCase() || 'PENDING',
      provider: 'MERCADO_PAGO',
      metadata: paymentMethod === 'pix' ? paymentResponse.point_of_interaction?.transaction_data : {
        last_four_digits: paymentResponse.card?.last_four_digits,
        cardholder_name: paymentResponse.card?.cardholder?.name,
      },
    });

    return new Response(JSON.stringify(paymentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('!!! ERRO FATAL NA FUNÇÃO !!!:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});