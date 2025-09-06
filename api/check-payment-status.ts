import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
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

    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID é obrigatório' });
    }

    // Determinar token baseado no ambiente
    const isProduction = process.env.NODE_ENV === 'production' && 
                        process.env.VERCEL_URL && 
                        !process.env.VERCEL_URL.includes('vercel.app');
    
    const accessToken = isProduction 
      ? process.env.MERCADO_PAGO_ACCESS_TOKEN_PROD
      : process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST;

    if (!accessToken) {
      return res.status(500).json({ error: 'Token do Mercado Pago não configurado' });
    }

    // Consultar status no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!mpResponse.ok) {
      return res.status(400).json({ error: 'Pagamento não encontrado no Mercado Pago' });
    }

    const mpPayment = await mpResponse.json();

    // Atualizar status no banco de dados
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: mpPayment.status,
        updated_at: new Date().toISOString()
      })
      .eq('external_id', paymentId);

    if (updateError) {
      console.error('Erro ao atualizar status:', updateError);
    }

    return res.status(200).json({
      id: mpPayment.id,
      status: mpPayment.status,
      updated: true
    });

  } catch (error: any) {
    console.error('Erro ao verificar status:', error);
    return res.status(500).json({ error: error.message });
  }
}