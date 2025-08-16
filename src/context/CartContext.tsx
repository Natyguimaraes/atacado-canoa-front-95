import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
  category: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any, size: string) => void;
  removeItem: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user, isAuthenticated } = useAuth();

  // Load cart when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadCartFromDatabase();
    } else {
      loadCartFromLocalStorage();
    }
  }, [user, isAuthenticated]);

  // Save cart when items change
  useEffect(() => {
    if (isAuthenticated && user) {
      saveCartToDatabase();
    } else {
      saveCartToLocalStorage();
    }
  }, [items, user, isAuthenticated]);

  const loadCartFromLocalStorage = () => {
    try {
      const savedCart = localStorage.getItem("atacado-canoa-cart");
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Error loading cart from localStorage:", error);
    }
  };

  const saveCartToLocalStorage = () => {
    try {
      localStorage.setItem("atacado-canoa-cart", JSON.stringify(items));
    } catch (error) {
      console.error("Error saving cart to localStorage:", error);
    }
  };

  const loadCartFromDatabase = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading cart from database:', error);
        return;
      }

      if (data?.items) {
        setItems(data.items as CartItem[]);
      }
    } catch (error) {
      console.error('Error loading cart from database:', error);
      // Fallback to localStorage if database fails
      loadCartFromLocalStorage();
    }
  };

  const saveCartToDatabase = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('carts')
        .upsert({
          user_id: user.id,
          items: items
        });

      if (error) {
        console.error('Error saving cart to database:', error);
      }
    } catch (error) {
      console.error('Error saving cart to database:', error);
    }
  };

  const addToCart = (product: any, size: string) => {
    console.log('Dados recebidos:', { product, size });
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === product.id && item.size === size
      );
      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...currentItems, { ...product, size, quantity: 1 }];
      }
    });
  };

  const removeItem = (id: string, size: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => !(item.id === id && item.size === size))
    );
  };

  const updateQuantity = (id: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id, size);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id && item.size === size ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const value = {
    items, // FUNÇÃO RENOMEADA NO OBJETO DE VALOR
    addToCart,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  };

  return (
    <CartContext.Provider value={value}>
          {children}   {" "}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
