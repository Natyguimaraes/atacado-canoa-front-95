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
  user_id?: string;
  order_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paymentData: PaymentRequest = await req.json();
    
    console.log('Dados do pagamento recebidos:', {
      amount: paymentData.transaction_amount,
      method: paymentData.payment_method_id,
      email: paymentData.payer?.email,
      user_id: paymentData.user_id,
      has_token: !!paymentData.token,
      installments: paymentData.installments
    });

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!accessToken) {
      console.error('Access token não encontrado');
      throw new Error('Token do Mercado Pago não configurado');
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Configurações Supabase não encontradas');
      throw new Error('Configurações do Supabase não encontradas');
    }

    console.log('Tokens configurados corretamente');

    // Criar pagamento no Mercado Pago
    console.log('Enviando dados para MP API:', {
      method: paymentData.payment_method_id,
      amount: paymentData.transaction_amount,
      has_token: !!paymentData.token
    });

    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(paymentData),
    });

    console.log('MP Response status:', mercadoPagoResponse.status);

    if (!mercadoPagoResponse.ok) {
      const errorData = await mercadoPagoResponse.json();
      console.error('Erro detalhado do Mercado Pago:', JSON.stringify(errorData, null, 2));
      throw new Error(`Erro do Mercado Pago: ${JSON.stringify(errorData)}`);
    }

    const paymentResult = await mercadoPagoResponse.json();
    
    console.log('Pagamento criado:', {
      id: paymentResult.id,
      status: paymentResult.status,
      status_detail: paymentResult.status_detail
    });

    // Salvar pagamento no banco de dados
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determinar metadata baseado no tipo de pagamento
    let metadata = null;
    if (paymentData.payment_method_id === 'pix' && paymentResult.point_of_interaction) {
      metadata = {
        qrCodeBase64: paymentResult.point_of_interaction.transaction_data.qr_code_base64,
        qrCode: paymentResult.point_of_interaction.transaction_data.qr_code,
        expirationDate: paymentResult.date_of_expiration
      };
    } else if (paymentData.payment_method_id !== 'pix' && paymentData.token) {
      metadata = {
        cardId: paymentData.token
      };
    }

    // Inserir pagamento na tabela payments
    const { data: paymentRecord, error: dbError } = await supabase
      .from('payments')
      .insert({
        user_id: paymentData.user_id,
        order_id: paymentData.order_id,
        method: paymentData.payment_method_id === 'pix' ? 'PIX' : 'CARD',
        status: paymentResult.status?.toUpperCase() || 'PENDING',
        amount: paymentData.transaction_amount,
        provider: 'MERCADO_PAGO',
        external_id: paymentResult.id.toString(),
        metadata: metadata,
        paid_at: paymentResult.status === 'approved' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar pagamento no banco:', dbError);
      // Não falhar a operação se o banco falhar, mas logar o erro
    } else {
      console.log('Pagamento salvo no banco:', paymentRecord?.id);
    }

    // Criar resposta base
    let response = {
      id: paymentResult.id,
      status: paymentResult.status,
      status_detail: paymentResult.status_detail,
      transaction_amount: paymentResult.transaction_amount,
      payment_method_id: paymentResult.payment_method_id,
    };

    // Para PIX, incluir informações do QR Code
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

    // Para cartão de crédito, incluir informações de installments
    if (paymentData.payment_method_id !== 'pix') {
      console.log('Pagamento com cartão criado:', {
        id: paymentResult.id,
        status: paymentResult.status,
        status_detail: paymentResult.status_detail,
        installments: paymentData.installments || 1,
        payment_method: paymentResult.payment_method_id
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