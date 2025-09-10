import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Truck, Package, MapPin, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { 
  calculateShippingForCart, 
  createSampleCart, 
  demonstrateShippingCalculation,
  type ShippingCalculationResult,
  type CartProduct,
  SHIPPING_CONSTANTS
} from '@/utils/shippingSimulator';

/**
 * Componente de demonstração do sistema de cálculo de frete
 * Mostra como integrar a API dos Correios em um e-commerce
 */
export function ShippingDemo() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<ShippingCalculationResult | null>(null);
  const [cart] = useState<CartProduct[]>(createSampleCart());

  // CEPs de exemplo para demonstração
  const originCep = '01310-100'; // São Paulo - SP (Av. Paulista)
  const destinyCep = '22071-900'; // Rio de Janeiro - RJ (Copacabana)

  const handleCalculateShipping = async () => {
    setIsCalculating(true);
    setResult(null);

    try {
      toast.info('Calculando frete com os Correios...');
      
      const shippingResult = await calculateShippingForCart(
        cart,
        originCep,
        destinyCep,
        [SHIPPING_CONSTANTS.SERVICES.PAC, SHIPPING_CONSTANTS.SERVICES.SEDEX]
      );

      setResult(shippingResult);
      
      if (shippingResult.success) {
        toast.success('Frete calculado com sucesso!');
      } else {
        toast.warning('Frete calculado com valores estimados');
      }

    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      toast.error('Erro ao calcular frete');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRunFullDemo = async () => {
    setIsCalculating(true);
    try {
      toast.info('Executando demonstração completa...');
      await demonstrateShippingCalculation();
      toast.success('Demonstração executada! Verifique o console do navegador.');
    } catch (error) {
      console.error('Erro na demonstração:', error);
      toast.error('Erro na demonstração');
    } finally {
      setIsCalculating(false);
    }
  };

  const cartTotal = cart.reduce((total, product) => total + (product.price * product.quantity), 0);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Sistema de Cálculo de Frete</h1>
        <p className="text-muted-foreground">
          Demonstração da integração com a API dos Correios para cálculo de frete em e-commerce
        </p>
      </div>

      {/* Carrinho Simulado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Carrinho Simulado
          </CardTitle>
          <CardDescription>
            Produtos selecionados para demonstração do cálculo de frete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cart.map((product, index) => (
              <div key={product.id} className="flex justify-between items-start p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium">{product.name}</h3>
                  <div className="text-sm text-muted-foreground">
                    <p>Quantidade: {product.quantity}</p>
                    <p>Peso: {product.weight}g</p>
                    <p>Dimensões: {product.length}×{product.width}×{product.height}cm</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">R$ {product.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    Total: R$ {(product.price * product.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            
            <Separator />
            
            <div className="flex justify-between items-center font-medium">
              <span>Subtotal do Carrinho:</span>
              <span>R$ {cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Frete */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Informações de Entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">CEP de Origem (Loja)</h4>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-mono">{originCep}</p>
                <p className="text-sm text-muted-foreground">São Paulo - SP</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">CEP de Destino (Cliente)</h4>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-mono">{destinyCep}</p>
                <p className="text-sm text-muted-foreground">Rio de Janeiro - RJ</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={handleCalculateShipping} 
              disabled={isCalculating}
              className="flex-1"
            >
              <Truck className="h-4 w-4 mr-2" />
              {isCalculating ? 'Calculando...' : 'Calcular Frete'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleRunFullDemo}
              disabled={isCalculating}
            >
              Demonstração Completa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados do Frete */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Opções de Frete Calculadas
            </CardTitle>
            <CardDescription>
              {result.success 
                ? 'Valores obtidos da API dos Correios' 
                : 'Valores estimados (API temporariamente indisponível)'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Resumo do Pacote */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Resumo do Pacote</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Peso Total</p>
                    <p className="font-medium">{result.totalWeight}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Comprimento</p>
                    <p className="font-medium">{result.totalDimensions.length}cm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Largura</p>
                    <p className="font-medium">{result.totalDimensions.width}cm</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Altura</p>
                    <p className="font-medium">{result.totalDimensions.height}cm</p>
                  </div>
                </div>
              </div>

              {/* Opções de Frete */}
              <div className="grid gap-4">
                {result.options.map((option, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{option.serviceName}</h4>
                        <p className="text-sm text-muted-foreground">Código: {option.service}</p>
                      </div>
                      <Badge variant={option.error ? "secondary" : "default"}>
                        {option.error ? "Estimado" : "Oficial"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-lg">R$ {option.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{option.deliveryTime} dias úteis</span>
                      </div>
                    </div>

                    {option.error && (
                      <p className="text-sm text-amber-600 mt-2">⚠️ {option.error}</p>
                    )}

                    {/* Total com Frete */}
                    <Separator className="my-3" />
                    <div className="flex justify-between items-center font-medium">
                      <span>Total do Pedido:</span>
                      <span className="text-lg">R$ {(cartTotal + option.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {result.error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                  <p className="font-medium">Erro no cálculo:</p>
                  <p className="text-sm">{result.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações Técnicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Técnicas</CardTitle>
          <CardDescription>
            Detalhes sobre a implementação do sistema de frete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Características do Sistema:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Integração com API oficial dos Correios</li>
              <li>Suporte para PAC e SEDEX</li>
              <li>Cálculo automático de peso e dimensões do carrinho</li>
              <li>Fallback com valores estimados em caso de falha da API</li>
              <li>Timeout de 8 segundos para evitar espera excessiva</li>
              <li>Empacotamento inteligente considerando limites dos Correios</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Códigos de Serviços:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted rounded">
                <strong>PAC:</strong> 04510
              </div>
              <div className="p-2 bg-muted rounded">
                <strong>SEDEX:</strong> 04014
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}