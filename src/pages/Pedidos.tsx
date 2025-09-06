// src/pages/Pedidos.tsx

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, CreditCard, QrCode, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

// Tipagem atualizada
interface Payment {
  id: string;
  external_id: string;
  status: string;
  method: string;
  amount: number;
  created_at: string;
  metadata: any;
}

interface OrderWithPayment {
  id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  items: any;
  payment: Payment | null; // Alterado para objeto único
}

const Pedidos = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: orders, isLoading, error } = useQuery<OrderWithPayment[]>({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      logger.info('Buscando pedidos e pagamentos...');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          payments!payments_order_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      // Mapeia os dados, transformando o array 'payments' em um objeto 'payment'
      const formattedData = data.map(order => ({
          ...order,
          payment: Array.isArray(order.payments) && order.payments.length > 0 ? order.payments[0] : null
      }));

      return formattedData;
    },
    enabled: !!user && isAuthenticated, 
  });
  
  useEffect(() => {
    if (error) {
      logger.error('Erro ao buscar pedidos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus pedidos.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Funções auxiliares (getStatusIcon, getStatusLabel, etc.)
  const getPaymentStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': case 'PAID': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING': case 'IN_PROCESS': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'REJECTED': case 'CANCELLED': case 'FAILED': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'Aprovado';
      case 'PAID': return 'Pago';
      case 'PENDING': return 'Pendente';
      case 'IN_PROCESS': return 'Processando';
      case 'REJECTED': return 'Rejeitado';
      case 'CANCELLED': return 'Cancelado';
      case 'FAILED': return 'Falhou';
      default: return status || 'Desconhecido';
    }
  };

  const getPaymentStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toUpperCase()) {
        case 'APPROVED': case 'PAID': return 'default';
        case 'REJECTED': case 'CANCELLED': case 'FAILED': return 'destructive';
        case 'PENDING': case 'IN_PROCESS': return 'secondary';
        default: return 'outline';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'PIX': return <QrCode className="h-4 w-4" />;
      case 'CREDIT_CARD': case 'DEBIT_CARD': case 'CARD': return <CreditCard className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  if (!isAuthenticated) {
    // ... (código para usuário não logado, sem alterações)
    return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto text-center py-16">
              <Package className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
              <h1 className="font-display text-3xl font-bold text-primary mb-4">
                Faça login para ver seus pedidos
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Para acessar o histórico de seus pedidos, você precisa estar logado.
              </p>
              <Button size="lg" asChild>
                <Link to="/login">Fazer Login</Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Home
            </Link>
          </Button>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
            Meus Pedidos
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o status dos seus pedidos e pagamentos.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/30"></CardHeader>
                <CardContent className="p-6 h-48 bg-muted/10"></CardContent>
              </Card>
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
            <h2 className="font-display text-2xl font-bold text-primary mb-4">
              Nenhum pedido encontrado
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Você ainda não fez nenhum pedido.
            </p>
            <Button size="lg" asChild>
              <Link to="/">Ver Produtos</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const displayStatus = order.payment?.status || order.status;
              const displayMethod = order.payment?.method || order.payment_method;

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Pedido #{order.id.slice(0, 8)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Realizado em {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(displayMethod)}
                          <span className="text-sm font-medium">{displayMethod}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPaymentStatusIcon(displayStatus)}
                          <Badge variant={getPaymentStatusVariant(displayStatus)}>
                            {getPaymentStatusLabel(displayStatus)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {order.payment && (
                        <div className="bg-muted/20 p-4 rounded-lg">
                          <h4 className="font-medium mb-3">Detalhes do Pagamento</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <p><strong>Valor:</strong> {formatCurrency(order.payment.amount)}</p>
                            <p><strong>Status:</strong> {getPaymentStatusLabel(order.payment.status)}</p>
                          </div>
                          {/* CORREÇÃO: Botão aparece se o external_id existir */}
                          {order.payment.external_id && (
                            <div className="mt-4">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/status-pagamento/${order.payment.external_id}`} className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  Ver Detalhes do Pagamento
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium mb-3">Itens do Pedido</h4>
                        {/* ... (lógica de itens do pedido sem alteração) */}
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>Total do Pedido</span>
                        <span>{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Pedidos;