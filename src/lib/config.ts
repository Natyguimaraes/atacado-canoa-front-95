// src/lib/config.ts
/**
 * Configurações centralizadas baseadas no ambiente
 */

import { envManager } from './environment';

interface AppConfig {
  app: {
    name: string;
    version: string;
    description: string;
  };
  api: {
    timeout: number;
    retries: number;
    baseUrl: string;
  };
  payment: {
    provider: 'mercado_pago';
    environment: 'test' | 'production';
    timeout: number;
    maxRetries: number;
    webhookTimeout: number;
  };
  security: {
    maxLoginAttempts: number;
    loginTimeout: number;
    sessionTimeout: number;
    enableCSRFProtection: boolean;
    enableRateLimiting: boolean;
  };
  ui: {
    enableAnimations: boolean;
    enableTransitions: boolean;
    showDebugInfo: boolean;
    theme: 'auto' | 'light' | 'dark';
  };
  monitoring: {
    enableAnalytics: boolean;
    enableErrorTracking: boolean;
    enablePerformanceTracking: boolean;
    enableUserTracking: boolean;
  };
  features: {
    enableCart: boolean;
    enableWishlist: boolean;
    enableReviews: boolean;
    enableNotifications: boolean;
    enablePWA: boolean;
  };
  store: {
    name: string;
    description: string;
    zipCode: string;
    city: string;
    state: string;
  };
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.buildConfig();
  }

  private buildConfig(): AppConfig {
    const baseConfig: AppConfig = {
      app: {
        name: 'Atacado Canoa',
        version: '1.0.0',
        description: 'Loja de roupas online'
      },
      api: {
        timeout: envManager.isProduction ? 30000 : 60000,
        retries: envManager.isProduction ? 3 : 1,
        baseUrl: envManager.supabaseUrl
      },
      payment: {
        provider: 'mercado_pago',
        environment: envManager.mercadoPagoEnvironment,
        timeout: 45000,
        maxRetries: envManager.isProduction ? 2 : 5,
        webhookTimeout: 30000
      },
      security: {
        maxLoginAttempts: 5,
        loginTimeout: 900000, // 15 minutos
        sessionTimeout: envManager.isProduction ? 3600000 : 86400000, // 1h prod, 24h dev
        enableCSRFProtection: envManager.isProduction,
        enableRateLimiting: true
      },
      ui: {
        enableAnimations: !envManager.isProduction, // Desabilitar em prod para performance
        enableTransitions: true,
        showDebugInfo: envManager.enableDebugLogs,
        theme: 'auto'
      },
      monitoring: {
        enableAnalytics: envManager.isProduction,
        enableErrorTracking: envManager.isProduction,
        enablePerformanceTracking: envManager.isProduction,
        enableUserTracking: envManager.isProduction
      },
      features: {
        enableCart: true,
        enableWishlist: !envManager.isDevelopment, // Futuro
        enableReviews: !envManager.isDevelopment, // Futuro
        enableNotifications: envManager.isProduction,
        enablePWA: envManager.isProduction
      },
      store: {
        name: 'Atacado Canoa',
        description: 'Loja de roupas atacado e varejo',
        zipCode: '48000-211', // CEP da loja (Alagoas)
        city: 'Arapiraca',
        state: 'AL'
      }
    };

    return baseConfig;
  }

  // Getters para acessar configurações
  get app() {
    return this.config.app;
  }

  get api() {
    return this.config.api;
  }

  get payment() {
    return this.config.payment;
  }

  get security() {
    return this.config.security;
  }

  get ui() {
    return this.config.ui;
  }

  get monitoring() {
    return this.config.monitoring;
  }

  get features() {
    return this.config.features;
  }

  get store() {
    return this.config.store;
  }

  // Verificar se uma feature está habilitada
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  // Verificar configuração de monitoramento
  isMonitoringEnabled(type: keyof AppConfig['monitoring']): boolean {
    return this.config.monitoring[type];
  }

  // Override de configuração para testes
  overrideConfig(path: string, value: any): void {
    if (!envManager.isDevelopment) {
      console.warn('Override de configuração só é permitido em desenvolvimento');
      return;
    }

    const keys = path.split('.');
    let target: any = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = value;
    console.log(`🔧 Configuração alterada: ${path} = ${value}`);
  }

  // Exportar configuração atual (para debug)
  exportConfig(): AppConfig {
    return JSON.parse(JSON.stringify(this.config));
  }
}

// Instância singleton
export const config = new ConfigManager();

// Exports diretos para facilitar uso
export const {
  app: appConfig,
  api: apiConfig,
  payment: paymentConfig,
  security: securityConfig,
  ui: uiConfig,
  monitoring: monitoringConfig,
  features: featuresConfig,
  store: storeConfig
} = config;