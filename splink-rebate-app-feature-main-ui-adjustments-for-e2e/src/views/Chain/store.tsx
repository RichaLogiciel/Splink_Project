import type { Metadata } from "next";

// Import components
import Card from "@/components/Card";
import SearchField from "@/components/SearchField";
import StoreTable from "@/components/Table/StoreTable";

// Import API functions
import { fetchData } from "./storeAPIs";

// Import Types
import { StoreListingApiResType, StoreProps } from "@/types/StoreTypes";
import { PAGINATION_PAGE_QUERY_PARAMS } from "@/utils/constants";

export const metadata: Metadata = {
  title: "Stores",
  description: "View and manage all stores"
};

const Store: React.FC<StoreProps> = async ({ searchParams }) => {
  const {
    stores,
    totalStores,
    currentPage,
    totalPages
  }: StoreListingApiResType = await fetchData(
    searchParams?.currentPage || 1,
    searchParams?.s,
    searchParams?.sort,
    searchParams?.sortKey
  );

  return (
    <>
      <h2 className="mb-4 sm:mb-6 text-lg font-semibold">Store</h2>
      <div className="flex gap-4 sm:gap-6 justify-between items-center flex-col sm:flex-row mb-4 sm:mb-6">
        <SearchField
          className="w-full sm:w-auto"
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
        />
      </div>
      <Card className="mt-6 sm:mt-8 w-full">
        <StoreTable
          stores={stores}
          totalStores={totalStores}
          currentPage={currentPage}
          totalPages={totalPages}
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
          canInvite
          enablePurchaseSorting
        />
      </Card>
    </>
  );
};

export default Store;
