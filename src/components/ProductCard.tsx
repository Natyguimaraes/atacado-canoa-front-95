import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
  
  // Se o produto não existir ou estiver a carregar, mostra um esqueleto.
  if (!product) {
    return <ProductCardSkeleton />;
  }

  const hasDiscount = product.original_price && product.original_price > product.price;
  const isOutOfStock = product.stock === 0;
  const images = product.images && product.images.length > 0 ? product.images : ['/placeholder.svg'];
  const hasMultipleImages = images.length > 1;

  const handleImageIndicatorClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(index);
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
            
            {/* Imagem principal */}
            <img
              src={images[currentImageIndex]}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${isOutOfStock ? 'grayscale' : ''}`}
            />
            
            {/* Indicadores de imagem */}
            {hasMultipleImages && (
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="flex gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => handleImageIndicatorClick(index, e)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentImageIndex 
                          ? 'bg-white scale-125' 
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4">
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