import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

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
  const [items, setItems] = useState<CartItem[]>([]); // Load cart from localStorage on mount

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("atacado-canoa-cart");
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  }, []); // Save cart to localStorage whenever items change

  useEffect(() => {
    try {
      localStorage.setItem("atacado-canoa-cart", JSON.stringify(items));
    } catch (error) {
      console.error("Error saving cart:", error);
    }
  }, [items]); // FUNÇÃO RENOMEADA

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
