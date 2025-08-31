import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Heart, Star, Shield, Truck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';

// Importa as imagens padrão para o fallback
import babyClothes from '@/assets/baby-clothes.jpg';
import kidsClothes from '@/assets/kids-clothes.jpg';
import adultClothes from '@/assets/adult-clothes.jpg';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  sizes: string[];
  colors: string[];
  isNew: boolean;
  isFeatured: boolean;
  description: string;
  brand?: string;
  rating?: number;
  stock?: number;
}

// Mapeamento de imagens padrão por categoria para o fallback
const categoryImages = {
  bebe: babyClothes,
  infantil: kidsClothes,
  adulto: adultClothes,
};

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchRelatedProducts();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        navigate('/produtos');
        return;
      }

      const transformedProduct: Product = {
        id: data.id,
        name: data.name,
        price: Number(data.price),
        originalPrice: data.original_price ? Number(data.original_price) : undefined,
        image: data.images?.[0] || categoryImages[data.category as keyof typeof categoryImages],
        images: data.images || [],
        category: data.category,
        sizes: data.sizes || [],
        colors: data.colors || [],
        isNew: data.is_new,
        isFeatured: data.is_featured,
        description: data.description || '',
        brand: undefined,
        rating: 5,
        stock: 10,
      };

      setProduct(transformedProduct);
      if (transformedProduct.sizes.length > 0) {
        setSelectedSize(transformedProduct.sizes[0]);
      }
      if (transformedProduct.colors.length > 0) {
        setSelectedColor(transformedProduct.colors[0]);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      navigate('/produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .neq('id', id)
        .limit(4);

      if (error) {
        console.error('Error fetching related products:', error);
        return;
      }

      const transformedProducts: Product[] = data?.map(product => ({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        originalPrice: product.original_price ? Number(product.original_price) : undefined,
        image: product.images?.[0] || categoryImages[product.category as keyof typeof categoryImages],
        images: product.images || [],
        category: product.category,
        sizes: product.sizes || [],
        colors: product.colors || [],
        isNew: product.is_new,
        isFeatured: product.is_featured,
        description: product.description || '',
      })) || [];

      setRelatedProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login necessário',
        description: 'Você precisa estar logado para adicionar itens ao carrinho.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedSize && product?.sizes.length > 0) {
      toast({
        title: 'Selecione um tamanho',
        description: 'Por favor, selecione um tamanho antes de adicionar ao carrinho.',
        variant: 'destructive',
      });
      return;
    }

    if (product) {
      const success = addToCart(product, selectedSize);
      if (success) {
        toast({
          title: 'Produto adicionado!',
          description: `${product.name} foi adicionado ao seu carrinho.`,
        });
      }
    }
  };

  const hasDiscount = product?.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="w-full aspect-square" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
            <Button onClick={() => navigate('/produtos')}>
              Voltar aos produtos
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        
        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
              <img
                src={product.images?.[selectedImageIndex] || product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                      selectedImageIndex === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex gap-2">
              {product.isNew && (
                <Badge variant="secondary" className="bg-success text-success-foreground">
                  Novo
                </Badge>
              )}
              {discountPercentage > 0 && (
                <Badge variant="destructive">
                  -{discountPercentage}%
                </Badge>
              )}
            </div>

            {/* Product Name */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-muted-foreground">Marca: {product.brand}</p>
              )}
            </div>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < product.rating! ? 'text-yellow-400 fill-current' : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">({product.rating}/5)</span>
              </div>
            )}

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary">
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    R$ {product.originalPrice!.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                ou 12x de R$ {(product.price / 12).toFixed(2).replace('.', ',')} sem juros
              </p>
            </div>

            {/* Size Selection */}
            {product.sizes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Tamanho</h3>
                <ToggleGroup 
                  type="single" 
                  value={selectedSize} 
                  onValueChange={setSelectedSize}
                  className="justify-start flex-wrap gap-2"
                >
                  {product.sizes.map((size) => (
                    <ToggleGroupItem 
                      key={size} 
                      value={size}
                      className="h-10 min-w-10 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {size}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}

            {/* Color Selection */}
            {product.colors.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Cor</h3>
                <ToggleGroup 
                  type="single" 
                  value={selectedColor} 
                  onValueChange={setSelectedColor}
                  className="justify-start flex-wrap gap-2"
                >
                  {product.colors.map((color) => (
                    <ToggleGroupItem 
                      key={color} 
                      value={color}
                      className="h-10 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {color}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}

            {/* Stock Info */}
            {product.stock !== undefined && (
              <p className={`text-sm ${product.stock > 0 ? 'text-success' : 'text-destructive'}`}>
                {product.stock > 0 ? `${product.stock} em estoque` : 'Fora de estoque'}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Adicionar ao Carrinho
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
              </Button>
            </div>

            {/* Benefits */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <span className="text-sm">Frete grátis para compras acima de R$ 99</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RotateCcw className="h-5 w-5 text-primary" />
                    <span className="text-sm">Troca grátis em até 30 dias</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-sm">Compra protegida</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Description */}
        {product.description && (
          <Card className="mb-12">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Descrição do Produto</h2>
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Produtos Relacionados</h2>
              <Button variant="outline" onClick={() => navigate('/produtos')}>
                Ver todos
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  id={relatedProduct.id}
                  name={relatedProduct.name}
                  price={relatedProduct.price}
                  originalPrice={relatedProduct.originalPrice}
                  image={relatedProduct.image}
                  category={relatedProduct.category}
                  sizes={relatedProduct.sizes}
                  isNew={relatedProduct.isNew}
                  isFeatured={relatedProduct.isFeatured}
                  colors={relatedProduct.colors}
                  // NOVO: Adicionado showActions={false} para remover o botão e o seletor
                  showActions={false}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetails;