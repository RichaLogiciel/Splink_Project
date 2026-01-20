// Import core packages
import React from "react";

// Import Component
import WishlistProductsPage from "@/components/Product/WishlistProductsPage";

// Import Types
import { StoreWishlistProps } from "@/types/StoreTypes";

// Import Lib
import { apiServerClient } from "@/lib/axiosServer";
import { getUserServer } from "@/utils/getUserServer";

async function fetchWishlistProducts(storeID: number) {
  try {
    const { data } = await apiServerClient.get("/wishlist/store/" + storeID);

    return data;
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

const StoreWishlist: React.FC<StoreWishlistProps> = async () => {
  const user = getUserServer();
  const storeId = user?.associatedUserId;

  const products = await fetchWishlistProducts(storeId);

  return (
    <>
      <WishlistProductsPage products={products} STORE_ID={storeId} />
    </>
  );
};

export default StoreWishlist;
