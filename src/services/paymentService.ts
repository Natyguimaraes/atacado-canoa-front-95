// src/services/paymentService.ts

import { supabase } from '@/integrations/supabase/client';
import { OrderData, orderDataSchema } from '@/lib/schemas';
import { generateIdempotencyKey, checkIdempotency } from '@/lib/idempotency';

type PaymentMethod = 'pix' | 'credit';

/**
 * Invoca a Supabase Edge Function para processar o pagamento.
 * @param orderData - Os dados do pedido.
 * @param paymentMethod - O método de pagamento ('pix' ou 'credit').
 * @param paymentData - Dados adicionais para o pagamento (ex: dados do cartão).
 * @returns Os dados da resposta do pagamento do Mercado Pago.
 * @throws Lança um erro se a chamada da função falhar ou se a função retornar um erro.
 */
export const processPayment = async (
  orderData: OrderData, 
  paymentMethod: PaymentMethod,
  paymentData?: any // Parâmetro opcional para os dados do cartão
) => {
  // Validar dados do pedido antes de enviar
  try {
    orderDataSchema.parse(orderData);
  } catch (validationError: any) {
    throw new Error(`Dados do pedido inválidos: ${validationError.message}`);
  }

  // Gerar chave de idempotência
  const idempotencyKey = generateIdempotencyKey(orderData.user_id, orderData);
  
  // Verificar se já existe um pagamento com esta chave
  const existingPayment = await checkIdempotency(idempotencyKey);
  if (existingPayment) {
    return {
      id: existingPayment.external_id,
      status: 'duplicate',
      message: 'Pagamento já processado'
    };
  }

  const { data, error } = await supabase.functions.invoke('process-payment', {
    body: {
      orderData,
      paymentMethod,
      paymentData,
    },
    headers: {
      'x-idempotency-key': idempotencyKey
    }
  });

  if (error) {
    // Erros de rede ou permissão na chamada da função
    throw new Error(`Erro de comunicação com o servidor: ${error.message}`);
  }
  
  if (data.error) {
    // Erro de lógica retornado pela nossa função (status 400)
    throw new Error(data.error);
  }

  return data;
};