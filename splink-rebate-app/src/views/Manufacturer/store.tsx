import type { Metadata } from "next";

// Import components
import Card from "@/components/Card";
import SearchField from "@/components/SearchField";
import StoreTable from "@/components/Table/StoreTable";

// Import API functions
import { fetchData } from "./storeAPIs";

// Import Types
import { fetchDistributors } from "@/app/app/DashboardAPIs";
import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import SelectFilter from "@/components/SelectFilter";
import { StoreListingApiResType, StoreProps } from "@/types/StoreTypes";
import { PAGINATION_PAGE_QUERY_PARAMS } from "@/utils/constants";
import { getProgramTimelineQueryParam } from "@/utils/helper";

export const metadata: Metadata = {
  title: "Stores",
  description: "View and manage all stores"
};

const Store: React.FC<StoreProps> = async ({
  searchParams,
  manufacturerId
}) => {
  const {
    stores,
    totalStores,
    currentPage,
    totalPages
  }: StoreListingApiResType = await fetchData(
    manufacturerId!,
    searchParams?.currentPage || 1,
    searchParams?.s,
    searchParams?.dtId,
    searchParams?.sort,
    searchParams?.sortKey,
    getProgramTimelineQueryParam(searchParams?.programTimeline),
    false
  );

  const distributors = await fetchDistributors();

  return (
    <>
      <h2 className="mb-4 sm:mb-6 text-lg font-semibold">Store</h2>
      <div className="flex gap-4 sm:gap-6 justify-between items-center flex-col sm:flex-row mb-4 sm:mb-6">
        <SearchField
          className="w-full sm:w-auto"
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
        />
        <div className="flex gap-4 text-sm font-medium justify-between w-full sm:w-auto">
          <ProgramTimelineOptionSelector />
          <SelectFilter
            options={[
              { value: "", label: "All Distributors" },
              // eslint-disable-next-line no-unsafe-optional-chaining
              ...distributors?.map((dt: any) => ({
                value: dt.associatedUserId,
                label: dt.name
              }))
            ]}
            queryParam="dtId"
            className="text-xs outline-none rounded p-2 border border-border-gray w-full"
          />
        </div>
      </div>
      <Card className="mt-6 sm:mt-8 w-full">
        <StoreTable
          stores={stores}
          totalStores={totalStores}
          currentPage={currentPage}
          totalPages={totalPages}
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
          isDistributorStores
          enablePurchaseSorting
          programTimeline={getProgramTimelineQueryParam(
            searchParams?.programTimeline
          )}
          isIndependentStores={true}
        />
      </Card>
    </>
  );
};

export default Store;
