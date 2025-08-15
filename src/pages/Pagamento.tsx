import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';

interface PaymentData {
  method: 'credit' | 'pix';
  installments?: number;
  cardNumber?: string;
  cardName?: string;
  cardExpiry?: string;
  cardCvv?: string;
}

interface ShippingData {
  fullName: string;
  email: string;
  phone: string;
  zipCode: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const Pagamento = () => {
  const { user, isAuthenticated } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const total = totalPrice;
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<'shipping' | 'payment' | 'success'>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
  const [shippingData, setShippingData] = useState<ShippingData>({
    fullName: '',
    email: user?.email || '',
    phone: '',
    zipCode: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const [paymentData, setPaymentData] = useState<PaymentData>({
    method: 'pix',
    installments: 1,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      navigate('/carrinho');
      return;
    }
  }, [isAuthenticated, items.length, navigate]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const createMercadoPagoPayment = async () => {
    try {
      const paymentPayload = {
        transaction_amount: total,
        description: `Pedido Atacado Canoa - ${items.length} item(s)`,
        payment_method_id: paymentData.method === 'pix' ? 'pix' : 'visa',
        payer: {
          email: shippingData.email,
          first_name: shippingData.fullName.split(' ')[0],
          last_name: shippingData.fullName.split(' ').slice(1).join(' '),
          identification: {
            type: 'CPF',
            number: '12345678901' // Em produção, coletar CPF real
          }
        },
        additional_info: {
          items: items.map(item => ({
            id: item.id,
            title: item.name,
            description: item.name,
            picture_url: item.image,
            category_id: item.category,
            quantity: item.quantity,
            unit_price: item.price
          })),
          payer: {
            first_name: shippingData.fullName.split(' ')[0],
            last_name: shippingData.fullName.split(' ').slice(1).join(' '),
            phone: {
              area_code: shippingData.phone.substring(1, 3),
              number: shippingData.phone.substring(3)
            },
            address: {
              street_name: shippingData.address,
              street_number: parseInt(shippingData.number),
              zip_code: shippingData.zipCode
            }
          },
          shipments: {
            receiver_address: {
              zip_code: shippingData.zipCode,
              state_name: shippingData.state,
              city_name: shippingData.city,
              street_name: shippingData.address,
              street_number: parseInt(shippingData.number)
            }
          }
        }
      };

      // Para cartão de crédito, adicionar dados do cartão
      if (paymentData.method === 'credit') {
        Object.assign(paymentPayload, {
          token: 'card_token_id', // Em produção, usar token real do cartão
          installments: paymentData.installments,
          payment_method_id: 'visa' // Detectar bandeira automaticamente
        });
      }

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: paymentPayload
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      throw error;
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Criar pagamento no Mercado Pago
      const paymentResponse = await createMercadoPagoPayment();
      
      if (paymentResponse.status === 'approved' || paymentResponse.status === 'pending') {
        setPaymentId(paymentResponse.id);
        
        // Log do sucesso do pagamento (remover inserção no banco por enquanto)
        console.log('Pagamento processado:', {
          user_id: user?.id,
          total_amount: total,
          status: paymentResponse.status === 'approved' ? 'confirmed' : 'pending',
          payment_id: paymentResponse.id,
          payment_method: paymentData.method,
          shipping_data: shippingData,
          items: items
        });

        // Remover verificação de erro por enquanto

        // Limpar carrinho
        clearCart();
        setStep('success');

        toast({
          title: 'Pedido realizado!',
          description: paymentData.method === 'pix' 
            ? 'Pagamento PIX criado. Complete o pagamento para confirmar seu pedido.'
            : 'Pagamento processado com sucesso!',
        });
      } else {
        throw new Error('Falha no processamento do pagamento');
      }
    } catch (error: any) {
      toast({
        title: 'Erro no pagamento',
        description: error.message || 'Erro ao processar pagamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Pedido Realizado!
            </h1>
            <p className="text-muted-foreground mb-6">
              {paymentData.method === 'pix' 
                ? 'Seu PIX foi gerado. Complete o pagamento para confirmar seu pedido.'
                : 'Seu pagamento foi processado com sucesso!'}
            </p>
            {paymentId && (
              <p className="text-sm text-muted-foreground mb-6">
                ID do Pagamento: {paymentId}
              </p>
            )}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/pedidos">Ver Meus Pedidos</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link to="/">Continuar Comprando</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/carrinho" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Carrinho
              </Link>
            </Button>
            <h1 className="font-display text-2xl font-bold text-primary">
              Finalizar Compra
            </h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulários */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados de Entrega */}
            {step === 'shipping' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
                    Dados de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Nome Completo *</Label>
                        <Input
                          id="fullName"
                          value={shippingData.fullName}
                          onChange={(e) => setShippingData(prev => ({ ...prev, fullName: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={shippingData.email}
                          onChange={(e) => setShippingData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone *</Label>
                        <Input
                          id="phone"
                          value={shippingData.phone}
                          onChange={(e) => setShippingData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(75) 99999-9999"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">CEP *</Label>
                        <Input
                          id="zipCode"
                          value={shippingData.zipCode}
                          onChange={(e) => setShippingData(prev => ({ ...prev, zipCode: e.target.value }))}
                          placeholder="44380-000"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço *</Label>
                      <Input
                        id="address"
                        value={shippingData.address}
                        onChange={(e) => setShippingData(prev => ({ ...prev, address: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="number">Número *</Label>
                        <Input
                          id="number"
                          value={shippingData.number}
                          onChange={(e) => setShippingData(prev => ({ ...prev, number: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          value={shippingData.complement}
                          onChange={(e) => setShippingData(prev => ({ ...prev, complement: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro *</Label>
                        <Input
                          id="neighborhood"
                          value={shippingData.neighborhood}
                          onChange={(e) => setShippingData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input
                          id="city"
                          value={shippingData.city}
                          onChange={(e) => setShippingData(prev => ({ ...prev, city: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Select 
                        value={shippingData.state} 
                        onValueChange={(value) => setShippingData(prev => ({ ...prev, state: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BA">Bahia</SelectItem>
                          <SelectItem value="SP">São Paulo</SelectItem>
                          <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                          <SelectItem value="MG">Minas Gerais</SelectItem>
                          {/* Adicionar outros estados */}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full">
                      Continuar para Pagamento
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Dados de Pagamento */}
            {step === 'payment' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
                    Forma de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePaymentSubmit} className="space-y-6">
                    {/* Método de Pagamento */}
                    <div className="space-y-4">
                      <Label>Escolha a forma de pagamento</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card 
                          className={`cursor-pointer transition-all ${
                            paymentData.method === 'pix' ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setPaymentData(prev => ({ ...prev, method: 'pix' }))}
                        >
                          <CardContent className="p-4 text-center">
                            <Smartphone className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <div className="font-medium">PIX</div>
                            <div className="text-sm text-muted-foreground">
                              Pagamento instantâneo
                            </div>
                          </CardContent>
                        </Card>

                        <Card 
                          className={`cursor-pointer transition-all ${
                            paymentData.method === 'credit' ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setPaymentData(prev => ({ ...prev, method: 'credit' }))}
                        >
                          <CardContent className="p-4 text-center">
                            <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <div className="font-medium">Cartão de Crédito</div>
                            <div className="text-sm text-muted-foreground">
                              Em até 12x sem juros
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Dados do Cartão */}
                    {paymentData.method === 'credit' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Número do Cartão *</Label>
                          <Input
                            id="cardNumber"
                            value={paymentData.cardNumber || ''}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, cardNumber: e.target.value }))}
                            placeholder="0000 0000 0000 0000"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cardName">Nome no Cartão *</Label>
                          <Input
                            id="cardName"
                            value={paymentData.cardName || ''}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, cardName: e.target.value }))}
                            placeholder="Como está escrito no cartão"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cardExpiry">Validade *</Label>
                            <Input
                              id="cardExpiry"
                              value={paymentData.cardExpiry || ''}
                              onChange={(e) => setPaymentData(prev => ({ ...prev, cardExpiry: e.target.value }))}
                              placeholder="MM/AA"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardCvv">CVV *</Label>
                            <Input
                              id="cardCvv"
                              value={paymentData.cardCvv || ''}
                              onChange={(e) => setPaymentData(prev => ({ ...prev, cardCvv: e.target.value }))}
                              placeholder="000"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="installments">Parcelas</Label>
                          <Select 
                            value={paymentData.installments?.toString()} 
                            onValueChange={(value) => setPaymentData(prev => ({ ...prev, installments: parseInt(value) }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}x de {formatPrice(total / num)} 
                                  {num === 1 ? ' à vista' : num <= 6 ? ' sem juros' : ' com juros'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStep('shipping')}
                        className="flex-1"
                      >
                        Voltar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? 'Processando...' : 'Finalizar Pedido'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumo do Pedido */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.id}-${item.size || 'no-size'}`} className="flex gap-3">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.size && `Tam: ${item.size}`}
                      </div>
                      <div className="text-sm">
                        {item.quantity}x {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Frete</span>
                    <span className="text-green-600">Grátis</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pagamento;