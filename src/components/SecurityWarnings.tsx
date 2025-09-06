// src/components/SecurityWarnings.tsx
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Lock, Eye } from 'lucide-react';

interface SecurityWarningsProps {
  showAll?: boolean;
}

const SecurityWarnings: React.FC<SecurityWarningsProps> = ({ showAll = false }) => {
  const warnings = [
    {
      icon: Shield,
      title: "Pagamento Seguro",
      message: "Seus dados de pagamento são protegidos por criptografia SSL e processados pelo Mercado Pago.",
      level: "info"
    },
    {
      icon: Lock,
      title: "Dados Protegidos",
      message: "Não armazenamos dados do seu cartão. Todas as informações são processadas de forma segura.",
      level: "info"
    },
    {
      icon: Eye,
      title: "Privacidade",
      message: "Seus dados pessoais são usados apenas para processar seu pedido conforme nossa política de privacidade.",
      level: "info"
    }
  ];

  const importantWarnings = [
    {
      icon: AlertTriangle,
      title: "Verificação de Segurança",
      message: "Por segurança, sua transação pode ser verificada pelo banco emissor do cartão.",
      level: "warning"
    }
  ];

  const allWarnings = showAll ? [...warnings, ...importantWarnings] : warnings.slice(0, 2);

  return (
    <div className="space-y-3">
      {allWarnings.map((warning, index) => {
        const Icon = warning.icon;
        return (
          <Alert key={index} className={`border-l-4 ${
            warning.level === 'warning' 
              ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' 
              : 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
          }`}>
            <Icon className={`h-4 w-4 ${
              warning.level === 'warning' ? 'text-yellow-600' : 'text-green-600'
            }`} />
            <AlertDescription className="text-sm">
              <span className="font-medium">{warning.title}:</span> {warning.message}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
};

export default SecurityWarnings;