// src/components/CardPaymentForm.tsx

import React from 'react';
import { CardPayment } from '@mercadopago/sdk-react';
import { Label } from './ui/label';

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
  payerEmail: string; // <-- NOVO: Propriedade para receber o e-mail
  onPaymentReady: (data: CardPaymentData) => void;
  onFormError: (error: any) => void;
}

const CardPaymentForm: React.FC<CardPaymentFormProps> = ({ amount, payerEmail, onPaymentReady, onFormError }) => {
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
    onPaymentReady(cardPaymentData);
  };
  
  const onError = async (error: any) => {
    console.error("--- DETALHE DO ERRO NO FORMULÁRIO DO CARTÃO ---", error);
    onFormError(error);
  };

  return (
    <div className="space-y-4">
      <Label>Dados do Cartão de Crédito</Label>
      <div id="card-payment-brick-container">
        <CardPayment
          initialization={initialization}
          customization={customization}
          onSubmit={onSubmit}
          onError={onError}
        />
      </div>
    </div>
  );
};

export default CardPaymentForm;