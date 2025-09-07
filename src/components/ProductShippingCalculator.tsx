import { useState, useEffect } from 'react';
import { Package, Calculator, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ShippingOption {
  service: string;
  price: number;
  days: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

interface ProductShippingCalculatorProps {
  product: Product;
  quantity: number;
}

const ProductShippingCalculator = ({ product, quantity }: ProductShippingCalculatorProps) => {
  const { user } = useAuth();
  const [cep, setCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Carregar CEP salvo do usuário
  useEffect(() => {
    if (user) {
      loadUserCep();
    }
  }, [user]);

  const loadUserCep = () => {
    if (!user) return;
    
    try {
      const savedAddress = localStorage.getItem(`address-${user.id}`);
      if (savedAddress) {
        const addressData = JSON.parse(savedAddress);
        if (addressData.zipCode) {
          setCep(addressData.zipCode);
          // Calcular automaticamente se já tem CEP
          calculateShipping(addressData.zipCode);
        }
      }
    } catch (error) {
      console.error('Error loading user CEP:', error);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 5) {
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    setCep(value);
  };

  const calculateShipping = async (zipCode?: string) => {
    const targetCep = zipCode || cep;
    if (!targetCep || targetCep.replace(/\D/g, '').length !== 8) {
      toast.error('Por favor, informe um CEP válido.');
      return;
    }

    setIsCalculating(true);
    try {
      // Estimar peso baseado na categoria do produto
      const getEstimatedWeight = (category: string, qty: number) => {
        const baseWeights: { [key: string]: number } = {
          'roupas adulto': 300,
          'roupas infantil': 200,
          'roupas bebê': 150,
          'calçados': 500,
          'acessórios': 100
        };
        return (baseWeights[category.toLowerCase()] || 300) * qty;
      };

      const weight = getEstimatedWeight(product.category, quantity);

      const { data, error } = await supabase.functions.invoke('calculate-shipping', {
        body: {
          destinyCep: targetCep.replace(/\D/g, ''),
          weight: weight,
          length: 20,
          height: 10,
          width: 15
        }
      });

      if (error) throw error;

      if (data && data.shippingOptions) {
        setShippingOptions(data.shippingOptions);
        setHasCalculated(true);
      } else {
        // Fallback com estimativas
        const fallbackOptions: ShippingOption[] = [
          { service: 'PAC', price: 15.50, days: '8 a 12' },
          { service: 'SEDEX', price: 25.90, days: '3 a 5' }
        ];
        setShippingOptions(fallbackOptions);
        setHasCalculated(true);
        toast.info('Calculando com base em estimativas');
      }
    } catch (error: any) {
      console.error('Erro ao calcular frete:', error);
      // Fallback em caso de erro
      const fallbackOptions: ShippingOption[] = [
        { service: 'PAC', price: 15.50, days: '8 a 12' },
        { service: 'SEDEX', price: 25.90, days: '3 a 5' }
      ];
      setShippingOptions(fallbackOptions);
      setHasCalculated(true);
      toast.error('Erro ao calcular frete. Valores estimados.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card className="card-elegant">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Calcular Frete
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite seu CEP"
              value={cep}
              onChange={handleCepChange}
              maxLength={9}
              className="pl-10"
            />
          </div>
          <Button 
            onClick={() => calculateShipping()}
            disabled={isCalculating || !cep}
            className="hover-scale"
          >
            {isCalculating ? (
              <Calculator className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
          </Button>
        </div>

        {hasCalculated && shippingOptions.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Opções de entrega para {cep}:</h4>
              <div className="space-y-2">
                {shippingOptions.map((option, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-medium">
                        {option.service}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {option.days} dias úteis
                      </span>
                    </div>
                    <span className="font-bold text-primary">
                      R$ {option.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * Prazo de entrega em dias úteis após a confirmação do pagamento
              </p>
            </div>
          </div>
        )}

        {user && (
          <div className="text-xs text-muted-foreground">
            💡 Configure seu CEP nas <span className="underline">configurações</span> para cálculo automático
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductShippingCalculator;