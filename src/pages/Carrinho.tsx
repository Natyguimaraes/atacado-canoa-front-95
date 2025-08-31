import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, Frown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header'; // <-- 1. Importar o Header
import Footer from '@/components/Footer'; // <-- 2. Importar o Footer

const Carrinho = () => {
  const { cart, removeFromCart, updateQuantity, loading, clearCart } = useCart();

  const renderCartContent = () => {
    if (loading) {
      return <CarrinhoSkeleton />;
    }
  
    if (!cart || cart.length === 0) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <Frown className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">O seu carrinho está vazio</h1>
          <p className="text-muted-foreground mb-6">
            Parece que você ainda não adicionou nenhum produto.
          </p>
          <Button asChild>
            <Link to="/produtos">Começar a comprar</Link>
          </Button>
        </div>
      );
    }

    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 font-display">Meu Carrinho</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <Card key={`${item.product_id}-${item.size}-${item.color}`} className="flex items-center p-4">
                <img
                  src={item.image || '/placeholder.svg'}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-md mr-4"
                />
                <div className="flex-grow">
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {item.size && `Tamanho: ${item.size}`}
                    {item.color && ` / Cor: ${item.color}`}
                  </p>
                  <p className="font-bold mt-1">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="flex items-center border rounded-md mx-4">
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
              </Card>
            ))}
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete</span>
                  <span>Grátis</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <Button size="lg" className="w-full" asChild>
                  <Link to="/pagamento">Finalizar Compra</Link>
                </Button>
                <Button variant="outline" className="w-full" onClick={clearCart}>
                  Limpar Carrinho
                </Button>
              </CardContent>
            </Card>
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