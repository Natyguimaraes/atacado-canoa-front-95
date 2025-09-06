import { NextApiRequest, NextApiResponse } from 'next';

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
    const { amount, payment_method_id, issuer_id } = req.body;

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

    // Consultar opções de parcelamento no Mercado Pago
    const url = `https://api.mercadopago.com/v1/payment_methods/installments?amount=${amount}&payment_method_id=${payment_method_id}&issuer_id=${issuer_id}`;
    
    const mpResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!mpResponse.ok) {
      return res.status(400).json({ error: 'Erro ao consultar opções de parcelamento' });
    }

    const mpResult = await mpResponse.json();

    // Formatar resposta
    const installmentOptions = mpResult[0]?.payer_costs?.map((cost: any) => ({
      installments: cost.installments,
      total_amount: cost.total_amount,
      labels: cost.labels || []
    })) || [];

    return res.status(200).json(installmentOptions);

  } catch (error: any) {
    console.error('Erro ao buscar parcelamento:', error);
    return res.status(500).json({ error: error.message });
  }
}