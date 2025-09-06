// src/pages/StatusPagamento.tsx

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  CreditCard,
  QrCode,
  Loader2,
} from "lucide-react";
import { TPaymentStatus, PixPaymentMetadata } from "@/types/payment";
import { isAfter } from "date-fns";
import { StatusScreen, initMercadoPago } from "@mercadopago/sdk-react";
import { supabase } from "@/integrations/supabase/client";
import { getEnvironmentConfigSync } from "@/lib/mercadoPago";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function StatusPagamento() {
  const params = useParams();
  const paymentId = params.id as string;

  // Inicializa o SDK do Mercado Pago com a chave pública do ambiente
  const { publicKey } = getEnvironmentConfigSync();
  initMercadoPago(publicKey);

  const { data: paymentResult, isPending, error, refetch } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: async () => {
      if (!paymentId) throw new Error("ID do pagamento não encontrado");
      
      // Primeiro, verificar status atualizado no Mercado Pago
      try {
        await supabase.functions.invoke('check-payment-status', {
          body: { paymentId }
        });
      } catch (checkError) {
        console.warn('Erro ao verificar status:', checkError);
      }
      
      // Buscar por external_id ou id
      let { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('external_id', paymentId)
        .maybeSingle();

      if (error) throw error;
      
      // Se não encontrou por external_id, tentar por id (apenas se for UUID válido)
      if (!data) {
        // Verificar se paymentId é um UUID válido antes de tentar buscar por id
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
        if (isUUID) {
          const { data: dataById, error: errorById } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .maybeSingle();
            
          if (errorById) throw errorById;
          data = dataById;
        }
      }
      
      if (!data) throw new Error("Pagamento não encontrado");
      
      return { status: "success", data };
    },
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.data?.status;
      return status === 'PENDING' || status === 'IN_PROCESS' ? 10000 : false;
    },
  });

  const paymentData = useMemo(() => {
    return paymentResult?.data || null;
  }, [paymentResult]);

  const getStatusConfig = (status: TPaymentStatus) => {
    switch (status) {
        case "APPROVED":
        case "PAID":
            return { color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-4 w-4" />, text: "Aprovado" };
        case "PENDING":
        case "IN_PROCESS":
            return { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" />, text: "Pendente" };
        case "REJECTED":
        case "CANCELED":
        case "FAILED":
            return { color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" />, text: status === "CANCELED" ? "Cancelado" : "Rejeitado" };
        case "EXPIRED":
            return { color: "bg-gray-100 text-gray-800", icon: <AlertCircle className="h-4 w-4" />, text: "Expirado" };
        default:
            return { color: "bg-gray-100 text-gray-800", icon: <AlertCircle className="h-4 w-4" />, text: "Desconhecido" };
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  const formatDate = (dateString: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(dateString));
  const isPaymentExpired = (expirationDate: string) => isAfter(new Date(), new Date(expirationDate));

  const renderContent = () => {
    if (isPending && !paymentData) {
      return (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-semibold">Buscando informações...</h2>
          <p className="text-muted-foreground">Aguarde enquanto verificamos o status do seu pagamento.</p>
        </div>
      );
    }
  
    if (error) {
      return (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold">Erro ao buscar pagamento</h2>
            <p className="text-center text-muted-foreground">Não foi possível encontrar este pagamento. Verifique o link ou tente novamente.</p>
          </CardContent>
        </Card>
      );
    }

    if (!paymentData) return null;

    const statusConfig = getStatusConfig(paymentData.status as TPaymentStatus);
    const pixMetadata = paymentData.metadata as unknown as PixPaymentMetadata | null;
    const isExpired = pixMetadata?.expirationDate && isPaymentExpired(pixMetadata.expirationDate);

    // Debug logs
    console.log('StatusPagamento Debug:', {
      paymentData,
      status: paymentData.status,
      method: paymentData.method,
      pixMetadata,
      isExpired,
      hasQrCode: !!pixMetadata?.qrCodeBase64
    });

    return (
      <>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Detalhes do Pagamento</CardTitle>
              <Badge className={statusConfig.color + ' flex items-center gap-1'}>
                {statusConfig.icon}
                {statusConfig.text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor</label>
                <p className="text-lg font-semibold">{formatCurrency(parseFloat(paymentData.amount.toString()))}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Método</label>
                <div className="flex items-center gap-2 font-medium">
                  {paymentData.method === "PIX" ? <QrCode className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  <span>{paymentData.method}</span>
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID da Transação</label>
                <p className="font-mono text-sm">{paymentData.external_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Criado em</label>
                <p className="text-sm">{formatDate(paymentData.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {(paymentData.status.toUpperCase() === 'PENDING' || paymentData.status.toUpperCase() === 'IN_PROCESS') && !isExpired && (
          <>
            {/* Debug card para PIX */}
            {paymentData.method === "PIX" && (
              <Card className="border-blue-200 bg-blue-50 mb-4">
                <CardHeader>
                  <CardTitle className="text-sm text-blue-900">Debug PIX</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto">{JSON.stringify({ 
                    method: paymentData.method,
                    hasMetadata: !!pixMetadata,
                    hasQrCode: !!pixMetadata?.qrCodeBase64,
                    hasQrString: !!pixMetadata?.qrCode,
                    metadata: pixMetadata 
                  }, null, 2)}</pre>
                </CardContent>
              </Card>
            )}

            {/* Exibir QR Code PIX se disponível */}
            {paymentData.method === "PIX" && pixMetadata?.qrCodeBase64 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-yellow-900">
                    <QrCode className="h-5 w-5" />
                    Pagamento PIX Pendente
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                    <img 
                      src={`data:image/png;base64,${pixMetadata.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-yellow-800 font-medium">
                      Escaneie o QR Code ou copie o código PIX abaixo
                    </p>
                    {pixMetadata.qrCode && (
                      <div className="p-3 bg-white rounded-lg border">
                        <p className="text-xs font-mono break-all text-gray-700">{pixMetadata.qrCode}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => navigator.clipboard.writeText(pixMetadata.qrCode)}
                        >
                          Copiar Código PIX
                        </Button>
                      </div>
                    )}
                    {pixMetadata.expirationDate && (
                      <p className="text-xs text-yellow-700">
                        Válido até: {formatDate(pixMetadata.expirationDate)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fallback para PIX sem QR code */}
            {paymentData.method === "PIX" && !pixMetadata?.qrCodeBase64 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="text-center py-8">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-600" />
                  <h3 className="mb-2 text-lg font-semibold text-orange-900">QR Code indisponível</h3>
                  <p className="text-orange-700">Os dados do PIX não foram carregados corretamente. Recarregue a página.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Recarregar
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {(paymentData.status.toUpperCase() === 'APPROVED' || paymentData.status.toUpperCase() === 'PAID') && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="text-center py-8">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />
              <h3 className="mb-2 text-xl font-semibold text-green-900">Pagamento Confirmado!</h3>
              <p className="text-green-700">Seu pedido já está sendo preparado para envio.</p>
            </CardContent>
          </Card>
        )}
      </>
    );
  };
  

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow">
            <div className="container mx-auto max-w-2xl p-6">
            <div className="mb-6">
                <h1 className="mb-2 text-2xl font-bold">Status do Pagamento</h1>
                <p className="text-muted-foreground">Acompanhe os detalhes da sua transação.</p>
            </div>
            {renderContent()}
            <div className="mt-6 flex gap-4">
                <Button asChild className="flex-1"><Link to="/pedidos">Ver Meus Pedidos</Link></Button>
                <Button variant="outline" asChild className="flex-1"><Link to="/">Voltar ao Início</Link></Button>
            </div>
            </div>
        </main>
        <Footer />
    </div>
  );
}