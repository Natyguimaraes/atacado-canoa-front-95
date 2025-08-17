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
  addToCart: (product: any, size: string) => boolean;
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
        .maybeSingle();

      if (error) {
        console.error('Error loading cart from database:', error);
        // Fallback to localStorage if database fails
        loadCartFromLocalStorage();
        return;
      }

      if (data?.items) {
        setItems(JSON.parse(JSON.stringify(data.items)) as CartItem[]);
      } else {
        // Se não há carrinho no banco, carregar do localStorage
        loadCartFromLocalStorage();
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
          items: JSON.parse(JSON.stringify(items))
        });

      if (error) {
        console.error('Error saving cart to database:', error);
        // Ainda assim salvar no localStorage como backup
        saveCartToLocalStorage();
      }
    } catch (error) {
      console.error('Error saving cart to database:', error);
      // Salvar no localStorage como backup
      saveCartToLocalStorage();
    }
  };

  const addToCart = (product: any, size: string) => {
    // Verificar se o usuário está logado antes de adicionar ao carrinho
    if (!isAuthenticated || !user) {
      console.warn('Usuário precisa estar logado para adicionar itens ao carrinho');
      return false; // Retorna false para indicar que o item não foi adicionado
    }

    console.log('Dados recebidos para adicionar ao carrinho:', { product, size });
    
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === product.id && item.size === size
      );
      
      if (existingItem) {
        console.log('Item já existe, aumentando quantidade');
        return currentItems.map((item) =>
          item.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        console.log('Adicionando novo item ao carrinho');
        const newItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          size: size,
          quantity: 1,
          category: product.category
        };
        return [...currentItems, newItem];
      }
    });
    
    return true; // Retorna true para indicar que o item foi adicionado com sucesso
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
    items,
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
