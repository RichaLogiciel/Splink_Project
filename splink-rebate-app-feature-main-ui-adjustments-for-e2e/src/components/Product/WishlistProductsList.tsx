"use client";
import filledHeartIcon from "@/assets/icons/filledHeartIcon.svg";
import ConfirmationDialog from "@/components/Dialog/ConfirmWishlistItemDelete";
import { USER_ROLES } from "@/configs/roles";
import {
  WishlistProducts,
  WishlistProductsListProps
} from "@/types/ProductTypes";
import { getUserClient } from "@/utils/getUserClient";
import Image from "next/image";
import React, { useEffect, useState } from "react";

const WishlistProductsList: React.FC<WishlistProductsListProps> = ({
  products,
  showWishlists = true,
  isInPopup = false,
  removeWishlistProduct,
  bulkSelectedItems: selectedItems,
  setBulkSelectedItems
}) => {
  const user = getUserClient();
  const [canRemove, setCanRemove] = useState<boolean>(false);
  const [allProducts, setAllProducts] = useState<WishlistProducts[]>(products);
  const [confirmDelete, setConfirmDelete] = useState<{
    productIndexes: number[];
    productIDs: number[];
  } | null>(null);

  useEffect(() => {
    setAllProducts(products);
    setCanRemove(
      user?.role === USER_ROLES.DISTRIBUTOR_SALES_REP ||
        user?.role === USER_ROLES.STORE
    );
  }, [products, user?.role]);

  const handleDelete = async (
    productIndexes: number[],
    productIDs: number[]
  ) => {
    if (!removeWishlistProduct) return false;
    const result = await removeWishlistProduct(productIDs);
    if (result) {
      const newProducts = allProducts.filter(
        (_, index) => !productIndexes.includes(index)
      );
      setAllProducts(newProducts);
      setConfirmDelete(null);
    }
  };

  const handleCheckbox = (index: number, productID: number) => {
    if (!selectedItems) return;
    const newSelectedItems = selectedItems.includes(productID)
      ? selectedItems.filter((id) => id !== productID)
      : [...selectedItems, productID];
    if (setBulkSelectedItems) {
      setBulkSelectedItems(newSelectedItems);
    }
  };

  const handleAllCheckbox = () => {
    if (!selectedItems || !setBulkSelectedItems) return;
    const allProductIDs = allProducts.map((product) => product.id);
    const allSelected = allProductIDs.length === selectedItems.length;
    if (allSelected) {
      setBulkSelectedItems([]);
    } else {
      setBulkSelectedItems(allProductIDs);
    }
  };

  return (
    <div className="text-xs">
      <div className="font-semibold text-heading-very-light pb-2 border-b border-border-gray flex items-center gap-3">
        {canRemove && (
          <input
            type="checkbox"
            name={`items`}
            id={`item-s`}
            className="w-3 h-3 border-[#B6B6B6]"
            checked={selectedItems?.length === allProducts.length}
            onChange={handleAllCheckbox}
          />
        )}
        <label htmlFor={`item-s`}>Product Name</label>
      </div>

      <ul
        className={`text-sm ${isInPopup ? "max-h-48 [@media(min-height:600px)]:max-h-[15vh] [@media(min-height:720px)]:max-h-[23vh]" : "max-h-[60vh]"} overflow-y-auto pr-2 -mr-2`}
      >
        {allProducts.map((product, productIndex) => (
          <li
            key={`${product.product_name}-${product.id}`}
            className={`py-3.5 last:border-0 last:pb-0 border-b border-border-gray flex justify-between gap-4 items-center `}
          >
            <div className="flex items-center gap-2">
              {canRemove && (
                <input
                  type="checkbox"
                  name={`item-${product.id}`}
                  id={`item-${product.id}`}
                  className="w-3 h-3 border-[#B6B6B6]"
                  checked={selectedItems?.includes(product.id)}
                  onChange={() => handleCheckbox(productIndex, product.id)}
                />
              )}
              <label htmlFor={`item-${product.id}`}>
                {product.product_name}
              </label>
            </div>
            {showWishlists && (
              <span>
                <Image
                  height={13}
                  width={15}
                  className={canRemove ? "cursor-pointer" : ""}
                  src={filledHeartIcon.src}
                  alt={product.product_name}
                  onClick={() => {
                    if (canRemove) {
                      setConfirmDelete({
                        productIndexes: [productIndex],
                        productIDs: [product.id]
                      });
                    }
                  }}
                />
              </span>
            )}
          </li>
        ))}
      </ul>

      {confirmDelete && (
        <ConfirmationDialog
          isOpen={true}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() =>
            handleDelete(confirmDelete.productIndexes, confirmDelete.productIDs)
          }
          title="Confirm Removal"
          message="Are you sure you want to remove this product from the wishlist?"
        />
      )}
    </div>
  );
};

export default WishlistProductsList;
