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
import { initMercadoPago } from '@mercadopago/sdk-react';
import { getEnvironmentConfig } from '@/lib/mercadoPago';

// Interfaces
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
  const { user } = useAuth();
  const { cart: items, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix');
  
  const cardPaymentDataRef = useRef<any>(null);
  const [isCardDataReady, setIsCardDataReady] = useState(false);

  // Inicializa o SDK do Mercado Pago com a chave pública do ambiente
  const { publicKey } = getEnvironmentConfig();
  initMercadoPago(publicKey, { locale: 'pt-BR' });

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
    state: ''
  });

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
    setStep('payment');
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
        user_id: user?.id,
        items: items,
        total_amount: orderTotal,
        shipping_data: shippingData,
      };
      
      const paymentResult = await processPayment(
        orderData, 
        paymentMethod, 
        cardPaymentDataRef.current 
      );
      
      if (paymentResult && paymentResult.id) {
          await clearCart();
          toast({ title: "Pedido realizado com sucesso!", description: "A redirecionar..." });
          navigate(`/status-pagamento/${paymentResult.id}`);
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
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/carrinho')}><ArrowLeft className="h-5 w-5"/></Button>
          <h1 className="text-3xl font-bold font-display">Finalizar Compra</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className={`bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold transition-opacity ${step !== 'shipping' && 'opacity-50'}`}>1</span>
                  Dados de Entrega
                </CardTitle>
              </CardHeader>
              {step === 'shipping' && (
                <CardContent>
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
                    {/* ... (o teu formulário de entrega continua igual) ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor="fullName">Nome Completo *</Label><Input id="fullName" value={shippingData.fullName} onChange={(e) => setShippingData(prev => ({...prev, fullName: e.target.value}))} required/></div>
                      <div className="space-y-2"><Label htmlFor="email">E-mail *</Label><Input id="email" type="email" value={shippingData.email} onChange={(e) => setShippingData(prev => ({...prev, email: e.target.value}))} required/></div>
                      <div className="space-y-2"><Label htmlFor="phone">Telefone *</Label><Input id="phone" value={shippingData.phone} onChange={(e) => setShippingData(prev => ({...prev, phone: e.target.value}))} required/></div>
                      <div className="space-y-2"><Label htmlFor="zipCode">CEP *</Label><Input id="zipCode" value={shippingData.zipCode} onChange={handleZipCodeChange} placeholder="00000-000" maxLength={9} required/></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2"><Label htmlFor="address">Endereço *</Label><Input id="address" value={shippingData.address} onChange={(e) => setShippingData(prev => ({...prev, address: e.target.value}))} required/></div>
                      <div className="space-y-2"><Label htmlFor="number">Número *</Label><Input id="number" value={shippingData.number} onChange={(e) => setShippingData(prev => ({...prev, number: e.target.value}))} required/></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="complement">Complemento</Label><Input id="complement" value={shippingData.complement} onChange={(e) => setShippingData(prev => ({...prev, complement: e.target.value}))}/></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><Label htmlFor="neighborhood">Bairro *</Label><Input id="neighborhood" value={shippingData.neighborhood} onChange={(e) => setShippingData(prev => ({...prev, neighborhood: e.target.value}))} required/></div>
                      <div className="space-y-2"><Label htmlFor="city">Cidade *</Label><Input id="city" value={shippingData.city} onChange={(e) => setShippingData(prev => ({...prev, city: e.target.value}))} required/></div>
                      <div className="space-y-2"><Label htmlFor="state">Estado *</Label><Input id="state" value={shippingData.state} onChange={(e) => setShippingData(prev => ({...prev, state: e.target.value}))} maxLength={2} required/></div>
                    </div>
                    <Button type="submit" className="w-full text-lg py-6">Continuar para Pagamento</Button>
                  </form>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 transition-opacity ${step !== 'payment' && 'opacity-50'}`}>
                  <span className={`bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold`}>2</span>
                  Forma de Pagamento
                </CardTitle>
              </CardHeader>
              {step === 'payment' && (
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-primary shadow-md' : 'border-gray-200'}`} onClick={() => { setPaymentMethod('pix'); setIsCardDataReady(false); cardPaymentDataRef.current = null; }}>
                      <div className="flex items-center gap-3"><QrCode className="h-8 w-8 text-primary"/><div><h3 className="font-semibold">PIX</h3><p className="text-sm text-muted-foreground">Pagamento instantâneo</p></div></div>
                    </div>
                    <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'credit' ? 'border-primary shadow-md' : 'border-gray-200'}`} onClick={() => setPaymentMethod('credit')}>
                      <div className="flex items-center gap-3"><CreditCard className="h-8 w-8 text-primary"/><div><h3 className="font-semibold">Cartão de Crédito</h3><p className="text-sm text-muted-foreground">Pague com seu cartão</p></div></div>
                    </div>
                  </div>
                  
                  {paymentMethod === 'credit' && (
                    <>
                      {isCardDataReady ? (
                        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2"/>
                          <p className="font-medium text-green-700">Cartão validado com sucesso!</p>
                          <p className="text-sm text-green-600">Pode clicar em "Pagar com Cartão" para finalizar.</p>
                        </div>
                      ) : (
                        <CardPaymentForm
                          amount={orderTotal}
                          payerEmail={shippingData.email}
                          onPaymentReady={(data) => {
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
                    </>
                  )}
                  
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('shipping')} className="flex-1 text-md py-6">Voltar</Button>
                    <Button onClick={handlePayment} className="flex-1 text-md py-6" disabled={isProcessing || (paymentMethod === 'credit' && !isCardDataReady)}>
                      {isProcessing ? <><Loader2 className="animate-spin mr-2"/> Processando...</> : `Pagar com ${paymentMethod === 'pix' ? 'PIX' : 'Cartão'}`}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.product_id}-${item.size}`} className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">Tamanho: {item.size} | Qtd: {item.quantity}</p>
                    </div>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(orderTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pagamento;