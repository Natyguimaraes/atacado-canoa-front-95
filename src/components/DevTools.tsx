// src/components/DevTools.tsx
/**
 * Ferramentas de desenvolvimento e debug
 * Apenas disponível em ambiente de desenvolvimento
 */

import React, { useState } from 'react';
import { envManager } from '@/lib/environment';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Settings, 
  Database, 
  CreditCard, 
  Shield, 
  Monitor,
  ChevronDown,
  ChevronUp,
  Bug,
  Info
} from 'lucide-react';

const DevTools: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'environment' | 'config' | 'logs'>('environment');

  // Só renderizar em desenvolvimento
  if (!envManager.isDevelopment && !envManager.isStaging) {
    return null;
  }

  const tabs = [
    { id: 'environment', label: 'Ambiente', icon: Monitor },
    { id: 'config', label: 'Configuração', icon: Settings },
    { id: 'logs', label: 'Debug', icon: Bug }
  ];

  const environmentInfo = {
    'Ambiente': envManager.environment,
    'Hostname': typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    'Supabase URL': envManager.supabaseUrl,
    'Mercado Pago': envManager.mercadoPagoEnvironment,
    'Debug Logs': envManager.enableDebugLogs ? 'Habilitado' : 'Desabilitado',
    'Console Reports': envManager.enableConsoleReports ? 'Habilitado' : 'Desabilitado'
  };

  const configInfo = {
    'API Timeout': `${config.api.timeout}ms`,
    'API Retries': config.api.retries,
    'Payment Timeout': `${config.payment.timeout}ms`,
    'Session Timeout': `${config.security.sessionTimeout / 60000}min`,
    'Rate Limiting': config.security.enableRateLimiting ? 'Ativo' : 'Inativo',
    'Animações': config.ui.enableAnimations ? 'Habilitadas' : 'Desabilitadas'
  };

  const clearLogs = () => {
    console.clear();
    console.log('🧹 Logs limpos pelo DevTools');
  };

  const testPayment = () => {
    console.group('💳 Teste de Pagamento');
    console.log('Ambiente:', envManager.mercadoPagoEnvironment);
    console.log('Timeout:', config.payment.timeout);
    console.log('Max Retries:', config.payment.maxRetries);
    console.groupEnd();
  };

  const logEnvironmentInfo = () => {
    console.group('🌍 Informações do Ambiente');
    console.table(environmentInfo);
    console.groupEnd();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/80 backdrop-blur-sm border-2 border-orange-500/50 hover:border-orange-500"
          >
            <Bug className="h-4 w-4 mr-2" />
            DevTools
            {isOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="w-96 bg-background/95 backdrop-blur-sm border-orange-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-700">
                  {envManager.environment.toUpperCase()}
                </Badge>
                Ferramentas de Desenvolvimento
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTab(tab.id as any)}
                      className="flex-1 text-xs"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {tab.label}
                    </Button>
                  );
                })}
              </div>

              {/* Environment Tab */}
              {activeTab === 'environment' && (
                <div className="space-y-3">
                  <div className="grid gap-2 text-xs">
                    {Object.entries(environmentInfo).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={logEnvironmentInfo}
                    className="w-full text-xs"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Log no Console
                  </Button>
                </div>
              )}

              {/* Config Tab */}
              {activeTab === 'config' && (
                <div className="space-y-3">
                  <div className="grid gap-2 text-xs">
                    {Object.entries(configInfo).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={testPayment}
                      className="text-xs"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Test Payment
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => console.table(config.exportConfig())}
                      className="text-xs"
                    >
                      <Database className="h-3 w-3 mr-1" />
                      Log Config
                    </Button>
                  </div>
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === 'logs' && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Ferramentas de debug e logging
                  </div>
                  <div className="grid gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={clearLogs}
                      className="text-xs"
                    >
                      🧹 Limpar Console
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        localStorage.clear();
                        console.log('🗑️ LocalStorage limpo');
                      }}
                      className="text-xs"
                    >
                      🗑️ Limpar Storage
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="text-xs"
                    >
                      🔄 Recarregar App
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DevTools;