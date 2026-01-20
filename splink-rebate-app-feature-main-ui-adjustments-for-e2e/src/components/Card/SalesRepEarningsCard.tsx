"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// Import Components
import Card from "@/components/Card";
import CardBlue from "@/components/CardBlue";
import Row from "@/components/Row";

// Import Utils
import { MESSAGES } from "@/configs/messages";
import { formatNumber } from "@/utils/numberFormatter";

import { REPORT_TYPE } from "@/utils/constants";
import { isDemo, isStaging } from "@/utils/environmentDetection";
import { getUserClient } from "@/utils/getUserClient";
import {
  getParentDistributorId,
  isDistributorSalesRep,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";
import { useSearchParams } from "next/navigation";
import GenerateCsvBtn from "../Elements/GenerateCsvBtn";
import SortableHeader from "../SortableHeader";

interface SalesRepEarnings {
  salesRepId: number;
  name: string;
  storesCount: string;
  storeIds: any[];
  salesManagerId: number | null;
  salesManagerName: string | null;
  salesManagerTitle: string | null;
  totalEarnedRebate: number;
  salesManagerEarnings: number;
}

interface SalesRepEarningsCardProps {
  totalSalesReps: number;
  totalEarnings: string;
  salesRepData: SalesRepEarnings[];
  totalStores?: number;
  showDownloadCsvBtn?: boolean;
  salesRepManagerTotalEarnings?: number;
}

const SalesRepEarningsCard: React.FC<SalesRepEarningsCardProps> = ({
  totalSalesReps = 0,
  totalEarnings = 0,
  salesRepData = [],
  totalStores = 0,
  showDownloadCsvBtn = false,
  salesRepManagerTotalEarnings
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(
    new Set()
  );
  const searchParams = useSearchParams(); // Get the current search parameters
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to get the correct store count (defined before useMemo)
  const getStoreCountForCalc = (salesRep: SalesRepEarnings): number => {
    let count = Number(salesRep?.storesCount) || 0;

    // If storeIds array is available and has values, use its length for unique stores
    if (
      salesRep?.storeIds &&
      Array.isArray(salesRep.storeIds) &&
      salesRep.storeIds.length > 0
    ) {
      count = salesRep.storeIds.length;
    }

    return count;
  };

  const totalStoresCount = useMemo(() => {
    if (totalStores) return totalStores;

    // Calculate unique stores across all sales reps using storeIds
    const allStoreIds = new Set<number>();
    salesRepData.forEach((rep) => {
      if (rep.storeIds && Array.isArray(rep.storeIds)) {
        rep.storeIds.forEach((id: any) => {
          if (id != null) allStoreIds.add(Number(id));
        });
      }
    });

    // If we have unique store IDs, use that count, otherwise sum individual counts
    return allStoreIds.size > 0
      ? allStoreIds.size
      : salesRepData.reduce((acc, curr) => acc + getStoreCountForCalc(curr), 0);
  }, [salesRepData, totalStores]);

  // Group sales reps by manager
  const groupedData = useMemo(() => {
    const managers: { [key: string]: SalesRepEarnings[] } = {};
    const standaloneReps: SalesRepEarnings[] = [];

    salesRepData.forEach((rep) => {
      if (rep.salesManagerId && rep.salesManagerName) {
        const managerKey = `${rep.salesManagerId}-${rep.salesManagerName}`;
        if (!managers[managerKey]) {
          managers[managerKey] = [];
        }
        managers[managerKey].push(rep);
      } else {
        standaloneReps.push(rep);
      }
    });

    return { managers, standaloneReps };
  }, [salesRepData]);

  // Toggle manager expansion
  const toggleManager = (managerKey: string) => {
    setExpandedManagers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(managerKey)) {
        newSet.delete(managerKey);
      } else {
        newSet.add(managerKey);
      }
      return newSet;
    });
  };

  // Set loading state when search params change (indicating a sort operation)
  useEffect(() => {
    if (searchParams.get("sortFor") === "salesRepEarnings") {
      tableContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      setIsLoading(true);
      // Small delay to show loading state
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Helper function to render table rows
  const renderTableRows = (data: SalesRepEarnings[]) => {
    return data.map((salesRepData, index) => (
      <tr
        key={`${salesRepData.salesRepId}-${salesRepData.name}`}
        className="border-b bg-gray-50"
      >
        <td className="px-4 py-3">
          <p className="font-normal">{salesRepData.name}</p>
        </td>
        <td className="px-4 py-3 text-center">
          {formatNumber(getStoreCount(salesRepData))}
        </td>
        <td className="px-4 py-3 text-highlighted-color text-right">
          ${formatNumber(Number(salesRepData?.totalEarnedRebate))}
        </td>
      </tr>
    ));
  };

  const user = getUserClient();
  // get the distributor id from the user
  const distributorId = getParentDistributorId(user?.role ?? "", user ?? {});

  const isSalesRep = isDistributorSalesRep(user?.role ?? "");
  const isSalesRepManager = isDistributorSalesRepManager(user?.role ?? "");

  // Helper function to check if a name matches the logged-in user
  const isCurrentUser = (name: string): boolean => {
    if (!user) return false;
    const userFullName = `${user.firstName || ""} ${user.lastName || ""}`
      .trim()
      .toUpperCase();
    const nameToCompare = name.trim().toUpperCase();
    return userFullName === nameToCompare;
  };

  // Helper function to get the correct store count
  // Prefer unique storeIds count, fallback to storesCount, and cap at totalStores
  const getStoreCount = (salesRep: SalesRepEarnings): number => {
    let count = Number(salesRep?.storesCount) || 0;

    // If storeIds array is available and has values, use its length for unique stores
    if (
      salesRep?.storeIds &&
      Array.isArray(salesRep.storeIds) &&
      salesRep.storeIds.length > 0
    ) {
      count = salesRep.storeIds.length;
    }

    // Cap the count to not exceed total stores from key metrics as a safety check
    if (totalStores > 0 && count > totalStores) {
      count = totalStores;
    }

    return count;
  };

  return (
    <Card className="sku-distribution-bar-chart w-full">
      <Row className="justify-between" marginBottom="mb-0">
        <div className="text-base font-normal text-heading-light">
          Sales Rep Earnings
        </div>
        {/* {showDownloadCsvBtn && (
          <GenerateCsvBtn
            reportTypes={[
              {
                value: REPORT_TYPE.SALES_REP_EARNINGS,
                label: "Sales Rep Earnings"
              }
            ]}
          />
        )} */}
      </Row>

      <CardBlue className="mt-4 mb-2 px-5 py-2 text-heading-blue text-sm">
        <Row
          marginBottom="mb-0"
          gap="gap-1.5"
          className="flex-wrap sm:flex-nowrap justify-center"
        >
          <div className="flex-1 sm:flex-auto flex flex-col gap-1.5 w-1/3 items-center justify-center">
            <div className="font-normal text-center">Sales Reps</div>
            <div className="font-semibold text-center">{totalSalesReps}</div>
          </div>
          <div className="flex-1 sm:flex-auto flex w-1/2 border-l border-info-0 justify-center items-center">
            <div className="flex flex-col gap-1.5 text-center w-full">
              <div className="font-normal">Total Stores</div>
              <div className="font-semibold">
                {formatNumber(Number(totalStoresCount))}
              </div>
            </div>
          </div>
          <div className="w-full sm:flex-auto flex sm:w-1/3 justify-center items-center border-t sm:border-t-0 sm:border-l border-info-0 pt-1.5 mt-1.5 sm:pt-0 sm:mt-0">
            <div className="flex flex-col gap-1.5 text-center">
              <div className="font-normal">
                {isSalesRepManager
                  ? "Your Sales Reps Earnings"
                  : isSalesRep
                    ? "Estimated Earnings"
                    : "Sales Rep Earnings"}
              </div>
              <div className="font-semibold text-center">
                ${formatNumber(Number(totalEarnings))}
              </div>
            </div>
          </div>
        </Row>
      </CardBlue>
      <div
        ref={tableContainerRef}
        className={`storeTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter max-h-[450px] overflow-y-auto -mr-2 pr-2 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        {salesRepData.length > 0 ? (
          <table className="w-full border-collapse table-fixed">
            <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0 bg-white z-10">
              <tr>
                <SortableHeader
                  className="font-medium px-4 w-1/3"
                  label="Name"
                  sortKey={"salesRepName"}
                  sort={searchParams.get("sort") || "ASC"}
                  sortFor="salesRepEarnings"
                />
                <SortableHeader
                  label="Stores"
                  sortKey={"storesCount"}
                  sort={searchParams.get("sort") || "ASC"}
                  sortFor="salesRepEarnings"
                  className="font-medium px-4 w-1/3 text-center"
                />
                <SortableHeader
                  label={
                    isSalesRep ? "Estimated Earnings" : "Sales Rep Earnings"
                  }
                  sortKey={"storesEarnings"}
                  sort={searchParams.get("sort") || "ASC"}
                  className="font-medium px-4 w-1/3 text-right"
                  sortFor="salesRepEarnings"
                />
              </tr>
            </thead>
            <tbody>
              {/* Render managers as expandable rows */}
              {Object.entries(groupedData.managers).map(
                ([managerKey, reps]) => {
                  const [managerId, managerName] = managerKey.split("-");
                  // Use unique store IDs to calculate manager stores to avoid duplicates
                  const managerStoreIds = new Set<number>();
                  reps.forEach((rep) => {
                    if (rep.storeIds && Array.isArray(rep.storeIds)) {
                      rep.storeIds.forEach((id: any) => {
                        if (id != null) managerStoreIds.add(Number(id));
                      });
                    }
                  });
                  // Use unique store count if available, otherwise sum the counts
                  const managerStores =
                    managerStoreIds.size > 0
                      ? managerStoreIds.size
                      : reps.reduce((acc, rep) => acc + getStoreCount(rep), 0);

                  // Cap manager stores to total stores
                  const finalManagerStores =
                    totalStores > 0 && managerStores > totalStores
                      ? totalStores
                      : managerStores;

                  let managerEarnings =
                    groupedData.managers[managerKey][0]?.salesManagerEarnings ||
                    0;

                  // Use salesRepManagerTotalEarnings if this is the current logged-in sales rep manager
                  if (
                    isSalesRepManager &&
                    isCurrentUser(managerName) &&
                    salesRepManagerTotalEarnings !== undefined
                  ) {
                    managerEarnings = salesRepManagerTotalEarnings;
                  }

                  // TEMPORARY FOR STAGING
                  // Add Earning Amount for Alcohal Demo - Sales Rep Manager
                  if (isStaging && distributorId == 55) {
                    managerEarnings = 250;
                  }

                  // TEMPORARY FOR DEMO
                  // Add Earning Amount for Alcohal Demo - Sales Rep Manager
                  if (
                    isDemo &&
                    isSalesRepManager &&
                    user?.associatedUserId == 605
                  ) {
                    managerEarnings = 250;
                  }

                  const isExpanded = !expandedManagers.has(managerKey);

                  return (
                    <React.Fragment key={managerKey}>
                      {/* Manager row */}
                      <tr
                        className="border-b cursor-pointer mb-2"
                        onClick={() => toggleManager(managerKey)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`transition-transform duration-200 ${isExpanded ? "rotate-90 z-0" : ""}`}
                            >
                              ▶
                            </span>
                            <span className="font-medium">{managerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {formatNumber(finalManagerStores)}
                        </td>
                        <td className="px-4 py-3 text-highlighted-color text-right">
                          ${formatNumber(managerEarnings)}
                        </td>
                      </tr>

                      {/* Expanded sales rep rows */}
                      {isExpanded && renderTableRows(reps)}
                    </React.Fragment>
                  );
                }
              )}

              {/* Render standalone sales reps */}
              {groupedData.standaloneReps.map((salesRepData) => {
                let earnings = Number(salesRepData?.totalEarnedRebate);

                // Use salesRepManagerTotalEarnings if this is the current logged-in sales rep manager
                if (
                  isSalesRepManager &&
                  isCurrentUser(salesRepData.name) &&
                  salesRepManagerTotalEarnings !== undefined
                ) {
                  earnings = salesRepManagerTotalEarnings;
                }

                return (
                  <tr
                    key={`${salesRepData.salesRepId}-${salesRepData.name}`}
                    className="border-b"
                  >
                    <td className="px-4 py-3">
                      <p className="font-normal">{salesRepData.name}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {formatNumber(getStoreCount(salesRepData))}
                    </td>
                    <td className="px-4 py-3 text-highlighted-color text-right">
                      ${formatNumber(earnings)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="pt-3 text-center font-medium text-heading-very-light text-sm">
            {MESSAGES.NO_RECORDS_FOUND}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SalesRepEarningsCard;
