import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Calculator, MapPin, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShippingOption {
  service: string;
  serviceName: string;
  price: number;
  deliveryTime: number;
  error?: string;
}

interface ShippingCalculatorProps {
  weight?: number; // peso total do carrinho em gramas
  onShippingSelected?: (option: ShippingOption) => void;
  selectedOption?: ShippingOption | null;
}

const ShippingCalculator = ({ 
  weight = 500, 
  onShippingSelected,
  selectedOption 
}: ShippingCalculatorProps) => {
  const [cep, setCep] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [showResults, setShowResults] = useState(false);

  const formatCep = (value: string) => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');
    
    // Aplica a máscara
    if (cleaned.length <= 8) {
      return cleaned.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }
    return cleaned.substring(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const calculateShipping = async () => {
    if (!cep || cep.length < 9) {
      toast.error('Digite um CEP válido');
      return;
    }

    setIsLoading(true);
    setShowResults(false);

    try {
      // CEP de origem fixo (pode ser configurável no futuro)
      const originCep = '01001-000'; // São Paulo - SP (exemplo)
      
      // Dimensões padrão do pacote (pode ser calculado baseado nos produtos)
      const packageDimensions = {
        length: 20, // cm
        height: 10, // cm  
        width: 15,  // cm
        weight: Math.max(weight, 300) // mínimo 300g
      };

      const { data, error } = await supabase.functions.invoke('calculate-shipping', {
        body: {
          originCep,
          destinyCep: cep,
          ...packageDimensions
        }
      });

      if (error) throw error;

      if (data.success && data.options) {
        setShippingOptions(data.options);
        setShowResults(true);
        
        if (data.options.length > 0) {
          toast.success('Frete calculado com sucesso!');
        }
      } else {
        throw new Error(data.error || 'Erro ao calcular frete');
      }

    } catch (error: any) {
      console.error('Error calculating shipping:', error);
      toast.error('Erro ao calcular frete', {
        description: error.message || 'Tente novamente em alguns instantes'
      });
      
      // Fallback com valores padrão
      setShippingOptions([
        {
          service: 'standard',
          serviceName: 'Frete Padrão',
          price: 19.90,
          deliveryTime: 5,
          error: 'Valor estimado'
        }
      ]);
      setShowResults(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
  };

  const handleSelectShipping = (option: ShippingOption) => {
    onShippingSelected?.(option);
    toast.success(`${option.serviceName} selecionado!`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calcular Frete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite seu CEP"
              value={cep}
              onChange={handleCepChange}
              className="pl-8"
              maxLength={9}
            />
          </div>
          <Button 
            onClick={calculateShipping}
            disabled={isLoading || cep.length < 9}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Calculando...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4" />
                Calcular
              </>
            )}
          </Button>
        </div>

        {showResults && shippingOptions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Opções de entrega:</h3>
            {shippingOptions.map((option) => (
              <div
                key={option.service}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedOption?.service === option.service
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
                onClick={() => handleSelectShipping(option)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.serviceName}</span>
                      {option.error && (
                        <Badge variant="outline" className="text-xs">
                          {option.error}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {option.deliveryTime} dia{option.deliveryTime !== 1 ? 's' : ''} úteis
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      R$ {option.price.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedOption && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Frete selecionado:</span>
              <span className="font-medium">
                {selectedOption.serviceName} - R$ {selectedOption.price.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShippingCalculator;