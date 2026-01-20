export const dynamic = "force-dynamic";

import type { Metadata } from "next";

// Import components
import Card from "../../components/Card";
import SearchField from "../../components/SearchField";
import StoreTable from "../../components/Table/StoreTable";

// Import API functions
import { fetchData, fetchSalesReps } from "./storeAPIs";

// Import Types
import { fetchManagerWarehouseList } from "@/app/app/DashboardAPIs";
import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import SelectFilter from "@/components/SelectFilter";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import { StoreListingApiResType, StoreProps } from "@/types/StoreTypes";
import {
  CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  PAGINATION_PAGE_QUERY_PARAMS,
  SHOW_ENABLED_DSD_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled,
  isWarehouseFeatureEnabled
} from "@/utils/helper";
import {
  getParentDistributorId,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";

export const metadata: Metadata = {
  title: "Stores",
  description: "View and manage all stores"
};

const Store: React.FC<StoreProps> = async ({
  distributorId,
  searchParams,
  showAnnualPurchaseVolume: showAnnualPurchaseVolumeProp
}) => {
  const user = getUserServer();
  const isManager = isDistributorGeneralManager(user.role);

  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);
  const isSalesRepManager = isDistributorSalesRepManager(user.role);

  // Determine if chain stores should be excluded based on feature flag
  const isChainProgramsEnabled = isDistributorFeatureEnabled(
    Number(distributorId),
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // Check if default upcoming is enabled for distributor
  const defaultUpcomingEnabled = isDistributorFeatureEnabled(
    Number(getParentDistributorId(user.role, user)),
    DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const programTimeline =
    searchParams?.programTimeline ||
    getProgramTimelineQueryParam(
      defaultUpcomingEnabled ? "Upcoming" : "Current"
    );

  // Check if Annual Purchase Volume column should be shown
  // Use prop if provided (for sales manager role), otherwise calculate using associatedUserId
  const showAnnualPurchaseVolume =
    showAnnualPurchaseVolumeProp !== undefined
      ? showAnnualPurchaseVolumeProp
      : isDistributorFeatureEnabled(
          user.associatedUserId,
          SHOW_ENABLED_DSD_DISTRIBUTOR_IDS
        );

  const {
    stores,
    totalStores,
    currentPage,
    totalPages
  }: StoreListingApiResType = await fetchData({
    distributorId: distributorId!,
    page: searchParams?.currentPage || 1,
    searchQuery: searchParams?.s,
    selectedSalesRepId: searchParams?.srId || "",
    sort: searchParams?.sort,
    chainId: searchParams?.chainId,
    sortKey: searchParams?.sortKey,
    warehouseId: searchParams?.warehouseId,
    programTimeline,
    isInternal: false,
    isExcludeChainStores: false
  });

  const warehouses =
    isWarehouseFeatureEnabled(Number(distributorId ?? "")) &&
    (isManager || isAdminOrExecutive)
      ? await fetchManagerWarehouseList()
      : [];

  const { salesReps } = await fetchSalesReps(distributorId || "", user);
  // const storeChains = await fetchStoreChains();

  return (
    <>
      <h2 className="mb-4 sm:mb-6 text-lg font-semibold">Store</h2>
      <div className="flex gap-4 sm:gap-6 justify-between items-center flex-col sm:flex-row mb-4 sm:mb-6">
        <SearchField
          className="w-full sm:w-auto"
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
        />
        <div className="flex flex-col gap-2 md:flex-row md:gap-4 text-sm font-medium justify-between w-full sm:w-auto">
          <ProgramTimelineOptionSelector />
          <SelectFilter
            options={[
              { value: "", label: "All Sales Reps" },
              // eslint-disable-next-line no-unsafe-optional-chaining
              ...salesReps?.map((sr: any) => ({ value: sr.id, label: sr.name }))
            ]}
            className="text-xs outline-none rounded p-2 border border-border-gray"
          />

          {/* <SelectFilter
            options={[
              { value: "", label: "Chain" },
              // eslint-disable-next-line no-unsafe-optional-chaining
              ...storeChains?.map((dt: any) => ({
                value: dt.id,
                label: dt.name
              }))
            ]}
            queryParam="chainId"
            className="text-xs outline-none rounded p-2 border border-border-gray"
          /> */}

          {!isSalesRepManager && !isManager && (
            <WarehouseSelectFilter
              isManager={isAdminOrExecutive}
              warehouses={warehouses}
            />
          )}
        </div>
      </div>
      <Card className="mt-6 sm:mt-8 w-full">
        <StoreTable
          stores={stores}
          totalStores={totalStores}
          currentPage={currentPage}
          totalPages={totalPages}
          pageVariable="currentPage"
          canInvite
          enablePurchaseSorting
          salesReps={salesReps}
          programTimeline={programTimeline}
          isIndependentStores={true}
          showAnnualPurchaseVolume={showAnnualPurchaseVolume}
        />
      </Card>
    </>
  );
};

export default Store;
