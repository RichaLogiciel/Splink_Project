import { apiServerClient } from "@/lib/axiosServer";
import { StoreListingApiResType } from "@/types/StoreTypes";

/**
 * Transforms chains data into the format expected by StoreTable
 */
function transformChainsToStoreFormat(chains: any[]): any[] {
  return chains.map((chain: any) => ({
    id: chain.id.toString(),
    externalStoreId: chain.id,
    userInfo: {
      id: chain.id,
      status: "ACTIVE"
    },
    storeInfo: {
      name: chain.name,
      location: `${chain.totalStores} stores • ${chain.compliancePercentage?.toFixed(1) || 0}% compliant`,
      rep: null
    },
    salesData: {
      purchaseVolume: {
        amount: chain.totalPurchaseVolume || 0
      },
      totalSavings: {
        amount: chain.totalEarnedRebate || 0
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
    // Add compliance data for display
    compliancePercentage: chain.compliancePercentage || 0,
    compliantStores: chain.compliantStores || 0,
    totalStores: chain.totalStores || 0
  }));
}

/**
 * Fetches chains data in the format expected by StoreTable
 */
export async function fetchChainsData(
  distributorId: string,
  page: number = 1,
  searchQuery: string = "",
  _selectedSalesRepId: string = "",
  sort: string = "ASC",
  _chainId: string = "",
  sortKey: string = "sort",
  warehouseId?: string,
  returnSpiffEarning?: boolean,
  programTimeline?: string
): Promise<StoreListingApiResType> {
  const startTime = Date.now();
  console.log(
    `[PERF] Starting fetchChainsData for distributorId: ${distributorId}`
  );

  try {
    // Build API URL with programTimeline parameter - use new /chain/listing endpoint
    let apiUrl = `/chain/listing?distributorId=${distributorId}`;
    if (programTimeline) {
      apiUrl += `&programTimeline=${programTimeline}`;
    }

    // Map sort keys to API expected values
    let apiSortKey = sortKey;
    if (sortKey === "SORT" || sortKey === "sort") {
      apiSortKey = "chain_name";
    } else if (sortKey === "PURCHASE_VOLUME_SORT") {
      apiSortKey = "total_purchase_volume";
    } else if (sortKey === "TOTAL_SAVINGS_SORT") {
      apiSortKey = "total_rebate_amount";
    } else if (sortKey === "STORE_COUNT_SORT") {
      apiSortKey = "total_stores";
    } else if (sortKey === "NEAR_COMPLIANCE_PERCENTAGE") {
      apiSortKey = "near_compliance_percentage";
    }

    // Add pagination and search parameters
    if (page > 1) {
      apiUrl += `&page=${page}`;
    }
    if (searchQuery) {
      apiUrl += `&searchQuery=${encodeURIComponent(searchQuery)}`;
    }
    if (sort) {
      apiUrl += `&sort=${sort}`;
    }
    if (apiSortKey) {
      apiUrl += `&sortKey=${apiSortKey}`;
    }

    console.log(`[PERF] Making API call to: ${apiUrl}`);
    const apiStartTime = Date.now();

    const { data: responseData } = await apiServerClient.get(apiUrl);

    const apiEndTime = Date.now();
    console.log(`[PERF] API call completed in ${apiEndTime - apiStartTime}ms`);

    // Handle the response structure: { "status": "success", "data": { "chains": [...] } }
    let chainsData: any[] = [];

    if (
      responseData?.status === "success" &&
      responseData.data?.chains &&
      Array.isArray(responseData.data.chains)
    ) {
      chainsData = responseData.data.chains;
    } else if (
      responseData?.data?.chains &&
      Array.isArray(responseData.data.chains)
    ) {
      chainsData = responseData.data.chains;
    } else if (responseData?.chains && Array.isArray(responseData.chains)) {
      chainsData = responseData.chains;
    } else {
      chainsData = [];
    }

    console.log(`[PERF] Found ${chainsData.length} chains in response`);

    // Transform chains data to match StoreTable format
    const transformStartTime = Date.now();
    const transformedChains = transformChainsToStoreFormat(chainsData);
    const transformEndTime = Date.now();
    console.log(
      `[PERF] Data transformation completed in ${transformEndTime - transformStartTime}ms`
    );

    // Get pagination info from API response
    const totalChains =
      responseData?.data?.totalChains || transformedChains.length;
    const totalPages =
      responseData?.data?.totalPages || Math.ceil(totalChains / 50);

    const totalTime = Date.now() - startTime;
    console.log(`[PERF] Total fetchChainsData completed in ${totalTime}ms`);

    return {
      stores: transformedChains,
      totalStores: totalChains,
      currentPage: page,
      totalPages: totalPages
    };
  } catch (error) {
    console.error("Error in fetchChainsData:", error);
    return {
      stores: [],
      totalStores: 0,
      currentPage: 1,
      totalPages: 1
    };
  }
}

/**
 * Fetches sales reps data (placeholder for chains - might not be used)
 */
export async function fetchSalesReps(
  distributorId: string,
  user?: any,
  warehouseId: string = ""
) {
  try {
    const { data } = await apiServerClient.get(
      `/store/getSalesReps/${distributorId}?warehouseId=${warehouseId}`
    );
    return data;
  } catch (error) {
    return { salesReps: [] };
  }
}

/**
 * Fetches sales reps data for a sales rep manager
 */
export async function fetchSalesRepsForSalesRepManager(
  salesRepManagerId: string,
  distributorId: string,
  warehouseId: string = ""
) {
  try {
    const { data } = await apiServerClient.get(
      `/store/getSalesRep/salesRepManager/${distributorId}?salesRepManagerId=${salesRepManagerId}&warehouseId=${warehouseId}`
    );
    return data?.salesReps;
  } catch (error) {
    return [];
  }
}
