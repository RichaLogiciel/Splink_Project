import React from "react";

// Import components
import DashboardCard from "@/components/Elements/DashboardCard";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Images
// import orangeStoreIcon from "@/assets/icons/orangeStoreIcon.svg";
import TotalPurchaseVolumeIcon from "@/assets/icons/total-purchase-volume.svg";
import TotalSalesIcon from "@/assets/logo/total-sales.svg";

interface TopKeyMetricsCard {
  totalSavings: number;
  storesCount: number;
  totalStoreProgram: number;
  totalActiveStores: number;
  pendingPayoutEarning?: number;
  showStoreProgramsCard?: boolean;
  showCurrentEarningsCard?: boolean;
}

const TopKeyMetricsCard: React.FC<TopKeyMetricsCard> = ({
  totalSavings = 0,
  // storesCount = 0,
  totalStoreProgram = 0,
  // totalActiveStores = 0
  pendingPayoutEarning,
  showStoreProgramsCard = true,
  showCurrentEarningsCard = true
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {showCurrentEarningsCard && (
        <DashboardCard
          icon={TotalSalesIcon.src}
          label="Current Earnings"
          value={`$${formatNumber(totalSavings)}`}
          fullWidth
          rightSideLabel={"Pending Payout"}
          rightSideValue={
            pendingPayoutEarning != undefined
              ? `$${formatNumber(pendingPayoutEarning)}`
              : undefined
          }
          switcherLabel="Pending Payout"
          id="my-spiff-earnings"
        />
      )}
      {/* <DashboardCard
        icon={orangeStoreIcon.src}
        label="Active Stores on Splink"
        value={`${formatNumber(
          totalActiveStores
        )}<span class="text-[13px] text-heading-very-light font-semibold">/${formatNumber(
          storesCount
        )}<span>`}
        fullWidth
      /> */}
      {showStoreProgramsCard && (
        <DashboardCard
          icon={TotalPurchaseVolumeIcon.src}
          label="Store Programs"
          value={`${formatNumber(totalStoreProgram)}`}
          fullWidth
          id="store-programs-available"
        />
      )}
    </div>
  );
};

export default TopKeyMetricsCard;
