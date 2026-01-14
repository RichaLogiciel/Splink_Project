"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

// Import Lib
import { apiClient } from "@/lib/axiosClient";

// Import Types
import { ProductsListProps } from "@/types/ProductTypes";
import { ManufacturerProduct } from "@/types/StoreTypes";

// Import Image
import AddIcon from "@/assets/icons/plusWhiteIcon.svg";
// import greenFilledTick from "@/assets/icons/greenFilledTick.svg";
import DeleteIcon from "@/assets/icons/redDeleteIcon.svg";
import MinusIcon from "../../assets/icons/minusIcon.svg";
import PlusIcon from "../../assets/icons/plusIcon.svg";
import redCrossIcon from "../../assets/icons/redCircleCrossIcon.svg";

import { MESSAGES } from "@/configs/messages";
import { USER_ROLES } from "@/configs/roles";
import { useCart } from "@/contexts/CartContext";
import { useWindowWidth } from "@/utils/clientHelper";
import { CART_ITEM_QUANTITY_TYPE } from "@/utils/constants";
import { enableOrderingFeature } from "@/utils/featureHelper";
import { getUserClient } from "@/utils/getUserClient";
import {
  getProductNameWithSizeAndCaseSku,
  isQuantitySelectionEnabled
} from "@/utils/helper";
import {
  isDistributor,
  isDistributorSalesRep,
  isManufacturer,
  isManufacturerAccountManager,
  isManufacturerExecutive
} from "@/utils/rolesConditions";
import CardButton from "../CardButton";

const ProductsList: React.FC<ProductsListProps> = ({
  products,
  showWishlists = true,
  isInPopup = false,
  showDistributorCode = false,
  showUpcCode = false,
  emptyListMessage = "",
  showProductsIcon = true,
  showAddIcon = false,
  storeId,
  manufacturerId,
  isShowGreyBg = true
}) => {
  const user = getUserClient();
  const ORDERING_FEATURE_ENABLED = user?.associatedUserId
    ? enableOrderingFeature(
        user.associatedUserId,
        user.parentEntityId ?? undefined,
        user.primaryWarehouseId ?? undefined
      )
    : false;

  const isDistributorRoles = isDistributor(user?.role as string);
  const isManufacturerUser =
    isManufacturer(user?.role || "") ||
    isManufacturerExecutive(user?.role || "") ||
    isManufacturerAccountManager(user?.role || "");
  const windowWidth = useWindowWidth();

  const [cartProducts, setCartProducts] = useState<any[]>([]);
  const [activeProduct, setActiveProduct] = useState<{
    skuId: string;
    quantity: number;
    quantityType: string;
    itemId?: number;
  } | null>(null);
  const { refreshCart } = useCart();

  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

  const allProducts: ManufacturerProduct[] = useMemo(() => {
    return products?.sort((a: any, b: any) => {
      const aCode = a?.internalCode;
      const bCode = b?.internalCode;

      if (!aCode || aCode === "NA" || aCode === "N/A") return 1;
      if (!bCode || bCode === "NA" || bCode === "N/A") return -1;

      return aCode.localeCompare(bCode);
    });
  }, [products]);

  // Helper function to check if a product should be greyed out
  const isNAProduct = (product: any) => {
    const internalCode = product?.internalCode;
    // Check for NA, N/A, null, undefined, empty string, or false (since internalCode can be boolean)
    return (
      internalCode === "NA" ||
      internalCode === "N/A" ||
      internalCode === null ||
      internalCode === undefined ||
      internalCode === "" ||
      internalCode === false
    );
  };

  // Helper function to check if a product should be greyed out (only if not manufacturer)
  const shouldGreyOutProduct = (product: any) => {
    return isNAProduct(product) && !isManufacturerUser;
  };

  // Declare fetchCartItems outside useEffect so it can be used by other functions
  const fetchCartItems = async () => {
    if (storeId) {
      try {
        const response = await apiClient.get("/cart/items/by-entity", {
          params: {
            entityId: storeId,
            entityType: USER_ROLES.STORE
          }
        });
        if (response?.data) {
          setCartProducts(response.data);
        }
      } catch (error) {
        console.error("Error fetching cart items:", error);
      }
    }
  };
  useEffect(() => {
    if (storeId && isDistributorSalesRep(user?.role ?? "")) fetchCartItems();
  }, []);

  const handleAddToCart = async (
    skuId: string,
    quantity: number,
    quantityType: string
  ) => {
    try {
      const response = await apiClient.post("/cart/items", {
        productId: skuId,
        quantityType: quantityType,
        quantity: quantity,
        entityId: storeId,
        entityType: USER_ROLES.STORE,
        manufacturerId: manufacturerId
      });
      if (response?.data?.length > 0) {
        setCartProducts(response.data);
        toast.success(MESSAGES.ADDED_TO_CART);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(MESSAGES.ERROR_ADDING_TO_CART);
    } finally {
      setActiveProduct(null);
      refreshCart(storeId);
    }
  };

  const handleRemoverFromCart = async (itemId: number) => {
    try {
      const response: any = await apiClient.delete(`/cart/items/${itemId}`);
      if (response.status == "success") {
        setCartProducts((prevItems: any[]) =>
          prevItems.filter((it) => it.id != itemId)
        );
        toast.success("Cart Item removed successfully");
      } else {
        console.error("Error removeing item from cart:", response);
        toast.error("Failed to remove item from cart");
      }
    } catch (error) {
      console.error("Error removeing item from cart:", error);
      toast.error("Failed to remove item from cart");
    } finally {
      setActiveProduct(null);
      refreshCart(storeId);
    }
  };

  const handleUpdateCart = async (item: any) => {
    try {
      await apiClient.put(`/cart/items/${item.itemId}`, {
        productId: item.skuId,
        quantityType: item.quantityType,
        quantity: item.quantity
      });

      // Update local state
      setCartProducts((prevItems: any[]) =>
        prevItems.map((it) =>
          it.id === item.itemId
            ? { ...it, ...item, id: it.id, productId: item.skuId }
            : it
        )
      );

      toast.success("Cart updated successfully");
    } catch (error) {
      console.error("Error updating cart:", error);
      toast.error("Failed to update cart");
    } finally {
      setActiveProduct(null);
      refreshCart(storeId);
    }
  };

  return (
    <div
      className={`text-xs ${isInPopup ? "max-h-48 [@media(min-height:600px)]:max-h-[15vh] [@media(min-height:720px)]:max-h-[23vh]" : "max-h-[60vh]"} overflow-y-auto block -mr-2 sm:mr-0`}
    >
      {windowWidth > 640 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="sticky top-0 bg-white border-b border-border-gray pb-2 font-semibold text-heading-very-light z-10">
                <th className={`text-left pb-2 px-2 w-[35px]`}>#</th>
                <th
                  className={`text-left pb-2 px-2 ${showUpcCode && showDistributorCode ? "w-[40%]" : showUpcCode || showDistributorCode ? "w-[60%]" : "w-[80%]"}`}
                >
                  Product Name
                </th>
                {showUpcCode && (
                  <th className={`text-left pb-2 px-2 w-32`}>UPC</th>
                )}
                {(showDistributorCode || showWishlists) && (
                  <th
                    className={`text-left pb-2 px-2 ${
                      showDistributorCode ? "w-32" : "w-8"
                    }`}
                  >
                    {showDistributorCode ? "Internal Code" : ""}
                  </th>
                )}
                {/* {showProductsIcon && (
                  <th className="text-left pb-2 px-2 w-8"></th>
                )} */}
                {showAddIcon && ORDERING_FEATURE_ENABLED && (
                  <th className="text-left pb-2 px-2"></th>
                )}
              </tr>
            </thead>
            <tbody className="text-sm">
              {allProducts?.length > 0 ? (
                allProducts.map((product, productIndex) => (
                  <tr
                    key={`${product.name}-${productIndex}`}
                    className={`last:border-0 last:pb-0 border-b border-border-gray ${shouldGreyOutProduct(product) ? "bg-[#f4f4f5]" : ""} ${shouldGreyOutProduct(product) && "text-zinc-400"}`}
                  >
                    <td className="py-3.5 px-2">{productIndex + 1}</td>
                    <td
                      className={`py-3.5 px-2 ${shouldGreyOutProduct(product) ? "text-zinc-400" : ""}`}
                    >
                      {getProductNameWithSizeAndCaseSku(
                        product.name,
                        product.size,
                        ""
                      )}
                    </td>
                    {showUpcCode && (
                      <td className="py-3.5 px-2">
                        <span
                          className={`${(shouldGreyOutProduct(product) && "text-zinc-400") || "text-filter-light"} text-xs font-medium
                        `}
                        >
                          {product.caseSkusId}
                        </span>
                      </td>
                    )}
                    {(showDistributorCode || showWishlists) && (
                      <td className="py-3.5 px-2">
                        <div className="flex gap-4 justify-between items-center">
                          {showDistributorCode && (
                            <span
                              className={`${(shouldGreyOutProduct(product) && "text-zinc-400") || "text-filter-light"} break-all text-xs font-medium`}
                            >
                              {/* {product?.internalCode === "NA"
                                ? "Not available in warehouse"
                                : product?.internalCode} */}
                              {isDistributorRoles
                                ? isNAProduct(product)
                                  ? "N/A"
                                  : product?.internalCode
                                : ""}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {showAddIcon && ORDERING_FEATURE_ENABLED && (
                      <>
                        {!shouldGreyOutProduct(product) ? (
                          <td className="py-3.5 px-2 relative">
                            {[
                              product.caseSkusId,
                              product.boxSkusId,
                              product.unitSkusId
                            ].includes(activeProduct?.skuId ?? "NA") && (
                              <ProductAddToCartActions
                                ORDERING_FEATURE_ENABLED={
                                  ORDERING_FEATURE_ENABLED
                                }
                                product={product}
                                activeProduct={activeProduct}
                                setActiveProduct={setActiveProduct}
                                cartItem={cartProducts?.find((item) =>
                                  [
                                    product.caseSkusId,
                                    product.boxSkusId,
                                    product.unitSkusId
                                  ].includes(item.productId)
                                )}
                                handleUpdateCart={handleUpdateCart}
                                handleAddToCart={handleAddToCart}
                                handleRemoverFromCart={handleRemoverFromCart}
                              />
                            )}

                            <CardButton
                              onClick={() => {
                                const cartItem = cartProducts?.find((item) =>
                                  [
                                    product.caseSkusId,
                                    product.boxSkusId,
                                    product.unitSkusId
                                  ].includes(item.productId)
                                );

                                if (cartItem) {
                                  setActiveProduct({
                                    ...product,
                                    skuId: cartItem.productId,
                                    quantityType: cartItem.quantityType,
                                    quantity: cartItem.quantity,
                                    itemId: cartItem.id
                                  });
                                } else {
                                  setActiveProduct({
                                    ...product,
                                    skuId:
                                      product.unitSkusId ??
                                      product.boxSkusId ??
                                      product.caseSkusId ??
                                      "NA",
                                    quantityType: CART_ITEM_QUANTITY_TYPE.UNIT,
                                    quantity: 1
                                  });
                                }
                              }}
                              className={`border border-border-gray bg-green rounded-full h-[32px] w-[32px] flex justify-center items-center relative`}
                              padding="p-0"
                              tooltip="Add to cart"
                            >
                              <Image
                                height={12}
                                width={12}
                                src={AddIcon.src}
                                alt="Add Icon"
                              />
                              {cartProducts?.find((item) =>
                                [
                                  product.caseSkusId,
                                  product.boxSkusId,
                                  product.unitSkusId
                                ].includes(item.productId)
                              ) && (
                                <div className="absolute -top-3 -right-2 bg-amber-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                                  {
                                    cartProducts?.find((item) =>
                                      [
                                        product.caseSkusId,
                                        product.boxSkusId,
                                        product.unitSkusId
                                      ].includes(item.productId)
                                    )?.quantity
                                  }
                                </div>
                              )}
                            </CardButton>
                          </td>
                        ) : (
                          <td></td>
                        )}
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="py-3.5 text-heading-very-light text-sm text-center"
                  >
                    {emptyListMessage
                      ? emptyListMessage
                      : MESSAGES.NO_RECORDS_FOUND}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="sticky top-0 bg-white border-b border-border-gray pb-2 font-semibold text-heading-very-light z-10">
              <th className="flex gap-2 w-full">
                <p className={`text-left pb-2 w-4`}>#</p>
                <p className={`text-left pb-2 px-2`}>Product Name</p>
                {/* {showProductsIcon && (
                  <p className="text-left pb-2 px-2 w-8"></p>
                )} */}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {allProducts?.length > 0 ? (
              allProducts.map((product, productIndex) => (
                <tr
                  key={`${product.name}-${productIndex}`}
                  className={`last:border-0 last:pb-0 border-b border-border-gray ${shouldGreyOutProduct(product) && "bg-[#f4f4f5]"} ${shouldGreyOutProduct(product) && "text-zinc-400"}`}
                >
                  <td
                    onClick={() => {
                      setExpandedProduct(
                        expandedProduct == productIndex ? -1 : productIndex
                      );
                      setActiveProduct(null);
                    }}
                  >
                    <div className="flex gap-2 w-full items-center">
                      <div className="py-2 w-3.5">{productIndex + 1}</div>
                      <div className="py-2 px-2 text-xs flex-1 flex gap-3 justify-between items-center">
                        <p
                          className={`w-full ${shouldGreyOutProduct(product) ? "text-zinc-400" : ""}`}
                        >
                          {getProductNameWithSizeAndCaseSku(
                            product.name,
                            product.size,
                            ""
                          )}
                        </p>
                        <div className="flex justify-between items-center gap-1.5">
                          {(showDistributorCode || showUpcCode) && (
                            <div className="pb-0.5 text-xl text-filter-light w-4">
                              {expandedProduct === productIndex ? "-" : "+"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedProduct == productIndex && (
                      <>
                        <div className="py-2 px-2 text-xs flex-1 grid grid-cols-2 gap-2 ml-6">
                          {showDistributorCode && (
                            <div className="mb-2">
                              <span className="text-filter-light text-[11px] font-medium">
                                Internal Code
                              </span>
                              <p
                                className={`break-all ${shouldGreyOutProduct(product) ? "text-zinc-400" : "text-highlighted-color"}`}
                              >
                                {product?.internalCode}
                              </p>
                            </div>
                          )}
                          {showUpcCode && (
                            <div className="mb-2">
                              <span className="text-filter-light text-[11px] font-medium">
                                UPC
                              </span>
                              <p
                                className={`${shouldGreyOutProduct(product) ? "text-zinc-400" : "text-highlighted-color"}`}
                              >
                                {product?.caseSkusId || "NA"}
                              </p>
                            </div>
                          )}
                          {showAddIcon && ORDERING_FEATURE_ENABLED && (
                            <div className="flex justify-end">
                              {!activeProduct ? (
                                (() => {
                                  const cartItem = cartProducts?.find((item) =>
                                    [
                                      product.caseSkusId,
                                      product.boxSkusId,
                                      product.unitSkusId
                                    ].includes(item.productId)
                                  );

                                  const skuId =
                                    cartItem?.productId ??
                                    product.unitSkusId ??
                                    product.boxSkusId ??
                                    product.caseSkusId ??
                                    "NA";

                                  const quantity = cartItem?.quantity ?? 1;
                                  const quantityType =
                                    cartItem?.quantityType ??
                                    CART_ITEM_QUANTITY_TYPE.UNIT;

                                  return (
                                    <CardButton
                                      onClick={(e: any) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveProduct({
                                          ...product,
                                          skuId,
                                          quantityType,
                                          quantity,
                                          ...(cartItem?.id && {
                                            itemId: cartItem.id
                                          })
                                        });
                                      }}
                                      className="border border-border-gray bg-green rounded flex justify-center items-center relative"
                                      padding="py-2 px-3"
                                      tooltip="Add to cart"
                                    >
                                      <Image
                                        height={12}
                                        width={12}
                                        src={AddIcon.src}
                                        alt="Add Icon"
                                      />

                                      {cartItem && (
                                        <div className="absolute -top-3 -right-2 bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                                          {cartItem.quantity}
                                        </div>
                                      )}
                                    </CardButton>
                                  );
                                })()
                              ) : (
                                <div className="flex gap-2 items-center">
                                  <CardButton
                                    onClick={(e: any) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setActiveProduct(null);
                                    }}
                                    className="border border-border-gray bg-gray-200 rounded flex justify-center items-center relative"
                                    padding="py-2 px-3"
                                  >
                                    <Image
                                      src={redCrossIcon}
                                      width={25}
                                      height={25}
                                      alt="cancel icon"
                                    />
                                  </CardButton>
                                  {activeProduct?.itemId && (
                                    <button
                                      className="cursor-pointer w-[25px] h-[25px] hover:opacity-90"
                                      onClick={(e) => {
                                        e?.preventDefault();
                                        e?.stopPropagation();
                                        if (activeProduct?.itemId)
                                          handleRemoverFromCart(
                                            activeProduct.itemId
                                          );
                                      }}
                                    >
                                      <Image
                                        src={DeleteIcon}
                                        width={25}
                                        height={25}
                                        alt="Delete Icon"
                                      />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {showAddIcon && ORDERING_FEATURE_ENABLED && (
                          <div className="py-3.5 px-2 relative w-full flex-1">
                            {[
                              product.caseSkusId,
                              product.boxSkusId,
                              product.unitSkusId
                            ].includes(activeProduct?.skuId ?? "NA") && (
                              <ProductAddToCartActions
                                ORDERING_FEATURE_ENABLED={
                                  ORDERING_FEATURE_ENABLED
                                }
                                product={product}
                                activeProduct={activeProduct}
                                setActiveProduct={setActiveProduct}
                                cartItem={cartProducts?.find((item) =>
                                  [
                                    product.caseSkusId,
                                    product.boxSkusId,
                                    product.unitSkusId
                                  ].includes(item.productId)
                                )}
                                handleUpdateCart={handleUpdateCart}
                                handleAddToCart={handleAddToCart}
                                handleRemoverFromCart={handleRemoverFromCart}
                                isMobileView
                              />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="py-3.5 text-heading-very-light text-sm text-center"
                >
                  {emptyListMessage
                    ? emptyListMessage
                    : MESSAGES.NO_RECORDS_FOUND}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProductsList;

const ProductAddToCartActions: React.FC<any> = ({
  ORDERING_FEATURE_ENABLED,
  product,
  activeProduct,
  setActiveProduct,
  cartItem,
  handleUpdateCart,
  handleAddToCart,
  handleRemoverFromCart,
  isMobileView
}) => {
  const user = getUserClient();
  const HIDE_ORDER_UNIT_TYPE = isQuantitySelectionEnabled(
    user?.parentEntityId ?? undefined
  );
  return (
    <div
      className={` ${isMobileView ? "bg-white border rounded-lg z-20 mr-2" : "absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow-2xl border rounded-lg z-20 z-[99]"} `}
    >
      <div
        className={`flex items-stretch space-x-4 p-3 ${isMobileView ? "justify-between" : ""}`}
      >
        <div className="flex ">
          <div className="flex items-center border rounded">
            <button
              onClick={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
                const qty = Number(activeProduct?.quantity || 1);
                if (qty > 1 && activeProduct) {
                  setActiveProduct({
                    ...activeProduct,
                    quantity: qty - 1
                  });
                }
              }}
              className="flex justify-center items-center h-[25px] w-[30px] border-r border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              disabled={Number(activeProduct?.quantity || 1) <= 1}
            >
              <Image
                height={20}
                width={20}
                className="max-h-8"
                src={MinusIcon}
                alt="Plus quantity Icon"
              />
            </button>
            <span className="px-1 py-1 text-sm font-semibold min-w-[30px] text-center">
              {activeProduct?.quantity || 1}
            </span>
            <button
              onClick={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
                if (!activeProduct) return;

                const qty = Number(activeProduct?.quantity || 1);
                setActiveProduct({
                  ...activeProduct,
                  quantity: qty + 1
                });
              }}
              className="flex justify-center items-center h-[25px] w-[30px] border-l border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            >
              <Image
                height={20}
                width={20}
                className="max-h-8"
                src={PlusIcon}
                alt="Plus quantity Icon"
              />
            </button>
          </div>

          {!HIDE_ORDER_UNIT_TYPE && (
            <select
              value={
                activeProduct?.quantityType || CART_ITEM_QUANTITY_TYPE.UNIT
              }
              onClick={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
              }}
              onChange={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
                if (!activeProduct) return;

                const skusIds = [
                  {
                    type: CART_ITEM_QUANTITY_TYPE.UNIT,
                    skuId: product.unitSkusId
                  },
                  {
                    type: CART_ITEM_QUANTITY_TYPE.BOX,
                    skuId: product.boxSkusId
                  },
                  {
                    type: CART_ITEM_QUANTITY_TYPE.CASE,
                    skuId: product.caseSkusId
                  }
                ];

                const type: any = e.target.value;
                const skuId: any = skusIds?.find(
                  (obj) => obj.type == type
                )?.skuId;

                setActiveProduct((prev: any) => ({
                  ...prev!,
                  quantityType: type,
                  skuId: skuId,
                  quantity: prev?.quantity ?? 1 // default if missing
                }));
              }}
              className="border rounded px-2 py-1 bg-white"
            >
              {[
                {
                  type: CART_ITEM_QUANTITY_TYPE.UNIT,
                  skuId: product.unitSkusId
                },
                {
                  type: CART_ITEM_QUANTITY_TYPE.BOX,
                  skuId: product.boxSkusId
                },
                {
                  type: CART_ITEM_QUANTITY_TYPE.CASE,
                  skuId: product.caseSkusId
                }
              ]
                .filter((t) => t.skuId != null)
                .map(({ type }) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
            </select>
          )}
        </div>

        <div className="flex space-x-2 items-center">
          {ORDERING_FEATURE_ENABLED && (
            <button
              onClick={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
                if (activeProduct) {
                  if (activeProduct?.itemId) {
                    handleUpdateCart(activeProduct);
                  } else {
                    handleAddToCart(
                      activeProduct.skuId,
                      Number(activeProduct.quantity || 1),
                      activeProduct.quantityType
                    );
                  }
                }
              }}
              className="bg-green text-white px-3 py-1 rounded hover:bg-opacity-90"
            >
              {cartItem ? "Update" : "Add"}
            </button>
          )}
          {!isMobileView && activeProduct?.itemId && (
            <button
              className="cursor-pointer w-[25px] h-[25px] hover:opacity-90"
              onClick={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
                if (activeProduct?.itemId)
                  handleRemoverFromCart(activeProduct.itemId);
              }}
            >
              <Image
                src={DeleteIcon}
                width={25}
                height={25}
                alt="Delete Icon"
              />
            </button>
          )}
          {!isMobileView && (
            <button
              onClick={(e) => {
                e?.preventDefault();
                e?.stopPropagation();
                setActiveProduct(null);
              }}
              className="w-[25px] h-[25px] hover:opacity-90"
            >
              <Image
                width={25}
                height={25}
                src={redCrossIcon}
                alt="cancel icon"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
