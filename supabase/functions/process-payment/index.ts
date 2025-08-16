import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    identification: {
      type: string;
      number: string;
    };
  };
  token?: string;
  installments?: number;
  additional_info?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paymentData: PaymentRequest = await req.json();
    
    console.log('Processando pagamento:', {
      amount: paymentData.transaction_amount,
      method: paymentData.payment_method_id,
      email: paymentData.payer.email
    });

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    // Criar pagamento no Mercado Pago
    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(paymentData),
    });

    if (!mercadoPagoResponse.ok) {
      const errorData = await mercadoPagoResponse.json();
      console.error('Erro do Mercado Pago:', errorData);
      throw new Error(`Erro do Mercado Pago: ${errorData.message || 'Erro desconhecido'}`);
    }

    const paymentResult = await mercadoPagoResponse.json();
    
    console.log('Pagamento criado:', {
      id: paymentResult.id,
      status: paymentResult.status,
      status_detail: paymentResult.status_detail
    });

    // Para PIX, incluir informações do QR Code
    let response = {
      id: paymentResult.id,
      status: paymentResult.status,
      status_detail: paymentResult.status_detail,
      transaction_amount: paymentResult.transaction_amount,
      payment_method_id: paymentResult.payment_method_id,
    };

    if (paymentData.payment_method_id === 'pix' && paymentResult.point_of_interaction) {
      response = {
        ...response,
        pix_qr_code: paymentResult.point_of_interaction.transaction_data.qr_code,
        pix_qr_code_base64: paymentResult.point_of_interaction.transaction_data.qr_code_base64,
      };
      
      console.log('PIX criado com sucesso:', {
        id: paymentResult.id,
        status: paymentResult.status,
        qr_code_length: paymentResult.point_of_interaction.transaction_data.qr_code?.length || 0
      });
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});