import { useState, useEffect } from 'react';
import { Search, Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import babyClothes from '@/assets/baby-clothes.jpg';
import kidsClothes from '@/assets/kids-clothes.jpg';
import adultClothes from '@/assets/adult-clothes.jpg';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  sizes: string[];
  colors: string[];
  isNew: boolean;
  isFeatured: boolean;
  description?: string;
}

const Produtos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const categoryImages = {
    bebe: babyClothes,
    infantil: kidsClothes,
    adulto: adultClothes,
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      const transformedProducts: Product[] = data?.map(product => ({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        originalPrice: product.original_price ? Number(product.original_price) : undefined,
        image: product.images[0] || categoryImages[product.category as keyof typeof categoryImages],
        category: product.category,
        sizes: product.sizes,
        colors: product.colors,
        isNew: product.is_new,
        isFeatured: product.is_featured,
        description: product.description,
      })) || [];

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // CORRIGIDO: Recarrega os dados ao entrar na página
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    if (category !== 'all') {
      filtered = filtered.filter(product => product.category === category);
    }

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      ); 
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered);
  }, [searchTerm, category, sortBy, products]);

  const categories = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'bebe', label: 'Bebê' },
    { value: 'infantil', label: 'Infantil' },
    { value: 'adulto', label: 'Adulto' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Nome A-Z' },
    { value: 'price-low', label: 'Menor Preço' },
    { value: 'price-high', label: 'Maior Preço' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-4">
            Nossos Produtos
          </h1>
          <p className="text-lg text-muted-foreground">
            Encontre roupas para toda a família com qualidade e preços incríveis
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
            
            {category !== 'all' && (
              <Badge variant="outline" className="flex items-center gap-2">
                {categories.find(cat => cat.value === category)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setCategory('all')}
                >
                  ×
                </Button>
              </Badge>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-muted rounded-lg aspect-[4/5] mb-4"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Products Grid */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    image={product.image}
                    category={product.category}
                    sizes={product.sizes}
                    isNew={product.isNew}
                    isFeatured={product.isFeatured}
                    colors={product.colors}
                    showActions={false}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative w-full sm:w-48 aspect-square sm:aspect-[4/5]">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        {product.isNew && (
                          <Badge className="absolute top-2 left-2 bg-success text-success-foreground">
                            Novo
                          </Badge>
                        )}
                      </div>
                      <CardContent className="flex-1 p-6">
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              {categories.find(cat => cat.value === product.category)?.label}
                            </p>
                            <h3 className="font-medium text-lg mb-2">{product.name}</h3>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg text-primary">
                                R$ {product.price.toFixed(2).replace('.', ',')}
                              </span>
                              {product.originalPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                  R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                                </span>
                              )}
                            </div>
                            <Button asChild>
                              <Link to={`/produto/${product.id}`}>
                                Ver Detalhes
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            {/* No Results */}
            {filteredProducts.length === 0 && (
              <Card className="p-12 text-center">
                <div className="text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium text-lg mb-2">Nenhum produto encontrado</h3>
                  <p>Tente ajustar os filtros ou buscar por outros termos.</p>
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Produtos;