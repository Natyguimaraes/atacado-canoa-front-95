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
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Inicializar MercadoPago com a chave pública
const mpKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
if (mpKey) {
  initMercadoPago(mpKey);
}

// Interfaces...
interface ShippingData { fullName: string; email: string; phone: string; zipCode: string; address: string; number: string; complement: string; neighborhood: string; city: string; state: string; }
interface CardData { cardNumber: string; rawCardNumber: string; cardholderName: string; expiryDate: string; expiryMonth?: string; expiryYear?: string; cvv: string; rawCvv: string; identificationType: string; identificationNumber: string; rawIdentificationNumber: string; }
interface PaymentData { method: 'pix' | 'credit'; installments?: number; }
interface PixData { qrCode: string; qrCodeBase64: string; paymentId: string; }

const Pagamento = () => {
  const { user } = useAuth();
  const { cart: items, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'shipping' | 'payment' | 'pix-payment'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixTimer, setPixTimer] = useState<number>(0);
  const [pixExpired, setPixExpired] = useState(false);

  const [shippingData, setShippingData] = useState<ShippingData>({ fullName: user?.user_metadata?.full_name || '', email: user?.email || '', phone: '', zipCode: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
  const [cardData, setCardData] = useState<CardData>({ cardNumber: '', rawCardNumber: '', cardholderName: '', expiryDate: '', expiryMonth: '', expiryYear: '', cvv: '', rawCvv: '', identificationType: 'CPF', identificationNumber: '', rawIdentificationNumber: '' });
  const [paymentData, setPaymentData] = useState<PaymentData>({ method: 'pix', installments: 1 });
  const [pixData, setPixData] = useState<PixData | null>(null);

  const orderTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'pix-payment' && pixData && !pixExpired) {
      setPixTimer(600);
      interval = setInterval(() => setPixTimer(prev => {
        if (prev <= 1) {
          setPixExpired(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      }), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [step, pixData, pixExpired]);
  
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  useEffect(() => {
    if (items.length === 0 && step !== 'pix-payment') {
      toast({ title: "Carrinho Vazio", description: "O seu carrinho está vazio, a redirecionar..." });
      navigate('/carrinho');
    }
  }, [items, step, navigate, toast]);

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5) value = value.replace(/(\d{5})(\d)/, '$1-$2');
    setShippingData(prev => ({ ...prev, zipCode: value }));
    if (value.replace(/\D/g, '').length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value.replace(/\D/g, '')}/json/`);
        const data = await response.json();
        if (data && !data.erro) setShippingData(prev => ({ ...prev, address: data.logradouro || '', neighborhood: data.bairro || '', city: data.localidade || '', state: data.uf || '' }));
      } catch (error) { console.error('Erro ao buscar CEP:', error); }
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePixPayment = async () => {
    setIsProcessing(true);
    try {
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: user?.id,
        items: items,
        total_amount: orderTotal,
        shipping_data: shippingData,
        payment_method: 'PIX',
        status: 'pending'
      }).select().single();
      if (orderError) throw orderError;
      
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('process-payment', {
        body: { cart: items, payer: { email: user?.email }, external_reference: order.id, payment_method: 'pix' }
      });
      if (paymentError) throw paymentError;

      setPixData({ qrCode: paymentResult.pix_qr_code, qrCodeBase64: paymentResult.pix_qr_code_base64, paymentId: paymentResult.id });
      setStep('pix-payment');
    } catch (error: any) {
      toast({ title: "Erro ao gerar PIX", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const copyPixCode = async () => {
    if (pixData?.qrCode) {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast({ title: "Código PIX copiado!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (step === 'pix-payment' && pixData) {
     return (
        <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                  <CardTitle>Pagamento PIX</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    {!pixExpired ? (
                        <>
                         <div className="bg-white p-4 rounded-lg inline-block"><img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code PIX" className="w-64 h-64 mx-auto"/></div>
                         <div className="w-full"><Label>Código PIX (Copia e Cola):</Label><div className="flex gap-2"><Input value={pixData.qrCode} readOnly className="font-mono text-xs"/><Button variant="outline" size="sm" onClick={copyPixCode}>{copied ? <Check className="h-4 w-4"/> : <Copy className="h-4 w-4"/>}</Button></div></div>
                         <p className="font-bold text-lg">Total: {formatPrice(orderTotal)}</p>
                         <div className="flex items-center justify-center gap-2 text-sm font-mono font-bold text-orange-600"><Clock className="h-4 w-4" /><span>{formatTime(pixTimer)}</span></div>
                        </>
                    ) : (
                        <div className="space-y-4"><Clock className="h-12 w-12 mx-auto text-destructive"/><h3 className="font-semibold text-lg">Código PIX Expirado</h3><p className="text-muted-foreground">Gere um novo código para continuar.</p><Button onClick={handlePixPayment} disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>} Gerar Novo Código</Button></div>
                    )}
                </CardContent>
            </Card>
        </main>
        <Footer />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/carrinho')}><ArrowLeft className="h-5 w-5"/></Button>
          <h1 className="text-3xl font-bold font-display">Finalizar Compra</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><span className={`bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm transition-opacity ${step !== 'shipping' && 'opacity-50'}`}>1</span>Dados de Entrega</CardTitle></CardHeader>
              {step === 'shipping' && (
                <CardContent>
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
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
                    <Button type="submit" className="w-full">Continuar para Pagamento</Button>
                  </form>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader><CardTitle className={`flex items-center gap-2 transition-opacity ${step !== 'payment' && 'opacity-50'}`}><span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>Forma de Pagamento</CardTitle></CardHeader>
              {step === 'payment' && (
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`border rounded-lg p-4 cursor-pointer ${paymentData.method === 'pix' ? 'border-primary' : ''}`} onClick={() => setPaymentData(prev => ({...prev, method: 'pix'}))}><div className="flex items-center gap-3"><QrCode className="h-8 w-8 text-primary"/><div><h3 className="font-semibold">PIX</h3><p className="text-sm text-muted-foreground">Pagamento instantâneo</p></div></div></div>
                    <div className={`border rounded-lg p-4 cursor-pointer ${paymentData.method === 'credit' ? 'border-primary' : ''}`} onClick={() => setPaymentData(prev => ({...prev, method: 'credit'}))}><div className="flex items-center gap-3"><CreditCard className="h-8 w-8 text-primary"/><div><h3 className="font-semibold">Cartão de Crédito</h3><p className="text-sm text-muted-foreground">Indisponível</p></div></div></div>
                  </div>
                  {paymentData.method === 'credit' && <p className='text-center text-muted-foreground'>Pagamento com cartão de crédito indisponível no momento.</p>}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('shipping')} className="flex-1">Voltar</Button>
                    <Button onClick={handlePixPayment} className="flex-1" disabled={isProcessing || paymentData.method !== 'pix'}>{isProcessing ? <><Loader2 className="animate-spin mr-2"/> Gerando...</> : 'Gerar QR Code PIX'}</Button>
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
                    <div><h4 className="font-medium">{item.name}</h4><p className="text-sm text-muted-foreground">Tamanho: {item.size} | Qty: {item.quantity}</p></div>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-4"><div className="flex justify-between items-center font-bold text-lg"><span>Total</span><span className="text-primary">{formatPrice(orderTotal)}</span></div></div>
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