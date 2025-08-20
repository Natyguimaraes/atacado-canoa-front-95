// src/lib/mercadoPago.ts
/**
 * Utility functions for Mercado Pago environment detection and configuration.
 * Public keys are loaded from environment variables.
 */

interface EnvironmentConfig {
  environment: 'production' | 'test';
  isProduction: boolean;
  isTest: boolean;
  publicKey: string;
  accessToken: string;
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  
  // As public keys são carregadas do Vercel, e os segredos do Edge Function
  const publicTestKey = process.env.NEXT_PUBLIC_MERCADOPAGO_TEST_KEY || '';
  const publicProductionKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PRODUCTION_KEY || '';
  const accessTestToken = process.env.MERCADOPAGO_TEST_ACCESS_TOKEN || '';
  const accessProductionToken = process.env.MERCADOPAGO_PRODUCTION_ACCESS_TOKEN || '';

  return {
    environment: isProd ? 'production' : 'test',
    isProduction: isProd,
    isTest: !isProd,
    publicKey: isProd ? publicProductionKey : publicTestKey,
    accessToken: isProd ? accessProductionToken : accessTestToken,
  };
};