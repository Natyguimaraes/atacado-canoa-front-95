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
import ShippingCalculator from '@/components/ShippingCalculator';

interface ShippingOption {
  service: string;
  serviceName: string;
  price: number;
  deliveryTime: number;
  error?: string;
}

const Carrinho = () => {
  const { cart, removeFromCart, updateQuantity, loading, clearCart } = useCart();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

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
        <div className="bg-gray-50/40 min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md mx-auto px-4">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Frown className="w-12 h-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Seu carrinho está vazio</h2>
              <p className="text-gray-600">Que tal adicionar alguns produtos incríveis?</p>
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/produtos">
                Explorar Produtos
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    const selectedCartItems = cart.filter(item => 
      selectedItems.has(`${item.product_id}-${item.size}-${item.color}`)
    );

    const hasSelectedItems = selectedCartItems.length > 0;

    const subtotal = selectedCartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Calcular peso total (estimativa baseada nos produtos)
    const totalWeight = selectedCartItems.reduce((total, item) => {
      return total + (item.quantity * 200); // 200g por item (estimativa)
    }, 0);

    const shippingCost = selectedShipping ? selectedShipping.price : 0;
    const total = subtotal + shippingCost;

    const renderCartItems = () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedItems.size === cart.length && cart.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium">
              Selecionar todos ({cart.length} {cart.length === 1 ? 'item' : 'itens'})
            </span>
          </div>
        </div>

        {cart.map((item) => {
          const itemKey = `${item.product_id}-${item.size}-${item.color}`;
          const isSelected = selectedItems.has(itemKey);

          return (
            <Card key={itemKey} className={`transition-all ${isSelected ? 'ring-2 ring-primary ring-opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleItemSelection(itemKey)}
                    className="mt-2"
                  />
                  
                  <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-xs">Sem imagem</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-grow min-w-0">
                    <h3 className="font-medium text-sm md:text-base line-clamp-2">{item.name}</h3>
                    {item.size && (
                      <p className="text-xs md:text-sm text-gray-600 mt-1">Tamanho: {item.size}</p>
                    )}
                    {item.color && (
                      <p className="text-xs md:text-sm text-gray-600">Cor: {item.color}</p>
                    )}
                    <p className="font-bold text-sm md:text-base mt-2">
                      R$ {item.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  <div className="flex flex-col items-end space-y-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.product_id, item.size, item.color)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center space-x-2 bg-gray-100 rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.size, item.color)}
                        disabled={item.quantity <= 1}
                        className="h-8 w-8 hover:bg-gray-200"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="px-2 py-1 text-sm font-medium min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.size, item.color)}
                        className="h-8 w-8 hover:bg-gray-200"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );

    return (
      <div className="bg-gray-50/40 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Carrinho de Compras</h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {renderCartItems()}
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              {/* Calculadora de Frete */}
              <ShippingCalculator 
                weight={totalWeight}
                onShippingSelected={setSelectedShipping}
                selectedOption={selectedShipping}
              />

              {/* Resumo do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({selectedItems.size} {selectedItems.size === 1 ? 'item' : 'itens'})</span>
                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {selectedShipping && (
                    <div className="flex justify-between text-sm">
                      <span>Frete ({selectedShipping.serviceName})</span>
                      <span>R$ {selectedShipping.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {!selectedShipping && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Frete</span>
                      <span>Calcule o frete</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-base md:text-lg">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full text-sm md:text-base h-11 md:h-12" 
                    asChild
                    disabled={!hasSelectedItems}
                  >
                    <Link to="/pagamento" state={{ selectedShipping }}>
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
      <div className="lg:col-span-1 space-y-6">
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