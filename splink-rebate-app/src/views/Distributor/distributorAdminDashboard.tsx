"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DistributorAdminProductsTable from "@/components/Table/DistributorAdminProductsTable";
import DistributorAdminStatsCard from "@/components/Card/DistributorAdminStatsCard";
import AuthorizedDistributorManufacturersTable from "@/components/Table/AuthorizedDistributorManufacturersTable";
import StoreLookupTable from "@/components/Table/StoreLookupTable";
import DistributorAdminProgramsTable from "@/components/Table/DistributorAdminProgramsTable";
import { fetchDistributorAdminStatistics } from "@/app/app/distributor-admin/APIClient";
import { isSuperAdmin } from "@/utils/rolesConditions";

interface DistributorAdminDashboardProps {
  initialData?: any;
  initialStatistics?: any;
  activeTab?: string;
  userRole?: string;
}

const DistributorAdminDashboard: React.FC<DistributorAdminDashboardProps> = ({
  initialData,
  initialStatistics,
  activeTab = "products",
  userRole
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statistics, setStatistics] = useState(initialStatistics || null);
  const [isLoadingStats, setIsLoadingStats] = useState(!initialStatistics);
  const [currentTab, setCurrentTab] = useState(activeTab);
  const isSuper = isSuperAdmin(userRole);

  useEffect(() => {
    if (!initialStatistics) {
      fetchStats();
    }
  }, [initialStatistics]);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetchDistributorAdminStatistics();
      setStatistics(response);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", tab);
    router.replace(`/app/distributor-admin?${params.toString()}`);
  };

  const statsData = statistics
    ? [
        {
          label: "Total Products",
          value: statistics.totalProducts || 0,
          trend: statistics.totalProductsTrend
            ? {
                value: statistics.totalProductsTrend,
                isPositive: statistics.totalProductsTrend > 0
              }
            : undefined
        },
        {
          label: "Total Manufacturers",
          value: statistics.totalManufacturers || 0,
          trend: statistics.manufacturersTrend
            ? {
                value: statistics.manufacturersTrend,
                isPositive: statistics.manufacturersTrend > 0
              }
            : undefined
        }
      ]
    : [];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Distributor Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage and monitor products across your distribution network
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange("products")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === "products"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Products
            </button>
            {isSuper && (
              <button
                onClick={() => handleTabChange("controls")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === "controls"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Controls
              </button>
            )}
            {isSuper && (
              <button
                onClick={() => handleTabChange("programs")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === "programs"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Programs
              </button>
            )}
            {isSuper && (
              <button
                onClick={() => handleTabChange("store-lookup")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === "store-lookup"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Store Lookup
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {currentTab === "products" && (
        <>
          {/* Statistics Cards */}
          <DistributorAdminStatsCard
            statistics={statsData}
            isLoading={isLoadingStats}
          />

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Products Management
              </h2>
              <p className="text-sm text-gray-600">
                View, search, and filter all products in your network
              </p>
            </div>

            <DistributorAdminProductsTable
              initialData={initialData}
              enableFiltering={true}
              enableSearch={true}
            />
          </div>
        </>
      )}

      {currentTab === "controls" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Authorized Distributor Manufacturers
            </h2>
            <p className="text-sm text-gray-600">
              View and manage authorized relationships between distributors and
              manufacturers
            </p>
          </div>

          <AuthorizedDistributorManufacturersTable />
        </div>
      )}

      {currentTab === "programs" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Programs Management
            </h2>
            <p className="text-sm text-gray-600">
              View and filter all programs across the platform with detailed
              metadata
            </p>
          </div>

          <DistributorAdminProgramsTable />
        </div>
      )}

      {currentTab === "store-lookup" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Store Lookup
            </h2>
            <p className="text-sm text-gray-600">
              Search and find stores by name, manufacturer, and transaction date
            </p>
          </div>

          <StoreLookupTable />
        </div>
      )}
    </div>
  );
};

export default DistributorAdminDashboard;
