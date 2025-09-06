// src/components/CardPaymentForm.tsx

import React, { useState } from 'react';
import { CardPayment } from '@mercadopago/sdk-react';
import { Label } from './ui/label';
import InstallmentSelector from './InstallmentSelector';
import SecurityWarnings from './SecurityWarnings';

interface CardPaymentData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

interface CardPaymentFormProps {
  amount: number;
  payerEmail: string;
  onPaymentReady: (data: CardPaymentData) => void;
  onFormError: (error: any) => void;
  onInstallmentsReady?: (hasInstallments: boolean) => void;
}

const CardPaymentForm: React.FC<CardPaymentFormProps> = ({ 
  amount, 
  payerEmail, 
  onPaymentReady, 
  onFormError, 
  onInstallmentsReady 
}) => {
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [paymentMethodInfo, setPaymentMethodInfo] = useState<{
    paymentMethodId: string;
    issuerId: string;
  } | null>(null);
  const initialization = {
    amount: amount,
    // --- INÍCIO DA CORREÇÃO ---
    // Adicionamos o e-mail do pagador na inicialização do formulário
    // para que o token seja gerado com o e-mail de teste correto.
    payer: {
      email: payerEmail,
    },
    // --- FIM DA CORREÇÃO ---
  };

  const customization = {
    visual: {
      style: {
        theme: 'flat',
      }
    }
  };
  
  const onSubmit = async (cardPaymentData: CardPaymentData) => {
    // Adicionar número de parcelas selecionado
    const enhancedData = {
      ...cardPaymentData,
      installments: selectedInstallments
    };
    onPaymentReady(enhancedData);
  };
  
  const onError = async (error: any) => {
    console.error("--- DETALHE DO ERRO NO FORMULÁRIO DO CARTÃO ---", error);
    onFormError(error);
  };

  const onReady = () => {
    // Quando o formulário estiver pronto, indicar que as parcelas podem ser carregadas
    onInstallmentsReady?.(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Dados do Cartão de Crédito</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha os dados do seu cartão para continuar
        </p>
      </div>
      
      <div id="card-payment-brick-container">
        <CardPayment
          initialization={initialization}
          customization={customization}
          onSubmit={onSubmit}
          onError={onError}
          onReady={onReady}
        />
      </div>

      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <Label className="text-sm font-medium">Parcelas</Label>
        <p className="text-sm text-muted-foreground mt-1">
          As opções de parcelamento serão exibidas após validar o cartão
        </p>
      </div>

      <SecurityWarnings />
    </div>
  );
};

export default CardPaymentForm;