import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images?: string[];
  is_new?: boolean;
  stock: number;
}

interface ProductCardProps {
  product?: Product; // Tornamos a prop opcional para o loading
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Se o produto não existir ou estiver a carregar, mostra um esqueleto.
  if (!product) {
    return <ProductCardSkeleton />;
  }

  const hasDiscount = product.original_price && product.original_price > product.price;
  const isOutOfStock = product.stock === 0;
  const images = product.images && product.images.length > 0 ? product.images : ['/placeholder.svg'];
  const hasMultipleImages = images.length > 1;

  // Verificar se o usuário está logado e se o produto está nos favoritos
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user && product) {
        const { data } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .single();
        
        setIsFavorite(!!data);
      }
    };
    
    getUser();
  }, [product]);

  const handleImageIndicatorClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para adicionar produtos aos favoritos",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
        
        setIsFavorite(false);
        toast({
          title: "Removido dos favoritos",
          description: "Produto removido da sua lista de favoritos"
        });
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: product.id
          });
        
        setIsFavorite(true);
        toast({
          title: "Adicionado aos favoritos",
          description: "Produto adicionado à sua lista de favoritos"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar os favoritos",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="overflow-hidden group transition-all hover:shadow-lg">
      <Link to={`/produto/${product.id}`} className="block">
        <CardContent className="p-0">
          <div className="aspect-square w-full overflow-hidden relative">
            <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2">
              {product.is_new && !isOutOfStock && <Badge>Novo</Badge>}
              {hasDiscount && !isOutOfStock && <Badge variant="destructive">Promoção</Badge>}
              {isOutOfStock && <Badge variant="destructive" className="text-base">Esgotado</Badge>}
            </div>
            
            {/* Botão de favoritos */}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-3 right-3 z-10 p-2 bg-white/80 hover:bg-white rounded-full transition-all duration-200 shadow-sm"
              aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Heart 
                size={20} 
                className={`transition-colors duration-200 ${
                  isFavorite 
                    ? 'fill-red-500 text-red-500' 
                    : 'text-gray-600 hover:text-red-500'
                }`}
              />
            </button>
            
            {/* Imagem principal */}
            <img
              src={images[currentImageIndex]}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${isOutOfStock ? 'grayscale' : ''}`}
            />
          </div>
          
          <div className="p-4">
            {/* Miniaturas das imagens */}
            {hasMultipleImages && (
              <div className="flex justify-start gap-1.5 mb-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleImageIndicatorClick(index, e)}
                    className={`w-10 h-10 rounded border-2 transition-all duration-200 overflow-hidden ${
                      index === currentImageIndex 
                        ? 'border-primary scale-110' 
                        : 'border-gray-300 hover:border-primary/50'
                    }`}
                    aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} - imagem ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            
            <h3 className="font-semibold text-lg truncate">{product.name}</h3>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-xl font-bold text-primary">R$ {product.price.toFixed(2).replace('.', ',')}</p>
              {hasDiscount && (
                <p className="text-sm text-muted-foreground line-through">
                  R$ {product.original_price?.toFixed(2).replace('.', ',')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full" disabled={isOutOfStock}>
          <Link to={`/produto/${product.id}`}>
            {isOutOfStock ? 'Esgotado' : 'Ver Detalhes'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

// Componente de Skeleton para o ProductCard
export const ProductCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-7 w-1/2" />
      </div>
    </CardContent>
    <CardFooter className="p-4 pt-0">
      <Skeleton className="h-10 w-full" />
    </CardFooter>
  </Card>
);


export default ProductCard;