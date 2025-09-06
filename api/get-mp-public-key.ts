import { NextApiRequest, NextApiResponse } from 'next';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Detectar ambiente baseado na URL da Vercel
    const isProduction = process.env.NODE_ENV === 'production' && 
                        process.env.VERCEL_URL && 
                        !process.env.VERCEL_URL.includes('vercel.app');

    const publicKey = isProduction
      ? process.env.MERCADO_PAGO_PUBLIC_KEY_PROD
      : process.env.MERCADO_PAGO_PUBLIC_KEY_TEST;

    if (!publicKey) {
      return res.status(500).json({ 
        error: 'Chave pública do Mercado Pago não configurada para o ambiente atual.' 
      });
    }

    return res.status(200).json({
      publicKey: publicKey,
      environment: isProduction ? 'production' : 'development',
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}