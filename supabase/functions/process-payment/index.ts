// supabase/functions/process-payment/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { edgeEnv } from '../_shared/environment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

// Schemas de validação
const orderDataSchema = z.object({
  user_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    name: z.string().min(1),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    size: z.string().min(1)
  })).min(1),
  total_amount: z.number().positive(),
  shipping_data: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    cpf: z.string().regex(/^\d{11}$/),
    zipCode: z.string().regex(/^\d{8}$/),
    address: z.string().min(5),
    number: z.string().min(1),
    complement: z.string().optional(),
    neighborhood: z.string().min(2),
    city: z.string().min(2),
    state: z.string().length(2)
  })
});

// Função para gerar chave de idempotência
const generateIdempotencyKey = (userId: string, orderData: any): string => {
  const dataString = JSON.stringify(orderData);
  const timestamp = Math.floor(Date.now() / 60000); // Janela de 1 minuto
  return `${userId}-${timestamp}-${btoa(dataString).slice(0, 32)}`;
};

serve(async (req) => {
  // Log inicial da requisição
  edgeEnv.log('info', 'Payment request received', {
    method: req.method,
    url: req.url,
    environment: edgeEnv.environment
  });
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Validação de dados de entrada
    const validatedOrderData = orderDataSchema.parse(requestBody.orderData);
    const paymentMethod = requestBody.paymentMethod;
    const paymentData = requestBody.paymentData;

    if (!paymentMethod || !['pix', 'credit'].includes(paymentMethod)) {
      throw new Error("Método de pagamento inválido. Use 'pix' ou 'credit'.");
    }

    // Sistema de idempotência
    const clientIdempotencyKey = req.headers.get('x-idempotency-key');
    const generatedKey = generateIdempotencyKey(validatedOrderData.user_id, validatedOrderData);
    const idempotencyKey = clientIdempotencyKey || generatedKey;
    
    // Usar sistema de ambiente para obter token
    const accessToken = edgeEnv.getMercadoPagoToken();
    
    edgeEnv.log('info', 'Payment processing started', {
      environment: edgeEnv.environment,
      mercadoPagoEnv: edgeEnv.mercadoPagoEnvironment,
      idempotencyKey
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar se já existe um pagamento com esta chave de idempotência
    const { data: existingPayment } = await supabaseAdmin
      .from('payment_idempotency')
      .select('payment_id, external_id')
      .eq('idempotency_key', idempotencyKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingPayment) {
      edgeEnv.log('warn', 'Duplicate payment detected', { idempotencyKey, existingPayment });
      return new Response(JSON.stringify({
        id: existingPayment.external_id,
        status: 'duplicate',
        message: 'Pagamento já processado'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin.from('orders').insert({
      user_id: validatedOrderData.user_id,
      items: validatedOrderData.items,
      total_amount: validatedOrderData.total_amount,
      shipping_data: validatedOrderData.shipping_data,
      payment_method: paymentMethod.toUpperCase(),
      status: 'PENDING'
    }).select().single();

    if (orderError) throw new Error(`Erro ao criar o pedido: ${orderError.message}`);
    
    const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercado-pago-webhook`;
    let mercadoPagoPayload;

    // Extrair dados do cliente e endereço IP para auditoria
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
    
    // Constrói os objetos 'payer' com dados validados
    const fullName = validatedOrderData.shipping_data.fullName;
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Sobrenome';
    const userEmail = validatedOrderData.shipping_data.email;
    const userCpf = validatedOrderData.shipping_data.cpf;

    if (!userEmail) {
      throw new Error("E-mail é obrigatório para processar o pagamento.");
    }

    if (!userCpf) {
      throw new Error("CPF é obrigatório para processar o pagamento.");
    }

    // CPF já foi validado pelo schema, usar diretamente
    const cpfClean = userCpf;

    const pixPayer = {
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        identification: { type: 'CPF', number: cpfClean }
    };
    
    const cardPayer = {
        email: userEmail,
        identification: { type: 'CPF', number: cpfClean }
    };

    if (paymentMethod === 'pix') {
      mercadoPagoPayload = {
        transaction_amount: Number(validatedOrderData.total_amount),
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
        transaction_amount: Number(validatedOrderData.total_amount),
        description: `Pedido #${order.id}`,
        token: paymentData.token,
        issuer_id: paymentData.issuer_id,
        payment_method_id: paymentData.payment_method_id,
        installments: paymentData.installments,
        payer: cardPayer,
        external_reference: order.id.toString(),
        notification_url: notificationUrl,
      };
    }

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mercadoPagoPayload),
    });

    const paymentResponse = await response.json();
    if (!response.ok) {
      edgeEnv.log('error', 'Mercado Pago API error', {
        status: response.status,
        error: paymentResponse,
        idempotencyKey
      });
      throw new Error(`[Mercado Pago] ${paymentResponse.message || 'Erro desconhecido.'}`);
    }

    edgeEnv.log('info', 'Payment created successfully', {
      paymentId: paymentResponse.id,
      status: paymentResponse.status,
      amount: paymentResponse.transaction_amount
    });

    // Salvar o pagamento no banco se user_id estiver disponível
    let paymentRecord = null;
    if (validatedOrderData.user_id) {
      const { data, error: paymentInsertError } = await supabaseAdmin.from('payments').insert({
        user_id: validatedOrderData.user_id,
        order_id: order?.id || null,
        external_id: paymentResponse.id.toString(),
        amount: paymentResponse.transaction_amount,
        method: paymentMethod.toUpperCase(),
        status: paymentResponse.status?.toUpperCase() || 'PENDING',
        provider: 'MERCADO_PAGO',
        idempotency_key: idempotencyKey,
        request_ip: clientIP,
        user_agent: userAgent,
        metadata: paymentMethod === 'pix' ? paymentResponse.point_of_interaction?.transaction_data : {
          last_four_digits: paymentResponse.card?.last_four_digits,
          cardholder_name: paymentResponse.card?.cardholder?.name,
          installments: paymentData?.installments
        },
      }).select().single();

      if (paymentInsertError) {
        edgeEnv.log('error', 'Failed to save payment record', {
          error: paymentInsertError,
          paymentId: paymentResponse.id
        });
      } else {
        paymentRecord = data;
      }
    }

    // Salvar registro de idempotência se payment record foi criado
    if (paymentRecord) {
      await supabaseAdmin.from('payment_idempotency').insert({
        idempotency_key: idempotencyKey,
        payment_id: paymentRecord.id,
        external_id: paymentResponse.id.toString()
      });
    }

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