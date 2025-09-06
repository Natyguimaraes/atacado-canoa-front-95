// supabase/functions/mercado-pago-webhook/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { edgeEnv } from '../_shared/environment.ts';

// Para HMAC no Deno
async function createHmac(algorithm: string, key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: algorithm === 'sha256' ? 'SHA-256' : 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

// Schema para validação do webhook
const webhookSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string()
  })
});

// Função para validar assinatura do webhook
const validateWebhookSignature = async (
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> => {
  if (!signature || !secret) {
    console.log('Assinatura ou segredo não fornecidos');
    return false;
  }

  try {
    const expectedSignature = await createHmac("sha256", secret, body);
    const providedSignature = signature.replace('sha256=', '');
    
    return expectedSignature === providedSignature;
  } catch (error) {
    console.error('Erro ao validar assinatura:', error);
    return false;
  }
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
    // Obter o corpo da requisição como texto para validar a assinatura
    const requestBody = await req.text();
    const signature = req.headers.get('x-signature');
    const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');
    
    // Validar assinatura do webhook (opcional, mas recomendado)
    if (webhookSecret && !(await validateWebhookSignature(requestBody, signature, webhookSecret))) {
      console.warn('Assinatura do webhook inválida');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
        status: 401,
        headers: corsHeaders 
      });
    }
    
    // Parse do JSON após validação
    const notification = JSON.parse(requestBody);
    
    // Validar estrutura do webhook
    const validatedNotification = webhookSchema.parse(notification);
    
    console.log("--> Webhook do Mercado Pago recebido:", JSON.stringify(validatedNotification, null, 2));

    // A notificação do Mercado Pago só nos diz o ID do pagamento que mudou.
    if (validatedNotification.type === 'payment' && validatedNotification.data?.id) {
      const paymentId = validatedNotification.data.id;

      // Com o ID, nós buscamos os detalhes completos do pagamento na API do Mercado Pago.
      const accessToken = edgeEnv.getMercadoPagoToken();
      
      edgeEnv.log('info', 'Processing webhook notification', {
        paymentId,
        environment: edgeEnv.environment
      });

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
          .update({ 
            status: newStatus === 'APPROVED' ? 'PAID' : newStatus.toLowerCase(),
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (orderUpdateError) {
          throw new Error(`Erro ao atualizar o pedido ${orderId}: ${orderUpdateError.message}`);
        }
        console.log(`Pedido ${orderId} atualizado para o status ${newStatus}.`);

        // Também atualizamos o status na nossa tabela 'payments'
        const { error: paymentUpdateError } = await supabaseAdmin
          .from('payments')
          .update({ 
            status: newStatus,
            paid_at: newStatus === 'APPROVED' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('external_id', paymentId.toString());

        if (paymentUpdateError) {
          console.error(`Erro ao atualizar pagamento: ${paymentUpdateError.message}`);
        }
        
        // Se o pagamento foi aprovado, reduzir estoque
        if (newStatus === 'APPROVED') {
          const { data: order } = await supabaseAdmin
            .from('orders')
            .select('items')
            .eq('id', orderId)
            .single();

          if (order?.items) {
            for (const item of order.items) {
              await supabaseAdmin.rpc('decrease_stock', {
                product_id_to_update: item.product_id,
                quantity_to_decrease: item.quantity
              });
            }
          }
        }
      }
    }

    // Respondemos 200 OK para dizer ao Mercado Pago que recebemos a notificação com sucesso.
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error('!!! ERRO NO WEBHOOK !!!:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});