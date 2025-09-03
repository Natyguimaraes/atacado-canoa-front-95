// src/services/paymentService.ts

import { supabase } from '@/integrations/supabase/client';

// Tipagem para os dados do pedido, para garantir consistência
interface OrderData {
  user_id: string | undefined;
  items: any[]; // Idealmente, crie uma interface para os itens do carrinho também
  total_amount: number;
  shipping_data: any; // Idealmente, use a interface ShippingData que você já tem
}

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
  const { data, error } = await supabase.functions.invoke('process-payment', {
    body: {
      orderData,
      paymentMethod,
      paymentData, // Enviamos os dados do cartão aqui
    },
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