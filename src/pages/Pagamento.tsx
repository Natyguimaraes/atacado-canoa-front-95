// src/pages/Pagamento.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { CreditCard, QrCode, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { processPayment } from '@/services/paymentService';
import CardPaymentForm from '@/components/CardPaymentForm';
import CPFInput from '@/components/CPFInput';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { getEnvironmentConfig } from '@/lib/mercadoPago';
import { validateCpf, unformatCpf } from '@/utils/cpfUtils';
import { supabase } from '@/integrations/supabase/client';
import { shippingDataSchema, type ShippingData } from '@/lib/schemas';

// As interfaces agora vêm de schemas.ts

const Pagamento = () => {
  const { user } = useAuth();
  const { cart: items, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix');
  const [mpInitialized, setMpInitialized] = useState(false);
  
  const cardPaymentDataRef = useRef<any>(null);
  const [isCardDataReady, setIsCardDataReady] = useState(false);

  // Inicializa o SDK do Mercado Pago
  useEffect(() => {
    const initializeMercadoPago = async () => {
      try {
        const config = await getEnvironmentConfig();
        initMercadoPago(config.publicKey, { locale: 'pt-BR' });
        setMpInitialized(true);
      } catch (error) {
        console.error('Erro ao inicializar Mercado Pago:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar configurações de pagamento",
          variant: "destructive",
        });
      }
    };

    initializeMercadoPago();
  }, [toast]);

  const [shippingData, setShippingData] = useState<ShippingData>({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    cpf: '',
    zipCode: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  // Carregar dados do perfil do usuário
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar perfil:', error);
          return;
        }

        if (profile) {
          setShippingData(prev => ({
            ...prev,
            fullName: profile.full_name || prev.fullName,
            phone: profile.phone || prev.phone,
            cpf: profile.cpf || prev.cpf,
            // Carregar endereço se salvo no perfil
            ...(profile.address && typeof profile.address === 'object' ? {
              address: (profile.address as any).street || prev.address,
              number: (profile.address as any).number || prev.number,
              complement: (profile.address as any).complement || prev.complement,
              neighborhood: (profile.address as any).neighborhood || prev.neighborhood,
              city: (profile.address as any).city || prev.city,
              state: (profile.address as any).state || prev.state,
              zipCode: (profile.address as any).zipCode || prev.zipCode,
            } : {})
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    loadUserProfile();
  }, [user]);

  const orderTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  useEffect(() => {
    if (items.length === 0 && !isProcessing) {
      toast({ title: "Carrinho Vazio", description: "O seu carrinho está vazio, a redirecionar..." });
      navigate('/carrinho');
    }
  }, [items, navigate, toast, isProcessing]);

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5) value = value.replace(/(\d{5})(\d)/, '$1-$2');
    setShippingData(prev => ({ ...prev, zipCode: value }));
    if (value.replace(/\D/g, '').length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value.replace(/\D/g, '')}/json/`);
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
    
    try {
      // Validar dados de entrega usando schema
      const validatedData = shippingDataSchema.parse({
        ...shippingData,
        cpf: unformatCpf(shippingData.cpf),
        zipCode: shippingData.zipCode.replace(/\D/g, ''),
        state: shippingData.state.toUpperCase()
      });
      
      // Atualizar estado com dados validados
      setShippingData(prev => ({ ...prev, ...validatedData }));
      setStep('payment');
    } catch (error: any) {
      toast({
        title: "Dados inválidos",
        description: error.message || "Verifique os dados informados.",
        variant: "destructive"
      });
    }
  };

  const handlePayment = async () => {
    if (!user) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para fazer um pedido.", variant: "destructive" });
        return;
    }
    
    if (paymentMethod === 'credit' && !isCardDataReady) {
      toast({ title: "Pagamento Incompleto", description: "Por favor, preencha os dados do cartão e aguarde a validação.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = {
        user_id: user?.id || '',
        items: items.map(item => ({
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.image
        })),
        total_amount: orderTotal,
        shipping_data: {
          ...shippingData,
          cpf: unformatCpf(shippingData.cpf),
          zipCode: shippingData.zipCode.replace(/\D/g, ''),
          state: shippingData.state.toUpperCase()
        },
      };
      
      console.log("=== PAYMENT DEBUG ===");
      console.log("Order data:", orderData);
      console.log("Payment method:", paymentMethod);
      console.log("Card payment data:", cardPaymentDataRef.current);
      
      const paymentResult = await processPayment(
        orderData, 
        paymentMethod, 
        cardPaymentDataRef.current 
      );
      
      if (paymentResult && paymentResult.id) {
          // Verificar se é um pagamento duplicado
          if (paymentResult.status === 'duplicate') {
            toast({ 
              title: "Pagamento já processado", 
              description: "Este pagamento já foi processado anteriormente.",
              variant: "default"
            });
            navigate(`/status-pagamento/${paymentResult.external_id || paymentResult.id}`);
            return;
          }
          
          await clearCart();
          toast({ title: "Pedido realizado com sucesso!", description: "A redirecionar..." });
          navigate(`/status-pagamento/${paymentResult.external_id || paymentResult.id}`);
      } else {
          throw new Error("A resposta do servidor de pagamento foi inválida.");
      }

    } catch (error: any) {
      toast({ title: "Erro ao Processar Pagamento", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex-grow">
        {/* Header com botão voltar - melhor espaçamento mobile */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/carrinho')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5"/>
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display">Finalizar Compra</h1>
        </div>
        
        {/* Layout responsivo com ordem melhorada para mobile */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Resumo do pedido - Primeira no mobile, lateral no desktop */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="max-h-64 sm:max-h-80 overflow-y-auto space-y-3">
                  {items.map((item) => (
                    <div key={`${item.product_id}-${item.size}`} className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base truncate">{item.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {item.size && `Tamanho: ${item.size}`}
                          {item.size && item.quantity && ' | '}
                          {item.quantity && `Qtd: ${item.quantity}`}
                        </p>
                      </div>
                      <span className="font-medium text-sm sm:text-base shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 sm:pt-4">
                  <div className="flex justify-between items-center font-bold text-lg sm:text-xl">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(orderTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulários - Segunda no mobile, primeira coluna no desktop */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Dados de Entrega */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <span className={`bg-primary text-primary-foreground rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold transition-opacity ${step !== 'shipping' && 'opacity-50'}`}>
                    1
                  </span>
                  Dados de Entrega
                </CardTitle>
              </CardHeader>
              {step === 'shipping' && (
                <CardContent className="pt-0">
                  <form onSubmit={handleShippingSubmit} className="space-y-4 sm:space-y-6">
                    
                    {/* Grid responsivo para campos pessoais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-medium">Nome Completo *</Label>
                        <Input 
                          id="fullName" 
                          value={shippingData.fullName} 
                          onChange={(e) => setShippingData(prev => ({...prev, fullName: e.target.value}))} 
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                      <CPFInput 
                        value={shippingData.cpf} 
                        onChange={(cpf) => setShippingData(prev => ({...prev, cpf}))} 
                        required 
                        showValidation 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">E-mail *</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={shippingData.email} 
                          onChange={(e) => setShippingData(prev => ({...prev, email: e.target.value}))} 
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">Telefone *</Label>
                        <Input 
                          id="phone" 
                          value={shippingData.phone} 
                          onChange={(e) => setShippingData(prev => ({...prev, phone: e.target.value}))} 
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                    </div>

                    {/* CEP em linha separada para destaque */}
                    <div className="space-y-2">
                      <Label htmlFor="zipCode" className="text-sm font-medium">CEP *</Label>
                      <Input 
                        id="zipCode" 
                        value={shippingData.zipCode} 
                        onChange={handleZipCodeChange} 
                        placeholder="00000-000" 
                        maxLength={9} 
                        required
                        className="text-sm sm:text-base max-w-xs"
                      />
                    </div>
                    
                    {/* Endereço com grid responsivo */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                      <div className="col-span-2 sm:col-span-3 space-y-2">
                        <Label htmlFor="address" className="text-sm font-medium">Endereço *</Label>
                        <Input 
                          id="address" 
                          value={shippingData.address} 
                          onChange={(e) => setShippingData(prev => ({...prev, address: e.target.value}))} 
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number" className="text-sm font-medium">Número *</Label>
                        <Input 
                          id="number" 
                          value={shippingData.number} 
                          onChange={(e) => setShippingData(prev => ({...prev, number: e.target.value}))} 
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                    </div>
                    
                    {/* Complemento em linha própria */}
                    <div className="space-y-2">
                      <Label htmlFor="complement" className="text-sm font-medium">Complemento</Label>
                      <Input 
                        id="complement" 
                        value={shippingData.complement} 
                        onChange={(e) => setShippingData(prev => ({...prev, complement: e.target.value}))}
                        className="text-sm sm:text-base"
                      />
                    </div>
                    
                    {/* Bairro, cidade e estado */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood" className="text-sm font-medium">Bairro *</Label>
                        <Input 
                          id="neighborhood" 
                          value={shippingData.neighborhood} 
                          onChange={(e) => setShippingData(prev => ({...prev, neighborhood: e.target.value}))} 
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium">Cidade *</Label>
                        <Input 
                          id="city" 
                          value={shippingData.city} 
                          onChange={(e) => setShippingData(prev => ({...prev, city: e.target.value}))} 
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-medium">Estado *</Label>
                        <Input 
                          id="state" 
                          value={shippingData.state} 
                          onChange={(e) => setShippingData(prev => ({...prev, state: e.target.value}))} 
                          maxLength={2} 
                          required
                          className="text-sm sm:text-base uppercase"
                        />
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full text-sm sm:text-lg py-4 sm:py-6 font-medium">
                      Continuar para Pagamento
                    </Button>
                  </form>
                </CardContent>
              )}
            </Card>

            {/* Forma de Pagamento */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl transition-opacity ${step !== 'payment' && 'opacity-50'}`}>
                  <span className={`bg-primary text-primary-foreground rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold`}>
                    2
                  </span>
                  Forma de Pagamento
                </CardTitle>
              </CardHeader>
              {step === 'payment' && (
                <CardContent className="pt-0 space-y-4 sm:space-y-6">
                  
                  {/* Métodos de pagamento em grid responsivo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                        paymentMethod === 'pix' ? 'border-primary shadow-md bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`} 
                      onClick={() => { 
                        setPaymentMethod('pix'); 
                        setIsCardDataReady(false); 
                        cardPaymentDataRef.current = null; 
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0"/>
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">PIX</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">Pagamento instantâneo</p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                        paymentMethod === 'credit' ? 'border-primary shadow-md bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`} 
                      onClick={() => setPaymentMethod('credit')}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0"/>
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">Cartão de Crédito</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">Pague com seu cartão</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Formulário de cartão */}
                  {paymentMethod === 'credit' && (
                    <div className="space-y-4">
                      {isCardDataReady ? (
                        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-green-500 mb-2"/>
                          <p className="font-medium text-green-700 text-sm sm:text-base">Cartão validado com sucesso!</p>
                          <p className="text-xs sm:text-sm text-green-600">Pode clicar em "Pagar com Cartão" para finalizar.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {mpInitialized && (
                            <CardPaymentForm
                              amount={orderTotal}
                              payerEmail={shippingData.email}
                              onPaymentReady={(data) => {
                                console.log("=== CARD PAYMENT DATA RECEIVED ===", data);
                                cardPaymentDataRef.current = data;
                                setIsCardDataReady(true);
                                toast({ title: "Cartão validado", description: "Pode prosseguir com o pagamento." });
                              }}
                              onFormError={(error) => {
                                if (!cardPaymentDataRef.current) {
                                    toast({ title: "Erro no formulário", description: "Verifique os dados do cartão.", variant: "destructive"});
                                }
                                setIsCardDataReady(false);
                                cardPaymentDataRef.current = null;
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Botões de ação */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('shipping')} 
                      className="w-full sm:flex-1 text-sm sm:text-base py-4 sm:py-6 order-2 sm:order-1"
                    >
                      Voltar
                    </Button>
                    <Button 
                      onClick={handlePayment} 
                      className="w-full sm:flex-1 text-sm sm:text-base py-4 sm:py-6 order-1 sm:order-2 font-medium" 
                      disabled={isProcessing || (paymentMethod === 'credit' && !isCardDataReady)}
                    >
                      {isProcessing ? (
                        <><Loader2 className="animate-spin mr-2 h-4 w-4"/> Processando...</>
                      ) : (
                        `Pagar com ${paymentMethod === 'pix' ? 'PIX' : 'Cartão'}`
                      )}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pagamento;