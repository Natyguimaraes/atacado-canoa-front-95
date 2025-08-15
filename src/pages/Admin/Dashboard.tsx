import { useState } from 'react';
import { Link } from 'react-router-dom';
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

const Dashboard = () => {
  const { user, profile, isAdmin } = useAuth();
  
  // Redirect if not admin
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

  const stats = [
    {
      title: 'Total de Produtos',
      value: '127',
      icon: Package,
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Pedidos Hoje',
      value: '23',
      icon: ShoppingCart,
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Clientes Ativos',
      value: '89',
      icon: Users,
      trend: '+3%',
      trendUp: true,
    },
    {
      title: 'Vendas do Mês',
      value: 'R$ 12.450',
      icon: TrendingUp,
      trend: '+15%',
      trendUp: true,
    },
  ];

  const recentProducts = [
    {
      id: '1',
      name: 'Conjunto Bebê Menino',
      category: 'Bebê',
      price: 24.90,
      stock: 15,
      status: 'Ativo',
    },
    {
      id: '2',
      name: 'Vestido Infantil Floral',
      category: 'Infantil',
      price: 32.50,
      stock: 8,
      status: 'Ativo',
    },
    {
      id: '3',
      name: 'Camiseta Adulto Premium',
      category: 'Adulto',
      price: 19.90,
      stock: 0,
      status: 'Sem Estoque',
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
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
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
          ))}
        </div>

        {/* Recent Products */}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
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
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={product.status === 'Ativo' ? 'default' : 'destructive'}
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;