import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  sizes: string[];
  colors?: string[];
  images?: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  description?: string;
  className?: string;
  onAddToCart?: (selectedSize: string) => void;
  showActions?: boolean;
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
  className,
  onAddToCart,
  showActions = true,
}: ProductCardProps) => {
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Erro de Validação', {
        description: 'Por favor, selecione um tamanho antes de adicionar ao carrinho.',
      });
      return;
    }
    if (onAddToCart) {
      onAddToCart(selectedSize);
    }
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
        className
      )}
      onClick={() => navigate(`/produto/${id}`)}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {isNew && (
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

        {showActions && (
          <div className="absolute bottom-2 left-2 right-2 z-10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button 
              className="w-full h-8 text-xs" 
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart();
              }}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Adicionar ao Carrinho
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {category}
          </p>

          <h3 className="font-medium line-clamp-2 text-sm">
            {name}
          </h3>

          {showActions && (
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
          )}

          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">
              R$ {price.toFixed(2).replace('.', ',')}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                R$ {originalPrice!.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;