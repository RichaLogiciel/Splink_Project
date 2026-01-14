"use client";

import CartIcon from "@/assets/icons/greenCartIcon.svg";
import { APP_ROUTES } from "@/configs/routes";
import { useCart } from "@/contexts/CartContext";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

interface CartIconButtonProps {
  storeId: string;
}

const CartIconButton = ({ storeId }: CartIconButtonProps) => {
  const { cartCount, refreshCart } = useCart();

  useEffect(() => {
    refreshCart(storeId);
  }, [storeId, refreshCart]);

  return (
    <Link
      href={`${APP_ROUTES.store}/${storeId}/cart`}
      className="w-[45px] h-[45px] bg-gray-200 rounded-full flex items-center justify-center cursor-pointer relative"
    >
      <Image
        src={CartIcon.src}
        alt="Cart Icon"
        className="object-contain"
        width={24}
        height={24}
      />
      {cartCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-green text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
          {cartCount}
        </div>
      )}
    </Link>
  );
};

export default CartIconButton;
