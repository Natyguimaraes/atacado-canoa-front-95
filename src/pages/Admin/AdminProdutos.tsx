import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Eye, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  original_price?: number;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  images: string[];
  created_at: string;
}

const AdminProdutos = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar produtos', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Filtrar por status
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(product => product.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(product => !product.is_active);
      }
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const getCategoryLabel = (category: string) => {
    const categories = {
      bebe: 'Bebê',
      infantil: 'Infantil',
      adulto: 'Adulto'
    };
    return categories[category as keyof typeof categories] || category;
  };

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;

      toast.success(
        `Produto ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`
      );
      fetchProducts();
    } catch (error: any) {
      toast.error('Erro ao atualizar produto', { description: error.message });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Produtos</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gerencie todos os produtos da loja
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/admin/cadastro-produto" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="bebe">Bebê</SelectItem>
                  <SelectItem value="infantil">Infantil</SelectItem>
                  <SelectItem value="adulto">Adulto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Produtos ({filteredProducts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="space-y-2">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                          <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-16" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-20" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-12" />
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-muted rounded animate-pulse w-16" />
                        </TableCell>
                        <TableCell>
                          <div className="h-8 bg-muted rounded animate-pulse w-24" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                              {product.images[0] && (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <div className="flex gap-1 mt-1">
                                {product.is_new && (
                                  <Badge variant="secondary" className="text-xs">
                                    Novo
                                  </Badge>
                                )}
                                {product.is_featured && (
                                  <Badge variant="default" className="text-xs">
                                    Destaque
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getCategoryLabel(product.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              R$ {product.price.toFixed(2).replace('.', ',')}
                            </p>
                            {product.original_price && product.original_price > product.price && (
                              <p className="text-xs text-muted-foreground line-through">
                                R$ {product.original_price.toFixed(2).replace('.', ',')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.stock > 0 ? 'default' : 'destructive'}
                          >
                            {product.stock} un.
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.is_active ? 'default' : 'secondary'}
                          >
                            {product.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/produto/${product.id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1">Ver</span>
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant={product.is_active ? 'secondary' : 'default'}
                              onClick={() => toggleProductStatus(product.id, product.is_active)}
                              className="w-full sm:w-auto"
                            >
                              {product.is_active ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum produto encontrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProdutos;