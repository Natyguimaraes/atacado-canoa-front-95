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
  // Forçar sempre test environment até que as credenciais de produção sejam configuradas
  const isProd = false;
  
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
    environment: 'test', // Sempre test por enquanto
    isProduction: false,
    isTest: true,
    publicKey: publicTestKey, // Sempre usar test key
    accessToken: '', // Não usado no frontend
  };
};