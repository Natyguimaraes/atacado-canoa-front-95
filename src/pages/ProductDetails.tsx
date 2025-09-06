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
  const { addToCart } = useCart();

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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb className="mb-8 animate-fade-in">
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/produtos">Produtos</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>{product.name}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-16">
            {/* Galeria de Imagens */}
            <div className="animate-fade-in">
              <Card className="card-elegant overflow-hidden">
                <CardContent className="p-0">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {product.images && product.images.length > 0 ? (
                        product.images.map((image, index) => (
                          <CarouselItem key={index}>
                            <div className="aspect-square w-full overflow-hidden">
                              <img 
                                src={image} 
                                alt={`${product.name} ${index + 1}`} 
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                              />
                            </div>
                          </CarouselItem>
                        ))
                      ) : (
                        <CarouselItem>
                          <div className="aspect-square w-full bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground">Sem imagem</span>
                          </div>
                        </CarouselItem>
                      )}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </Carousel>
                </CardContent>
              </Card>
            </div>

            {/* Informações do Produto */}
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-sm px-4 py-1 bg-gradient-primary text-white">
                    {product.category}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="hover-scale">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="hover-scale">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <h1 className="text-4xl lg:text-5xl font-bold font-display text-gradient leading-tight">
                  {product.name}
                </h1>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-warning">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">(148 avaliações)</span>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {product.description || "Produto de alta qualidade com design moderno e materiais premium."}
                </p>
              </div>
              
              {/* Preço */}
              <Card className="card-elegant p-6">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-4">
                    <span className="text-4xl font-bold text-primary">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </span>
                    {product.original_price && (
                      <div className="flex flex-col">
                        <span className="text-lg text-muted-foreground line-through">
                          R$ {product.original_price.toFixed(2).replace('.', ',')}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2">
                    {product.stock === 0 ? (
                      <Badge variant="destructive" className="text-base px-4 py-2">
                        Esgotado
                      </Badge>
                    ) : product.stock <= 3 ? (
                      <Badge className="bg-warning text-warning-foreground text-base px-4 py-2 animate-bounce-subtle">
                        🔥 Últimas {product.stock} unidades!
                      </Badge>
                    ) : (
                      <p className="text-success font-semibold text-lg">
                        ✅ Em estoque ({product.stock} disponíveis)
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Opções do Produto */}
              <div className="space-y-6">
                {product.sizes && product.sizes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Tamanho:</h3>
                    <div className="flex flex-wrap gap-3">
                      {product.sizes.map((size) => (
                        <Button 
                          key={size} 
                          variant={selectedSize === size ? 'default' : 'outline'} 
                          onClick={() => setSelectedSize(size)}
                          className="min-w-[50px] h-12 hover-scale"
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {product.colors && product.colors.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Cor:</h3>
                    <div className="flex flex-wrap gap-3">
                      {product.colors.map((color) => (
                        <Button 
                          key={color} 
                          variant={selectedColor === color ? 'default' : 'outline'} 
                          className="h-12 w-12 rounded-full p-0 border-2 hover-scale overflow-hidden" 
                          style={{ backgroundColor: color.toLowerCase() }} 
                          aria-label={color}
                          onClick={() => setSelectedColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantidade e Adicionar ao Carrinho */}
                <Card className="card-elegant p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="font-semibold text-lg">Quantidade:</label>
                      <div className="flex items-center border-2 rounded-xl overflow-hidden">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                          disabled={product.stock === 0}
                          className="h-12 w-12 hover:bg-muted"
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                        <div className="w-16 h-12 flex items-center justify-center bg-muted font-bold text-lg">
                          {product.stock === 0 ? 0 : quantity}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} 
                          disabled={product.stock === 0}
                          className="h-12 w-12 hover:bg-muted"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      size="lg" 
                      className="w-full h-14 text-lg font-semibold btn-gradient hover-scale" 
                      onClick={handleAddToCart} 
                      disabled={isAdding || product.stock === 0}
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="mr-3 h-5 w-5 animate-spin" /> 
                          Adicionando...
                        </>
                      ) : product.stock === 0 ? (
                        'Produto Esgotado'
                      ) : (
                        <>
                          <ShoppingCart className="mr-3 h-5 w-5" />
                          Adicionar ao Carrinho - R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
          
          {/* Seção de Produtos Relacionados */}
          <section className="animate-fade-in">
            <Card className="card-elegant p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold font-display text-gradient mb-2">
                  Você também pode gostar
                </h2>
                <p className="text-muted-foreground">Produtos selecionados especialmente para você</p>
              </div>
              
              {isSuggestionsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {suggestions.map((p, index) => (
                    <div key={p.id} className="animate-fade-in hover-scale" style={{ animationDelay: `${index * 0.1}s` }}>
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">Nenhum produto relacionado encontrado.</p>
                </div>
              )}
            </Card>
          </section>
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