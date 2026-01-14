"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";

import Card from "@/components/Card";
import ConfirmationDialog from "@/components/Dialog/ConfirmWishlistItemDelete";
import WishlistProductsList from "@/components/Product/WishlistProductsList";
import Button from "@/core-ui/Button";
import { apiClient } from "@/lib/axiosClient";
import {
  WishlistProducts,
  WishlistProductsPageProps
} from "@/types/ProductTypes";

const WishlistProductsPage: React.FC<WishlistProductsPageProps> = ({
  products: initialProducts,
  showWishlists,
  STORE_ID
}) => {
  const [products, setProducts] = useState<WishlistProducts[]>(initialProducts);
  const [bulkSelectedItems, setBulkSelectedItems] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<boolean | null>(null);

  const removeWishlistProducts = async (wishlistIDs: number[]) => {
    try {
      await apiClient.delete("/wishlist/delete", {
        data: { storeId: STORE_ID, id: wishlistIDs }
      });

      toast.success("Product(s) removed from the wishlist.");

      // Update the products state by removing deleted items
      setProducts((prevProducts) =>
        prevProducts.filter((product) => !wishlistIDs.includes(product.id))
      );
      return true;
    } catch (error) {
      toast.error("Unable to remove product(s) from the Wishlist.");
      return false;
    }
  };

  const handleBulkAction = async () => {
    if (bulkSelectedItems.length > 0) {
      const result = await removeWishlistProducts(bulkSelectedItems);
      if (result) {
        setBulkSelectedItems([]); // Clear selection after deletion
      }
      setConfirmDelete(null); // Close confirmation dialog
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row mb-4 sm:mb-6 justify-between items-center min-h-9">
        <h2 className="text-lg font-semibold">Wishlist</h2>
        {bulkSelectedItems.length > 0 && (
          <div className="flex gap-4">
            <Button
              onClick={() => setConfirmDelete(true)}
              className="bg-danger text-white text-sm hover:opacity-90"
            >
              {bulkSelectedItems.length > 1 ? "Remove Items" : "Remove Item"}
            </Button>
          </div>
        )}
      </div>

      {products.length > 0 ? (
        <Card className="p-5 min-h-screen">
          <WishlistProductsList
            products={products}
            showWishlists={showWishlists}
            removeWishlistProduct={removeWishlistProducts}
            bulkSelectedItems={bulkSelectedItems}
            setBulkSelectedItems={setBulkSelectedItems}
          />
          {confirmDelete !== null && (
            <ConfirmationDialog
              isOpen={true}
              onClose={() => setConfirmDelete(null)}
              onConfirm={handleBulkAction}
              title="Confirm Removal"
              message="Are you sure you want to remove selected products from the wishlist?"
            />
          )}
        </Card>
      ) : (
        <div className="text-heading-light bg-white h-full rounded-md p-4 text-center">
          It looks like you haven’t added any products to your wishlist yet.
        </div>
      )}
    </>
  );
};

export default WishlistProductsPage;
