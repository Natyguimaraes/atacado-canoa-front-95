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
} from "lucide-react";
import { TPaymentStatus, PixPaymentMetadata } from "@/types/payment";
import { isAfter } from "date-fns";
import { StatusScreen } from "@mercadopago/sdk-react";
import { supabase } from "@/integrations/supabase/client";

export default function StatusPagamento() {
  const params = useParams();
  const paymentId = params.id as string;

  const { data: paymentResult, isPending: isPendingPaymentResult, error } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: async () => {
      if (!paymentId) throw new Error("ID do pagamento não encontrado");
      
      // Primeiro tentar buscar por ID direto
      let { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle();

      // Se não encontrar por ID, tentar buscar por external_id
      if (!data && !error) {
        const { data: dataByExternalId, error: errorByExternalId } = await supabase
          .from('payments')
          .select('*')
          .eq('external_id', paymentId)
          .maybeSingle();
        
        data = dataByExternalId;
        error = errorByExternalId;
      }

      if (error) throw error;
      if (!data) throw new Error("Pagamento não encontrado");
      
      return { status: "success", data };
    },
    refetchInterval: 5000, // 5 segundos para atualizar mais frequentemente
    enabled: !!paymentId,
    retry: (failureCount, error: any) => {
      // Se o erro for "not found" e ainda não tentou muitas vezes, continue tentando
      if (error?.message?.includes("No rows returned") && failureCount < 20) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const paymentData = useMemo(() => {
    if (!paymentResult || paymentResult.status !== "success") {
      return null;
    }
    return paymentResult.data;
  }, [paymentResult]);

  const getStatusConfig = (status: TPaymentStatus) => {
    switch (status) {
      case "PAID":
        return {
          color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
          icon: <CheckCircle className="h-4 w-4" />,
          text: "Pago",
        };
      case "PENDING":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
          icon: <Clock className="h-4 w-4" />,
          text: "Pendente",
        };
      case "CANCELED":
      case "FAILED":
        return {
          color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
          icon: <XCircle className="h-4 w-4" />,
          text: status === "CANCELED" ? "Cancelado" : "Falhou",
        };
      case "EXPIRED":
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300",
          icon: <AlertCircle className="h-4 w-4" />,
          text: "Expirado",
        };
      case "REFUNDED":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
          icon: <AlertCircle className="h-4 w-4" />,
          text: "Reembolsado",
        };
      case "IN_PROCESS":
        return {
          color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
          icon: <Clock className="h-4 w-4" />,
          text: "Em Processamento",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300",
          icon: <AlertCircle className="h-4 w-4" />,
          text: "Desconhecido",
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dateString));
  };

  const isPaymentExpired = (expirationDate: string) => {
    return isAfter(new Date(), new Date(expirationDate));
  };

  // Se ainda está carregando ou tentando buscar o pagamento, mostra loading
  if (isPendingPaymentResult || (!paymentData && !error)) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 rounded bg-muted"></div>
          <div className="h-64 rounded bg-muted"></div>
        </div>
        <div className="text-center mt-4">
          <p className="text-muted-foreground">Aguardando informações do pagamento...</p>
        </div>
      </div>
    );
  }

  // Só mostra erro se realmente falhou após várias tentativas
  if (error && !paymentData) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold text-muted-foreground">
              Pagamento não encontrado
            </h2>
            <p className="text-center text-muted-foreground">
              Não foi possível encontrar informações sobre este pagamento após várias tentativas.
            </p>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(paymentData.status as TPaymentStatus);
  const isPixPayment = paymentData.method === "PIX";
  const pixMetadata = isPixPayment && paymentData.metadata
    ? (paymentData.metadata as unknown as PixPaymentMetadata)
    : null;
  const isExpired = pixMetadata && isPaymentExpired(pixMetadata.expirationDate);

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">
          Status do Pagamento
        </h1>
        <p className="text-muted-foreground">Acompanhe o status do seu pagamento</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Informações do Pagamento</CardTitle>
            <Badge className={`${statusConfig.color} flex items-center gap-1`}>
              {statusConfig.icon}
              {statusConfig.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Valor</label>
              <p className="text-lg font-semibold">
                {formatCurrency(parseFloat(paymentData.amount.toString()))}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Método
              </label>
              <div className="flex items-center gap-2">
                {isPixPayment ? (
                  <QrCode className="h-4 w-4" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {paymentData.method === "PIX"
                    ? "PIX"
                    : paymentData.method === "CREDIT"
                      ? "Cartão de Crédito"
                      : paymentData.method === "DEBIT"
                        ? "Cartão de Débito"
                        : "Outro Método"}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                ID do Pagamento
              </label>
              <p className="font-mono text-sm">{paymentData.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Criado em
              </label>
              <p className="text-sm">{formatDate(paymentData.created_at)}</p>
            </div>
          </div>

          {paymentData.paid_at && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Pago em
              </label>
              <p className="text-sm">{formatDate(paymentData.paid_at)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {paymentData.status !== "EXPIRED" && (
        <div className="mb-4">
          <StatusScreen
            initialization={{
              paymentId: paymentData.external_id,
            }}
            locale="pt-BR"
          />
        </div>
      )}

      {/* PIX Expired Message */}
      {isPixPayment &&
        pixMetadata &&
        paymentData.status === "PENDING" &&
        isExpired && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-4 h-16 w-16 text-orange-600 dark:text-orange-400" />
                <h3 className="mb-2 text-xl font-semibold text-orange-900 dark:text-orange-100">
                  PIX Expirado
                </h3>
                <p className="mb-4 text-orange-700 dark:text-orange-300">
                  Este código PIX expirou em{" "}
                  {formatDate(pixMetadata.expirationDate)}.
                </p>
                <p className="mb-4 text-orange-700 dark:text-orange-300">
                  Por favor, inicie um novo pagamento.
                </p>
                <Link to="/produtos">
                  <Button className="mt-4" variant="outline">
                    Voltar às Compras
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Success/Error Messages */}
      {paymentData.status === "PAID" && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600 dark:text-green-400" />
              <h3 className="mb-2 text-xl font-semibold text-green-900 dark:text-green-100">
                Pagamento Confirmado!
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Seu pagamento foi processado com sucesso.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(paymentData.status === "FAILED" ||
        paymentData.status === "CANCELED") && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <XCircle className="mx-auto mb-4 h-16 w-16 text-red-600 dark:text-red-400" />
              <h3 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
                {paymentData.status === "FAILED"
                  ? "Pagamento Falhou"
                  : "Pagamento Cancelado"}
              </h3>
              <p className="text-red-700 dark:text-red-300">
                {paymentData.status === "FAILED"
                  ? "Houve um problema ao processar seu pagamento."
                  : "O pagamento foi cancelado."}
              </p>
              <Link to="/produtos">
                <Button className="mt-4" variant="outline">
                  Voltar às Compras
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex gap-4">
        <Button asChild className="flex-1">
          <Link to="/pedidos">Ver Meus Pedidos</Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link to="/">Voltar ao Início</Link>
        </Button>
      </div>
    </div>
  );
}