import { Link } from 'react-router-dom';
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
  // --- INÍCIO DA CORREÇÃO ---
  // Se o produto não existir ou estiver a carregar, mostra um esqueleto.
  if (!product) {
    return <ProductCardSkeleton />;
  }
  // --- FIM DA CORREÇÃO ---

  const hasDiscount = product.original_price && product.original_price > product.price;
  const isOutOfStock = product.stock === 0;

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
            <img
              src={product.images?.[0] || '/placeholder.svg'}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${isOutOfStock ? 'grayscale' : ''}`}
            />
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