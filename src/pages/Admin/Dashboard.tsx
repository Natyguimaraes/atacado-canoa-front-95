import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
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
  const { user, profile, isAdmin } = useAuth();
  
  // Estados para os dados
  const [stats, setStats] = useState({ totalProducts: 0, ordersToday: 0, activeCustomers: 0, monthlySales: 0 });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
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
      
      let totalSales = 0;
      const salesByMonth: { [key: string]: number } = {};
      const salesByCategory: { [key: string]: number } = {};

      if (allCarts) {
        const { data: products } = await supabase.from('products').select('id, category');
        const productCategoryMap = new Map(products?.map(p => [p.id, p.category]));

        allCarts.forEach(cart => {
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

      setStats({
        totalProducts: productCount || 0,
        ordersToday: ordersTodayCount || 0,
        activeCustomers: uniqueCustomers.size,
        monthlySales: totalSales,
      });
      
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
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);
  
  if (!isAdmin) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Card className="max-w-md">
                <CardContent className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Acesso Negado</h1>
                    <p className="text-muted-foreground mb-6">Você não tem permissão para acessar esta página.</p>
                    <Button asChild><Link to="/">Voltar para Home</Link></Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  const statCards = [
    {
      title: 'Vendas Totais',
      value: `R$ ${stats.monthlySales.toFixed(2).replace('.', ',')}`,
      icon: TrendingUp,
    },
    {
      title: 'Pedidos Hoje',
      value: stats.ordersToday.toString(),
      icon: ShoppingCart,
    },
    {
      title: 'Clientes Ativos',
      value: stats.activeCustomers.toString(),
      icon: Users,
    },
    {
        title: 'Total de Produtos',
        value: stats.totalProducts.toString(),
        icon: Package,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="ghost" asChild>
                    <Link to="/" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Loja
                    </Link>
                </Button>
                <div>
                    <h1 className="font-display text-2xl font-bold text-primary">Painel Administrativo</h1>
                    <p className="text-muted-foreground">Bem-vindo, {profile?.full_name || user?.email}</p>
                </div>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/admin/cadastro-produto" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/estoque" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Gerenciar Estoque
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* --- SEÇÃO DE CARTÕES DE ESTATÍSTICAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            [...Array(4)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                      <div className="h-6 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-muted"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* --- SEÇÃO DE GRÁFICOS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Vendas Mensais</CardTitle>
              <CardDescription>Receita total por mês neste ano.</CardDescription>
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
                    <Bar dataKey="total" fill="#16a34a" name="Vendas" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Vendas por Categoria</CardTitle>
              <CardDescription>Distribuição da receita entre as categorias.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;