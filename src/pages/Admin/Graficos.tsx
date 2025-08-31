import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface Product {
  id: string;
  name: string;
  category: string;
}

interface Cart {
  items: Array<{ price: number; quantity: number }>;
  created_at: string;
}

// Configuração do gráfico de barra
const productChartConfig = {
  bebe: {
    label: 'Bebê',
    color: 'hsl(var(--chart-1))',
  },
  infantil: {
    label: 'Infantil',
    color: 'hsl(var(--chart-2))',
  },
  adulto: {
    label: 'Adulto',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

// Configuração do gráfico de linha
const salesChartConfig = {
  sales: {
    label: 'Vendas',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const Graficos = () => {
  const { isAdmin } = useAuth();
  const [productData, setProductData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch products to count by category
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('category');

      if (productsError) throw productsError;

      // Count products per category
      const counts = products.reduce((acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {});

      setProductData(
        Object.keys(counts).map((category) => ({
          category,
          count: counts[category],
          fill: `var(--color-${category})`,
        }))
      );

      // Fetch sales data from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: carts, error: cartsError } = await supabase
        .from('carts')
        .select('items, created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (cartsError) throw cartsError;

      const dailySales: { [key: string]: number } = {};
      const today = new Date();

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dailySales[date.toISOString().slice(0, 10)] = 0;
      }

      carts.forEach((cart: Cart) => {
        const cartDate = new Date(cart.created_at).toISOString().slice(0, 10);
        if (dailySales[cartDate] !== undefined) {
          (cart.items as unknown as Array<{ price: number; quantity: number }>).forEach((item) => {
            dailySales[cartDate] += item.price * item.quantity;
          });
        }
      });

      const salesChartData = Object.keys(dailySales)
        .sort()
        .map((date) => ({
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          sales: dailySales[date],
        }));

      setSalesData(salesChartData);

    } catch (error: any) {
      toast.error('Erro ao carregar dados', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Acesso Negado</h1>
            <p className="text-muted-foreground mb-6">
              Você não tem permissão para acessar esta página.
            </p>
            <Button asChild>
              <Link to="/">Voltar para Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/admin/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </Link>
            </Button>
            <h1 className="font-display text-2xl font-bold text-primary">
              Análise de Dados
            </h1>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Produtos por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="h-full w-full animate-pulse bg-muted rounded-lg" />
                </div>
              ) : (
                <ChartContainer config={productChartConfig} className="min-h-[300px]">
                  <BarChart data={productData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) =>
                        productChartConfig[value as keyof typeof productChartConfig]?.label
                      }
                    />
                    <YAxis />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill="var(--color-category)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendas Diárias (Últimos 7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="h-full w-full animate-pulse bg-muted rounded-lg" />
                </div>
              ) : (
                <ChartContainer config={salesChartConfig} className="min-h-[300px]">
                  <LineChart
                    accessibilityLayer
                    data={salesData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickFormatter={(value) => `R$${value.toFixed(2).replace('.', ',')}`}
                      axisLine={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(value) => `Data: ${value}`}
                          formatter={(value) => `Vendas: R$${(value as number).toFixed(2).replace('.', ',')}`}
                        />
                      }
                    />
                    <Line
                      dataKey="sales"
                      type="natural"
                      stroke="var(--color-sales)"
                      strokeWidth={2}
                      dot={{
                        fill: 'var(--color-sales)',
                      }}
                      activeDot={{
                        r: 6,
                        style: { fill: 'var(--color-sales)' },
                      }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Graficos;