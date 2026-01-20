import { CART_ITEM_QUANTITY_TYPE } from "@/utils/constants";
import React, { useEffect } from "react";

import DeleteIcon from "@/assets/icons/redDeleteIcon.svg";
import { getUserClient } from "@/utils/getUserClient";
import { isQuantitySelectionEnabled } from "@/utils/helper";
import Image from "next/image";
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
  internal_code?: string;
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
  Product: CartProduct; // Using the newly defined CartProduct interface
  Store: { name: string }; // Using the newly defined CartProduct interface
}

interface OrderItemProps {
  id: number;
  name: string;
  brand: string;
  size: string;
  internalCode: string;
  quantity: number;
  quantityType?: string;
  cartItem?: any;
  onUpdateCartClick?: (item: any) => void;
  onRemoveCartClick?: (itemId: number) => void;
}

const OrderItemCard: React.FC<OrderItemProps> = ({
  name,
  brand,
  size,
  internalCode,
  quantity,
  quantityType,
  cartItem,
  onUpdateCartClick = () => {},
  onRemoveCartClick = () => {}
}) => {
  const user = getUserClient();
  const HIDE_ORDER_UNIT_TYPE = isQuantitySelectionEnabled(
    user?.parentEntityId ?? undefined
  );

  const [selectedItem, setSelectedItem] = React.useState<CartItem | null>(null);

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity <= 0) return;

    if (selectedItem == null) {
      setSelectedItem({ ...item, quantity: newQuantity });
      return;
    }

    setSelectedItem((prev) => ({
      ...prev!,
      quantity: newQuantity
    }));
  };

  const handleQuantityTypeChange = (
    item: CartItem,
    newQuantityType: string
  ) => {
    const skusIds = [
      {
        type: CART_ITEM_QUANTITY_TYPE.UNIT,
        skuId: item.Product.unit_skus_id
      },
      {
        type: CART_ITEM_QUANTITY_TYPE.BOX,
        skuId: item.Product.box_skus_id
      },
      {
        type: CART_ITEM_QUANTITY_TYPE.CASE,
        skuId: item.Product.case_skus_id
      }
    ];

    const skuId: any = skusIds?.find(
      (obj) => obj.type == newQuantityType
    )?.skuId;

    if (!selectedItem) {
      setSelectedItem({
        ...item,
        quantityType: newQuantityType,
        productId: skuId
      });
      return;
    }

    setSelectedItem((prev) => ({
      ...prev!,
      quantityType: newQuantityType,
      productId: skuId,
      quantity: prev?.quantity ?? 1 // default if missing
    }));
  };

  useEffect(() => {
    if (
      selectedItem &&
      selectedItem.quantity == cartItem?.quantity &&
      selectedItem.quantityType == cartItem?.quantityType &&
      selectedItem.productId == cartItem?.productId
    ) {
      setSelectedItem(null);
    }
  }, [cartItem, selectedItem]);

  return (
    <div className="flex items-start space-x-4 border border-border-gray p-4 rounded-lg relative">
      {/* add relevent no product image */}
      {/* <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
        <BoxIcon size={36} className="text-gray-400" strokeWidth={1.5} />
      </div> */}
      {/* Details */}
      <div className="flex-grow flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium pr-10">{name}</h4>
            <p className="text-sm text-gray-600">{brand}</p>
            <div className="mt-2 flex row items-center justify-start gap-4">
              {size && (
                <p className="text-sm text-gray-600">
                  Size:{" "}
                  <span className="font-medium text-gray-800">{size}</span>
                </p>
              )}
              {!cartItem && (
                <p className="text-sm text-gray-600">
                  Type:{" "}
                  <span className="font-medium text-gray-800">
                    {quantityType}
                  </span>
                </p>
              )}
            </div>
          </div>
          {cartItem && (
            <button
              className="cursor-pointer mt-1 hover:opacity-90 hover:bg-red-100 rounded-full p-1 absolute top-0 right-0.5"
              onClick={() => {
                onRemoveCartClick(cartItem?.id);
              }}
            >
              <Image
                src={DeleteIcon}
                width={20}
                height={20}
                alt="Delete Icon"
              />
            </button>
          )}
        </div>
        {!cartItem ? (
          <div className="mt-2 flex items-center justify-start gap-4">
            <div>
              <p className="text-sm text-gray-600">Internal Code</p>
              <p className="text-sm font-semibold">
                {internalCode?.trim() || "NA"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quantity</p>
              <p className="text-sm font-semibold">{quantity}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-2 flex items-center justify-start gap-4">
              <div>
                <p className="text-sm text-gray-600">Internal Code</p>
                <p className="text-sm font-semibold">
                  {internalCode?.trim() || "NA"}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium">Quantity</span>
                  <div className="flex items-center border border-border-gray rounded-md">
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          cartItem,
                          (selectedItem?.quantity || cartItem.quantity) - 1
                        )
                      }
                      disabled={
                        (selectedItem?.quantity || cartItem.quantity) <= 1
                      }
                      className="px-3 py-1 disabled:opacity-50 text-xl"
                    >
                      -
                    </button>
                    <div className="px-4 py-1 text-base font-semibold border-l border-r border-border-gray">
                      {selectedItem?.quantity || cartItem.quantity}
                    </div>
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          cartItem,
                          (selectedItem?.quantity || cartItem.quantity) + 1
                        )
                      }
                      className="px-3 py-1 text-xl"
                    >
                      +
                    </button>
                  </div>
                </div>
                {!HIDE_ORDER_UNIT_TYPE && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-medium">Type:</span>
                    <select
                      value={
                        selectedItem?.quantityType || cartItem.quantityType
                      }
                      onChange={(e) =>
                        handleQuantityTypeChange(cartItem, e.target.value)
                      }
                      className="px-2 py-1 border rounded text-sm"
                    >
                      {[
                        {
                          type: CART_ITEM_QUANTITY_TYPE.UNIT,
                          skuId: cartItem.Product.unit_skus_id
                        },
                        {
                          type: CART_ITEM_QUANTITY_TYPE.BOX,
                          skuId: cartItem.Product.box_skus_id
                        },
                        {
                          type: CART_ITEM_QUANTITY_TYPE.CASE,
                          skuId: cartItem.Product.case_skus_id
                        }
                      ]
                        .filter((t) => t.skuId != null)
                        .map(({ type }) => {
                          return (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    if (selectedItem) onUpdateCartClick(selectedItem);
                  }}
                  className="py-1 px-2 text-sm text-white bg-green rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedItem}
                >
                  Update Cart
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderItemCard;
