import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useAuth } from '@/context/AuthContext';
import { AdminLayout } from '@/components/AdminLayout';

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
  stock: number;
  is_active: boolean;
  is_new: boolean;
  is_featured: boolean;
  created_at: string;
}

const EstoqueManagement = () => {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const productsPerPage = 10;

  // Estados para os modais
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query.range(
        (currentPage - 1) * productsPerPage,
        currentPage * productsPerPage - 1
      );

      if (error) throw error;
      
      setProducts(data || []);
      setTotalProducts(count || 0);
    } catch (error: any) {
      toast.error('Erro ao buscar produtos', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, fetchProducts]);
  
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
      fetchProducts(); // Atualiza a lista após deletar
      setIsDeleteAlertOpen(false);
    } catch (error: any) {
      toast.error('Erro ao excluir produto', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    fetchProducts();
  };

  const totalPages = Math.ceil(totalProducts / productsPerPage);

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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Gestão de Estoque</h1>
            <p className="text-muted-foreground">
              Visualize, edite e gerencie todos os produtos do seu catálogo
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/cadastro-produto" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Link>
          </Button>
        </div>

        {/* Search and Content */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome do produto..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
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
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
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
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>R$ {product.price.toFixed(2).replace('.', ',')}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'destructive'}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedProduct(product); setIsViewModalOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedProduct(product); setIsEditModalOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setSelectedProduct(product); setIsDeleteAlertOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                     <PaginationItem key={i}>
                        <PaginationLink href="#" isActive={currentPage === i + 1} onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}>
                          {i + 1}
                        </PaginationLink>
                     </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </div>

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
                            className="w-full h-auto object-cover rounded-md aspect-square"
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
                 <div className="space-y-2">
                  <h4 className="font-semibold">Cores</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.colors && selectedProduct.colors.length > 0 ? (
                      selectedProduct.colors.map(color => (
                        <Badge key={color} variant="outline">{color}</Badge>
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
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
         <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
               <DialogTitle>Editar Produto: {selectedProduct?.name}</DialogTitle>
               <DialogDescription>
                  Faça as alterações necessárias e clique em salvar.
               </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
               <EditProductModal 
                  key={selectedProduct.id}
                  product={selectedProduct} 
                  onClose={handleCloseEditModal}
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
              Esta ação não pode ser desfeita. Isso removerá permanentemente o produto **{selectedProduct?.name}** da sua base de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteProduct(selectedProduct?.id || '')} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default EstoqueManagement;