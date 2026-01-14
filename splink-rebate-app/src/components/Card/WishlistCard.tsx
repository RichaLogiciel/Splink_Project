"use client";

import React from "react";

// Import Components
import Card from "@/components/Card";
import Row from "@/components/Row";
import { MESSAGES } from "@/configs/messages";
import { getUserClient } from "@/utils/getUserClient";
import { dateFormatter, isDistributorFeatureEnabled } from "@/utils/helper";
import { STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS } from "@/utils/constants";
import { useRouter } from "next/navigation";

// Import Utils

interface WishlistDetail {
  storeId: string;
  storeName: string;
  productCount: number;
  lastUpdateDate: string;
}

interface WishlistOverviewCardProps {
  wishlistData: WishlistDetail[];
}

const WishlistOverviewCard: React.FC<WishlistOverviewCardProps> = ({
  wishlistData
}) => {
  const router = useRouter();

  const navigateToStore = (storeId: string) => {
    // Check if store programming is enabled for this distributor
    const user = getUserClient();
    const distributorId =
      user?.parentEntityId ?? user?.associatedUserId ?? null;
    const isStoreProgrammingEnabled = isDistributorFeatureEnabled(
      distributorId,
      STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
    );

    // If store programming is not enabled, default to tab 1, otherwise use tab 2
    const tab = isStoreProgrammingEnabled ? "2" : "1";
    router.push(`/app/store/${storeId}?store_tab_options=${tab}`);
  };

  return (
    <Card>
      <Row className="justify-between mb-4">
        <div className="text-s font-normal text-heading-very-light">
          Recent Wishlist
        </div>
      </Row>
      <div className="storeTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter">
        <table className="w-full border-collapse">
          <thead className="h-11 text-heading-very-light text-xs border-b border-border-gray">
            <tr>
              <th className="font-medium pr-4">Store Name</th>
              <th className="font-medium pr-4 text-center">No. of Products </th>
              <th className="font-medium pr-4 text-right">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {wishlistData?.length > 0 ? (
              wishlistData.map((wishlist, index) => (
                <tr
                  key={`${index}-${wishlist.storeName}`}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigateToStore(wishlist.storeId)}
                >
                  <td className="pr-4 py-3">{wishlist.storeName}</td>
                  <td className="pr-4 py-3 text-center">
                    {wishlist.productCount}
                  </td>
                  <td className="pr-4 py-3 text-right">
                    {dateFormatter(wishlist.lastUpdateDate)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="text-heading-very-light">
                <td className="text-center pt-4 text-sm" colSpan={3}>
                  {MESSAGES.NO_RECORDS_FOUND}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default WishlistOverviewCard;
