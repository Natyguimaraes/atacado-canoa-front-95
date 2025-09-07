import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft, Package, Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Carrinho = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cart, removeFromCart, updateQuantity, clearCart, shipping, getTotal, getTotalWithShipping, loading, isCalculatingShipping } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [stockStatus, setStockStatus] = useState<{[key: string]: number}>({});

  useEffect(() => {
    checkStockStatus();
  }, [cart]);

  const checkStockStatus = async () => {
    if (cart.length === 0) return;
    
    try {
      const productIds = [...new Set(cart.map(item => item.product_id))];
      const { data: products, error } = await supabase
        .from('products')
        .select('id, stock')
        .in('id', productIds);

      if (error) throw error;

      const stockMap: {[key: string]: number} = {};
      products?.forEach(product => {
        stockMap[product.id] = product.stock;
      });
      
      setStockStatus(stockMap);
    } catch (error: any) {
      console.error('Erro ao verificar estoque:', error);
    }
  };

  const total = getTotal();
  const totalWithShipping = getTotalWithShipping();

  const handleUpdateQuantity = (productId: string, newQuantity: number, size?: string, color?: string) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    const productStock = stockStatus[productId];
    if (productStock && newQuantity > productStock) {
      toast.error(`Disponível apenas ${productStock} unidade(s) em estoque.`);
      return;
    }

    updateQuantity(productId, newQuantity, size, color);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Faça login para continuar com a compra');
      navigate('/login');
      return;
    }

    navigate('/pagamento', { state: { shipping } });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <CarrinhoSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (!cart || cart.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-background via-muted/20 to-background">
          <div className="container mx-auto px-4 py-20 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Seu carrinho está vazio</h2>
                <p className="text-muted-foreground">Que tal adicionar alguns produtos incríveis?</p>
              </div>
              <Button asChild size="lg" className="btn-gradient hover-scale">
                <Link to="/produtos">
                  <Package className="mr-2 h-4 w-4" />
                  Explorar Produtos
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Breadcrumb */}
          <div className="mb-6 sm:mb-8">
            <Button variant="ghost" asChild className="mb-4 hover-scale">
              <Link to="/" className="flex items-center gap-2 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Continuar Comprando</span>
                <span className="sm:hidden">Voltar</span>
              </Link>
            </Button>
            
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-gradient flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8" />
                Carrinho de Compras
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {cart.length} {cart.length === 1 ? 'item' : 'itens'} no seu carrinho
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Lista de Produtos */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => {
                const itemKey = `${item.product_id}-${item.size || ''}-${item.color || ''}`;
                const productStock = stockStatus[item.product_id];
                const isOutOfStock = productStock !== undefined && productStock < item.quantity;
                
                return (
                  <Card key={itemKey} className="card-elegant">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Imagem */}
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-lg overflow-hidden">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Informações do Produto */}
                        <div className="flex-grow space-y-2">
                          <div className="space-y-1">
                            <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{item.name}</h3>
                            {(item.size || item.color) && (
                              <div className="flex flex-wrap gap-2">
                                {item.size && (
                                  <Badge variant="outline" className="text-xs">
                                    Tamanho: {item.size}
                                  </Badge>
                                )}
                                {item.color && (
                                  <Badge variant="outline" className="text-xs">
                                    Cor: {item.color}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary text-lg">
                              R$ {item.price.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Subtotal: R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          {isOutOfStock && (
                            <Alert variant="destructive">
                              <AlertDescription className="text-xs">
                                Apenas {productStock} unidade(s) disponível(s) em estoque
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>

                        {/* Controles */}
                        <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-3">
                          {/* Quantidade */}
                          <div className="flex items-center border rounded-lg overflow-hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1, item.size, item.color)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <div className="w-12 h-8 flex items-center justify-center bg-muted text-sm font-medium">
                              {item.quantity}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1, item.size, item.color)}
                              disabled={productStock !== undefined && item.quantity >= productStock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Remover */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeFromCart(item.product_id, item.size, item.color)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Sidebar - Resumo */}
            <div className="lg:col-span-1 space-y-6">
              {/* Resumo do Pedido */}
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Resumo do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'itens'})</span>
                      <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                    </div>
                    
                    {isCalculatingShipping ? (
                      <div className="flex justify-between text-sm">
                        <span>Frete</span>
                        <span className="text-muted-foreground">Calculando...</span>
                      </div>
                    ) : shipping ? (
                      <div className="flex justify-between text-sm">
                        <span>Frete ({shipping.service}) - {shipping.cep}</span>
                        <span>R$ {shipping.price.toFixed(2).replace('.', ',')}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Frete</span>
                        <span>Configure seu CEP</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">
                      R$ {totalWithShipping.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Button 
                      size="lg" 
                      className="w-full btn-gradient hover-scale" 
                      onClick={handleCheckout}
                      disabled={isCalculatingShipping}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {isCalculatingShipping ? 'Calculando frete...' : 'Finalizar Compra'}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={clearCart}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpar Carrinho
                    </Button>
                  </div>

                  {!shipping && !isCalculatingShipping && (
                    <Alert>
                      <Package className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Configure seu CEP nas configurações para calcular o frete automaticamente
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const CarrinhoSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="space-y-4 mb-8">
      <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
      <div className="h-4 bg-muted rounded w-1/6 animate-pulse" />
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-muted rounded animate-pulse" />
                <div className="flex-grow space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                  <div className="h-5 bg-muted rounded w-1/4 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
              </div>
            </div>
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default Carrinho;