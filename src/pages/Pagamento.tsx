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

  const [pixData, setPixData] = useState<{
    qr_code?: string;
    qr_code_base64?: string;
  } | null>(null);

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

  // Carregar endereço salvo quando usuário estiver autenticado
  useEffect(() => {
    if (user) {
      loadSavedAddress();
    }
  }, [user]);

  const loadSavedAddress = () => {
    if (!user) return;
    
    try {
      const savedAddress = localStorage.getItem(`address-${user.id}`);
      if (savedAddress) {
        const addressData = JSON.parse(savedAddress);
        setShippingData(prev => ({
          ...prev,
          address: addressData.address || '',
          zipCode: addressData.zipCode || '',
          neighborhood: addressData.neighborhood || '',
          city: addressData.city || '',
          state: addressData.state || ''
        }));
      }
    } catch (error) {
      console.error('Error loading address:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove caracteres não numéricos
    
    // Aplica máscara CEP
    if (value.length > 5) {
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    setShippingData(prev => ({ ...prev, zipCode: value }));
    
    // Busca endereço quando CEP tem 8 dígitos
    if (value.replace(/\D/g, '').length === 8) {
      try {
        const cep = value.replace(/\D/g, '');
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (data && !data.erro) {
          setShippingData(prev => ({
            ...prev,
            address: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const detectCardBrand = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    if (cleanNumber.startsWith('4')) return 'visa';
    if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) return 'master';
    if (cleanNumber.startsWith('3')) return 'amex';
    if (cleanNumber.startsWith('6')) return 'elo';
    return 'visa'; // default
  };

  const createMercadoPagoPayment = async () => {
    try {
      let paymentPayload: any = {
        transaction_amount: total,
        description: `Pedido Atacado Canoa - ${items.length} item(s)`,
        payment_method_id: paymentData.method === 'pix' ? 'pix' : detectCardBrand(paymentData.cardNumber || ''),
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
              area_code: shippingData.phone.replace(/\D/g, '').substring(0, 2),
              number: shippingData.phone.replace(/\D/g, '').substring(2)
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

      // Para cartão de crédito, adicionar dados específicos
      if (paymentData.method === 'credit') {
        // Criar token do cartão para ambiente de teste
        const cardToken = await createCardToken();
        
        paymentPayload = {
          ...paymentPayload,
          token: cardToken,
          installments: paymentData.installments || 1,
          payment_method_id: detectCardBrand(paymentData.cardNumber || ''),
        };
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

  const createCardToken = async () => {
    try {
      const cardData = {
        card_number: paymentData.cardNumber?.replace(/\D/g, ''),
        security_code: paymentData.cardCvv,
        expiration_month: paymentData.cardExpiry?.split('/')[0],
        expiration_year: '20' + paymentData.cardExpiry?.split('/')[1],
        cardholder: {
          name: paymentData.cardName,
          identification: {
            type: 'CPF',
            number: '12345678901' // Em produção, coletar CPF real
          }
        }
      };

      const { data, error } = await supabase.functions.invoke('create-card-token', {
        body: cardData
      });

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Erro ao criar token do cartão:', error);
      throw new Error('Erro ao processar dados do cartão');
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
        
        // Para PIX, salvar dados do QR Code
        if (paymentData.method === 'pix' && paymentResponse.pix_qr_code) {
          setPixData({
            qr_code: paymentResponse.pix_qr_code,
            qr_code_base64: paymentResponse.pix_qr_code_base64
          });
        }
        
        // Criar pedido no banco de dados
        const orderInsert = {
          user_id: user?.id || '',
          total_amount: total,
          status: paymentResponse.status === 'approved' ? 'processing' : 'pending',
          payment_id: paymentResponse.id,
          payment_method: paymentData.method === 'pix' ? 'pix' : 'credit_card',
          shipping_data: shippingData as any,
          items: items as any
        };

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert(orderInsert)
          .select()
          .single();

        if (orderError) {
          console.error('Erro ao criar pedido:', orderError);
          // Continuar mesmo com erro no banco para não bloquear o pagamento
        }

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
        <Card className="max-w-2xl w-full mx-4">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Pedido Realizado!
              </h1>
              <p className="text-muted-foreground mb-4">
                {paymentData.method === 'pix' 
                  ? 'Escaneie o QR Code PIX abaixo para finalizar o pagamento:'
                  : 'Seu pagamento foi processado com sucesso!'}
              </p>
              {paymentId && (
                <p className="text-sm text-muted-foreground mb-4">
                  ID do Pagamento: {paymentId}
                </p>
              )}
            </div>

            {/* PIX QR Code */}
            {paymentData.method === 'pix' && pixData && (
              <div className="border rounded-lg p-6 mb-6 bg-card">
                <div className="text-center space-y-4">
                  <h3 className="font-semibold text-lg">Pagamento PIX</h3>
                  
                  {pixData.qr_code_base64 && (
                    <div className="flex justify-center">
                      <img 
                        src={`data:image/png;base64,${pixData.qr_code_base64}`}
                        alt="QR Code PIX"
                        className="w-64 h-64 border rounded"
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium">Código PIX (Copiar e Colar):</Label>
                    <div className="mt-2 p-3 bg-muted rounded border flex items-center gap-2">
                      <Input 
                        value={pixData.qr_code || ''} 
                        readOnly 
                        className="font-mono text-xs"
                        onClick={(e) => e.currentTarget.select()}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.qr_code || '');
                          toast({ title: 'Código PIX copiado!' });
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Abra o app do seu banco</p>
                    <p>• Escaneie o QR Code ou cole o código PIX</p>
                    <p>• Confirme o pagamento de {formatPrice(total)}</p>
                  </div>
                </div>
              </div>
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
                           onChange={handleZipCodeChange}
                           placeholder="44380-000"
                           maxLength={9}
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