import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images?: string[];
  is_new?: boolean;
  stock: number;
  category: string;
}

interface Favorite {
  id: string;
  product_id: string;
  products: Product;
}

const Favoritos = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('favorites')
          .select(`
            id,
            product_id,
            products:product_id (
              id,
              name,
              price,
              original_price,
              images,
              is_new,
              stock,
              category
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setFavorites(data || []);
      } catch (error: any) {
        toast({
          title: "Erro",
          description: "Erro ao carregar favoritos",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (productId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      setFavorites(favorites.filter(fav => fav.product_id !== productId));
      toast({
        title: "Sucesso",
        description: "Produto removido dos favoritos"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover produto dos favoritos",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Acesse sua conta</h1>
            <p className="text-muted-foreground mb-6">
              Faça login para ver seus produtos favoritos
            </p>
            <Button asChild>
              <Link to="/login">Fazer Login</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meus Favoritos</h1>
          <p className="text-muted-foreground">
            Produtos que você salvou para comprar depois
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Nenhum favorito ainda</h2>
            <p className="text-muted-foreground mb-6">
              Explore nossos produtos e adicione seus favoritos aqui
            </p>
            <Button asChild>
              <Link to="/produtos">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Ver Produtos
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite) => (
              <div key={favorite.id} className="relative">
                <ProductCard product={favorite.products} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-white/80 hover:bg-white rounded-full"
                  onClick={() => handleRemoveFavorite(favorite.product_id)}
                  aria-label="Remover dos favoritos"
                >
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Favoritos;