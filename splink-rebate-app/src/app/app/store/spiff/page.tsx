export const dynamic = "force-dynamic";

import type { Metadata } from "next";

// Import components
import Card from "@/components/Card";
import SearchField from "@/components/SearchField";
import StoreNavigationTabs from "@/components/StoreNavigationTabs";

// Import API functions

// Import Types
import { fetchStoreChains } from "@/app/app/DashboardAPIs";
import SelectFilter from "@/components/SelectFilter";
import SpiffTable from "@/components/Table/SpiffTable";
import { StoreListingApiResType, StoreProps } from "@/types/StoreTypes";
import {
  PAGINATION_PAGE_QUERY_PARAMS,
  SPIFF_OPPORTUNITIES_FEATURE
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import { getProgramTimelineQueryParam } from "@/utils/helper";
import { fetchData } from "@/views/Distributor/storeAPIs";

export const metadata: Metadata = {
  title: "Stores",
  description: "View and manage all stores"
};

const Page: React.FC<StoreProps> = async ({ searchParams }) => {
  const user = getUserServer();
  const salesRepUserId = user?.id;
  const distributorId = user?.parentEntityId;

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
    warehouseId: searchParams?.warehouseId,
    programTimeline: getProgramTimelineQueryParam(
      searchParams?.programTimeline
    ),
    returnSpiffEarning: true,
    isInternal: false
  });

  if (!SPIFF_OPPORTUNITIES_FEATURE) {
    return (
      <h4 className="font-semibold text-highlighted-color">
        SPIFF Opportunities Feature is not enabled
      </h4>
    );
  }

  const storeChains = await fetchStoreChains();

  return (
    <>
      <h2 className="mb-3 text-lg font-semibold">Store Breakdown</h2>
      <StoreNavigationTabs />

      <div className="flex gap-4 sm:gap-6 justify-between items-center flex-col sm:flex-row mb-4 sm:mb-6">
        <SearchField
          className="w-full sm:w-auto"
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
        />
        <div className="flex gap-4 text-sm font-medium justify-between w-full sm:w-auto">
          {/* <ProgramTimelineOptionSelector /> */}

          <SelectFilter
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
          />
        </div>
      </div>
      <Card className="mt-6 sm:mt-8 w-full">
        <SpiffTable
          stores={stores}
          totalStores={totalStores}
          currentPage={currentPage}
          totalPages={totalPages}
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
          isSalesRep
          canInvite={true}
          enablePurchaseSorting
          isInternal={false}
        />
      </Card>
    </>
  );
};

export default Page;
