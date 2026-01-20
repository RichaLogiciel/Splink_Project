import React from "react";
import DistributorAdminDashboard from "@/views/Distributor/distributorAdminDashboard";
import NoAccess from "@/components/NoAccess";
import { getUserServer } from "@/utils/getUserServer";
import { isSuperAdmin } from "@/utils/rolesConditions";
import {
  fetchDistributorAdminProductsServer,
  fetchDistributorAdminStatisticsServer,
  DistributorAdminProductsParams
} from "./API";

interface DistributorAdminPageProps {
  searchParams: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    manufacturerId?: string;
    categoryId?: string;
    search?: string;
    tab?: string;
  };
}

const DistributorAdminPage = async ({
  searchParams
}: DistributorAdminPageProps) => {
  const user = getUserServer();
  const isSuper = isSuperAdmin(user?.role);

  // Only super admins can access the Controls and Store Lookup tabs
  const activeTab = searchParams.tab || "products";

  if (!isSuper && (activeTab === "controls" || activeTab === "store-lookup")) {
    return <NoAccess />;
  }

  const params: DistributorAdminProductsParams = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    limit: searchParams.limit ? parseInt(searchParams.limit) : 20,
    sortBy: searchParams.sortBy || "name",
    sortOrder: searchParams.sortOrder || "ASC",
    manufacturerId: searchParams.manufacturerId
      ? parseInt(searchParams.manufacturerId)
      : undefined,
    categoryId: searchParams.categoryId
      ? parseInt(searchParams.categoryId)
      : undefined,
    search: searchParams.search || undefined
  };

  // Fetch initial data on the server
  const [productsData, statisticsData] = await Promise.all([
    fetchDistributorAdminProductsServer(params),
    fetchDistributorAdminStatisticsServer()
  ]);

  // Transform server data to match component expectations
  const transformedData = productsData
    ? {
        products: productsData.products || [],
        totalPages:
          productsData.pagination?.totalPages || productsData.totalPages || 1,
        currentPage:
          productsData.pagination?.page || productsData.currentPage || 1,
        totalCount:
          productsData.pagination?.total || productsData.totalCount || 0
      }
    : undefined;

  return (
    <DistributorAdminDashboard
      initialData={transformedData}
      initialStatistics={statisticsData}
      activeTab={activeTab}
      userRole={user?.role}
    />
  );
};

export default DistributorAdminPage;
