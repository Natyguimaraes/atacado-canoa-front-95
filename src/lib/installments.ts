// src/lib/installments.ts
import { supabase } from '@/integrations/supabase/client';

export interface InstallmentOption {
  installments: number;
  installment_rate: number;
  discount_rate: number;
  min_allowed_amount: number;
  max_allowed_amount: number;
  recommended_message: string;
  installment_amount: number;
  total_amount: number;
  labels: string[];
}

export const getInstallmentOptions = async (
  amount: number,
  paymentMethodId: string,
  issuerId: string
): Promise<InstallmentOption[]> => {
  try {
    const response = await fetch('/api/get-installments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        payment_method_id: paymentMethodId,
        issuer_id: issuerId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao buscar opções de parcelamento:', errorData);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Erro ao carregar parcelamento:', error);
    return [];
  }
};

export const formatInstallmentText = (option: InstallmentOption): string => {
  if (option.installments === 1) {
    return `À vista: ${formatCurrency(option.total_amount)}`;
  }

  const interestText = option.installment_rate === 0 ? 'sem juros' : 'com juros';
  return `${option.installments}x de ${formatCurrency(option.installment_amount)} ${interestText}`;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};