import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Inicialização do cliente do Mercado Pago
const client = new MercadoPagoConfig({ accessToken: Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')! });
const payment = new Payment(client);

serve(async (req) => {
  const { type, data } = await req.json();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}` } } }
    );

    if (type === 'payment') {
      const paymentData = await payment.get({ id: data.id });
      console.log('Webhook de pagamento recebido:', paymentData);

      // Encontrar o pedido associado a este pagamento
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('mp_payment_id', paymentData.id)
        .single();
      
      if (orderError || !order) {
        console.error(`Pedido não encontrado para o pagamento ID: ${paymentData.id}`);
        return new Response('Pedido não encontrado', { status: 404 });
      }

      // Se o pagamento foi aprovado, atualize o status do pedido e diminua o estoque
      if (paymentData.status === 'approved') {
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (orderUpdateError) {
          console.error('Erro ao atualizar status do pedido:', orderUpdateError);
        } else {
          console.log(`Pedido ${order.id} atualizado para status "paid".`);
        }

        // --- LÓGICA DE DIMINUIÇÃO DE ESTOQUE ---
        if (Array.isArray(order.items)) {
          console.log(`Iniciando baixa de estoque para o pedido: ${order.id}`);
          for (const item of order.items) {
            if (item.product_id && item.quantity) {
              const { error: stockError } = await supabase.rpc('decrease_stock', {
                product_id_to_update: item.product_id,
                quantity_to_decrease: item.quantity
              });

              if (stockError) {
                console.error(`Erro ao diminuir estoque do produto ${item.product_id}:`, stockError);
              } else {
                console.log(`Estoque do produto ${item.product_id} diminuído em ${item.quantity}.`);
              }
            }
          }
        }
      }
    }

    return new Response('Webhook recebido', { status: 200 });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(`Erro no webhook: ${error.message}`, { status: 500 });
  }
});