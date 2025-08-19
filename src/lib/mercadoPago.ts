// Utility functions for Mercado Pago environment detection and configuration

/**
 * Checks if the current environment is production based on the hostname
 */
export const isProduction = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  
  // Check for production domains
  const productionDomains = [
    'atacadocanoa.com',
    'www.atacadocanoa.com',
    'atacado-canoa-loja.lovable.app', // Domínio de produção atual
    // Add other production domains here
  ];
  
  return productionDomains.some(domain => hostname.includes(domain));
};

/**
 * Gets the appropriate Mercado Pago public key based on environment
 */
export const getMercadoPagoPublicKey = async (): Promise<string> => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    if (isProduction()) {
      // Get production key from Supabase secrets
      const { data, error } = await supabase.functions.invoke('get-mp-config', {
        body: { environment: 'production' }
      });
      
      if (error) throw error;
      return data.publicKey;
    } else {
      // Get test key from Supabase secrets  
      const { data, error } = await supabase.functions.invoke('get-mp-config', {
        body: { environment: 'test' }
      });
      
      if (error) throw error;
      return data.publicKey;
    }
  } catch (error) {
    console.error('Error getting Mercado Pago public key:', error);
    // Fallback to hardcoded test key for development
    return 'TEST-dfc36fd1-447c-4c28-ba97-740e7d046799';
  }
};

/**
 * Gets environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const isProd = isProduction();
  
  // Log para debugging
  console.log('Environment detection debug:', {
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    isProduction: isProd,
    environment: isProd ? 'production' : 'test'
  });
  
  return {
    environment: isProd ? 'production' : 'test',
    isProduction: isProd,
    isDevelopment: !isProd,
  };
};