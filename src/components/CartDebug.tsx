import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const CartDebug = () => {
  const { items, addToCart, totalItems, totalPrice } = useCart();
  const { user, isAuthenticated } = useAuth();

  const testProduct = {
    id: 'test-1',
    name: 'Produto de Teste',
    price: 29.90,
    image: '/placeholder.svg',
    category: 'Teste',
    sizes: ['P', 'M', 'G'],
  };

  const handleTestAdd = () => {
    const success = addToCart(testProduct, 'M');
    console.log('Teste de adicionar ao carrinho:', success);
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
          <p><strong>Total de itens:</strong> {totalItems}</p>
          <p><strong>Valor total:</strong> R$ {totalPrice.toFixed(2)}</p>
        </div>

        <Button onClick={handleTestAdd} className="w-full">
          Testar Adicionar ao Carrinho
        </Button>

        <div>
          <p><strong>Itens no carrinho:</strong></p>
          {items.length === 0 ? (
            <p className="text-muted-foreground">Nenhum item</p>
          ) : (
            <ul className="text-sm">
              {items.map((item, index) => (
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