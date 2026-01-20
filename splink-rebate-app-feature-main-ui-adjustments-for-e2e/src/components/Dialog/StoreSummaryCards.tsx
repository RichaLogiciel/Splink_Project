import React from "react";
import Image from "next/image";
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import { formatNumber } from "@/utils/numberFormatter";

interface StoreSummaryCardsProps {
  purchaseVolume: number;
  earnedRebate: number;
  earningsOpp: number;
}

const StoreSummaryCards: React.FC<StoreSummaryCardsProps> = ({
  purchaseVolume,
  earnedRebate,
  earningsOpp
}) => {
  return (
    <div className="grid gap-4 grid-cols-2">
      <div id="estimated-earnings" className="mt-6 border rounded-lg p-3">
        <div className="flex gap-1.5 items-center">
          <Image
            height={19}
            width={19}
            src={GreenDollarIcon.src}
            alt="Total Purchase Volume Icon"
          />
          <span className="text-sm font-medium text-heading-light">
            Estimated Earnings
          </span>
        </div>
        <span className="flex items-center mt-3">
          <p className="font-bold text-lg">${formatNumber(earnedRebate)}</p>
        </span>
      </div>
      <div id="incremental-earnings" className="mt-6 border rounded-lg p-3">
        <div className="flex gap-1.5 items-center">
          <Image
            height={19}
            width={19}
            src={GreenDollarIcon.src}
            alt="Total Purchase Volume Icon"
          />
          <span className="text-sm font-medium text-heading-light">
            Incremental Earnings Opp.
          </span>
        </div>
        <span className="flex items-center mt-3">
          <p className="font-bold text-lg">${formatNumber(earningsOpp)}</p>
        </span>
      </div>
    </div>
  );
};

export default StoreSummaryCards;
