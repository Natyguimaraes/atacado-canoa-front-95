// src/lib/mercadoPago.ts
/**
 * Utility functions for Mercado Pago environment detection and configuration.
 * Public keys are loaded from Supabase edge functions.
 */

import { supabase } from "@/integrations/supabase/client";

interface EnvironmentConfig {
  environment: 'production' | 'test';
  isProduction: boolean;
  isTest: boolean;
  publicKey: string;
  accessToken: string;
}

let cachedConfig: EnvironmentConfig | null = null;

export const getEnvironmentConfig = async (): Promise<EnvironmentConfig> => {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase.functions.invoke('get-mp-public-key');
    
    if (error) {
      throw new Error(`Erro ao buscar configuração: ${error.message}`);
    }

    cachedConfig = {
      environment: data.environment === 'production' ? 'production' : 'test',
      isProduction: data.environment === 'production',
      isTest: data.environment !== 'production',
      publicKey: data.publicKey,
      accessToken: '', // Não usado no frontend
    };

    return cachedConfig;
  } catch (error) {
    console.error('Erro ao carregar configuração do Mercado Pago:', error);
    // Fallback para desenvolvimento local
    cachedConfig = {
      environment: 'test',
      isProduction: false,
      isTest: true,
      publicKey: 'TEST-710ad6a1-8e41-44a1-9979-90e213360bc8', // Fallback
      accessToken: '',
    };
    return cachedConfig;
  }
};

// Versão síncrona para compatibilidade
export const getEnvironmentConfigSync = (): EnvironmentConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  // Retorna configuração de fallback se não houver cache
  return {
    environment: 'test',
    isProduction: false,
    isTest: true,
    publicKey: 'TEST-710ad6a1-8e41-44a1-9979-90e213360bc8',
    accessToken: '',
  };
};