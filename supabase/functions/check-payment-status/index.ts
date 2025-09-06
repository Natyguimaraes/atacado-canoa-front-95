import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { edgeEnv } from '../_shared/environment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação do usuário
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { paymentId } = await req.json();
    
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    edgeEnv.log('info', 'Checking payment status', {
      paymentId,
      userId: user.id
    });

    // Buscar detalhes do pagamento no Mercado Pago
    const accessToken = edgeEnv.getMercadoPagoToken();
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar pagamento ${paymentId} no Mercado Pago`);
    }

    const paymentDetails = await response.json();
    const newStatus = paymentDetails.status?.toUpperCase();

    edgeEnv.log('info', 'Payment status from Mercado Pago', {
      paymentId,
      currentStatus: newStatus,
      statusDetail: paymentDetails.status_detail
    });

    if (newStatus) {
      // Atualizar status na tabela payments (apenas do usuário logado)
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({ 
          status: newStatus,
          paid_at: newStatus === 'APPROVED' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('external_id', paymentId.toString())
        .eq('user_id', user.id);

      if (paymentUpdateError) {
        throw new Error(`Erro ao atualizar pagamento: ${paymentUpdateError.message}`);
      }

      // Buscar o order_id associado ao pagamento
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('order_id')
        .eq('external_id', paymentId.toString())
        .eq('user_id', user.id)
        .single();

      if (payment?.order_id) {
        // Atualizar status na tabela orders
        const orderStatus = newStatus === 'APPROVED' ? 'paid' : 
                           newStatus === 'REJECTED' ? 'cancelled' : 'pending';
        
        const { error: orderUpdateError } = await supabaseAdmin
          .from('orders')
          .update({ 
            status: orderStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.order_id)
          .eq('user_id', user.id);

        if (orderUpdateError) {
          throw new Error(`Erro ao atualizar pedido: ${orderUpdateError.message}`);
        }

        // Se aprovado, reduzir estoque
        if (newStatus === 'APPROVED') {
          const { data: order } = await supabaseAdmin
            .from('orders')
            .select('items')
            .eq('id', payment.order_id)
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

      edgeEnv.log('info', 'Payment status updated successfully', {
        paymentId,
        newStatus
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      status: newStatus,
      details: paymentDetails
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    edgeEnv.log('error', 'Error checking payment status', {
      error: error.message
    });
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});