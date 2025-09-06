// src/lib/mercadoPago.ts
/**
 * Utility functions for Mercado Pago environment detection and configuration.
 * Public keys are loaded from Supabase edge functions.
 */

import { supabase } from "@/integrations/supabase/client";
import { envManager } from '@/lib/environment';
import { logger as mpLogger } from '@/lib/logger';

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

  mpLogger.debug('Loading Mercado Pago configuration', { environment: envManager.environment });

  try {
    const { data, error } = await supabase.functions.invoke('get-mp-public-key');
    
    if (error) {
      mpLogger.error('Failed to fetch MP configuration', error);
      throw new Error(`Erro ao buscar configuração: ${error.message}`);
    }

    mpLogger.info('MP configuration loaded successfully', { environment: data.environment });

    cachedConfig = {
      environment: data.environment === 'production' ? 'production' : 'test',
      isProduction: data.environment === 'production',
      isTest: data.environment !== 'production',
      publicKey: data.publicKey,
      accessToken: '', // Não usado no frontend
    };

    return cachedConfig;
  } catch (error) {
    mpLogger.error('Error loading MP configuration, using fallback', error);
    // Fallback para desenvolvimento local
    cachedConfig = {
      environment: envManager.mercadoPagoEnvironment,
      isProduction: envManager.isProduction,
      isTest: !envManager.isProduction,
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