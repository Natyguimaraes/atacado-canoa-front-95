import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Plus,
  ArrowLeft,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import EditProductModal from './EditProductModal';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  original_price?: number;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  is_active: boolean;
  is_new: boolean;
  is_featured: boolean;
}

interface CartItem {
  price: number;
  quantity: number;
}

const Dashboard = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalProducts: 0,
    ordersToday: 0,
    activeCustomers: 0,
    monthlySales: 0,
  });

  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { count: productCount, error: productError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (productError) throw productError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count: ordersTodayCount, error: ordersError } = await supabase
        .from('carts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (ordersError) throw ordersError;

      const { data: activeCustomersData, error: customersError } = await supabase
        .from('carts')
        .select('user_id');

      if (customersError) throw customersError;

      const uniqueCustomers = new Set(activeCustomersData.map(c => c.user_id));

      const { data: monthlySalesData, error: salesError } = await supabase
        .from('carts')
        .select('items');

      if (salesError) throw salesError;

      let totalSales = 0;
      if (monthlySalesData) {
        monthlySalesData.forEach(cart => {
          if (Array.isArray(cart.items)) {
            (cart.items as unknown as CartItem[]).forEach(item => {
              if (item.price && item.quantity) {
                totalSales += item.price * item.quantity;
              }
            });
          }
        });
      }

      const { data: recentProductsData, error: recentProductsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentProductsError) throw recentProductsError;

      setStats({
        totalProducts: productCount || 0,
        ordersToday: ordersTodayCount || 0,
        activeCustomers: uniqueCustomers.size,
        monthlySales: totalSales,
      });
      setRecentProducts(recentProductsData as Product[]);

    } catch (error: any) {
      toast.error('Erro ao carregar dados', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Produto excluído!', {
        description: 'O produto foi removido do catálogo com sucesso.',
      });
      fetchData();
      setIsDeleteAlertOpen(false);
    } catch (error: any) {
      toast.error('Erro ao excluir produto', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
      console.error(error);
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

  const staticStats = [
    {
      title: 'Total de Produtos',
      value: stats.totalProducts.toString(),
      icon: Package,
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Pedidos Hoje',
      value: stats.ordersToday.toString(),
      icon: ShoppingCart,
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Clientes Ativos',
      value: stats.activeCustomers.toString(),
      icon: Users,
      trend: '+3%',
      trendUp: true,
    },
    {
      title: 'Vendas do Mês',
      value: `R$ ${stats.monthlySales.toFixed(2).replace('.', ',')}`,
      icon: TrendingUp,
      trend: '+15%',
      trendUp: true,
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
                <h1 className="font-display text-2xl font-bold text-primary">
                  Painel Administrativo
                </h1>
                <p className="text-muted-foreground">
                  Bem-vindo, {profile?.full_name || user?.email}
                </p>
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
              <Button asChild>
                <Link to="/admin/graficos" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Visualizar Gráficos
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
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
            staticStats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <TrendingUp className={`h-3 w-3 ${stat.trendUp ? 'text-success' : 'text-destructive'}`} />
                    <span className={`text-xs font-medium ${stat.trendUp ? 'text-success' : 'text-destructive'}`}>
                      {stat.trend}
                    </span>
                    <span className="text-xs text-muted-foreground">vs. mês anterior</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Produtos Recentes</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/produtos">Ver Todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>
                        R$ {product.price.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={product.is_active ? 'default' : 'destructive'}
                        >
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsDeleteAlertOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal de Visualização */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Visualizar Produto: {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid md:grid-cols-2 gap-6 p-4">
              <div className="space-y-4">
                <Carousel className="w-full">
                  <CarouselContent>
                    {selectedProduct.images && selectedProduct.images.length > 0 ? (
                      selectedProduct.images.map((image, index) => (
                        <CarouselItem key={index}>
                          <img 
                            src={image} 
                            alt={`${selectedProduct.name} - ${index + 1}`} 
                            className="w-full h-auto object-cover rounded-md"
                          />
                        </CarouselItem>
                      ))
                    ) : (
                      <CarouselItem>
                        <div className="w-full h-[400px] bg-muted flex items-center justify-center rounded-md">
                          <p className="text-muted-foreground">Sem imagem</p>
                        </div>
                      </CarouselItem>
                    )}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
                <p className="text-muted-foreground">
                  {selectedProduct.description || 'Sem descrição.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedProduct.category}</Badge>
                  <Badge variant="outline">
                    R$ {selectedProduct.price.toFixed(2).replace('.', ',')}
                  </Badge>
                  {selectedProduct.is_new && <Badge>Novo</Badge>}
                  {selectedProduct.is_featured && <Badge variant="secondary">Destaque</Badge>}
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Tamanhos</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes && selectedProduct.sizes.length > 0 ? (
                      selectedProduct.sizes.map(size => (
                        <Badge key={size} variant="outline">{size}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Não especificado</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal de Edição */}
      <Dialog 
        open={isEditModalOpen} 
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setSelectedProduct(null);
            fetchData(); 
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Editar Produto: {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {/* CORRIGIDO: Adiciona a key para forçar a reinicialização do estado do modal */}
          {selectedProduct && (
            <EditProductModal 
              key={selectedProduct.id}
              product={selectedProduct} 
              onClose={() => {
                setIsEditModalOpen(false);
                fetchData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente o produto
              **{selectedProduct?.name}** da sua base de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteProduct(selectedProduct?.id || '')}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Dashboard;