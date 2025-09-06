// src/lib/logger.ts
/**
 * Sistema de logging otimizado para diferentes ambientes
 */

import { envManager } from './environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
  userId?: string;
  sessionId?: string;
  environment: string;
}

class Logger {
  private context: string;
  private sessionId: string;

  constructor(context: string = 'App') {
    this.context = context;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (envManager.isProduction) {
      return level >= LogLevel.WARN; // Produção: apenas warnings e erros
    }
    if (envManager.isStaging) {
      return level >= LogLevel.INFO; // Staging: info, warnings e erros
    }
    return true; // Development: todos os logs
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context: this.context,
      sessionId: this.sessionId,
      environment: envManager.environment
    };
  }

  private outputLog(entry: LogEntry): void {
    const prefix = `[${entry.environment.toUpperCase()}][${entry.context}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        if (envManager.enableDebugLogs) {
          console.debug(`🔍 ${prefix}`, entry.message, entry.data || '');
        }
        break;
      case LogLevel.INFO:
        console.info(`ℹ️ ${prefix}`, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${prefix}`, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${prefix}`, entry.message, entry.data || '');
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 ${prefix} CRITICAL:`, entry.message, entry.data || '');
        // Em produção, poderia enviar para serviço de monitoramento
        break;
    }

    // Enviar para serviço de analytics em produção
    if (envManager.isProduction && entry.level >= LogLevel.ERROR) {
      this.sendToAnalytics(entry);
    }
  }

  private sendToAnalytics(entry: LogEntry): void {
    // Em uma implementação real, enviaria para serviços como Sentry, LogRocket, etc.
    if (envManager.isFeatureEnabled('performanceMonitoring')) {
      // Placeholder para integração com serviços de monitoramento
      console.log('📊 Enviando para analytics:', entry);
    }
  }

  // Métodos públicos
  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatMessage(LogLevel.DEBUG, message, data);
      this.outputLog(entry);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatMessage(LogLevel.INFO, message, data);
      this.outputLog(entry);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.formatMessage(LogLevel.WARN, message, data);
      this.outputLog(entry);
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.formatMessage(LogLevel.ERROR, message, data);
      this.outputLog(entry);
    }
  }

  critical(message: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.CRITICAL, message, data);
    this.outputLog(entry);
  }

  // Métodos especializados
  payment(action: string, data?: any): void {
    this.info(`Payment: ${action}`, data);
  }

  security(message: string, data?: any): void {
    this.warn(`Security: ${message}`, data);
  }

  performance(metric: string, value: number, unit: string = 'ms'): void {
    if (envManager.isFeatureEnabled('performanceMonitoring')) {
      this.info(`Performance: ${metric}`, { value, unit });
    }
  }

  // Criar logger com contexto específico
  withContext(context: string): Logger {
    return new Logger(context);
  }
}

// Instâncias pré-configuradas
export const logger = new Logger('App');
export const paymentLogger = new Logger('Payment');
export const authLogger = new Logger('Auth');
export const apiLogger = new Logger('API');

// Hook para React components
export const useLogger = (context: string) => {
  return new Logger(context);
};