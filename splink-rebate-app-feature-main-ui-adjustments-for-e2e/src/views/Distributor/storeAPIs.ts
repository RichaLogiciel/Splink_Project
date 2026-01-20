import { apiServerClient } from "@/lib/axiosServer";
import { isDistributorSalesRepManager } from "@/utils/rolesConditions";
import { getV2ApiUrl, shouldUseV2Api } from "@/utils/urlHelper";
import { getUserServer } from "@/utils/getUserServer";

/**
 * Retrieves a list of stores for a distributor.
 *
 * The result includes the store name, total amount of sales, and the distributor ID.
 * The query can be filtered by a search query and a specific distributor ID.
 * The results are paginated and sorted in ascending or descending order.
 *
 * @param {string} distributorId - The ID of the distributor for which the stores are to be fetched.
 * @param {number} page - The page number for pagination. Default is 1.
 * @param {string} searchQuery - Optional search query to filter the store results. Default is an empty string.
 * @param {string} selectedSalesRepId - Optional ID of the sales rep to filter the results. Default is an empty string.
 * @param {string} sort - The order in which the results should be sorted, either DESC or ASC. Default is ASC.
 *
 * @returns {Promise<StoreListingApiResType>} - A promise that resolves to an object containing the store information.
 */
export async function fetchData({
  distributorId,
  page = 1,
  searchQuery = "",
  selectedSalesRepId = "",
  sort = "ASC",
  chainId = "",
  sortKey = "sort",
  warehouseId,
  returnSpiffEarning,
  programTimeline,
  isInternal = false,
  isExcludeChainStores = false
}: {
  distributorId: string;
  page: number;
  searchQuery: any;
  selectedSalesRepId: string;
  sort?: string;
  chainId?: string;
  sortKey?: string;
  warehouseId?: string;
  returnSpiffEarning?: boolean;
  programTimeline?: string;
  isInternal?: boolean;
  isExcludeChainStores?: boolean;
}) {
  try {
    // Build query parameters only when they have values
    // Decode searchQuery only if it's already URL-encoded to prevent double-encoding
    let decodedSearchQuery = searchQuery || "";
    if (decodedSearchQuery && /%[0-9A-Fa-f]{2}/.test(decodedSearchQuery)) {
      try {
        decodedSearchQuery = decodeURIComponent(decodedSearchQuery);
      } catch (e) {
        // If decoding fails, use the original value
        decodedSearchQuery = searchQuery || "";
      }
    }
    const queryParams = new URLSearchParams({
      distributorId: distributorId,
      page: page.toString(),
      searchQuery: decodedSearchQuery,
      selectedSalesRepId: selectedSalesRepId || "",
      sort: sort || "ASC",
      chainId: chainId || "",
      sortKey: sortKey || "sort",
      isInternal: isInternal.toString(),
      isExcludeChainStores: isExcludeChainStores.toString()
    });

    // Only add optional parameters if they have values
    if (warehouseId) {
      queryParams.append("warehouseId", warehouseId);
    }
    if (returnSpiffEarning !== undefined) {
      queryParams.append("returnSpiffEarning", returnSpiffEarning.toString());
    }
    if (programTimeline) {
      queryParams.append("programTimeline", programTimeline);
    }

    let url = "";
    const user = getUserServer();
    const userRole = user?.role;
    if (shouldUseV2Api(userRole)) {
      url = getV2ApiUrl(`/store/listing?${queryParams.toString()}`);
    } else {
      url = `/store/listing?${queryParams.toString()}`;
    }

    const { data } = await apiServerClient.get(url);
    return data;
  } catch (error) {
    return {
      stores: [],
      totalStores: 0,
      currentPage: 0,
      totalPages: 0
    };
  }
}

export async function fetchSalesReps(
  distributorId: string | number,
  user?: any,
  warehouseId?: string
) {
  try {
    // Check if user is a sales rep manager (if user info is provided)
    const isSalesRepManager = user
      ? isDistributorSalesRepManager(user?.role ?? "")
      : false;

    // Use different API routes based on user role
    let endpoint: string;
    if (isSalesRepManager) {
      endpoint = `/store/getSalesRep/salesRepManager/${distributorId}?salesRepManagerId=${user.associatedUserId}&warehouseId=${warehouseId}`;
    } else {
      endpoint = `/store/getSalesReps/${distributorId}?warehouseId=${warehouseId}`;
    }
    console.log("endpoint", endpoint);

    const { data: res } = await apiServerClient.get(endpoint);

    // Ensure we return the expected structure
    // If the API returns { salesReps: [...] }, use that
    // If the API returns just an array, wrap it in the expected structure
    if (res && Array.isArray(res)) {
      return { salesReps: res };
    } else if (res && res.salesReps) {
      return res;
    } else {
      // Fallback to empty array if response structure is unexpected
      return { salesReps: [] };
    }
  } catch (error) {
    console.error("Error fetching sales reps:", error);
    return {
      salesReps: []
    };
  }
}
