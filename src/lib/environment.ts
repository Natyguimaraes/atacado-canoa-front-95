// src/lib/environment.ts
/**
 * Sistema de gerenciamento de ambientes com detecção automática
 * e configurações específicas para development/production
 */

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  environment: Environment;
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  mercadoPagoEnvironment: 'test' | 'production';
  enableDebugLogs: boolean;
  enableConsoleReports: boolean;
  enablePerformanceMonitoring: boolean;
  rateLimit: {
    payment: { maxRequests: number; windowMs: number };
    general: { maxRequests: number; windowMs: number };
  };
}

class EnvironmentManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.detectEnvironment();
    this.validateConfiguration();
    this.logEnvironmentInfo();
  }

  private detectEnvironment(): EnvironmentConfig {
    // Detectar ambiente baseado em múltiplos indicadores
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLovablePreview = hostname.includes('lovable.app');
    const isCustomDomain = !isLocalhost && !isLovablePreview;
    
    // Detectar baseado na URL do Supabase
    const supabaseUrl = "https://lcualhkpezggwqqmlywc.supabase.co";
    const isSupabaseProduction = supabaseUrl.includes('supabase.co');

    let environment: Environment;
    let mercadoPagoEnvironment: 'test' | 'production';

    if (isLocalhost) {
      environment = 'development';
      mercadoPagoEnvironment = 'test';
    } else if (isLovablePreview) {
      environment = 'staging';
      mercadoPagoEnvironment = 'test';
    } else if (isCustomDomain && isSupabaseProduction) {
      environment = 'production';
      mercadoPagoEnvironment = 'production';
    } else {
      environment = 'staging';
      mercadoPagoEnvironment = 'test';
    }

    return {
      isDevelopment: environment === 'development',
      isStaging: environment === 'staging',
      isProduction: environment === 'production',
      environment,
      apiUrl: supabaseUrl,
      supabaseUrl,
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjdWFsaGtwZXpnZ3dxcW1seXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMjM3ODMsImV4cCI6MjA3MDY5OTc4M30.GTR9N2rpBiitzTxbKeDdiSfE6rE5Ac1Vjxd7VzOUYL4",
      mercadoPagoEnvironment,
      enableDebugLogs: environment !== 'production',
      enableConsoleReports: environment === 'development',
      enablePerformanceMonitoring: environment === 'production',
      rateLimit: {
        payment: environment === 'production' 
          ? { maxRequests: 3, windowMs: 300000 }  // Produção: 3 tentativas em 5min
          : { maxRequests: 10, windowMs: 60000 }, // Dev: 10 tentativas em 1min
        general: environment === 'production'
          ? { maxRequests: 100, windowMs: 60000 } // Produção: 100 req/min
          : { maxRequests: 1000, windowMs: 60000 } // Dev: 1000 req/min
      }
    };
  }

  private validateConfiguration(): void {
    const requiredConfig = ['supabaseUrl', 'supabaseAnonKey'];
    
    for (const key of requiredConfig) {
      if (!this.config[key as keyof EnvironmentConfig]) {
        throw new Error(`Configuração obrigatória ausente: ${key}`);
      }
    }

    // Validar URLs
    try {
      new URL(this.config.supabaseUrl);
    } catch {
      throw new Error('URL do Supabase inválida');
    }

    // Verificar se estamos usando credenciais de produção em desenvolvimento
    if (this.config.isDevelopment && this.config.mercadoPagoEnvironment === 'production') {
      console.warn('⚠️ ATENÇÃO: Detectadas credenciais de produção em ambiente de desenvolvimento!');
    }
  }

  private logEnvironmentInfo(): void {
    if (!this.config.enableDebugLogs) return;

    const info = {
      environment: this.config.environment,
      mercadoPago: this.config.mercadoPagoEnvironment,
      debugLogs: this.config.enableDebugLogs,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
    };

    console.group('🌍 Configuração do Ambiente');
    console.table(info);
    console.groupEnd();
  }

  // Getters públicos
  get environment(): Environment {
    return this.config.environment;
  }

  get isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  get isStaging(): boolean {
    return this.config.isStaging;
  }

  get isProduction(): boolean {
    return this.config.isProduction;
  }

  get supabaseUrl(): string {
    return this.config.supabaseUrl;
  }

  get supabaseAnonKey(): string {
    return this.config.supabaseAnonKey;
  }

  get mercadoPagoEnvironment(): 'test' | 'production' {
    return this.config.mercadoPagoEnvironment;
  }

  get enableDebugLogs(): boolean {
    return this.config.enableDebugLogs;
  }

  get enableConsoleReports(): boolean {
    return this.config.enableConsoleReports;
  }

  get rateLimit() {
    return this.config.rateLimit;
  }

  // Métodos utilitários
  logDebug(message: string, data?: any): void {
    if (this.config.enableDebugLogs) {
      console.log(`🔍 [${this.config.environment.toUpperCase()}]`, message, data || '');
    }
  }

  logError(message: string, error?: any): void {
    console.error(`❌ [${this.config.environment.toUpperCase()}]`, message, error || '');
  }

  logInfo(message: string, data?: any): void {
    if (this.config.enableConsoleReports) {
      console.info(`ℹ️ [${this.config.environment.toUpperCase()}]`, message, data || '');
    }
  }

  logWarning(message: string, data?: any): void {
    console.warn(`⚠️ [${this.config.environment.toUpperCase()}]`, message, data || '');
  }

  // Verificar se uma feature está habilitada
  isFeatureEnabled(feature: 'debugLogs' | 'consoleReports' | 'performanceMonitoring'): boolean {
    switch (feature) {
      case 'debugLogs':
        return this.config.enableDebugLogs;
      case 'consoleReports':
        return this.config.enableConsoleReports;
      case 'performanceMonitoring':
        return this.config.enablePerformanceMonitoring;
      default:
        return false;
    }
  }
}

// Instância singleton
export const envManager = new EnvironmentManager();

// Exports para compatibilidade
export const {
  environment,
  isDevelopment,
  isStaging,
  isProduction,
  supabaseUrl,
  supabaseAnonKey,
  mercadoPagoEnvironment,
  enableDebugLogs
} = envManager;