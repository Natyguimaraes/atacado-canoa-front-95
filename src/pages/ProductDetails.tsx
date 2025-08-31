import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Minus, Plus, Loader2 } from 'lucide-react';

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
}

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        
        // --- CORREÇÃO DE TIPAGEM AQUI ---
        setProduct(data as unknown as Product);

      } catch (error: any) {
        toast.error('Erro ao buscar o produto.', { description: error.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Por favor, selecione um tamanho.');
      return;
    }
    if (quantity > product.stock) {
      toast.error('Quantidade indisponível em estoque.');
      return;
    }
    setIsAdding(true);
    setTimeout(() => {
      addToCart(product, quantity, selectedSize || undefined, selectedColor || undefined);
      setIsAdding(false);
    }, 500);
  };

  if (isLoading) return <ProductDetailsSkeleton />;
  if (!product) {
      return (
      <div className="container mx-auto text-center py-20">
        <h2 className="text-2xl font-bold">Produto não encontrado</h2>
        <Button asChild className="mt-4">
          <Link to="/produtos">Voltar aos produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb className="mb-8">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/produtos">Produtos</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{product.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <Carousel className="w-full">
          <CarouselContent>
            {product.images && product.images.length > 0 ? (
              product.images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="aspect-square w-full overflow-hidden rounded-lg">
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                </CarouselItem>
              ))
            ) : (
              <CarouselItem>
                <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center">
                  <span>Sem imagem</span>
                </div>
              </CarouselItem>
            )}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">{product.category}</Badge>
            <h1 className="text-3xl lg:text-4xl font-bold font-display">{product.name}</h1>
            <p className="text-muted-foreground mt-2">{product.description || "Descrição não disponível."}</p>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-bold text-primary">R$ {product.price.toFixed(2).replace('.', ',')}</span>
            {product.original_price && (<span className="text-lg text-muted-foreground line-through">R$ {product.original_price.toFixed(2).replace('.', ',')}</span>)}
          </div>
          
          <div className="pt-2">
            {product.stock === 0 ? (
              <Badge variant="destructive" className="text-base px-3 py-1">Esgotado</Badge>
            ) : product.stock <= 3 ? (
              <Badge variant="secondary" className="bg-orange-500 text-white text-base px-3 py-1">Últimas unidades!</Badge>
            ) : (
              <p className="text-sm text-green-600 font-semibold">Em estoque ({product.stock} disponíveis)</p>
            )}
          </div>

          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Tamanho:</h3>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <Button key={size} variant={selectedSize === size ? 'default' : 'outline'} onClick={() => setSelectedSize(size)}>{size}</Button>
                ))}
              </div>
            </div>
          )}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Cor:</h3>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                   <Button key={color} variant={selectedColor === color ? 'default' : 'outline'} onClick={() => setSelectedColor(color)} className="h-8 w-8 rounded-full p-0 border-2" style={{ backgroundColor: color.toLowerCase() }} aria-label={color}/>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-md">
              <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={product.stock === 0}><Minus className="h-4 w-4" /></Button>
              <span className="w-12 text-center">{product.stock === 0 ? 0 : quantity}</span>
              <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} disabled={product.stock === 0}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button size="lg" className="w-full" onClick={handleAddToCart} disabled={isAdding || product.stock === 0}>
              {isAdding ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adicionando...</>) : (product.stock === 0 ? 'Esgotado' : 'Adicionar ao Carrinho')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductDetailsSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
    <Skeleton className="h-6 w-1/3 mb-8" />
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="space-y-6">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/5" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-12" />
            <Skeleton className="h-10 w-12" />
            <Skeleton className="h-10 w-12" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  </div>
);

export default ProductDetails;