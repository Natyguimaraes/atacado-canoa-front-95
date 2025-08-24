import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../integrations/supabase/client';
import { CreditCard, QrCode, Copy, Check, Loader2, ArrowLeft, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

// Inicializar MercadoPago com a chave pública baseada no ambiente
const isProduction = window.location.hostname.includes('lovable.app') || 
                     window.location.hostname.includes('atacadocanoa.com');
const mpKey = isProduction ? 'APP_USR-edb5a218-3bc1-496e-b3d9-24d33475a5b5' : 'TEST-dfc36fd1-447c-4c28-ba97-740e7d046799';
initMercadoPago(mpKey);

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

interface CardData {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
  identificationType: string;
  identificationNumber: string;
}

interface PaymentData {
  method: 'pix' | 'credit';
  installments?: number;
}

interface PixData {
  qrCode: string;
  qrCodeBase64: string;
  paymentId: string;
}

const Pagamento = () => {
  const { user, isAuthenticated } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const total = totalPrice;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'shipping' | 'payment' | 'pix-payment'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mercadoPago, setMercadoPago] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [pixTimer, setPixTimer] = useState<number>(0);
  const [pixExpired, setPixExpired] = useState(false);

  const [shippingData, setShippingData] = useState<ShippingData>({
    fullName: user?.user_metadata?.full_name || '',
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

  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: '',
    identificationType: 'CPF',
    identificationNumber: '',
  });

  const [paymentData, setPaymentData] = useState<PaymentData>({
    method: 'pix',
    installments: 1,
  });

  const [pixData, setPixData] = useState<PixData | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (step === 'pix-payment' && pixData && !pixExpired) {
      setPixTimer(600);
      
      interval = setInterval(() => {
        setPixTimer((prev) => {
          if (prev <= 1) {
            setPixExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, pixData, pixExpired]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateNewPixCode = async () => {
    setPixExpired(false);
    setPixData(null);
    await handlePixPayment();
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      const isProduction = window.location.hostname.includes('lovable.app') || 
                           window.location.hostname.includes('atacadocanoa.com');
      const mpKey = isProduction ? 'APP_USR-edb5a218-3bc1-496e-b3d9-24d33475a5b5' : 'TEST-dfc36fd1-447c-4c28-ba97-740e7d046799';
      const mp = new (window as any).MercadoPago(mpKey);
      setMercadoPago(mp);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (items.length === 0 && step !== 'pix-payment') {
      navigate('/carrinho');
      return;
    }
  }, [isAuthenticated, items.length, navigate, step]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 5) {
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    setShippingData(prev => ({ ...prev, zipCode: value }));
    
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

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardData(prev => ({ ...prev, cardNumber: value }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.replace(/(\d{2})(\d)/, '$1/$2');
    }
    setCardData(prev => ({ ...prev, expiryDate: value }));
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shippingData.fullName || !shippingData.email || !shippingData.zipCode || 
        !shippingData.address || !shippingData.number || !shippingData.city) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setStep('payment');
  };

  const handleCardPayment = async () => {
    try {
      setIsProcessing(true);
      console.log('Iniciando pagamento com cartão', { cardData });
      
      console.log('Validando dados do cartão:', { 
        cardNumber: !!cardData.cardNumber, 
        cardholderName: !!cardData.cardholderName, 
        expiryDate: !!cardData.expiryDate, 
        cvv: !!cardData.cvv,
        identificationNumber: !!cardData.identificationNumber
      });

      if (!cardData.cardNumber || !cardData.cardholderName || !cardData.expiryDate || !cardData.cvv || !cardData.identificationNumber) {
        console.log('Erro na validação - campos faltando:', { cardData });
        throw new Error('Preencha todos os campos do cartão, incluindo o CPF');
      }

      const [month, year] = cardData.expiryDate.split('/');
      if (!month || !year || month.length !== 2 || year.length !== 2) {
        throw new Error('Data de validade inválida. Use o formato MM/AA');
      }

      // Detectar ambiente baseado no hostname  
      const environment = (window.location.hostname.includes('lovable.app') || 
                          window.location.hostname.includes('atacadocanoa.com')) ? 'production' : 'test';

      const tokenRequestData = {
        card_number: cardData.cardNumber.replace(/\s/g, ''),
        cardholder: {
          name: cardData.cardholderName.toUpperCase(),
          identification: {
            type: cardData.identificationType || 'CPF',
            number: cardData.identificationNumber.replace(/\D/g, '')
          }
        },
        expiration_month: parseInt(month),
        expiration_year: parseInt('20' + year),
        security_code: cardData.cvv,
      };

      console.log('Dados preparados para token:', {
        ...tokenRequestData,
        card_number: '**** **** **** ' + tokenRequestData.card_number.slice(-4),
        security_code: '***'
      });

      console.log('Chamando create-card-token...');
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('create-card-token', {
        body: tokenRequestData
      });

      if (tokenError) {
        console.error('Erro COMPLETO ao criar token:', tokenError);
        console.error('Token error details:', JSON.stringify(tokenError, null, 2));
        
        let errorMessage = 'Erro ao processar dados do cartão';
        if (tokenError.message) {
          errorMessage += `: ${tokenError.message}`;
        }
        if (tokenError.details) {
          errorMessage += ` - ${JSON.stringify(tokenError.details)}`;
        }
        
        throw new Error(errorMessage);
      }
      
      if (tokenData?.error) {
        console.error('Erro do Mercado Pago na criação do token:', tokenData);
        
        let mpErrorMessage = 'Erro do Mercado Pago';
        if (tokenData.mp_error) {
          if (tokenData.mp_error.message) {
            mpErrorMessage += `: ${tokenData.mp_error.message}`;
          }
          if (tokenData.mp_error.cause) {
            mpErrorMessage += ` - ${JSON.stringify(tokenData.mp_error.cause)}`;
          }
        }
        
        throw new Error(mpErrorMessage);
      }
      
      if (!tokenData?.id) {
        console.error('Token data recebido:', tokenData);
        throw new Error('Token do cartão não foi criado corretamente');
      }

      console.log('Token criado:', tokenData.id);

      console.log('Criando pedido...');
      const orderData = {
        user_id: user?.id,
        items: items as any,
        total_amount: total,
        shipping_data: shippingData as any,
        payment_method: 'CARD',
        status: 'pending'
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Erro ao criar pedido:', orderError);
        throw new Error('Erro ao criar pedido');
      }

      // Processar pagamento
      const paymentRequestData = {
        transaction_amount: Math.round(total * 100), // Converter para centavos
        description: `Pedido ${order.id}`,
        payment_method_id: tokenData.payment_method_id,
        token: tokenData.id,
        installments: paymentData.installments || 1,
        payer: {
          email: user?.email || '',
          first_name: user?.user_metadata?.full_name?.split(' ')[0] || '',
          last_name: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          identification: {
            type: cardData.identificationType || 'CPF',
            number: cardData.identificationNumber.replace(/\D/g, '') || '11144477735',
          },
        },
        user_id: user?.id,
        order_id: order.id,
      };

      console.log('Processando pagamento com dados:', {
        ...paymentRequestData,
        token: '***TOKEN***'
      });

      console.log('Chamando process-payment...');

      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('process-payment', {
        body: paymentRequestData
      });

      if (paymentError) {
        console.error('Erro COMPLETO no pagamento:', paymentError);
        console.error('Payment error details:', JSON.stringify(paymentError, null, 2));
        
        let errorMessage = 'Erro ao processar pagamento';
        if (paymentError.message) {
          errorMessage += `: ${paymentError.message}`;
        }
        if (paymentError.details) {
          errorMessage += ` - ${JSON.stringify(paymentError.details)}`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('Pagamento processado:', paymentResult);
      
      // Limpar carrinho
      clearCart();
      
      if (paymentResult.status === 'approved') {
        toast({
          title: "Pagamento aprovado!",
          description: "Seu pedido foi processado com sucesso.",
        });
        navigate('/status-pagamento', { state: { paymentData: paymentResult, success: true } });
      } else {
        toast({
          title: "Pagamento em processamento",
          description: "Aguarde a confirmação do pagamento.",
          variant: "default",
        });
        navigate('/status-pagamento', { state: { paymentData: paymentResult, success: false } });
      }
    } catch (error: any) {
      console.error('Erro FINAL no cartão:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error.stack);
      
      toast({
        title: "Erro no pagamento",
        description: error.message || "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePixPayment = async () => {
    try {
      setIsProcessing(true);
      console.log('Iniciando pagamento PIX');
      
      // Criar pedido primeiro
      const orderData = {
        user_id: user?.id,
        items: items as any,
        total_amount: total,
        shipping_data: shippingData as any,
        payment_method: 'PIX', // Corrigido para PIX
        status: 'pending'
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Erro ao criar pedido:', orderError);
        throw new Error('Erro ao criar pedido');
      }

      // Detectar ambiente baseado no hostname  
      const environment = (window.location.hostname.includes('lovable.app') || 
                          window.location.hostname.includes('atacadocanoa.com')) ? 'production' : 'test';

      const paymentRequestData = {
        transaction_amount: Math.round(total * 100), // Converter para centavos para o Mercado Pago
        description: `Pedido ${order.id}`,
        payment_method_id: 'pix',
        payer: {
          email: user?.email || '',
          first_name: user?.user_metadata?.full_name?.split(' ')[0] || '',
          last_name: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: '11144477735', // CPF de teste válido do Mercado Pago
          },
        },
        user_id: user?.id,
        order_id: order.id,
      };

      console.log('Processando pagamento com dados:', { ...paymentRequestData });
      console.log('Chamando process-payment...');

      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('process-payment', {
        body: paymentRequestData
      });

      if (paymentError) {
        console.error('Erro COMPLETO no PIX:', paymentError);
        console.error('PIX error details:', JSON.stringify(paymentError, null, 2));
        
        let errorMessage = 'Erro ao processar pagamento PIX';
        if (paymentError.message) {
          errorMessage += `: ${paymentError.message}`;
        }
        if (paymentError.details) {
          errorMessage += ` - ${JSON.stringify(paymentError.details)}`;
        }
        
        throw new Error(errorMessage);
      }

      // Verificar se a resposta contém erro do Mercado Pago
      if (paymentResult?.error) {
        console.error('Erro do Mercado Pago no PIX:', paymentResult);
        
        let mpErrorMessage = 'Erro do Mercado Pago no PIX';
        if (paymentResult.mp_error) {
          if (paymentResult.mp_error.message) {
            mpErrorMessage += `: ${paymentResult.mp_error.message}`;
          }
          if (paymentResult.mp_error.cause) {
            mpErrorMessage += ` - ${JSON.stringify(paymentResult.mp_error.cause)}`;
          }
        }
        
        throw new Error(mpErrorMessage);
      }

      console.log('PIX criado:', paymentResult);
      
      if (paymentResult.pix_qr_code && paymentResult.pix_qr_code_base64) {
        setPixData({
          qrCode: paymentResult.pix_qr_code,
          qrCodeBase64: paymentResult.pix_qr_code_base64,
          paymentId: paymentResult.id
        });
        
        // Mostrar toast de sucesso
        toast({
          title: "QR Code PIX gerado!",
          description: "Escaneie o código ou copie para efetuar o pagamento.",
        });
        
        // Mostrar PIX e configurar timer
        setStep('pix-payment');
        setPixExpired(false);
        setPixTimer(600); // 10 minutos
        
        // NÃO limpar carrinho até o pagamento ser confirmado
        // O carrinho será limpo apenas quando o pagamento for confirmado
      } else {
        console.error('Dados PIX incompletos:', paymentResult);
        throw new Error('Erro ao gerar QR Code PIX - dados incompletos');
      }
    } catch (error: any) {
      console.error('Erro FINAL no PIX:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error.stack);
      
      toast({
        title: "Erro no pagamento PIX",
        description: error.message || "Não foi possível gerar o QR Code. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.qrCode) {
      try {
        await navigator.clipboard.writeText(pixData.qrCode);
        setCopied(true);
        toast({
          title: "Código PIX copiado!",
          description: "Cole no seu app bancário para efetuar o pagamento.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar:', error);
      }
    }
  };

  if (step === 'pix-payment' && pixData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">💳</span>
                  Pagamento PIX
                </CardTitle>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    Escaneie o código QR ou copie o código PIX para finalizar o pagamento.
                  </p>
                  {!pixExpired && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span className="font-mono font-bold text-orange-600">
                        {formatTime(pixTimer)}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!pixExpired ? (
                  <>
                    <div className="flex flex-col items-center space-y-4">
                      <div className="bg-white p-4 rounded-lg">
                        <img 
                          src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                          alt="QR Code PIX" 
                          className="w-64 h-64"
                        />
                      </div>
                      
                      <div className="w-full max-w-md space-y-3">
                        <Label>Código PIX (Copiar e Colar):</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={pixData.qrCode}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyPixCode}
                            className="flex-shrink-0"
                          >
                            {copied ? (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="text-center space-y-2">
                        <p className="text-lg font-semibold">
                          Total: {formatPrice(total)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          O pagamento será processado automaticamente após a confirmação.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>Este código expira em {formatTime(pixTimer)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full">
                        <Clock className="h-8 w-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold">QR Code Expirado</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        O código PIX expirou após 10 minutos. Clique no botão abaixo para gerar um novo código.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-lg font-semibold">
                        Total: {formatPrice(total)}
                      </p>
                      <Button 
                        onClick={generateNewPixCode}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando novo código...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Gerar Novo QR Code
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Como pagar:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Abra o app do seu banco</li>
                    <li>2. Escaneie o QR Code ou cole o código PIX</li>
                    <li>3. Confirme o pagamento de {formatPrice(total)}</li>
                    <li>4. Aguarde a confirmação (pode levar alguns minutos)</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setStep('payment');
                      setPixData(null);
                      setPixExpired(false);
                      setPixTimer(0);
                    }}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      toast({
                        title: "Aguardando pagamento",
                        description: "Assim que o pagamento for confirmado, você será notificado.",
                      });
                      navigate('/pedidos');
                    }}
                  >
                    Ver Meus Pedidos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/carrinho')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Carrinho
            </Button>
            <h1 className="text-2xl font-bold text-primary">Finalizar Compra</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">CEP *</Label>
                        <Input
                          id="zipCode"
                          value={shippingData.zipCode}
                          onChange={handleZipCodeChange}
                          placeholder="00000-000"
                          maxLength={9}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      <div className="col-span-2 md:col-span-3 space-y-2">
                        <Label htmlFor="address">Endereço *</Label>
                        <Input
                          id="address"
                          value={shippingData.address}
                          onChange={(e) => setShippingData(prev => ({ ...prev, address: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número *</Label>
                        <Input
                          id="number"
                          value={shippingData.number}
                          onChange={(e) => setShippingData(prev => ({ ...prev, number: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={shippingData.complement}
                        onChange={(e) => setShippingData(prev => ({ ...prev, complement: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado *</Label>
                        <Input
                          id="state"
                          value={shippingData.state}
                          onChange={(e) => setShippingData(prev => ({ ...prev, state: e.target.value }))}
                          maxLength={2}
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validando...
                        </>
                      ) : 'Continuar para Pagamento'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === 'payment' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
                    Forma de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        paymentData.method === 'pix' ? 'border-primary bg-primary/5' : 'border-muted'
                      }`}
                      onClick={() => setPaymentData(prev => ({ ...prev, method: 'pix' }))}
                    >
                      <div className="flex items-center gap-3">
                        <QrCode className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-semibold">PIX</h3>
                          <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        paymentData.method === 'credit' ? 'border-primary bg-primary/5' : 'border-muted'
                      }`}
                      onClick={() => setPaymentData(prev => ({ ...prev, method: 'credit' }))}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-semibold">Cartão de Crédito</h3>
                          <p className="text-sm text-muted-foreground">Parcelado em até 12x</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {paymentData.method === 'credit' && (
                    <div className="space-y-4 border-t pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="cardNumber">Número do Cartão *</Label>
                          <Input
                            id="cardNumber"
                            value={cardData.cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardholderName">Nome do Titular *</Label>
                          <Input
                            id="cardholderName"
                            value={cardData.cardholderName}
                            onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value.toUpperCase() }))}
                            placeholder="NOME COMO NO CARTÃO"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="identificationNumber">CPF *</Label>
                          <Input
                            id="identificationNumber"
                            value={cardData.identificationNumber || ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              const formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                              setCardData(prev => ({ ...prev, identificationNumber: formatted }));
                            }}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">Validade *</Label>
                          <Input
                            id="expiryDate"
                            value={cardData.expiryDate}
                            onChange={handleExpiryChange}
                            placeholder="MM/AA"
                            maxLength={5}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV *</Label>
                          <Input
                            id="cvv"
                            value={cardData.cvv || ''}
                            onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                            placeholder="123"
                            maxLength={4}
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
                            <SelectValue placeholder="Selecione as parcelas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1x de {formatPrice(total)} (à vista)</SelectItem>
                            <SelectItem value="2">2x de {formatPrice(total / 2)}</SelectItem>
                            <SelectItem value="3">3x de {formatPrice(total / 3)}</SelectItem>
                            <SelectItem value="6">6x de {formatPrice(total / 6)}</SelectItem>
                            <SelectItem value="12">12x de {formatPrice(total / 12)}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('shipping')}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button 
                      onClick={paymentData.method === 'pix' ? handlePixPayment : handleCardPayment}
                      className="flex-1"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {paymentData.method === 'pix' ? 'Gerando PIX...' : 'Processando...'}
                        </>
                      ) : (
                        paymentData.method === 'pix' ? 'Gerar QR Code PIX' : 'Finalizar Pagamento'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Tamanho: {item.size} | Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pagamento;