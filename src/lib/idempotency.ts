// src/lib/idempotency.ts
import { supabase } from '@/integrations/supabase/client';

export const generateIdempotencyKey = (userId: string, data: any): string => {
  // Cria uma chave única baseada no usuário e dados da requisição
  const dataString = JSON.stringify(data);
  const timestamp = Math.floor(Date.now() / 60000); // Janela de 1 minuto
  return `${userId}-${timestamp}-${btoa(dataString).slice(0, 32)}`;
};

export const checkIdempotency = async (key: string) => {
  try {
    const { data, error } = await supabase
      .from('payment_idempotency')
      .select('*')
      .eq('idempotency_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao verificar idempotência:', error);
    return null;
  }
};

export const saveIdempotencyRecord = async (
  key: string, 
  paymentId: string, 
  externalId: string
) => {
  try {
    const { error } = await supabase
      .from('payment_idempotency')
      .insert({
        idempotency_key: key,
        payment_id: paymentId,
        external_id: externalId
      });

    if (error) {
      console.error('Erro ao salvar registro de idempotência:', error);
    }
  } catch (error) {
    console.error('Erro ao salvar idempotência:', error);
  }
};