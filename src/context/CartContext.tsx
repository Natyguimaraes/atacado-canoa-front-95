import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { storeConfig } from '@/lib/config';
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

  // Limpar cache antigo
  const clearOldCache = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      keys.forEach(key => {
        if (key.startsWith('shipping-')) {
          try {
            const cached = JSON.parse(localStorage.getItem(key) || '{}');
            // Remover cache mais antigo que 1 hora
            if (cached.timestamp && now - cached.timestamp > 60 * 60 * 1000) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            // Remover cache inválido
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.log('Erro ao limpar cache:', error);
    }
  }, []);

  useEffect(() => {
    fetchCart();
    clearOldCache(); // Limpar cache antigo ao inicializar
  }, [fetchCart, clearOldCache]);

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

  const calculateAutoShipping = useCallback(async (cartItems: CartItem[]) => {
    if (!user || cartItems.length === 0) {
      setShipping(null);
      return;
    }

    // Cache key baseado no usuário e itens do carrinho
    const cartHash = JSON.stringify(cartItems.map(item => ({ id: item.product_id, qty: item.quantity })));
    const cacheKey = `shipping-${user.id}-${btoa(cartHash).slice(0, 10)}`;
    
    // Verificar cache primeiro (válido por 5 minutos)
    const cachedResult = localStorage.getItem(cacheKey);
    if (cachedResult) {
      try {
        const cached = JSON.parse(cachedResult);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutos
          setShipping(cached.data);
          setIsCalculatingShipping(false);
          return;
        }
      } catch (error) {
        console.log('Cache inválido, calculando novamente');
      }
    }

    try {
      // Primeiro tentar buscar do perfil do Supabase
      let userCep = '';
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('address')
          .eq('user_id', user.id)
          .single();
          
        if (profile?.address && typeof profile.address === 'object') {
          const addr = profile.address as any;
          userCep = addr.zipCode || '';
        }
      } catch (error) {
        console.log('Profile address not found, trying localStorage');
      }
      
      // Fallback: buscar CEP salvo no localStorage
      if (!userCep) {
        const savedAddress = localStorage.getItem(`address-${user.id}`);
        if (savedAddress) {
          const addressData = JSON.parse(savedAddress);
          userCep = addressData.zipCode || '';
        }
      }
      
      // Validar CEP antes de prosseguir
      if (!userCep || userCep.replace(/\D/g, '').length !== 8) {
        setShipping(null);
        setIsCalculatingShipping(false);
        return;
      }

      setIsCalculatingShipping(true);

      // Calcular peso total do carrinho
      const totalWeight = cartItems.reduce((total, item) => total + (item.quantity * 300), 0);

      // Timeout para evitar espera excessiva
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

      try {
        const { data, error } = await supabase.functions.invoke('calculate-shipping', {
          body: {
            originCep: storeConfig.zipCode, // CEP de origem da loja
            destinyCep: userCep.replace(/\D/g, ''),
            weight: totalWeight,
            length: 20,
            height: 10,
            width: 15
          }
        });

        clearTimeout(timeoutId);

        if (error) throw error;

        let shippingResult = null;

        if (data && data.options && data.options.length > 0) {
          // Usar a opção mais barata (PAC) como padrão
          const cheapestOption = data.options.reduce((prev: any, current: any) => 
            current.price < prev.price ? current : prev
          );
          
          shippingResult = {
            service: cheapestOption.serviceName || cheapestOption.service,
            price: cheapestOption.price,
            days: cheapestOption.deliveryTime,
            cep: userCep
          };
        } else {
          // Fallback com PAC
          shippingResult = {
            service: 'PAC',
            price: 15.50,
            days: '8 a 12',
            cep: userCep
          };
        }

        setShipping(shippingResult);
        
        // Salvar no cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: shippingResult,
          timestamp: Date.now()
        }));

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.log('Cálculo de frete cancelado por timeout');
        } else {
          throw fetchError;
        }
      }

    } catch (error: any) {
      console.error('Erro ao calcular frete:', error);
      // Fallback em caso de erro
      const fallbackShipping = {
        service: 'PAC',
        price: 15.50,
        days: '8 a 12',
        cep: 'N/A'
      };
      setShipping(fallbackShipping);
      
      // Salvar fallback no cache por menos tempo (1 minuto)
      const cacheKey = `shipping-${user.id}-fallback`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data: fallbackShipping,
        timestamp: Date.now()
      }));
    } finally {
      setIsCalculatingShipping(false);
    }
  }, [user, storeConfig.zipCode]);

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