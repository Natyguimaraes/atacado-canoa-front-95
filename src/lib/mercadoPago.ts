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
  // Usar sempre test para desenvolvimento
  const isProd = false;
  
  // Usar sempre a public key de teste
  const publicTestKey = 'TEST-710ad6a1-8e41-44a1-9979-90e213360bc8';
  
  return {
    environment: 'test',
    isProduction: false,
    isTest: true,
    publicKey: publicTestKey,
    accessToken: '', // Não usado no frontend
  };
};