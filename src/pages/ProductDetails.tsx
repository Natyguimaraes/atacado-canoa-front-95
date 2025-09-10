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
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Minus, Plus, Loader2, Heart, Share2, ShoppingCart, Star } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import ProductShippingCalculator from '@/components/ProductShippingCalculator';
import ProductReviews from '@/components/ProductReviews';
import { useProductReviews } from '@/hooks/useProductReviews';

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
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { addToCart } = useCart();
  
  // Hook para estatísticas das avaliações
  const { averageRating, totalReviews, isLoading: reviewsLoading } = useProductReviews(id || '');

  useEffect(() => {
    const fetchProductAndSuggestions = async () => {
      if (!id) return;

      setIsLoading(true);
      setIsSuggestionsLoading(true);
      setProduct(null);
      setSuggestions([]);
      
      try {
        // Busca o produto principal
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;

        const mainProduct = data as unknown as Product;
        setProduct(mainProduct);
        
        // Busca as sugestões da mesma categoria
        const { data: suggestedData, error: suggestionError } = await supabase
          .from('products')
          .select('*')
          .eq('category', mainProduct.category)
          .neq('id', mainProduct.id) // Garante que o produto atual não apareça nas sugestões
          .limit(4);

        if (suggestionError) {
          console.error('Erro ao buscar sugestões:', suggestionError);
        } else {
          setSuggestions(suggestedData as unknown as Product[]);
        }

      } catch (error: any) {
        toast.error('Erro ao buscar o produto.', { description: error.message });
      } finally {
        setIsLoading(false);
        setIsSuggestionsLoading(false);
      }
    };
    
    fetchProductAndSuggestions();
  }, [id]);

  // Verificar se o usuário está logado e se o produto está nos favoritos
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user && id) {
        const { data } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', id)
          .single();
        
        setIsFavorite(!!data);
      }
    };
    
    getUser();
  }, [id]);

  const handleFavoriteClick = async () => {
    if (!user) {
      toast.error('Faça login para adicionar produtos aos favoritos');
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', id);
        
        setIsFavorite(false);
        toast.success('Produto removido dos favoritos');
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: id
          });
        
        setIsFavorite(true);
        toast.success('Produto adicionado aos favoritos');
      }
    } catch (error) {
      toast.error('Erro ao atualizar os favoritos');
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Por favor, selecione um tamanho.');
      return;
    }
    if (product.colors && product.colors.length > 0 && !selectedColor) {
      toast.error('Por favor, selecione uma cor.');
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
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto text-center py-20">
            <h2 className="text-2xl font-bold">Produto não encontrado</h2>
            <Button asChild className="mt-4">
            <Link to="/produtos">Voltar aos produtos</Link>
            </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Breadcrumb simplificado */}
          <nav className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <Link to="/produtos" className="hover:text-foreground transition-colors">Produtos</Link>
              <span>/</span>
              <span className="text-foreground">{product.name}</span>
            </div>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-12">
            {/* Galeria de Imagens - mais clean */}
            <div className="space-y-4">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
                <Carousel className="w-full h-full">
                  <CarouselContent className="h-full">
                    {product.images && product.images.length > 0 ? (
                      product.images.map((image, index) => (
                        <CarouselItem key={index} className="h-full">
                          <img 
                            src={image} 
                            alt={`${product.name} ${index + 1}`} 
                            className="w-full h-full object-cover" 
                          />
                        </CarouselItem>
                      ))
                    ) : (
                      <CarouselItem className="h-full">
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground">Sem imagem</span>
                        </div>
                      </CarouselItem>
                    )}
                  </CarouselContent>
                  {product.images && product.images.length > 1 && (
                    <>
                      <CarouselPrevious className="left-4" />
                      <CarouselNext className="right-4" />
                    </>
                  )}
                </Carousel>
              </div>
            </div>

            {/* Informações do Produto - layout mais clean */}
            <div className="space-y-6">
              {/* Header do produto */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="w-fit">
                    {product.category}
                  </Badge>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9"
                      onClick={handleFavoriteClick}
                      aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Heart className={`h-4 w-4 transition-colors ${
                        isFavorite 
                          ? 'fill-red-500 text-red-500' 
                          : 'text-gray-600 hover:text-red-500'
                      }`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                  {product.name}
                </h1>
                
                {/* Avaliações inline */}
                {reviewsLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  </div>
                ) : totalReviews > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${
                            i < Math.round(averageRating) ? 'fill-current' : ''
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {averageRating.toFixed(1)} • {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Seja o primeiro a avaliar
                  </span>
                )}

                <p className="text-base text-muted-foreground leading-relaxed">
                  {product.description || "Produto de alta qualidade com design moderno e materiais premium."}
                </p>
              </div>
              
              {/* Preço destacado */}
              <div className="space-y-3 py-4 border-y">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-primary">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </span>
                  {product.original_price && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">
                        R$ {product.original_price.toFixed(2).replace('.', ',')}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                      </Badge>
                    </>
                  )}
                </div>
                
                {/* Status do estoque */}
                <div>
                  {product.stock === 0 ? (
                    <Badge variant="destructive">Esgotado</Badge>
                  ) : product.stock <= 3 ? (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Últimas {product.stock} unidades
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Em estoque
                    </Badge>
                  )}
                </div>
              </div>

              {/* Opções do produto - mais clean */}
              <div className="space-y-6">
                {product.sizes && product.sizes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Tamanho</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <Button 
                          key={size} 
                          variant={selectedSize === size ? 'default' : 'outline'} 
                          onClick={() => setSelectedSize(size)}
                          className="min-w-[50px] h-10"
                          size="sm"
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {product.colors && product.colors.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Cor</h3>
                    <div className="flex flex-wrap gap-3">
                      {product.colors.map((color) => {
                        const getColorStyle = (colorName: string) => {
                          const colorMap: { [key: string]: string } = {
                            'branco': '#FFFFFF',
                            'preto': '#000000',
                            'azul': '#3B82F6',
                            'vermelho': '#EF4444',
                            'verde': '#10B981',
                            'amarelo': '#F59E0B',
                            'rosa': '#EC4899',
                            'roxo': '#8B5CF6',
                            'cinza': '#6B7280',
                            'marrom': '#92400E',
                            'laranja': '#F97316',
                            'bege': '#F5F5DC',
                          };
                          return colorMap[colorName.toLowerCase()] || colorName.toLowerCase();
                        };

                        return (
                          <button
                            key={color}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                              selectedColor === color 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedColor(color)}
                          >
                            <div 
                              className="w-5 h-5 rounded-full border border-muted-foreground/20"
                              style={{ 
                                backgroundColor: getColorStyle(color),
                                border: color.toLowerCase() === 'branco' ? '1px solid #E5E7EB' : 'none'
                              }}
                            />
                            <span className="text-sm capitalize">{color}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantidade e compra - design mais clean */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <label className="text-sm font-medium mr-3">Qtd:</label>
                      <div className="flex items-center border rounded-lg">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                          disabled={product.stock === 0}
                          className="h-10 w-10"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="w-16 h-10 flex items-center justify-center text-center font-medium">
                          {product.stock === 0 ? 0 : quantity}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} 
                          disabled={product.stock === 0}
                          className="h-10 w-10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="w-full h-12 text-base font-medium" 
                    onClick={handleAddToCart} 
                    disabled={isAdding || product.stock === 0}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        Adicionando...
                      </>
                    ) : product.stock === 0 ? (
                      'Produto Esgotado'
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Adicionar ao Carrinho • R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Seções adicionais em cards separados */}
          <div className="space-y-8">
            {/* Calculadora de Frete */}
            <ProductShippingCalculator 
              product={product} 
              quantity={quantity} 
            />

            {/* Sistema de Avaliações */}
            <ProductReviews productId={product.id} />

            {/* Produtos Relacionados - só se houver */}
            {(isSuggestionsLoading || suggestions.length > 0) && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Você também pode gostar</h2>
                  <p className="text-muted-foreground">Produtos selecionados para você</p>
                </div>
                
                {isSuggestionsLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {suggestions.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const ProductDetailsSkeleton = () => (
  <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
    <Header />
    <main className="flex-grow">
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-6 w-1/3 mb-8" />
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-16">
          <Card className="card-elegant overflow-hidden">
            <CardContent className="p-0">
              <Skeleton className="aspect-square w-full" />
            </CardContent>
          </Card>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
            
            <Card className="card-elegant p-6">
              <Skeleton className="h-16 w-1/2 mb-4" />
              <Skeleton className="h-8 w-1/4" />
            </Card>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-6 w-20" />
                <div className="flex gap-3">
                  <Skeleton className="h-12 w-12" />
                  <Skeleton className="h-12 w-12" />
                  <Skeleton className="h-12 w-12" />
                </div>
              </div>
              
              <Card className="card-elegant p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-12 w-32" />
                  </div>
                  <Skeleton className="h-14 w-full" />
                </div>
              </Card>
            </div>
          </div>
        </div>
        
        <Card className="card-elegant p-8">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
    <Footer />
  </div>
);

export default ProductDetails;