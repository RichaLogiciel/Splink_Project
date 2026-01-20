import React from "react";

// Import components
import DashboardCard from "@/components/Elements/DashboardCard";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Images
import greenUserOutline from "@/assets/icons/greenUserOutline.svg";
import orangeStoreIcon from "@/assets/icons/orangeStoreIcon.svg";
import TotalManufacturerPartnersIcon from "@/assets/icons/total-manufacturer-partners.svg";
import TotalPurchaseVolumeIcon from "@/assets/icons/total-purchase-volume.svg";
import TotalSalesIcon from "@/assets/logo/total-sales.svg";
import {
  HIDE_PURCHASE_VOLUME_AND_ACTIVE_SIGNUPS_CARDS_FOR_DISTRIBUTOR_IDS,
  MINIMAL_FEATURE_FOR_SALES_REP_MANAGER_IDS,
  STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import { isDistributorFeatureEnabled } from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";
import StoreEarningCard from "../Elements/StoreEarningCard";

interface ExecutiveCardProps {
  totalSavings: string;
  totalPurchaseVolume: number;
  relevantPurchaseVolume: number;
  storesEnrolledInProgramsCount: number;
  showEnrolledStoresTile: boolean;
  storesCount: number;
  activeStoresCount: number;
  manufacturersCount: number;
  showEstimatedEarnings?: boolean;
  salesRepTotalEarnings?: number;
  salesRepManagerTotalEarnings?: number;
  showCsvDownloadButton?: boolean;
}

const ExecutiveCard: React.FC<ExecutiveCardProps> = ({
  totalSavings = "",
  totalPurchaseVolume = 0,
  relevantPurchaseVolume = 0,
  storesEnrolledInProgramsCount = 0,
  showEnrolledStoresTile = false,
  storesCount = 0,
  manufacturersCount = 0,
  activeStoresCount = 0,
  showEstimatedEarnings = true,
  salesRepTotalEarnings = 0,
  salesRepManagerTotalEarnings = 0,
  showCsvDownloadButton = false
}) => {
  const user = getUserServer();
  const distributorId = isDistributorAdmin(user?.role)
    ? user?.associatedUserId
    : user?.parentEntityId;
  const storeProgrammingEnabled = isDistributorFeatureEnabled(
    distributorId,
    STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const isSalesRepManager = isDistributorSalesRepManager(user?.role);
  const isGeneralManager = isDistributorGeneralManager(user?.role);

  const hidePurchaseVolumeAndActiveSignupsCards = isDistributorFeatureEnabled(
    distributorId,
    HIDE_PURCHASE_VOLUME_AND_ACTIVE_SIGNUPS_CARDS_FOR_DISTRIBUTOR_IDS
  );

  const isSalesRepManagerMinimal =
    isSalesRepManager &&
    isDistributorFeatureEnabled(
      isSalesRepManager ? user?.associatedUserId : distributorId,
      MINIMAL_FEATURE_FOR_SALES_REP_MANAGER_IDS
    );

  // Calculate how many cards will be visible to determine grid layout
  let visibleCardCount = 0;

  if (
    showEstimatedEarnings &&
    storeProgrammingEnabled &&
    !isSalesRepManagerMinimal
  ) {
    visibleCardCount++;
  }

  if (
    showEnrolledStoresTile &&
    storeProgrammingEnabled &&
    !isSalesRepManagerMinimal
  ) {
    visibleCardCount++;
  } else if (
    storeProgrammingEnabled &&
    !hidePurchaseVolumeAndActiveSignupsCards &&
    !isSalesRepManagerMinimal
  ) {
    visibleCardCount++;
  }

  if (
    storeProgrammingEnabled &&
    !hidePurchaseVolumeAndActiveSignupsCards &&
    !isSalesRepManagerMinimal
  ) {
    visibleCardCount++;
  }

  // Add new sales rep earnings cards when feature flag is enabled
  if (storeProgrammingEnabled && hidePurchaseVolumeAndActiveSignupsCards) {
    visibleCardCount += 2; // Sales Reps Total Earnings + Sales Rep Manager Total Earnings
  }

  // Manufacturer Partners card is always visible unless minimal feature is enabled
  if (!isSalesRepManagerMinimal) {
    visibleCardCount++;
  }

  // Determine grid columns based on visible card count
  let gridCols = "grid-cols-1";
  if (visibleCardCount === 1) {
    gridCols = "grid-cols-1";
  } else if (visibleCardCount === 2) {
    gridCols = "grid-cols-1 md:grid-cols-2";
  } else if (visibleCardCount === 3) {
    gridCols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  } else if (visibleCardCount === 4) {
    gridCols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
  }

  return (
    <div className={`grid ${gridCols} gap-4 md:gap-6 mb-8`}>
      {showEstimatedEarnings &&
        storeProgrammingEnabled &&
        !isSalesRepManagerMinimal && (
          <StoreEarningCard
            fullWidth
            icon={TotalSalesIcon.src}
            label={`Store Earnings`}
            // label={`${user?.name || "Estimated"} Earnings`}
            value={totalSavings}
            id="estimated-earnings"
            buttonLabel="Generate Report"
            showDownloadButton={showCsvDownloadButton}
          />
        )}

      {storeProgrammingEnabled && (isSalesRepManager || isGeneralManager) && (
        <DashboardCard
          fullWidth
          icon={greenUserOutline.src}
          label="My Earnings"
          value={`$${formatNumber(salesRepManagerTotalEarnings)}`}
          id="my-earnings"
        />
      )}

      {showEnrolledStoresTile &&
      storeProgrammingEnabled &&
      !isSalesRepManagerMinimal ? (
        <DashboardCard
          fullWidth
          icon={orangeStoreIcon.src}
          label="Stores Enrolled in Programs"
          value={formatNumber(storesEnrolledInProgramsCount)}
          id="stores-enrolled-in-programs"
        />
      ) : (
        storeProgrammingEnabled &&
        !hidePurchaseVolumeAndActiveSignupsCards &&
        !isSalesRepManagerMinimal && (
          <DashboardCard
            fullWidth
            icon={TotalPurchaseVolumeIcon.src}
            label="Purchase Volume"
            value={`$${formatNumber(relevantPurchaseVolume)}`}
            values={[
              `$${formatNumber(relevantPurchaseVolume)}`,
              `$${formatNumber(totalPurchaseVolume)}`
            ]}
            id="purchase-volume"
          />
        )
      )}

      {/* Show new sales rep earnings cards when feature flag is enabled */}
      {storeProgrammingEnabled && hidePurchaseVolumeAndActiveSignupsCards && (
        <DashboardCard
          fullWidth
          icon={TotalSalesIcon.src}
          label="Sales Reps Total Earnings"
          value={`$${formatNumber(salesRepTotalEarnings)}`}
          id="sales-reps-total-earnings"
        />
      )}

      {storeProgrammingEnabled &&
        !hidePurchaseVolumeAndActiveSignupsCards &&
        !isSalesRepManager &&
        !isGeneralManager && (
          <DashboardCard
            fullWidth
            icon={greenUserOutline.src}
            label="Active Program Sign-Ups"
            value={`${formatNumber(activeStoresCount)}`}
            id="active-stores"
          />
        )}

      {/* Show sales rep manager earnings card when feature flag is enabled */}
      {storeProgrammingEnabled && hidePurchaseVolumeAndActiveSignupsCards && (
        <DashboardCard
          fullWidth
          icon={TotalSalesIcon.src}
          label="Sales Manager Total Earnings"
          value={`$${formatNumber(salesRepManagerTotalEarnings)}`}
          id="sales-rep-manager-total-earnings"
        />
      )}
      {!isSalesRepManagerMinimal && (
        <DashboardCard
          fullWidth
          icon={TotalManufacturerPartnersIcon.src}
          label="Manufacturer Partners"
          value={`${formatNumber(manufacturersCount)}`}
          id="manufacturer-partners"
        />
      )}
    </div>
  );
};

export default ExecutiveCard;
