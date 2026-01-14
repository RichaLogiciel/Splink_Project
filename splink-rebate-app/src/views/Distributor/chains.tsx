import type { Metadata } from "next";

// Import components
import Card from "../../components/Card";
import SearchField from "../../components/SearchField";
import StoreTable from "../../components/Table/StoreTable";

// Import API functions
import { fetchChainsData } from "./chainsAPIs";

// Import Types
import { fetchManagerWarehouseList } from "@/app/app/DashboardAPIs";
import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import { StoreListingApiResType, StoreProps } from "@/types/StoreTypes";
import { PAGINATION_PAGE_QUERY_PARAMS } from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isWarehouseFeatureEnabled
} from "@/utils/helper";
import {
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager
} from "@/utils/rolesConditions";
import { apiServerClient } from "@/lib/axiosServer";

export const metadata: Metadata = {
  title: "Chains",
  description: "View and manage all chains"
};

const Chains: React.FC<StoreProps> = async ({
  distributorId,
  searchParams
}) => {
  const startTime = Date.now();
  console.log(
    `[PERF] Starting Chains page load for distributorId: ${distributorId}`
  );

  const user = getUserServer();
  const isManager = isDistributorGeneralManager(user.role);

  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);

  console.log(`[PERF] Making optimized API call to /chain/listing`);
  const apiStartTime = Date.now();

  // Use the new lightweight /chain/listing endpoint
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );

  let apiUrl = `/chain/listing?distributorId=${distributorId}`;
  if (programTimeline) {
    apiUrl += `&programTimeline=${programTimeline}`;
  }
  if (searchParams?.sort) {
    apiUrl += `&sort=${searchParams.sort}`;
  }
  if (searchParams?.sortKey) {
    apiUrl += `&sortKey=${searchParams.sortKey}`;
  }
  if (searchParams?.page) {
    apiUrl += `&page=${searchParams.page}`;
  }
  if (searchParams?.s) {
    apiUrl += `&searchQuery=${encodeURIComponent(searchParams.s)}`;
  }

  console.log(`[PERF] Making API call to: ${apiUrl}`);

  const { data } = await apiServerClient.get(apiUrl);

  const apiEndTime = Date.now();
  console.log(`[PERF] API call completed in ${apiEndTime - apiStartTime}ms`);

  // Extract chains data from response
  let chainsData: any[] = [];
  if (
    data?.status === "success" &&
    data.data?.chains &&
    Array.isArray(data.data.chains)
  ) {
    chainsData = data.data.chains;
  } else if (data?.data?.chains && Array.isArray(data.data.chains)) {
    chainsData = data.data.chains;
  } else if (data?.chains && Array.isArray(data.chains)) {
    chainsData = data.chains;
  }

  console.log(`[PERF] Found ${chainsData.length} chains in response`);

  // Transform chains data for table display
  const transformStartTime = Date.now();
  const transformedChains = chainsData.map((chain: any) => ({
    id: chain.id.toString(),
    externalStoreId: chain.id,
    userInfo: {
      id: chain.id,
      status: "ACTIVE"
    },
    storeInfo: {
      name: chain.name,
      location: `${chain.totalStores} stores • ${chain.compliancePercentage?.toFixed(1) || 0}% compliant`,
      rep: null as any
    },
    salesData: {
      purchaseVolume: {
        amount: chain.totalPurchaseVolume || 0
      },
      totalSavings: {
        amount: chain.totalEarnedRebate || 0
      },
      totalOppSavings: {
        amount: 0
      },
      purchasedSkus: []
    },
    programData: {
      enrolledProgram: [],
      remainingProgram: [],
      completedPrograms: chain.compliantStores || 0,
      totalEnrolled: chain.totalStores || 0
    },
    chainId: chain.id,
    chainNames: chain.name,
    compliancePercentage: chain.compliancePercentage || 0,
    compliantStores: chain.compliantStores || 0,
    totalStores: chain.totalStores || 0
  }));

  const transformEndTime = Date.now();
  console.log(
    `[PERF] Data transformation completed in ${transformEndTime - transformStartTime}ms`
  );

  // Use the same data for both table display and chain expansion
  const chains = transformedChains;
  const chainStoresData = { stores: chainsData }; // Raw data for expansion
  const totalChains = data?.data?.totalChains || chains.length;
  const currentPage = searchParams?.currentPage || 1;
  const totalPages = data?.data?.totalPages || Math.ceil(totalChains / 50);

  const warehouses =
    isWarehouseFeatureEnabled(Number(distributorId ?? "")) &&
    (isManager || isAdminOrExecutive)
      ? await fetchManagerWarehouseList()
      : [];

  const totalTime = Date.now() - startTime;
  console.log(`[PERF] Total Chains page load completed in ${totalTime}ms`);

  return (
    <>
      <h2 className="mb-4 sm:mb-6 text-lg font-semibold">Chains</h2>
      <div className="flex gap-4 sm:gap-6 justify-between items-center flex-col sm:flex-row mb-4 sm:mb-6">
        <SearchField
          className="w-full sm:w-auto"
          pageVariable={PAGINATION_PAGE_QUERY_PARAMS.CURRENTPAGE}
        />
        <div className="flex flex-col gap-2 md:flex-row md:gap-4 text-sm font-medium justify-between w-full sm:w-auto">
          <ProgramTimelineOptionSelector />
          <WarehouseSelectFilter
            isManager={isManager || isAdminOrExecutive}
            warehouses={warehouses}
          />
        </div>
      </div>
      <Card className="mt-6 sm:mt-8 w-full">
        <StoreTable
          stores={chains}
          totalStores={totalChains}
          currentPage={currentPage}
          totalPages={totalPages}
          pageVariable="currentPage"
          canInvite={false}
          enablePurchaseSorting
          programTimeline={getProgramTimelineQueryParam(
            searchParams?.programTimeline
          )}
          isDistributorStores={false}
          isChainsView={true}
          chainStoresData={chainStoresData}
        />
      </Card>
    </>
  );
};

export default Chains;
