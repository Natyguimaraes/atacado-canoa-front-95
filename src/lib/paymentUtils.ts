import { supabase } from "@/integrations/supabase/client";

export interface PaymentData {
  user_id: string;
  order_id: string;
  external_id: string;
  amount: number;
  method: string;
  status: string;
  provider: string;
  paid_at?: string | null;
  metadata?: any;
}

export const createPaymentRecord = async (paymentData: PaymentData) => {
  const { data: paymentRecord, error: paymentInsertError } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single();

  if (paymentInsertError) {
    console.error('Erro ao salvar pagamento:', paymentInsertError);
    throw new Error('Erro ao registrar pagamento no sistema');
  }

  return paymentRecord;
};

export const updateOrderWithPayment = async (orderId: string, paymentId: string, status?: string) => {
  const updateData: any = { payment_id: paymentId };
  if (status) {
    updateData.status = status;
  }

  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (orderUpdateError) {
    console.error('Erro ao atualizar pedido:', orderUpdateError);
    throw new Error('Erro ao atualizar pedido com informações de pagamento');
  }
};

export const processPaymentResponse = async (
  paymentResponse: any,
  orderId: string,
  userId: string,
  amount: number,
  method: string
) => {
  // Criar registro de pagamento
  const paymentRecord = await createPaymentRecord({
    user_id: userId,
    order_id: orderId,
    external_id: paymentResponse.id.toString(),
    amount: amount,
    method: method,
    status: paymentResponse.status?.toUpperCase() || 'PENDING',
    provider: 'MERCADO_PAGO',
    paid_at: paymentResponse.status === 'approved' ? new Date().toISOString() : null,
    metadata: method === 'PIX' ? {
      qrCode: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64,
      expirationDate: paymentResponse.date_of_expiration,
      ticketUrl: paymentResponse.point_of_interaction?.transaction_data?.ticket_url
    } : {
      installments: paymentResponse.installments,
      payment_method: paymentResponse.payment_method_id,
      status_detail: paymentResponse.status_detail
    }
  });

  // Atualizar pedido com payment_id
  await updateOrderWithPayment(
    orderId, 
    paymentRecord.id, 
    paymentResponse.status === 'approved' ? 'paid' : 'pending'
  );

  return {
    ...paymentRecord,
    external_id: paymentResponse.id.toString()
  };
};