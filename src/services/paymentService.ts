// src/services/paymentService.ts

import { supabase } from '@/integrations/supabase/client';
import { OrderData, orderDataSchema } from '@/lib/schemas';
import { generateIdempotencyKey, checkIdempotency } from '@/lib/idempotency';
import { paymentLogger } from '@/lib/logger';
import { paymentRateLimiter } from '@/lib/rateLimiter';

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
  paymentData?: any
) => {
  const userId = orderData.user_id;
  
  // Verificar rate limiting
  if (!paymentRateLimiter.isAllowed(userId)) {
    const remaining = paymentRateLimiter.getRemainingTime(userId);
    const minutes = Math.ceil(remaining / 60000);
    paymentLogger.warn('Payment rate limit exceeded', { userId, remainingMinutes: minutes });
    throw new Error(`Muitas tentativas de pagamento. Tente novamente em ${minutes} minutos.`);
  }

  paymentLogger.info('Processing payment request', { 
    userId, 
    method: paymentMethod, 
    amount: orderData.total_amount 
  });
  // Validar dados do pedido antes de enviar
  try {
    orderDataSchema.parse(orderData);
    paymentLogger.debug('Order data validation passed');
  } catch (validationError: any) {
    paymentLogger.error('Order data validation failed', validationError);
    throw new Error(`Dados do pedido inválidos: ${validationError.message}`);
  }

  // Gerar chave de idempotência
  const idempotencyKey = generateIdempotencyKey(orderData.user_id, orderData);

  // Usar função principal corrigida
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
    paymentLogger.error('Payment processing error', { error, userId });
    throw new Error(error.message || 'Erro na comunicação com o servidor');
  }

  if (data.error) {
    paymentLogger.error('Payment processing error', { error: data.error, userId });
    throw new Error(data.error);
  }

  paymentLogger.info('Payment processed successfully', { 
    paymentId: data.id, 
    status: data.status, 
    userId 
  });

  return data;
};