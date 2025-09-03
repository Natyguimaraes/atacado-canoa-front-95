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
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function StatusPagamento() {
  const params = useParams();
  const paymentId = params.id as string;

  // Inicializa o SDK do Mercado Pago com a chave pública do ambiente
  initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);

  const { data: paymentResult, isPending, error } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: async () => {
      if (!paymentId) throw new Error("ID do pagamento não encontrado");
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('external_id', paymentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Pagamento não encontrado");
      
      return { status: "success", data };
    },
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.data?.status;
      return status === 'PENDING' || status === 'IN_PROCESS' ? 5000 : false;
    },
  });

  const paymentData = useMemo(() => {
    return paymentResult?.data || null;
  }, [paymentResult]);

  const getStatusConfig = (status: TPaymentStatus) => {
    switch (status) {
        case "PAID":
      case "PENDING":
          return { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" />, text: "Pendente" };
      case "CANCELED":
      case "FAILED":
          return { color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" />, text: status === "CANCELED" ? "Cancelado" : "Falhou" };
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
            <StatusScreen initialization={{ paymentId: paymentData.external_id }} />
        )}

        {paymentData.status.toUpperCase() === 'PAID' && (
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