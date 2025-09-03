import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const CartDebug = () => {
  const { cart, addToCart, itemCount } = useCart();
  const { user, isAuthenticated } = useAuth();

  const testProduct = {
    id: 'test-1',
    name: 'Produto de Teste',
    price: 29.90,
    images: ['/placeholder.svg'],
    stock: 10,
  };

  const handleTestAdd = () => {
    addToCart(testProduct, 1, 'M');
    console.log('Teste de adicionar ao carrinho');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Debug do Carrinho</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p><strong>Usuário logado:</strong> {isAuthenticated ? 'Sim' : 'Não'}</p>
          <p><strong>ID do usuário:</strong> {user?.id || 'N/A'}</p>
          <p><strong>Total de itens:</strong> {itemCount}</p>
          <p><strong>Valor total:</strong> R$ {cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</p>
        </div>

        <Button onClick={handleTestAdd} className="w-full">
          Testar Adicionar ao Carrinho
        </Button>

        <div>
          <p><strong>Itens no carrinho:</strong></p>
          {cart.length === 0 ? (
            <p className="text-muted-foreground">Nenhum item</p>
          ) : (
            <ul className="text-sm">
              {cart.map((item, index) => (
                <li key={index}>
                  {item.name} - {item.size} - Qty: {item.quantity}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};