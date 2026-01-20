import { apiServerClient } from "@/lib/axiosServer";

/**
 * Retrieves a list of stores for a manufacturer.
 *
 * The result includes the store name, total amount of sales, and the distributor ID.
 * The query can be filtered by a search query and a specific distributor ID.
 * The results are paginated and sorted in ascending or descending order.
 *
 * @param {number} page - The page number for pagination. Default is 1.
 * @param {string} searchQuery - Optional search query to filter the store results. Default is an empty string.
 * @param {string} distributorId - Optional ID of the distributor to filter the results. Default is an empty string.
 * @param {string} sort - The order in which the results should be sorted, either DESC or ASC. Default is ASC.
 *
 * @returns {Promise<any>} - A promise that resolves to an object containing the store information.
 */
export async function fetchData(
  manufacturerId: string,
  page: number = 1,
  searchQuery: string = "",
  distributorId: string = "",
  sort: string = "ASC",
  sortKey: string = "sort",
  programTimeline?: string,
  isExcludeChainStores?: boolean
) {
  try {
    const { data } = await apiServerClient.get(
      `/manufacturer/${manufacturerId}/store/listing?page=${page}&searchQuery=${decodeURI(
        searchQuery
      )}&distributorId=${distributorId}
      &sort=${sort}&sortKey=${sortKey}&programTimeline=${programTimeline}&isExcludeChainStores=${isExcludeChainStores}`
    );
    // if (res.status == "success") {
    return data;
    // }
  } catch (error) {
    return {
      stores: [],
      totalStores: 0,
      currentPage: 0,
      totalPages: 0
    };
  }
}
