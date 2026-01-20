import { apiServerClient } from "@/lib/axiosServer";

export interface DistributorAdminProductsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  manufacturerId?: number;
  categoryId?: number;
  search?: string;
  fields?: string;
  includeSchema?: boolean;
}

export interface FilterOptionsParams {
  field: string;
}

export async function fetchDistributorAdminProductsServer(
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
    if (params.search) searchParams.append("search", params.search);
    if (params.fields) searchParams.append("fields", params.fields);
    if (params.includeSchema)
      searchParams.append("includeSchema", params.includeSchema.toString());

    const { data } = await apiServerClient.get(
      `distributor-admin/products?${searchParams.toString()}`
    );

    return data;
  } catch (error) {
    console.error("Error fetching distributor admin products:", error);
    return null;
  }
}

export async function fetchDistributorAdminProductsSchemaServer(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      "distributor-admin/products/schema"
    );
    return data;
  } catch (error) {
    console.error("Error fetching products schema:", error);
    return null;
  }
}

export async function fetchDistributorAdminStatisticsServer(): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      "distributor-admin/products/statistics"
    );
    return data;
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    return null;
  }
}

export async function fetchDistributorAdminFilterOptionsServer(
  params: FilterOptionsParams
): Promise<any> {
  try {
    const { data } = await apiServerClient.get(
      `distributor-admin/products/filter-options/${params.field}`
    );
    return data;
  } catch (error) {
    console.error(`Error fetching filter options for ${params.field}:`, error);
    return null;
  }
}
