import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

interface OrderWithPayment {
  id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  items: any;
  payment: {
    id: string;
    external_id: string;
    status: string;
    method: string;
    amount: number;
    created_at: string;
    metadata: any;
  } | null;
}

const Pedidos = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchOrdersWithPayments();
    }
  }, [isAuthenticated, user]);

  const fetchOrdersWithPayments = async () => {
    try {
      // Buscar pedidos com pagamentos usando o relacionamento order_id
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          payments!order_id (
            id,
            external_id,
            status,
            method,
            amount,
            created_at,
            metadata
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      // Transformar os dados para o formato esperado
      const ordersWithPayments = ordersData?.map(order => ({
        ...order,
        payment: Array.isArray(order.payments) ? order.payments[0] : order.payments
      })) || [];

      setOrders(ordersWithPayments);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus pedidos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING':
      case 'IN_PROCESS':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'EXPIRED':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'Aprovado';
      case 'PAID':
        return 'Pago';
      case 'PENDING':
        return 'Pendente';
      case 'IN_PROCESS':
        return 'Processando';
      case 'REJECTED':
        return 'Rejeitado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'FAILED':
        return 'Falhou';
      case 'EXPIRED':
        return 'Expirado';
      default:
        return status || 'Desconhecido';
    }
  };

  const getPaymentStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'PAID':
        return 'default';
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
        return 'destructive';
      case 'PENDING':
      case 'IN_PROCESS':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'PIX':
        return <QrCode className="h-4 w-4" />;
      case 'CREDIT':
      case 'CARD':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
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
              <Link to="/login">
                Fazer Login
              </Link>
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
            Acompanhe o status real dos seus pedidos e pagamentos
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
            <h2 className="font-display text-2xl font-bold text-primary mb-4">
              Nenhum pedido encontrado
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Você ainda não fez nenhum pedido. Que tal dar uma olhada em nossos produtos?
            </p>
            <Button size="lg" asChild>
              <Link to="/produtos">
                Ver Produtos
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
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
                        {getPaymentMethodIcon(order.payment?.method || order.payment_method)}
                        <span className="text-sm font-medium">
                          {order.payment?.method === 'PIX' ? 'PIX' : 'Cartão de Crédito'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPaymentStatusIcon(order.payment?.status || 'pending')}
                        <Badge variant={getPaymentStatusVariant(order.payment?.status || 'pending')}>
                          {getPaymentStatusLabel(order.payment?.status || 'pending')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Informações do Pagamento */}
                    {order.payment && (
                      <div className="bg-muted/20 p-4 rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Informações do Pagamento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">ID do Pagamento:</span>
                            <p className="font-mono text-xs">{order.payment.external_id}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Processado em:</span>
                            <p>{formatDate(order.payment.created_at)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valor Pago:</span>
                            <p className="font-semibold">{formatCurrency(order.payment.amount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <div className="flex items-center gap-2 mt-1">
                              {getPaymentStatusIcon(order.payment.status)}
                              <span className="font-medium">
                                {getPaymentStatusLabel(order.payment.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Botão para ver detalhes do pagamento */}
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

                    {/* Itens do Pedido */}
                    <div>
                      <h4 className="font-medium mb-3">Itens do Pedido</h4>
                      <div className="space-y-2">
                        {Array.isArray(order.items) ? order.items.map((item: any, index: number) => (
                          <div key={`${item.id}-${index}`} className="flex justify-between items-center text-sm bg-muted/10 p-3 rounded">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-muted-foreground">
                                  Tamanho: {item.size || 'N/A'} • Quantidade: {item.quantity}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.price)} cada
                              </p>
                            </div>
                          </div>
                        )) : (
                          <div className="text-sm text-muted-foreground p-3 bg-muted/10 rounded">
                            Itens não disponíveis
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Total */}
                    <div className="flex justify-between items-center bg-primary/5 p-4 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Total do Pedido
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(order.total_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Pedidos;