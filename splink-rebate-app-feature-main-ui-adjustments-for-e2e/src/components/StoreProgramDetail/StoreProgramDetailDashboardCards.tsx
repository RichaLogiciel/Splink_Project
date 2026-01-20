"use client";

import cartIcon from "@/assets/icons/cartIcon.svg";
import goalGreenIcon from "@/assets/icons/goalGreenIcon.svg";
import greenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import storeIcon from "@/assets/icons/storeIcon.svg";
import DashboardCard from "@/components/Elements/DashboardCard";
import { formatNumber } from "@/utils/numberFormatter";

interface SalesData {
  purchaseVolume: {
    amount: number;
    yoy?: number;
  };
  totalSavings: {
    amount: number;
    yoy?: number;
  };
}

interface StoreProgramDetailDashboardCardsProps {
  salesData: SalesData;
  totalEnrolledStores: number;
  totalStores: number;
  totalProgramEnrollments: number;
  totalProgramCompliances: number;
  isAuthorized: boolean;
  cardCount?: 3 | 4; // 3 for SalesRep, 4 for Distributor
}

const StoreProgramDetailDashboardCards: React.FC<
  StoreProgramDetailDashboardCardsProps
> = ({
  salesData,
  totalEnrolledStores,
  totalStores,
  totalProgramEnrollments,
  totalProgramCompliances,
  isAuthorized,
  cardCount = 4
}) => {
  const gridColsClass =
    cardCount === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-4";

  return (
    <div className={`grid ${gridColsClass} gap-[1rem] sm:gap-[1.5rem]`}>
      <DashboardCard
        id="sales-volume-card"
        fullWidth
        label="Sales Volume"
        icon={cartIcon.src}
        value={`$${formatNumber(salesData?.purchaseVolume?.amount ?? 0)}`}
        yoyValue={salesData?.purchaseVolume?.yoy}
      />
      <DashboardCard
        id="estimated-store-earnings-card"
        fullWidth
        label="Estimated Store Earnings"
        icon={greenDollarIcon.src}
        value={`$${formatNumber(salesData?.totalSavings?.amount ?? 0)}`}
        yoyValue={salesData?.totalSavings?.yoy}
        showEstimatedWarning={!isAuthorized}
      />
      <DashboardCard
        id="stores-enrolled-card"
        fullWidth
        label="Stores Enrolled"
        icon={storeIcon.src}
        value={`${formatNumber(
          totalEnrolledStores ?? 0
        )}<span class="text-[13px] text-heading-very-light font-semibold">/${formatNumber(
          totalStores
        )}<span> <span class="text-[13px] text-heading-light font-semibold ml-2">${formatNumber(totalStores ? ((totalEnrolledStores ?? 0) / totalStores) * 100 : 0, false, 1)}%</span>`}
      />
      {cardCount === 4 && (
        <DashboardCard
          id="programs-compliant-card"
          fullWidth
          label="Programs Compliant"
          icon={goalGreenIcon.src}
          value={`<span id="programs-compliant-card-value">${formatNumber(
            totalProgramCompliances ?? 0
          )}<span class="text-[13px] text-heading-very-light font-semibold">/${formatNumber(
            totalProgramEnrollments ?? 0
          )}</span></span> <span class="text-[13px] text-heading-light font-semibold ml-2">${formatNumber(totalProgramEnrollments ? ((totalProgramCompliances ?? 0) / totalProgramEnrollments) * 100 : 0, false, 1)}%</span>`}
        />
      )}
    </div>
  );
};

export default StoreProgramDetailDashboardCards;
