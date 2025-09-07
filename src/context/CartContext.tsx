import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  stock: number; // Garante que o stock está na definição do produto
}

interface CartItem {
  product_id: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  size?: string;
  color?: string;
}

interface ShippingInfo {
  service: string;
  price: number;
  days: string;
  cep: string;
}

interface CartContextType {
  cart: CartItem[];
  shipping: ShippingInfo | null;
  isCalculatingShipping: boolean;
  addToCart: (product: Product, quantity: number, size?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  setShipping: (shipping: ShippingInfo | null) => void;
  clearCart: () => void;
  loading: boolean;
  itemCount: number;
  getTotal: () => number;
  getTotalWithShipping: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shipping, setShipping] = useState<ShippingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart([]);
      setShipping(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.items) {
        const cartItems = data.items as unknown as CartItem[];
        setCart(cartItems);
        
        // Calcular frete automaticamente se há itens no carrinho
        if (cartItems.length > 0) {
          calculateAutoShipping(cartItems);
        } else {
          setShipping(null);
        }
      } else {
        setCart([]);
        setShipping(null);
      }
    } catch (error: any) {
      toast.error('Erro ao buscar carrinho', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`public:carts:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'carts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newItemsPayload = payload.new as { items: Json };
          const newItems = newItemsPayload.items as unknown as CartItem[] || [];
          setCart(newItems);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const calculateAutoShipping = async (cartItems: CartItem[]) => {
    if (!user || cartItems.length === 0) {
      setShipping(null);
      return;
    }

    try {
      // Buscar CEP salvo do usuário
      const savedAddress = localStorage.getItem(`address-${user.id}`);
      if (!savedAddress) {
        setShipping(null);
        return;
      }

      const addressData = JSON.parse(savedAddress);
      const userCep = addressData.zipCode;
      
      if (!userCep || userCep.replace(/\D/g, '').length !== 8) {
        setShipping(null);
        return;
      }

      setIsCalculatingShipping(true);

      // Calcular peso total do carrinho
      const totalWeight = cartItems.reduce((total, item) => total + (item.quantity * 300), 0);

      const { data, error } = await supabase.functions.invoke('calculate-shipping', {
        body: {
          destinyCep: userCep.replace(/\D/g, ''),
          weight: totalWeight,
          length: 20,
          height: 10,
          width: 15
        }
      });

      if (error) throw error;

      if (data && data.shippingOptions && data.shippingOptions.length > 0) {
        // Usar a opção mais barata (PAC) como padrão
        const cheapestOption = data.shippingOptions.reduce((prev: any, current: any) => 
          current.price < prev.price ? current : prev
        );
        
        setShipping({
          service: cheapestOption.service,
          price: cheapestOption.price,
          days: cheapestOption.days,
          cep: userCep
        });
      } else {
        // Fallback com PAC
        setShipping({
          service: 'PAC',
          price: 15.50,
          days: '8 a 12',
          cep: userCep
        });
      }
    } catch (error: any) {
      console.error('Erro ao calcular frete:', error);
      // Fallback em caso de erro
      setShipping({
        service: 'PAC',
        price: 15.50,
        days: '8 a 12',
        cep: 'N/A'
      });
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const updateSupabaseCart = async (newCart: CartItem[]) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('carts')
        .upsert({ user_id: user.id, items: newCart as unknown as Json, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      setCart(newCart);
      
      // Recalcular frete automaticamente
      if (newCart.length > 0) {
        calculateAutoShipping(newCart);
      } else {
        setShipping(null);
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar carrinho', { description: error.message });
      fetchCart();
    }
  };

  const addToCart = (product: Product, quantity: number, size?: string, color?: string) => {
    const existingItemIndex = cart.findIndex(
      item => item.product_id === product.id && item.size === size && item.color === color
    );

    let newCart = [...cart];
    if (existingItemIndex > -1) {
      const newQuantity = newCart[existingItemIndex].quantity + quantity;
      // Validação de estoque para item já existente
      if (newQuantity > product.stock) {
        toast.error('Não é possível adicionar mais itens do que o disponível em estoque.');
        return;
      }
      newCart[existingItemIndex].quantity = newQuantity;
    } else {
      newCart.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        quantity,
        size,
        color,
      });
    }
    updateSupabaseCart(newCart);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };
  
  const removeFromCart = (productId: string, size?: string, color?: string) => {
    const newCart = cart.filter(
      item => !(item.product_id === productId && item.size === size && item.color === color)
    );
    updateSupabaseCart(newCart);
  };

  const updateQuantity = (productId: string, quantity: number, size?: string, color?: string) => {
    const newCart = cart.map(item => {
      if (item.product_id === productId && item.size === size && item.color === color) {
        return { ...item, quantity: Math.max(0, quantity) }; // Permite zerar a quantidade
      }
      return item;
    }).filter(item => item.quantity > 0); // Remove o item se a quantidade for zero
    updateSupabaseCart(newCart);
  };
  
  const clearCart = async () => {
    if (!user) {
      setCart([]);
      setShipping(null);
      return;
    }
    await updateSupabaseCart([]); 
    setShipping(null);
  };
  
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalWithShipping = () => {
    const cartTotal = getTotal();
    const shippingCost = shipping?.price || 0;
    return cartTotal + shippingCost;
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      shipping,
      isCalculatingShipping,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      setShipping,
      clearCart, 
      loading, 
      itemCount,
      getTotal,
      getTotalWithShipping
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};