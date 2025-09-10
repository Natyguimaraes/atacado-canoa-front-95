// src/lib/mercadoPago.ts

import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

// Interface para definir a estrutura da configuração esperada
interface EnvironmentConfig {
  publicKey: string;
}

// Variável para armazenar a configuração em cache na memória
let cachedConfig: EnvironmentConfig | null = null;

/**
 * Busca a configuração do ambiente do Mercado Pago (chave pública).
 * Primeiro, tenta usar o cache. Se não houver cache, invoca a Supabase Function.
 * Em caso de falha, utiliza uma chave de fallback do .env para emergências.
 * * @returns Uma promessa que resolve para a configuração contendo a `publicKey`.
 */
export const getEnvironmentConfig = async (): Promise<EnvironmentConfig> => {
  // 1. Se já tivermos a configuração em cache, retorna ela imediatamente
  if (cachedConfig) {
    logger.info('[App] Using cached MP configuration.');
    return cachedConfig;
  }

  try {
    logger.info('[App] Loading MP configuration from Supabase Function...');
    
    // Usar sempre teste por enquanto
    const { data, error } = await supabase.functions.invoke('debug-mp-config');

    // Se a função retornar um erro, lança para o bloco catch
    if (error) {
      throw error;
    }

    // Valida se a resposta contém a chave pública
    if (!data || !data.publicKey) {
      throw new Error('Invalid or missing publicKey in MP configuration from function.');
    }

    // 3. Armazena a configuração no cache para futuras requisições
    cachedConfig = { publicKey: data.publicKey };
    
    logger.info('[App] MP configuration loaded successfully from Supabase.');
    return cachedConfig;

  } catch (err) {
    logger.error('[App] Error loading MP configuration from Supabase, using fallback.', err);
    
    // Detectar ambiente para fallback correto
    const isProduction = window.location.hostname.includes('atacado-canoa-front-95.vercel.app') || 
                         window.location.hostname.includes('vercel.app');
    
    // Fallback baseado no ambiente
    return {
      publicKey: isProduction ? 
        "APP_USR-edb5a218-3bc1-496e-b3d9-24d33475a5b5" : 
        "TEST-dfc36fd1-447c-4c28-ba97-740e7d046799",
    };
  }
};