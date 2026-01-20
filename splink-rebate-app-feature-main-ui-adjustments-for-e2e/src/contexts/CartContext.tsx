"use client";

import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
import { createContext, useContext, useState } from "react";

interface CartContextType {
  cartCount: number;
  refreshCart: (storeId?: string) => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  cartCount: 0,
  refreshCart: async () => {}
});

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = async (storeId?: string) => {
    try {
      if (!storeId) return;

      const response = await apiClient.get("/cart/items/by-entity", {
        params: {
          entityId: storeId,
          entityType: USER_ROLES.STORE
        }
      });

      if (response?.data) {
        setCartCount(response.data.length);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCartCount(0);
    }
  };

  return (
    <CartContext.Provider value={{ cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
