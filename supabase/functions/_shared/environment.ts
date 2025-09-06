// supabase/functions/_shared/environment.ts
/**
 * Gerenciamento de ambiente para Edge Functions
 */

export type EdgeEnvironment = 'development' | 'staging' | 'production';

interface EdgeEnvironmentConfig {
  environment: EdgeEnvironment;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  mercadoPagoEnvironment: 'test' | 'production';
  enableVerboseLogs: boolean;
  enableDetailedErrors: boolean;
  enablePerformanceMetrics: boolean;
}

class EdgeEnvironmentManager {
  private config: EdgeEnvironmentConfig;

  constructor() {
    this.config = this.detectEnvironment();
  }

  private detectEnvironment(): EdgeEnvironmentConfig {
    // Detectar ambiente baseado nas variáveis do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const isLocalSupabase = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
    const isSupabaseProduction = supabaseUrl.includes('supabase.co');
    
    // Verificar se temos tokens de produção
    const hasProdTokens = !!Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD');
    const hasTestTokens = !!Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST');

    let environment: EdgeEnvironment;
    let mercadoPagoEnvironment: 'test' | 'production';

    if (isLocalSupabase) {
      environment = 'development';
      mercadoPagoEnvironment = 'test';
    } else if (isSupabaseProduction && hasProdTokens) {
      environment = 'production';
      mercadoPagoEnvironment = 'production';
    } else {
      environment = 'staging';
      mercadoPagoEnvironment = 'test';
    }

    return {
      environment,
      isDevelopment: environment === 'development',
      isStaging: environment === 'staging',
      isProduction: environment === 'production',
      mercadoPagoEnvironment,
      enableVerboseLogs: environment !== 'production',
      enableDetailedErrors: environment !== 'production',
      enablePerformanceMetrics: environment === 'production'
    };
  }

  // Getters
  get environment(): EdgeEnvironment {
    return this.config.environment;
  }

  get isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  get isProduction(): boolean {
    return this.config.isProduction;
  }

  get mercadoPagoEnvironment(): 'test' | 'production' {
    return this.config.mercadoPagoEnvironment;
  }

  get enableVerboseLogs(): boolean {
    return this.config.enableVerboseLogs;
  }

  get enableDetailedErrors(): boolean {
    return this.config.enableDetailedErrors;
  }

  // Obter token correto baseado no ambiente
  getMercadoPagoToken(): string {
    const token = this.config.mercadoPagoEnvironment === 'production'
      ? Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_PROD')
      : Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST');

    if (!token) {
      throw new Error(`Token do Mercado Pago não configurado para ambiente: ${this.config.mercadoPagoEnvironment}`);
    }

    return token;
  }

  // Logging baseado no ambiente
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${this.config.environment.toUpperCase()}]`;
    
    const logEntry = {
      timestamp,
      level,
      environment: this.config.environment,
      message,
      ...(data && { data })
    };

    switch (level) {
      case 'info':
        if (this.config.enableVerboseLogs) {
          console.log(`ℹ️ ${prefix}`, JSON.stringify(logEntry, null, 2));
        }
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix}`, JSON.stringify(logEntry, null, 2));
        break;
      case 'error':
        console.error(`❌ ${prefix}`, JSON.stringify(logEntry, null, 2));
        break;
    }
  }

  // Métricas de performance
  measurePerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.config.enablePerformanceMetrics) {
      return fn();
    }

    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.log('info', `Performance: ${operation}`, { duration: `${duration.toFixed(2)}ms` });
    });
  }

  // Configurar resposta de erro baseada no ambiente
  createErrorResponse(error: Error, status: number = 500): Response {
    const errorResponse = {
      error: this.config.enableDetailedErrors ? error.message : 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      ...(this.config.enableDetailedErrors && { stack: error.stack })
    };

    this.log('error', 'Request failed', errorResponse);

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Instância singleton
export const edgeEnv = new EdgeEnvironmentManager();