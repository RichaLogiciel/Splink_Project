import { apiServerClient } from "@/lib/axiosServer";

/**
 * Fetch key metrics for the Executive Dashboard
 * @param {string} distributorId - id of the distributor
 * @returns {Promise<any>} - a promise that resolves to the key metrics data
 */
export async function fetchExecutiveKeyMetrics(
  warehouseId?: string,
  programTimeline = "Current"
): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/dashboard/key-metrics?warehouseId=${warehouseId}&programTimeline=${programTimeline}`
    );

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch sales rep earnings data for the Executive Dashboard
 * @param {string} distributorId - id of the distributor
 * @returns {Promise<any>} - a promise that resolves to the sales rep earnings data
 */
export async function fetchExecutiveSalesRepEarnings({
  warehouseId,
  sort,
  sortKey,
  programTimeline = "Current"
}: {
  warehouseId?: string;
  sort?: string;
  sortKey?: string;
  programTimeline?: string;
}): Promise<any> {
  try {
    const url = `/dashboard/sales-rep-earnings?warehouseId=${warehouseId}&sortOrder=${sort}&sortBy=${sortKey}&programTimeline=${programTimeline}`;
    const { data } = await apiServerClient.get(url);
    return data;
  } catch (error) {
    return {
      totalSalesReps: 0,
      totalEarnings: 0,
      salesRepData: []
    };
  }
}

/**
 * Fetches the store program overview data for the Executive Dashboard.
 *
 * This function fetches data related to the store program overview for a given distributor.
 *
 * @param {string} distributorId - The ID of the distributor for which the store program overview is to be fetched.
 * @returns {Promise<any>} - A promise that resolves to the store program overview data, or null if an error occurs.
 */
export async function fetchExecutiveStoreProgram(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/dashboard/store-program-overview`
    );
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetches the store program overview data for a given sales representative.
 *
 * This function makes an API call to retrieve the top and bottom performing
 * programs for the sales representative's stores, grouped by manufacturers.
 *
 * @returns {Promise<any>} - A promise that resolves to the store program
 * overview data, or null if an error occurs.
 */
export async function fetchSalesRepStoreProgram(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/sales-rep/store-program-overview`
    );

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetches the sales representative earnings overview data.
 *
 * This function makes an API call to retrieve the earnings overview data for
 * a given sales representative, including the total savings and total sales.
 *
 * @param {string} salesRepId - The ID of the sales representative for whom
 * the earnings overview data is to be fetched.
 * @returns {Promise<any>} - A promise that resolves to the earnings overview
 * data, or null if an error occurs.
 */
export async function fetchSalesRepEarningsOverView(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(`/sales-rep/earning-overview`);

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetches all SPIFF opportunities for the sales representative.
 *
 * This function makes an API call to retrieve all SPIFF opportunities for the sales rep.
 *
 * @returns {Promise<any[]>} - A promise that resolves to the array of SPIFF opportunities, or an empty array if an error occurs.
 */
export async function fetchSalesRepAllSPIFFOpportunities(
  programTimeline = "Current"
): Promise<any[]> {
  try {
    console.log("fetching sales rep all SPIFF opportunities");
    const { data } = await apiServerClient.get(
      `/sales-rep/all-spiff-opportunities?programTimeline=${programTimeline}`
    );

    return data;
  } catch (error) {
    return [];
  }
}

/**
 * Fetches SPIFF summary data for distributor view (sales rep earnings overview).
 * This function makes an API call to retrieve SPIFF summary data from the distributor endpoint.
 *
 * @param {string} [programTimeline] - Optional program timeline filter
 * @param {boolean} [isInternal] - Optional internal programs filter
 * @returns {Promise<any[]>} - A promise that resolves to the array of SPIFF summary data, or an empty array if an error occurs.
 */
export async function fetchDistributorSpiffSummaryForEarnings({
  programTimeline = "Current",
  isInternal
}: {
  programTimeline?: string;
  isInternal?: boolean;
}): Promise<any[]> {
  try {
    const url = `/distributor/spiff-summary?programTimeline=${programTimeline}&isInternal=${isInternal}`;
    const { data } = await apiServerClient.get(url);
    return data;
  } catch (error) {
    console.error(
      "Failed to fetch distributor SPIFF summary for earnings:",
      error
    );
    return [];
  }
}

/**
 * Transforms distributor SPIFF summary data to SalesRepEarningDetail format
 * for use in SalesRepEarningsOverviewCard component.
 *
 * @param {any[]} distributorData - Raw data from /distributor/spiff-summary
 * @returns {any[]} - Transformed data matching the expected interface
 */
export function transformDistributorSpiffToEarningsFormat(
  distributorData: any[]
): any[] {
  if (!distributorData || !Array.isArray(distributorData)) {
    return [];
  }

  return distributorData.map((item: any) => ({
    ManufacturerId: item.id,
    ManufacturerName: item.manufacturer,
    ManufacturerLogo: item.logo,
    totalEarnedRebate: item.total_earnings?.toString() || "0"
  }));
}

/**
 * Fetches key metrics for a manufacturer.
 *
 * This function retrieves key metrics for a given manufacturer,
 * optionally filtered by distributor. It returns data related to
 * manufacturer performance metrics.
 *
 * @param {string} distributorId - The ID of the distributor to filter the metrics.
 * @returns {Promise<any>} - A promise that resolves to the key metrics data, or null if an error occurs.
 */
export async function fetchManufacturerKeyMetrics(
  distributorId: string
): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/manufacturer/key-metrics?distributorId=${distributorId}`
    );
    return data;
  } catch (error) {
    return null;
  }
}

export async function fetchManufacturerProductInsights(
  distributorId: string
): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/manufacturer/product-insights?distributorId=${distributorId}`
    );
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetches a list of distributors associated with a given manufacturer.
 *
 * This function sends a request to retrieve distributors for a specified manufacturer
 * using the manufacturer ID. It returns data related to the distributors.
 * @returns {Promise<any>} - A promise that resolves to the distributors' data, or false if an error occurs.
 */
export async function fetchDistributors(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/manufacturer/get-distributors`
    );
    return data;
  } catch (error) {
    return [];
  }
}

export async function fetchAuthorizedManufacturers(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(`/manufacturer/authorized`);
    return data;
  } catch (error) {
    return [];
  }
}

/**
 * Fetches a list of products associated with a given manufacturer.
 *
 * This function sends a request to retrieve products for a specified manufacturer
 * using the manufacturer ID. It returns data related to the products.
 * @returns {Promise<any>} - A promise that resolves to the products' data, or false if an error occurs.
 */
export async function fetchManufacturerProducts(
  manufacturerId?: number
): Promise<any> {
  try {
    const params = manufacturerId ? `?manufacturerId=${manufacturerId}` : "";
    const { data } = await apiServerClient.get(
      `/manufacturer/get-products${params}`
    );
    return data;
  } catch (error) {
    return [];
  }
}

/**
 * Fetches a list of stores associated with a given chain.
 *
 * This function sends a request to retrieve stores for a specified chain
 * It returns data related to the stores.
 * @returns {Promise<any>} - A promise that resolves to the stores' data, or false if an error occurs.
 */
export async function fetchChainStores(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(`/chain/get-stores`);
    return data;
  } catch (error) {
    return [];
  }
}

/**
 * Fetch all store chains from the API server.
 *
 * @returns {Promise<StoreChain[]>} The list of all store chains.
 */
export async function fetchStoreChains(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(`/store/get-store-chains`);

    // Handle different response structures
    if (Array.isArray(data)) {
      return data;
    } else if (data?.chains && Array.isArray(data.chains)) {
      return data.chains;
    } else if (data?.data?.chains && Array.isArray(data.data.chains)) {
      return data.data.chains;
    } else {
      console.warn("Unexpected store chains response structure:", data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching store chains:", error);
    return [];
  }
}

/**
 * Retrieves the compliance details for a manufacturer.
 * This function retrieves compliance details for programs associated with
 * a manufacturer. It optionally accepts a distributor ID to filter the
 * compliance details specific to that distributor.
 *
 * @param {string} [distributorId] - The optional ID of the distributor to
 * filter the compliance details.
 * @returns {Promise<any>} A promise that resolves to the compliance details
 * data, or false if an error occurs.
 */
export async function fetchManufacturerProgramsComplianceDetails(
  distributorId?: string
): Promise<any> {
  try {
    let url = `/manufacturer/get-compliances-details`;

    if (distributorId) {
      url += `?distributorId=${distributorId}`;
    }

    const { data } = await apiServerClient.get(url);
    return data;
  } catch (error) {
    return false;
  }
}

/**
 * Retrieves key metrics for a given store.
 *
 * This function retrieves key metrics associated with a store.
 *
 * @param {number} userId - The ID of the user for which key metrics are to be fetched.
 *
 * @returns {Promise<any>} A promise that resolves to the key metrics data, or null if an error occurs.
 */
export const getKeyMetrics = async (userId: number): Promise<any> => {
  try {
    const { data } = await apiServerClient.get(
      `/store/key-metrics?userId=${userId}`
    );

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Retrieves key metrics for a given chain.
 *
 * This function retrieves key metrics associated with a chain.
 *
 * @param {string} storeId - The ID of the store for which key metrics are to be fetched.
 *
 * @returns {Promise<any>} A promise that resolves to the key metrics data, or null if an error occurs.
 */
export const getChainKeyMetrics = async (storeId: string): Promise<any> => {
  try {
    const { data } = await apiServerClient.get(
      `/chain/key-metrics?storeId=${storeId}`
    );

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Fetches programs for a given user.
 *
 * This function sends a request to retrieve programs associated with a
 * specified user ID and type. It returns data related to the programs.
 *
 * @param {number} userId - The ID of the user whose programs are to be fetched.
 * @param {string} type - The type of programs to be fetched.
 * @returns {Promise<any>} - A promise that resolves to the programs' data, or null if an error occurs.
 */
export const getPrograms = async (
  userId: number,
  type: string,
  storeId?: string,
  programTimeline = "Current"
): Promise<any> => {
  try {
    let url = `/programs?userId=${userId}&type=${type}&programTimeline=${programTimeline}`;

    if (storeId) {
      url = `${url}&storeId=${storeId}`;
    }

    const { data } = await apiServerClient(url);
    return data;
  } catch (error) {
    return null;
  }
};

export async function fetchExecutiveSalesRepKeyMetrics(
  programTimeline = "Current"
): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/sales-rep/key-metrics?programTimeline=${programTimeline}`
    );
    return data;
  } catch (error) {
    return null;
  }
}

export async function fetchSalesRepStoreWishList(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(`/sales-rep/wishlist`);
    return data;
  } catch (error) {
    return null;
  }
}
export async function fetchSalesRepStoresEnrollment({
  warehouseId,
  programTimeline = "Current"
}: {
  warehouseId?: string;
  programTimeline?: string;
}): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/dashboard/store-program-enrollment?warehouseId=${warehouseId}&programTimeline=${programTimeline}`
    );
    return data;
  } catch (error) {
    return [];
  }
}

export async function fetchManagerWarehouseList(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `/distributor/get-manager-warehouses?returnAssigned=true`
    );
    return data;
  } catch (error) {
    return [];
  }
}

export async function fetchDistributorStoreEarnings({
  sort,
  sortKey,
  warehouseId,
  programTimeline = "Current"
}: {
  sort?: string;
  sortKey?: string;
  warehouseId?: string;
  programTimeline?: string;
}): Promise<any> {
  try {
    const url = `/dashboard/distributor-store-earnings?sortOrder=${sort}&sortBy=${sortKey}&warehouseId=${warehouseId}&programTimeline=${programTimeline}`;
    const { data } = await apiServerClient.get(url);

    return data;
  } catch (error) {
    return {
      stores: [],
      totalEarnings: 0
    };
  }
}

/**
 * Posts sales rep IDs to retrieve Void/Fill programs summary.
 * Optionally include excludeChainStore, warehouseId, warehouseIdFilter, and programId when provided.
 */
export async function getVoidFillProgramsSummary({
  salesRepIds,
  excludeChainStore,
  warehouseId,
  warehouseIdFilter = false,
  programId,
  isDownload,
  manufacturerId,
  programTimeline = "Current"
}: {
  salesRepIds?: number[];
  excludeChainStore?: boolean;
  warehouseId?: string;
  warehouseIdFilter?: boolean;
  programId?: number;
  isDownload?: boolean;
  manufacturerId?: number;
  programTimeline?: string;
}): Promise<any> {
  try {
    const body: any = {};

    // Only add salesRepIds if provided (not required when warehouseIdFilter is true)
    if (salesRepIds && salesRepIds.length > 0) {
      body.salesRepIds = salesRepIds;
    }

    if (excludeChainStore !== undefined) {
      body.excludeChainStore = excludeChainStore;
    }
    if (warehouseId && warehouseId !== "") {
      body.warehouseId = warehouseId;
    }

    body.warehouseIdFilter = warehouseIdFilter;

    if (programId !== undefined) {
      body.programId = programId;
    }

    if (isDownload) {
      body.isDownload = "true";
    }

    if (manufacturerId) {
      body.manufacturerId = manufacturerId;
    }

    if (programTimeline) {
      body.programTimeline = programTimeline;
    }

    const { data } = await apiServerClient.post(
      `/programs/get-void-fill-programs-summary`,
      body
    );
    return data;
  } catch (error) {
    return { status: "error", data: [] };
  }
}
