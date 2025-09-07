import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Plus,
  Calendar,
  DollarSign,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// Interfaces (tipos de dados)
interface CartItem {
  price: number;
  quantity: number;
  product_id: string;
}

interface SalesData {
  name: string;
  total: number;
}

interface CategoryData {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

const Dashboard = () => {
  // Estados para os dados
  const [stats, setStats] = useState({ 
    totalProducts: 0, 
    ordersToday: 0, 
    activeCustomers: 0, 
    monthlySales: 0,
    totalOrders: 0,
    avgOrderValue: 0 
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch para os cards de estatísticas
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: ordersTodayCount } = await supabase.from('carts').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
      const { data: activeCustomersData } = await supabase.from('carts').select('user_id');
      const uniqueCustomers = new Set(activeCustomersData?.map(c => c.user_id));
      const { data: allCarts } = await supabase.from('carts').select('items, created_at');
      
      const allCartsData = allCarts || [];
      let totalSales = 0;
      let totalOrders = allCartsData.length;
      const salesByMonth: { [key: string]: number } = {};
      const salesByCategory: { [key: string]: number } = {};

      if (allCartsData.length > 0) {
        const { data: products } = await supabase.from('products').select('id, category');
        const productCategoryMap = new Map(products?.map(p => [p.id, p.category]));

        allCartsData.forEach(cart => {
          if (Array.isArray(cart.items)) {
            const month = new Date(cart.created_at).toLocaleString('pt-BR', { month: 'short' });
            if (!salesByMonth[month]) salesByMonth[month] = 0;

            (cart.items as unknown as CartItem[]).forEach(item => {
              const saleValue = (item.price || 0) * (item.quantity || 0);
              totalSales += saleValue;
              salesByMonth[month] += saleValue;

              const category = productCategoryMap.get(item.product_id) || 'Outros';
              if (!salesByCategory[category]) salesByCategory[category] = 0;
              salesByCategory[category] += saleValue;
            });
          }
        });
      }

      // Fetch recent orders
      const { data: recentOrdersData } = await supabase
        .from('orders')
        .select('id, created_at, total, status')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalProducts: productCount || 0,
        ordersToday: ordersTodayCount || 0,
        activeCustomers: uniqueCustomers.size,
        monthlySales: totalSales,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      });
      
      setRecentOrders(recentOrdersData || []);
      
      const monthOrder = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      setSalesData(
        Object.keys(salesByMonth)
          .map(month => ({ name: month.replace('.', ''), total: salesByMonth[month] }))
          .sort((a, b) => monthOrder.indexOf(a.name.toLowerCase()) - monthOrder.indexOf(b.name.toLowerCase()))
      );
      
      setCategoryData(Object.keys(salesByCategory).map(cat => ({ name: cat, value: salesByCategory[cat] })));

    } catch (error: any) {
      toast.error('Erro ao carregar dados', { description: error.message });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const statCards = [
    {
      title: 'Vendas Totais',
      value: `R$ ${stats.monthlySales.toFixed(2).replace('.', ',')}`,
      icon: DollarSign,
      trend: '+12.5%',
      trendDirection: 'up' as const,
    },
    {
      title: 'Pedidos Hoje',
      value: stats.ordersToday.toString(),
      icon: ShoppingCart,
      trend: '+5.2%',
      trendDirection: 'up' as const,
    },
    {
      title: 'Clientes Ativos',
      value: stats.activeCustomers.toString(),
      icon: Users,
      trend: '+2.1%',
      trendDirection: 'up' as const,
    },
    {
      title: 'Total de Produtos',
      value: stats.totalProducts.toString(),
      icon: Package,
      trend: '+0.8%',
      trendDirection: 'up' as const,
    },
    {
      title: 'Total de Pedidos',
      value: stats.totalOrders.toString(),
      icon: Calendar,
      trend: '+8.3%',
      trendDirection: 'up' as const,
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${stats.avgOrderValue.toFixed(2).replace('.', ',')}`,
      icon: Activity,
      trend: '+3.7%',
      trendDirection: 'up' as const,
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Visão geral do seu negócio
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild size="sm">
              <Link to="/admin/cadastro-produto" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Produto
              </Link>
            </Button>
          </div>
        </div>

        {/* --- SEÇÃO DE CARTÕES DE ESTATÍSTICAS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-12"></div>
                      <div className="h-3 bg-muted rounded w-10"></div>
                    </div>
                    <div className="h-8 w-8 rounded bg-muted"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat) => (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {stat.title}
                      </p>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {stat.trend}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* --- SEÇÃO DE GRÁFICOS --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Vendas Mensais</CardTitle>
              <CardDescription>Receita total por mês neste ano</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={salesData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip formatter={(value: number) => [`R$${value.toFixed(2)}`, 'Receita']} />
                    <Legend />
                    <Bar dataKey="total" fill="hsl(var(--primary))" name="Vendas" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendas por Categoria</CardTitle>
              <CardDescription>Distribuição da receita</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie 
                      data={categoryData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80} 
                      label={({name, value}) => `${name}: R$${value.toFixed(0)}`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- SEÇÃO DE PEDIDOS RECENTES --- */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>Últimos 5 pedidos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">Pedido #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {order.total?.toFixed(2) || '0,00'}</p>
                      <p className="text-xs capitalize text-muted-foreground">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum pedido encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;