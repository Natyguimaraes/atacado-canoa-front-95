import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, Frown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Carrinho = () => {
  const { cart, removeFromCart, updateQuantity, loading, clearCart } = useCart();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Inicializar todos os itens como selecionados quando o carrinho carrega
  useEffect(() => {
    if (cart && cart.length > 0) {
      const allItems = new Set(cart.map(item => `${item.product_id}-${item.size}-${item.color}`));
      setSelectedItems(allItems);
    }
  }, [cart]);

  const toggleItemSelection = (itemKey: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.add(itemKey);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === cart.length) {
      setSelectedItems(new Set());
    } else {
      const allItems = new Set(cart.map(item => `${item.product_id}-${item.size}-${item.color}`));
      setSelectedItems(allItems);
    }
  };

  const renderCartContent = () => {
    if (loading) {
      return <CarrinhoSkeleton />;
    }
  
    if (!cart || cart.length === 0) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <Frown className="mx-auto h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4" />
          <h1 className="text-xl md:text-2xl font-bold mb-2">O seu carrinho está vazio</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Parece que você ainda não adicionou nenhum produto.
          </p>
          <Button asChild size="lg" className="h-11 md:h-12">
            <Link to="/produtos">Começar a comprar</Link>
          </Button>
        </div>
      );
    }

    const selectedCartItems = cart.filter(item => 
      selectedItems.has(`${item.product_id}-${item.size}-${item.color}`)
    );
    const subtotal = selectedCartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const hasSelectedItems = selectedItems.size > 0;

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 font-display">Meu Carrinho</h1>
        
        {/* Controle de Seleção Global */}
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedItems.size === cart.length}
                onCheckedChange={toggleSelectAll}
                className="h-5 w-5"
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                {selectedItems.size === cart.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </label>
            </div>
            <span className="text-xs md:text-sm text-muted-foreground">
              {selectedItems.size} de {cart.length} itens selecionados
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          <div className="xl:col-span-2 space-y-3 md:space-y-4">
            {cart.map((item) => {
              const itemKey = `${item.product_id}-${item.size}-${item.color}`;
              const isSelected = selectedItems.has(itemKey);
              
              return (
                <Card 
                  key={itemKey} 
                  className={`p-3 md:p-4 transition-all ${
                    isSelected ? 'ring-2 ring-primary/20 bg-primary/5' : 'opacity-60'
                  }`}
                >
                  {/* Layout Mobile: Vertical */}
                  <div className="flex flex-col sm:hidden gap-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItemSelection(itemKey)}
                        className="mt-1 h-5 w-5"
                      />
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                      <div className="flex-grow min-w-0">
                        <h2 className="font-semibold text-sm">{item.name}</h2>
                        <p className="text-xs text-muted-foreground">
                          {item.size && `Tamanho: ${item.size}`}
                          {item.color && ` / Cor: ${item.color}`}
                        </p>
                        <p className="font-bold text-sm mt-1">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border rounded-md">
                        <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.size, item.color)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.size, item.color)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.product_id, item.size, item.color)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Layout Desktop: Horizontal */}
                  <div className="hidden sm:flex items-center gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItemSelection(itemKey)}
                      className="h-5 w-5"
                    />
                    <img
                      src={item.image || '/placeholder.svg'}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-md"
                    />
                    <div className="flex-grow">
                      <h2 className="font-semibold">{item.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {item.size && `Tamanho: ${item.size}`}
                        {item.color && ` / Cor: ${item.color}`}
                      </p>
                      <p className="font-bold mt-1">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.size, item.color)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.size, item.color)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product_id, item.size, item.color)}>
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="xl:col-span-1">
            <div className="sticky top-4">
            <Card className="w-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <p>{selectedItems.size} {selectedItems.size === 1 ? 'item selecionado' : 'itens selecionados'}</p>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span>Frete</span>
                  <span>Grátis</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base md:text-lg">
                  <span>Total</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <Button 
                  size="lg" 
                  className="w-full text-sm md:text-base h-11 md:h-12" 
                  asChild
                  disabled={!hasSelectedItems}
                >
                  <Link to="/pagamento">
                    <span className="hidden sm:inline">
                      Finalizar Compra{hasSelectedItems ? ` (${selectedItems.size} ${selectedItems.size === 1 ? 'item' : 'itens'})` : ''}
                    </span>
                    <span className="sm:hidden">
                      Finalizar ({selectedItems.size})
                    </span>
                  </Link>
                </Button>
                <Button variant="outline" className="w-full text-sm" onClick={clearCart}>
                  Limpar Carrinho
                </Button>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    // --- 3. Envolver o conteúdo com a estrutura da página ---
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {renderCartContent()}
      </main>
      <Footer />
    </div>
  );
};

const CarrinhoSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    <Skeleton className="h-10 w-1/4 mb-6" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="flex items-center p-4">
            <Skeleton className="w-24 h-24 rounded-md mr-4" />
            <div className="flex-grow space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            <Skeleton className="h-10 w-32 mx-4" />
            <Skeleton className="h-10 w-10" />
          </Card>
        ))}
      </div>
      <div className="lg:col-span-1">
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-5 w-1/4" /></div>
            <div className="flex justify-between"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-5 w-1/4" /></div>
            <Separator />
            <div className="flex justify-between"><Skeleton className="h-7 w-1/3" /><Skeleton className="h-7 w-1/3" /></div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default Carrinho;