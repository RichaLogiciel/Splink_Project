import { apiServerClient } from "@/lib/axiosServer";

/**
 * Retrieves a list of chain stores.
 *
 * The result includes the store name, total amount of sales, and the distributor ID.
 * The query can be filtered by a search query and a specific distributor ID.
 * The results are paginated and sorted in ascending or descending order.
 *
 * @param {number} page - The page number for pagination. Default is 1.
 * @param {string} searchQuery - Optional search query to filter the store results. Default is an empty string.
 * @param {string} sort - The order in which the results should be sorted, either DESC or ASC. Default is ASC.
 *
 * @returns {Promise<any>} - A promise that resolves to an object containing the store information.
 */
export async function fetchData(
  page: number = 1,
  searchQuery: string = "",
  sort: string = "ASC",
  sortKey: string = "sort"
) {
  try {
    const { data } = await apiServerClient.get(
      `/chain/store/listing?page=${page}&searchQuery=${decodeURI(
        searchQuery
      )}&sort=${sort}&sortKey=${sortKey}`
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
