/* eslint-disable prettier/prettier */
import { apiClient } from "@/lib/axiosClient";
import { DistributorAdminProgramsParams } from "@/types/DistributorAdminProgramTypes";

export interface DistributorAdminProductsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  manufacturerId?: number;
  categoryId?: number;
  categoryTags?: string[];
  search?: string;
  fields?: string;
  includeSchema?: boolean;
}

export interface FilterOptionsParams {
  field: string;
}

export async function fetchDistributorAdminProducts(
  params: DistributorAdminProductsParams = {}
): Promise<any> {
  try {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);
    if (params.manufacturerId)
      searchParams.append("manufacturerId", params.manufacturerId.toString());
    if (params.categoryId)
      searchParams.append("categoryId", params.categoryId.toString());
    if (params.categoryTags && params.categoryTags.length > 0)
      searchParams.append("categoryTags", params.categoryTags.join(","));
    if (params.search) searchParams.append("search", params.search);
    if (params.fields) searchParams.append("fields", params.fields);
    if (params.includeSchema)
      searchParams.append("includeSchema", params.includeSchema.toString());

    const url = `distributor-admin/products?${searchParams.toString()}`;
    console.log("Making API call to:", url);

    const { data } = await apiClient.get(url);
    console.log("API response data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching distributor admin products:", error);
    console.error("Full error object:", error);
    throw error;
  }
}

export async function fetchDistributorAdminProductsSchema(): Promise<any> {
  try {
    const { data } = await apiClient.get("distributor-admin/products/schema");
    return data;
  } catch (error) {
    console.error("Error fetching products schema:", error);
    throw error;
  }
}

export async function fetchDistributorAdminStatistics(): Promise<any> {
  try {
    const { data } = await apiClient.get(
      "distributor-admin/products/statistics"
    );
    return data;
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    throw error;
  }
}

export async function fetchDistributorAdminFilterOptions(
  params: FilterOptionsParams
): Promise<any> {
  try {
    const { data } = await apiClient.get(
      `distributor-admin/products/filter-options/${params.field}`
    );
    return data;
  } catch (error) {
    console.error(`Error fetching filter options for ${params.field}:`, error);
    throw error;
  }
}

export async function fetchAuthorizedDistributorManufacturers(): Promise<any> {
  try {
    const { data } = await apiClient.get(
      "distributor-admin/authorized-distributor-manufacturers"
    );
    console.log("Authorized distributor manufacturers:", data);
    return data;
  } catch (error) {
    console.error(
      "Error fetching authorized distributor manufacturers:",
      error
    );
    throw error;
  }
}

export interface StoreLookupParams {
  startDate?: string;
  endDate?: string;
  storeName?: string;
  manufacturerName?: string;
  categoryTags?: string[];
}

export async function fetchStoreLookup(
  params: StoreLookupParams = {}
): Promise<any> {
  try {
    const searchParams = new URLSearchParams();

    // Always send all parameters (API requires them)
    searchParams.append("startDate", params.startDate || "");
    searchParams.append("endDate", params.endDate || "");
    searchParams.append("storeName", params.storeName || "");
    searchParams.append("manufacturerName", params.manufacturerName || "");
    if (params.categoryTags && params.categoryTags.length > 0)
      searchParams.append("categoryTags", params.categoryTags.join(","));

    const url = `distributor-admin/store-lookup?${searchParams.toString()}`;
    console.log("Making store lookup API call to:", url);

    const { data } = await apiClient.get(url);
    console.log("Store lookup API response:", data);
    return data;
  } catch (error) {
    console.error("Error fetching store lookup data:", error);
    throw error;
  }
}

export async function fetchAllManufacturersFromProducts(): Promise<any> {
  try {
    const { data } = await apiClient.get("distributor-admin/manufacturers");
    return data;
  } catch (error) {
    console.error("Error fetching all manufacturers from products:", error);
    throw error;
  }
}

export async function fetchAllDistributors(): Promise<any> {
  try {
    const { data } = await apiClient.get("distributor-admin/distributors");
    console.log("All distributors:", data);
    return data;
  } catch (error) {
    console.error("Error fetching all distributors:", error);
    throw error;
  }
}

export async function fetchDistributorAdminPrograms(
  params: DistributorAdminProgramsParams = {}
): Promise<any> {
  try {
    const searchParams = new URLSearchParams();

    if (params.participantType)
      searchParams.append("participantType", params.participantType);
    if (params.manufacturerName)
      searchParams.append("manufacturerName", params.manufacturerName);
    if (params.distributorName)
      searchParams.append("distributorName", params.distributorName);
    if (params.startDate) searchParams.append("startDate", params.startDate);
    if (params.endDate) searchParams.append("endDate", params.endDate);

    const url = `distributor-admin/programs?${searchParams.toString()}`;
    console.log("Making API call to:", url);

    const { data } = await apiClient.get(url);
    console.log("API response data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching distributor admin programs:", error);
    throw error;
  }
}

export async function fetchDistributorAdminProductTags(
  manufacturerId: number
): Promise<any> {
  try {
    const { data } = await apiClient.get(
      `distributor-admin/manufacturer/${manufacturerId}/product-tags`
    );
    console.log("Product tags for manufacturer", manufacturerId, ":", data);
    return data;
  } catch (error) {
    console.error("Error fetching product tags for manufacturer:", error);
    // Fallback to empty array if API fails
    return { tags: [] };
  }
}

export async function fetchDistributorAdminCategoryTags(
  manufacturerId: number
): Promise<any> {
  try {
    const { data } = await apiClient.get(
      `distributor-admin/category-tags/${manufacturerId}`
    );
    console.log("Category tags for manufacturer", manufacturerId, ":", data);
    return data;
  } catch (error) {
    console.error("Error fetching category tags for manufacturer:", error);
    // Fallback to empty array if API fails
    return { tags: [] };
  }
}
