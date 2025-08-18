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
    console.log('=== MERCADO PAGO WEBHOOK RECEIVED ===');
    
    // Obter dados do webhook
    const bodyText = await req.text();
    console.log('Webhook body:', bodyText);
    
    // Obter headers para validação
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    
    console.log('X-Signature:', xSignature);
    console.log('X-Request-ID:', xRequestId);

    // Validar assinatura do webhook
    const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.log('ERROR: Webhook secret not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validar assinatura se presente
    if (xSignature && xRequestId) {
      console.log('Validating webhook signature...');
      
      // Extrair ts e hash da assinatura
      const parts = xSignature.split(',');
      let ts = '';
      let hash = '';
      
      for (const part of parts) {
        const [key, value] = part.trim().split('=');
        if (key === 'ts') ts = value;
        if (key === 'v1') hash = value;
      }
      
      if (!ts || !hash) {
        console.log('Invalid signature format');
        return new Response(JSON.stringify({ error: 'Invalid signature format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Criar string para validação: id + request-id + ts + body
      const stringToSign = `id;${xRequestId};ts;${ts};${bodyText}`;
      console.log('String to sign length:', stringToSign.length);

      // Calcular HMAC SHA256
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(stringToSign)
      );

      // Converter para hex
      const expectedHash = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('Expected hash:', expectedHash);
      console.log('Received hash:', hash);

      if (expectedHash !== hash) {
        console.log('ERROR: Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('✅ Webhook signature validated successfully');
    } else {
      console.log('⚠️ No signature headers found, proceeding without validation');
    }

    // Parse do body
    const body = JSON.parse(bodyText);
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