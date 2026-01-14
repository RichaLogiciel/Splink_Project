"use client";
import React, { useState } from "react";

// Import Components
import ManufacturerAvatar from "../Avatar/ManufacturerAvatar";

// Import Util functions

// Import Types
import { MESSAGES } from "@/configs/messages";
import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
import { WishlistProducts } from "@/types/ProductTypes";
import { getUserClient } from "@/utils/getUserClient";
import { dateFormatter } from "@/utils/helper";
import { toast } from "react-toastify";
import { Representative } from "../../types/StoreTypes";
import ConfirmationDialog from "../Dialog/ConfirmWishlistItemDelete";

interface ProductsWishlistTableProps {
  products: WishlistProducts[];
  storeID: number;
}

const ProductsWishlistTable: React.FC<ProductsWishlistTableProps> = ({
  products,
  storeID
}) => {
  const user = getUserClient();
  const [selectedItems, setBulkSelectedItems] = useState<number[]>([]);
  const [allProducts, setAllProducts] = useState<WishlistProducts[]>(products);
  const [confirmDelete, setConfirmDelete] = useState<boolean | null>(null);
  const canRemove = user?.role == USER_ROLES.DISTRIBUTOR_SALES_REP;

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

  const removeWishlistProducts = async (wishlistIDs: number[]) => {
    try {
      await apiClient.delete("/wishlist/delete", {
        data: { storeId: storeID, id: wishlistIDs }
      });

      toast.success("Product(s) removed from the wishlist.");

      // Update the products state by removing deleted items
      setAllProducts((prevProducts) =>
        prevProducts.filter((product) => !wishlistIDs.includes(product.id))
      );
      return true;
    } catch (error) {
      toast.error("Unable to remove product(s) from the Wishlist.");
      return false;
    }
  };

  const handleDeleteAction = async () => {
    if (selectedItems.length > 0) {
      const result = await removeWishlistProducts(selectedItems);
      if (result) {
        setBulkSelectedItems([]); // Clear selection after deletion
      }
      setConfirmDelete(null); // Close confirmation dialog
    }
  };

  return (
    <>
      <table className="w-full border-collapse">
        <thead className="h-11 border-b text-heading-very-light text-xs">
          <tr>
            <th className="min-w-50 font-semibold px-4">
              <div className="flex items-center gap-4">
                {allProducts?.length > 0 && (
                  <input
                    type="checkbox"
                    name={`item`}
                    id={`item`}
                    className="w-3 h-3 border-[#B6B6B6]"
                    checked={selectedItems?.length === allProducts.length}
                    onChange={() => handleAllCheckbox()}
                  />
                )}
                Product Name
              </div>
            </th>
            <th className="min-w-10 font-semibold px-4 cursor-pointer pl-0">
              <span className="inline mr-2">Internal Code</span>
            </th>
            <th className="min-w-30 font-semibold px-4 cursor-pointer pl-0">
              <span className="inline mr-2">Manufacturer</span>
            </th>
            <th className="min-w-20 font-semibold px-4">Edited on</th>
          </tr>
        </thead>
        <tbody>
          {allProducts?.length > 0 ? (
            allProducts.map((pro, index) => (
              <tr
                key={`${index}-program`}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onChange={() => handleCheckbox(index, pro.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    {canRemove && (
                      <input
                        type="checkbox"
                        name={`item-${pro.id}`}
                        id={`item-${pro.id}`}
                        className="w-3 h-3 border-[#B6B6B6]"
                        checked={selectedItems?.includes(pro.id)}
                        onChange={() => handleCheckbox(index, pro.id)}
                      />
                    )}
                    {pro.product_name}
                  </div>
                </td>
                <td className="pr-4 py-3">{pro?.internal_code}</td>
                <td className="pr-4 py-3 12">
                  <ManufacturerAvatar
                    user={
                      {
                        name: pro.manufacturer_name,
                        avatar: pro.manufacturer_logo
                      } as Representative
                    }
                  />
                </td>
                <td className="px-4 py-3">{dateFormatter(pro.updated_at)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="pt-3" colSpan={3}>
                <p className="text-center font-medium text-heading-very-light text-sm">
                  {MESSAGES.NO_RECORDS_FOUND}
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {allProducts?.length > 0 && (
        <button
          className="profile-dropdown absolute -bottom-[30px] bg-white w-auto left-0 rounded shadow-sm transition pt-2 text-sm hover:bg-gray-100 px-4 py-2 border border-border-gray mt-3 disabled:bg-slate-50"
          onClick={() => {
            setConfirmDelete(true);
          }}
          disabled={!selectedItems?.length}
        >
          Delete
        </button>
      )}

      {confirmDelete !== null && (
        <ConfirmationDialog
          isOpen={true}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDeleteAction}
          title="Confirm Removal"
          message="Are you sure you want to remove selected products from the wishlist?"
        />
      )}
    </>
  );
};

export default ProductsWishlistTable;
