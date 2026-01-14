import React from "react";

import { getUserServer } from "@/utils/getUserServer";
import { USER_ROLES } from "@/configs/roles";
import StoreWishlist from "@/views/Store/Wishlist";
import NoAccess from "@/components/NoAccess";

export const dynamic = "force-dynamic";

const WishlistPage = async () => {
  const user = getUserServer();

  switch (user?.role) {
    case USER_ROLES.STORE:
    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return <StoreWishlist />;

    default:
      return (
        <>
          <b className="block pb-4">Role: {user?.role} - Wishlist</b>
          <NoAccess />
        </>
      );
  }
};

export default WishlistPage;
