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
  // Detectar automaticamente o ambiente baseado no hostname
  const isProd = typeof window !== 'undefined' && 
    (window.location.hostname.includes('lovable.app') || 
     window.location.hostname.includes('atacadocanoa.com'));
  
  // As public keys são carregadas das variáveis do projeto
  const publicTestKey = import.meta.env.VITE_MERCADOPAGO_TEST_KEY || '';
  const publicProductionKey = import.meta.env.VITE_MERCADOPAGO_PRODUCTION_KEY || '';
  
  console.log('Environment config:', {
    isProd,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    publicTestKey: publicTestKey ? publicTestKey.substring(0, 10) + '...' : 'missing',
    publicProductionKey: publicProductionKey ? publicProductionKey.substring(0, 10) + '...' : 'missing'
  });

  return {
    environment: isProd ? 'production' : 'test',
    isProduction: isProd,
    isTest: !isProd,
    publicKey: isProd ? publicProductionKey : publicTestKey,
    accessToken: '', // Não usado no frontend
  };
};