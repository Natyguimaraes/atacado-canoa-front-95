import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
// NOVA LINHA
import { toast } from 'sonner';

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
  onAddToCart: (selectedSize: string) => void;
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
  className,
  onAddToCart,
}: ProductCardProps) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  // LINHA REMOVIDA
  // const { toast } = useToast();

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : discount;

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Erro de Validação', {
        description: 'Por favor, selecione um tamanho antes de adicionar ao carrinho.',
      });
      return;
    }
    onAddToCart(selectedSize);
  };

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

        {/* Quick Add to Cart */}
        <div className="absolute bottom-2 left-2 right-2 z-10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button className="w-full h-8 text-xs" onClick={handleAddToCart}>
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

          {/* Seletor de Tamanho */}
          <div className="space-y-2">
            <p className="text-xs font-medium">Tamanho:</p>
            <ToggleGroup 
              type="single" 
              value={selectedSize || ''} 
              onValueChange={setSelectedSize}
              className="justify-start flex-wrap gap-1"
            >
              {sizes.map((size) => (
                <ToggleGroupItem 
                  key={size} 
                  value={size}
                  className="h-8 w-8 p-0 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {size}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
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