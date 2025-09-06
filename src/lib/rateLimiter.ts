// src/lib/rateLimiter.ts
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitRecord {
  requests: number[];
  blocked: boolean;
  blockedUntil?: number;
}

class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 }) {
    this.config = config;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.records.get(identifier) || { requests: [], blocked: false };

    // Verificar se ainda está bloqueado
    if (record.blocked && record.blockedUntil && now < record.blockedUntil) {
      return false;
    }

    // Limpar bloqueio expirado
    if (record.blocked && record.blockedUntil && now >= record.blockedUntil) {
      record.blocked = false;
      record.blockedUntil = undefined;
      record.requests = [];
    }

    // Filtrar requisições dentro da janela de tempo
    record.requests = record.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );

    // Verificar se excedeu o limite
    if (record.requests.length >= this.config.maxRequests) {
      record.blocked = true;
      record.blockedUntil = now + this.config.windowMs;
      this.records.set(identifier, record);
      return false;
    }

    // Adicionar nova requisição
    record.requests.push(now);
    this.records.set(identifier, record);
    return true;
  }

  getRemainingTime(identifier: string): number {
    const record = this.records.get(identifier);
    if (!record?.blocked || !record.blockedUntil) return 0;
    
    const remaining = record.blockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  reset(identifier: string): void {
    this.records.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (record.blocked && record.blockedUntil && now >= record.blockedUntil) {
        this.records.delete(key);
      }
    }
  }
}

// Instância global para pagamentos
export const paymentRateLimiter = new RateLimiter({
  maxRequests: 3, // Máximo 3 tentativas de pagamento
  windowMs: 300000 // Em 5 minutos
});

// Instância para requisições gerais
export const generalRateLimiter = new RateLimiter({
  maxRequests: 10, // Máximo 10 requisições
  windowMs: 60000 // Por minuto
});