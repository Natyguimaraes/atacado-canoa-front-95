import { Heart, ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  sizes: string[];
  isNew?: boolean;
  discount?: number;
  className?: string;
}

const ProductCard = ({
  id,
  name,
  price,
  originalPrice,
  image,
  category,
  sizes,
  isNew = false,
  discount,
  className
}: ProductCardProps) => {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : discount;

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      className
    )}>
      <div className="relative aspect-[4/5] overflow-hidden">
        {/* Product Image */}
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {isNew && (
            <Badge variant="secondary" className="bg-success text-success-foreground">
              Novo
            </Badge>
          )}
          {discountPercentage && discountPercentage > 0 && (
            <Badge variant="destructive">
              -{discountPercentage}%
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80 backdrop-blur">
            <Heart className="h-3 w-3" />
            <span className="sr-only">Adicionar aos favoritos</span>
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80 backdrop-blur">
            <Eye className="h-3 w-3" />
            <span className="sr-only">Visualização rápida</span>
          </Button>
        </div>

        {/* Quick Add to Cart */}
        <div className="absolute bottom-2 left-2 right-2 z-10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button className="w-full h-8 text-xs">
            <ShoppingCart className="h-3 w-3 mr-1" />
            Adicionar ao Carrinho
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Category */}
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {category}
          </p>

          {/* Product Name */}
          <h3 className="font-medium line-clamp-2 text-sm">
            {name}
          </h3>

          {/* Sizes */}
          <div className="flex flex-wrap gap-1">
            {sizes.slice(0, 4).map((size) => (
              <Badge key={size} variant="outline" className="text-xs px-1 py-0">
                {size}
              </Badge>
            ))}
            {sizes.length > 4 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{sizes.length - 4}
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">
              R$ {price.toFixed(2).replace('.', ',')}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                R$ {originalPrice.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;