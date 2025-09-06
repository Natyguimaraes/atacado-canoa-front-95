// src/components/InstallmentSelector.tsx
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard } from 'lucide-react';
import { getInstallmentOptions, formatInstallmentText, type InstallmentOption } from '@/lib/installments';

interface InstallmentSelectorProps {
  amount: number;
  paymentMethodId: string;
  issuerId: string;
  onInstallmentSelect: (installments: number) => void;
  selectedInstallments?: number;
}

const InstallmentSelector: React.FC<InstallmentSelectorProps> = ({
  amount,
  paymentMethodId,
  issuerId,
  onInstallmentSelect,
  selectedInstallments = 1
}) => {
  const [options, setOptions] = useState<InstallmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (amount && paymentMethodId && issuerId) {
      loadInstallmentOptions();
    }
  }, [amount, paymentMethodId, issuerId]);

  const loadInstallmentOptions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const installmentOptions = await getInstallmentOptions(amount, paymentMethodId, issuerId);
      setOptions(installmentOptions);
      
      if (installmentOptions.length > 0) {
        // Selecionar a primeira opção por padrão
        onInstallmentSelect(installmentOptions[0].installments);
      }
    } catch (error) {
      console.error('Erro ao carregar opções de parcelamento:', error);
      setError('Não foi possível carregar as opções de parcelamento');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Carregando opções de parcelamento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-destructive text-sm">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadInstallmentOptions}
          className="mt-2"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-muted-foreground text-sm">
          Nenhuma opção de parcelamento disponível
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Escolha o número de parcelas
      </Label>
      
      <div className="grid gap-2 max-h-64 overflow-y-auto">
        {options.map((option) => (
          <Card 
            key={option.installments}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedInstallments === option.installments 
                ? 'ring-2 ring-primary border-primary' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onInstallmentSelect(option.installments)}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">
                    {formatInstallmentText(option)}
                  </p>
                  {option.labels && option.labels.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.labels.join(', ')}
                    </p>
                  )}
                  {option.recommended_message && (
                    <p className="text-xs text-primary font-medium mt-1">
                      {option.recommended_message}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    Total: {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(option.total_amount)}
                  </p>
                  {option.installment_rate > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Juros: {(option.installment_rate * 100).toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
        <p>💡 As parcelas sem juros oferecem o melhor custo-benefício</p>
      </div>
    </div>
  );
};

export default InstallmentSelector;