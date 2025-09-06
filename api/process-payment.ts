import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-idempotency-key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { orderData, paymentMethod, paymentData } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    // Verificar se idempotency key está presente
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Header X-Idempotency-Key é obrigatório' });
    }

    // Verificar idempotência
    const { data: existingPayment } = await supabase
      .from('payment_idempotency')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingPayment) {
      return res.status(200).json({
        id: existingPayment.external_id,
        status: 'duplicate',
        message: 'Pagamento já processado'
      });
    }

    // Determinar token do Mercado Pago baseado no ambiente
    const isProduction = process.env.NODE_ENV === 'production' && 
                        process.env.VERCEL_URL && 
                        !process.env.VERCEL_URL.includes('vercel.app');
    
    const accessToken = isProduction 
      ? process.env.MERCADO_PAGO_ACCESS_TOKEN_PROD
      : process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;

    if (!accessToken) {
      return res.status(500).json({ error: 'Token do Mercado Pago não configurado' });
    }

    // Criar pagamento no Mercado Pago
    const paymentPayload: any = {
      transaction_amount: orderData.total_amount,
      description: `Pedido #${orderData.order_id}`,
      payment_method_id: paymentMethod === 'pix' ? 'pix' : paymentData?.payment_method_id,
      payer: {
        email: orderData.customer_email,
        first_name: orderData.customer_name?.split(' ')[0] || '',
        last_name: orderData.customer_name?.split(' ').slice(1).join(' ') || '',
        identification: {
          type: 'CPF',
          number: orderData.customer_cpf?.replace(/\D/g, '') || ''
        }
      }
    };

    if (paymentMethod === 'credit' && paymentData) {
      paymentPayload.token = paymentData.token;
      paymentPayload.installments = paymentData.installments;
      paymentPayload.issuer_id = paymentData.issuer_id;
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpResult = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Erro do Mercado Pago:', mpResult);
      return res.status(400).json({ 
        error: mpResult.message || 'Erro ao processar pagamento' 
      });
    }

    // Salvar pagamento no banco
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id: orderData.user_id,
        external_id: mpResult.id,
        status: mpResult.status,
        amount: orderData.total_amount,
        method: paymentMethod.toUpperCase(),
        metadata: {
          qr_code_base64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64,
          qr_code: mpResult.point_of_interaction?.transaction_data?.qr_code,
          expiration_date: mpResult.date_of_expiration
        }
      });

    if (insertError) {
      console.error('Erro ao salvar pagamento:', insertError);
    }

    // Salvar chave de idempotência
    if (idempotencyKey) {
      await supabase
        .from('payment_idempotency')
        .insert({
          idempotency_key: idempotencyKey,
          user_id: orderData.user_id,
          external_id: mpResult.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
    }

    return res.status(200).json({
      id: mpResult.id,
      status: mpResult.status,
      metadata: {
        qr_code_base64: mpResult.point_of_interaction?.transaction_data?.qr_code_base64,
        qr_code: mpResult.point_of_interaction?.transaction_data?.qr_code,
        expiration_date: mpResult.date_of_expiration
      }
    });

  } catch (error: any) {
    console.error('Erro no processamento:', error);
    return res.status(500).json({ error: error.message });
  }
}