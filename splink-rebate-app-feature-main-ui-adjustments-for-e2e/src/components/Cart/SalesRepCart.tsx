"use client";

import { MESSAGES } from "@/configs/messages";
import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import Button from "@/core-ui/Button";
import { apiClient } from "@/lib/axiosClient";
import { ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import BackButton from "../Buttons/BackButton";
import Card from "../Card";
import OrderItemCard from "../OrderItemCard";

interface CartProduct {
  id: number;
  name: string;
  brand: string;
  price: string; // API returns string for price
  size: string | null;
  unit_price: number | null;
  box_price: number | null;
  case_price: number | null;
  unit_skus_id: number | null;
  box_skus_id: number | null;
  case_skus_id: number | null;
  internal_code: string | null;
  product_name: string | null;
}

interface CartItem {
  id: number;
  entityId: number;
  entityType: string;
  creatorId: number;
  creatorType: string;
  productId: number; // This seems to be the SKU ID based on API response
  quantity: number;
  quantityType: string;
  distProductId?: string | null;
  Product: CartProduct; // Using the newly defined CartProduct interface
  Store: { name: string }; // Using the newly defined CartProduct interface
  Manufacturer: { name: string }; // Using the newly defined CartProduct interface
}

interface SalesRepCartProps {
  storeId?: string;
}

const SalesRepCart: React.FC<SalesRepCartProps> = ({ storeId }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const handleUpdateCart = async (item: CartItem) => {
    try {
      await apiClient.put(`/cart/items/${item.id}`, {
        quantity: item.quantity,
        quantityType: item.quantityType,
        productId: item.productId
      });

      // Update local state
      setCartItems((prevItems) =>
        prevItems.map((it) => (it.id === item.id ? { ...item } : it))
      );

      toast.success("Cart updated successfully");
    } catch (error) {
      console.error("Error updating cart:", error);
      toast.error("Failed to update cart");
      fetchCartItems();
    }
  };

  const handleRemoveFromCart = async (itemId: number) => {
    try {
      await apiClient.delete(`/cart/items/${itemId}`);

      // Update local state
      setCartItems((prevItems) => prevItems.filter((it) => it.id != itemId));

      toast.success("Cart Item removed successfully");
    } catch (error) {
      console.error("Error removeing item from cart:", error);
      toast.error("Failed to remove item from cart");
      fetchCartItems();
    }
  };

  const handleEmptyCart = async () => {
    try {
      await apiClient.delete("/cart/items");
      setCartItems([]);
      toast.success("Cart emptied successfully");
    } catch (error) {
      console.error("Error emptying cart:", error);
      toast.error("Failed to empty cart");
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      setPlacingOrder(true);
      const response = await apiClient.post("/orders");
      if (response?.data) {
        toast.success("Order placed successfully");
        // Cart is automatically emptied on the backend after order creation
        setCartItems([]); // Clear local cart state
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(MESSAGES.ERROR_PLACING_ORDER || "Failed to place order");
    } finally {
      setPlacingOrder(false);
    }
  };
  // Extract fetchCartItems function from useEffect for reuse
  const fetchCartItems = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/cart/items?entityId=${storeId}&entityType=${USER_ROLES.STORE}`;

      const response = await apiClient.get(url);
      if (response?.data) {
        setCartItems(response.data);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error("Error fetching cart items:", error);
      toast.error(
        MESSAGES.ERROR_FETCHING_CART_ITEMS || "Failed to fetch cart items."
      );
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  // Group cart items by entityId
  const groupedCartItems = useMemo(() => {
    const groups: { [entityId: number]: CartItem[] } = {};
    cartItems.forEach((item) => {
      if (!groups[item.entityId]) {
        groups[item.entityId] = [];
      }
      groups[item.entityId].push(item);
    });
    return groups;
  }, [cartItems]);
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center">
          <div className="icons flex">
            <BackButton link={`${APP_ROUTES.store}/${storeId}`} />
            <div className="seperater min-h-7 border ml-3 mr-5 border-border-gray"></div>
          </div>

          <div className="store-info">
            <h2 className="text-lg font-semibold text-highlighted-color">
              Store Cart
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            onClick={handlePlaceOrder}
            disabled={cartItems.length === 0 || placingOrder}
            color="success"
            size="md"
            className="shadow-sm hover:shadow-md transition-all px-5 rounded-md flex items-center gap-2"
          >
            <ShoppingCart size={20} />
            {placingOrder ? "Placing Order..." : "Place Order"}
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center items-center p-8 border border-border-gray rounded-lg bg-white">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
            <div className="text-gray-500">Loading cart items...</div>
          </div>
        </div>
      ) : cartItems.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedCartItems).map(([entityId, items]) => (
            <Card key={entityId}>
              <div className="flex justify-between items-center py-2">
                <h4 className="text-lg font-semibold ">
                  {items?.[0]?.Store?.name || "Unknown Store"}
                </h4>
                <Button
                  onClick={handleEmptyCart}
                  disabled={cartItems.length === 0}
                  color="danger"
                  outline
                  size="sm"
                  className="shadow-sm hover:shadow-md transition-all px-2 rounded-md flex items-center gap-1"
                >
                  <Trash2 size={18} />
                  Empty Cart
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items?.map((item) => (
                  <OrderItemCard
                    key={item.id}
                    id={item.id}
                    name={item.Product.product_name || item.Product.name}
                    brand={item.Manufacturer.name}
                    size={item.Product.size ?? ""}
                    internalCode={
                      item.distProductId ?? item.Product.internal_code ?? ""
                    }
                    quantity={item.quantity}
                    quantityType={item.quantityType}
                    cartItem={item}
                    onUpdateCartClick={handleUpdateCart}
                    onRemoveCartClick={handleRemoveFromCart}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-center justify-center py-10">
            <div className="mb-4">
              <ShoppingBag size={48} className="text-gray-300" />
            </div>
            <p className="text-center text-heading-very-light text-base mb-1">
              Your cart is empty
            </p>
            <p className="text-center text-heading-very-light text-sm">
              Add items to your cart to place an order
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SalesRepCart;
