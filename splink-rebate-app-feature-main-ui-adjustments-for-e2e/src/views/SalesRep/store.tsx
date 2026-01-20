import type { Metadata } from "next";

// Import components
import Card from "../../components/Card";
import SearchField from "../../components/SearchField";
import StoreTable from "../../components/Table/StoreTable";

// Import API functions
import { fetchData } from "../Distributor/storeAPIs";

// Import Types
import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import { StoreListingApiResType, StoreProps } from "@/types/StoreTypes";
import {
  CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  PAGINATION_PAGE_QUERY_PARAMS,
  SPIFF_OPPORTUNITIES_FEATURE
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import { getParentDistributorId } from "@/utils/rolesConditions";

export const metadata: Metadata = {
  title: "Stores",
  description: "View and manage all stores"
};

const Store: React.FC<StoreProps> = async ({
  distributorId,
  searchParams,
  showAnnualPurchaseVolume
}) => {
  const user = getUserServer();
  const salesRepUserId = user?.id;

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

  // Determine if chain stores should be excluded based on feature flag
  const isChainProgramsEnabled = isDistributorFeatureEnabled(
    Number(distributorId),
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
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
    selectedSalesRepId: salesRepUserId ?? searchParams?.srId,
    sort: searchParams?.sort,
    chainId: searchParams?.chainId,
    sortKey: searchParams?.sortKey,
    programTimeline: programTimeline,
    isInternal: false,
    isExcludeChainStores: isChainProgramsEnabled
  });

  // const storeChains = await fetchStoreChains();

  return (
    <>
      <h2 className="mb-6 text-lg font-semibold">
        Store {SPIFF_OPPORTUNITIES_FEATURE && "Breakdown"}
      </h2>

      <div className="flex gap-4 sm:gap-6 justify-between items-center flex-col sm:flex-row mb-4 sm:mb-6">
        <SearchField
          className="w-full sm:w-auto"
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
        />
        <div className="flex gap-4 text-sm font-medium justify-between w-full sm:w-auto">
          <ProgramTimelineOptionSelector />
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
            className="text-xs outline-none rounded p-2 border border-border-gray w-full"
          /> */}
        </div>
      </div>
      <Card className="mt-6 sm:mt-8 w-full">
        <StoreTable
          stores={stores}
          totalStores={totalStores}
          currentPage={currentPage}
          totalPages={totalPages}
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
          isSalesRep
          canInvite={true}
          enablePurchaseSorting
          programTimeline={programTimeline}
          isIndependentStores={true}
          showAnnualPurchaseVolume={showAnnualPurchaseVolume}
        />
      </Card>
    </>
  );
};

export default Store;
