"use client";

import { getVoidFillProgramsSummaryClient } from "@/app/app/DashboardAPIsClient";
import { exportVoidFillSummaryCSV } from "@/utils/csvExport";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import VoidFillProgramsSummaryCard from "./VoidFillProgramsSummaryCard";

interface VoidFillManufacturer {
  manId: number;
  manName: string;
  manLogo: string;
  earnings: number;
  voidsFilled: number;
  totalVoids: number;
  voidFilledPercentage: number;
  earningOpportunity: number;
  programs: any[];
}

interface VoidFillProgramsSummaryCardWrapperProps {
  initialData: VoidFillManufacturer[];
  salesRepOptions: Array<{ value: string; label: string }>;
  warehouseOptions: Array<{ value: string; label: string }>;
  programOptions: Array<{ value: string; label: string }>;
  initialSalesRepIds: number[];
  initialWarehouseId: string;
  initialExcludeChainStore: boolean;
  hideSalesRepFilter?: boolean;
  hideMetadataFilter?: boolean;
  manufacturerId?: number;
  allowWarehouseFilter?: boolean;
  initialProgramTimeline?: string;
}

const VoidFillProgramsSummaryCardWrapper: React.FC<
  VoidFillProgramsSummaryCardWrapperProps
> = ({
  initialData,
  salesRepOptions,
  warehouseOptions,
  programOptions,
  initialSalesRepIds,
  initialWarehouseId,
  initialExcludeChainStore,
  hideSalesRepFilter = false,
  hideMetadataFilter = false,
  manufacturerId,
  allowWarehouseFilter = true,
  initialProgramTimeline
}) => {
  const searchParams = useSearchParams();
  // Get warehouseId from URL, ensuring we get the latest value
  const dashboardWarehouseId =
    initialWarehouseId || searchParams.get("warehouseId") || "";
  const salesRepId = searchParams.get("salesRepId") || "";
  const programTimeline =
    initialProgramTimeline || searchParams.get("programTimeline") || "Current";

  const [filteredData, setFilteredData] =
    useState<VoidFillManufacturer[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSalesReps, setIsLoadingSalesReps] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Store initial sales rep options (from salesRepEarningsResponse)
  const [initialSalesRepOptions] = useState(salesRepOptions);
  const [preservedSalesRepOptions, setPreservedSalesRepOptions] =
    useState(salesRepOptions);
  const [preservedProgramOptions, setPreservedProgramOptions] =
    useState(programOptions);

  // Track filter selections (not applied until Filter button is clicked)
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>(salesRepId);
  const [selectedProgram, setSelectedProgram] = useState<string>("");

  // Track applied filter values (baseline to compare against)
  const [appliedSalesRep, setAppliedSalesRep] = useState<string>("");
  const [appliedProgram, setAppliedProgram] = useState<string>("");

  // Check if any filter has changed from applied state
  const hasFilterChanged =
    selectedSalesRep !== appliedSalesRep || selectedProgram !== appliedProgram;

  // Check if filter button should be enabled (disabled during sales rep loading)
  const isFilterButtonEnabled = hasFilterChanged && !isLoadingSalesReps;

  // Track current filter values for CSV export
  // These are updated when filters are applied or warehouse changes
  const [currentSalesRepIds, setCurrentSalesRepIds] =
    useState<number[]>(initialSalesRepIds);
  const [currentWarehouseIds, setCurrentWarehouseIds] = useState<
    (string | number)[]
  >(
    allowWarehouseFilter
      ? dashboardWarehouseId
        ? [dashboardWarehouseId]
        : []
      : []
  );
  const [currentProgramId, setCurrentProgramId] = useState<number | undefined>(
    undefined
  );
  const [currentExcludeChainStore] = useState<boolean>(
    initialExcludeChainStore
  );

  // Preserve options when they change
  useEffect(() => {
    setPreservedSalesRepOptions(salesRepOptions);
    setPreservedProgramOptions(programOptions);
  }, [salesRepOptions, programOptions]);

  // Update filtered data when initial data changes
  useEffect(() => {
    setFilteredData(initialData);
    setHasError(false);
  }, [initialData]);

  // Watch for dashboard warehouse filter changes and automatically refresh data
  useEffect(() => {
    if (!allowWarehouseFilter) {
      return;
    }

    const fetchDataForWarehouse = async () => {
      // Reset sales rep and program selections when warehouse changes
      setSelectedSalesRep("");
      setSelectedProgram("");
      setAppliedSalesRep("");
      setAppliedProgram("");

      // If no warehouse selected, use initial sales rep options
      if (!dashboardWarehouseId || dashboardWarehouseId === "") {
        setPreservedSalesRepOptions(initialSalesRepOptions);
        setCurrentSalesRepIds(initialSalesRepIds);
        setCurrentWarehouseIds([]);
        setCurrentProgramId(undefined);
        // Refresh data with initial sales rep IDs
        await refreshData(initialSalesRepIds, undefined, undefined);
        return;
      }

      // Make API call to get sales reps for selected warehouse
      setIsLoadingSalesReps(true);
      try {
        const response = await getVoidFillProgramsSummaryClient({
          excludeChainStore: initialExcludeChainStore,
          warehouseId: dashboardWarehouseId,
          warehouseIdFilter: true,
          manufacturerId: manufacturerId ? manufacturerId : undefined,
          programTimeline: programTimeline
        });

        // Extract salesReps from response
        if (response?.salesReps && Array.isArray(response.salesReps)) {
          const warehouseSalesRepOptions = response.salesReps.map(
            (salesRep: any) => ({
              value: salesRep?.salesRepId?.toString(),
              label: salesRep.name
            })
          );
          setPreservedSalesRepOptions(warehouseSalesRepOptions);

          // Update currentSalesRepIds for CSV export with warehouse-filtered sales reps
          const warehouseSalesRepIds = warehouseSalesRepOptions
            .filter((opt: { value: string; label: string }) => opt.value !== "")
            .map((opt: { value: string; label: string }) =>
              parseInt(opt.value)
            );
          setCurrentSalesRepIds(warehouseSalesRepIds);
          setCurrentWarehouseIds([dashboardWarehouseId]);

          // Automatically refresh data with warehouse-filtered sales reps
          await refreshData(
            warehouseSalesRepIds,
            dashboardWarehouseId && dashboardWarehouseId !== ""
              ? dashboardWarehouseId
              : undefined,
            undefined
          );
        } else {
          setPreservedSalesRepOptions([]);
          setCurrentSalesRepIds([]);
          setCurrentWarehouseIds([dashboardWarehouseId]);
          await refreshData(
            [],
            dashboardWarehouseId && dashboardWarehouseId !== ""
              ? dashboardWarehouseId
              : undefined,
            undefined
          );
        }
      } catch (error: any) {
        console.error("Error fetching sales reps by warehouse:", {
          error: error?.response?.data || error?.message,
          warehouseId: dashboardWarehouseId,
          manufacturerId,
          status: error?.response?.status
        });
        setPreservedSalesRepOptions(initialSalesRepOptions);
        setCurrentSalesRepIds(initialSalesRepIds);
        setCurrentWarehouseIds([]);
        await refreshData(initialSalesRepIds, undefined, undefined);
      } finally {
        setIsLoadingSalesReps(false);
      }
    };

    fetchDataForWarehouse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardWarehouseId]);

  // Helper function to refresh data
  // Always uses the current dashboardWarehouseId from URL to ensure it's up-to-date
  const refreshData = async (
    salesRepIds: number[] | undefined,
    warehouseId: string | undefined,
    programId: number | undefined
  ) => {
    setIsLoading(true);
    setHasError(false);

    try {
      // Always use the current dashboardWarehouseId from URL as the source of truth
      // warehouseId parameter is only used as a fallback if dashboardWarehouseId is not available
      const currentWarehouseIdFromUrl = searchParams.get("warehouseId") || "";
      const warehouseIdToUse =
        warehouseId && warehouseId !== ""
          ? warehouseId
          : currentWarehouseIdFromUrl && currentWarehouseIdFromUrl !== ""
            ? currentWarehouseIdFromUrl
            : undefined;

      const response = await getVoidFillProgramsSummaryClient({
        salesRepIds,
        excludeChainStore: initialExcludeChainStore,
        warehouseId: warehouseIdToUse,
        warehouseIdFilter: false,
        programId,
        manufacturerId: manufacturerId ? manufacturerId : undefined,
        programTimeline: programTimeline
      });

      if (response?.voidFillDetails) {
        setFilteredData(response.voidFillDetails);
        setHasError(response.voidFillDetails.length === 0);
      } else {
        setFilteredData([]);
        setHasError(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setHasError(true);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    // Just update state, don't make API call
    if (filterType === "salesRep") {
      setSelectedSalesRep(value);
    } else if (filterType === "program") {
      setSelectedProgram(value);
    }
  };

  const handleApplyFilters = async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      // Determine sales rep IDs to use:
      // 1. If a specific sales rep is selected, use that one
      // 2. If a warehouse is selected (but no specific sales rep):
      //    - If there are warehouse-filtered options, use those IDs
      //    - If there are NO options ("No Sales Rep Found"), send empty array
      // 3. If no warehouse selected:
      //    - If there are initial sales rep options, use initialSalesRepIds
      //    - If there are NO options ("No Sales Rep Found"), send empty array
      let salesRepIdsToSend: number[] | undefined;
      if (selectedSalesRep) {
        salesRepIdsToSend = [parseInt(selectedSalesRep)];
      } else if (dashboardWarehouseId) {
        if (preservedSalesRepOptions.length > 0) {
          // Use sales rep IDs from the warehouse-filtered options
          salesRepIdsToSend = preservedSalesRepOptions
            .filter((opt) => opt.value !== "") // Exclude "All Sales Reps" option
            .map((opt) => parseInt(opt.value));
        } else {
          // No sales rep options available for selected warehouse
          salesRepIdsToSend = [];
        }
      } else {
        // No warehouse selected
        if (preservedSalesRepOptions.length > 0) {
          // Use initial sales rep IDs if options are available
          salesRepIdsToSend = initialSalesRepIds;
        } else {
          // No sales rep options available ("No Sales Rep Found")
          salesRepIdsToSend = [];
        }
      }

      // Always get the latest warehouseId from URL
      const currentWarehouseIdFromUrl = searchParams.get("warehouseId") || "";
      const warehouseIdToUse =
        currentWarehouseIdFromUrl && currentWarehouseIdFromUrl !== ""
          ? currentWarehouseIdFromUrl
          : undefined;

      const response = await getVoidFillProgramsSummaryClient({
        salesRepIds: salesRepIdsToSend,
        excludeChainStore: initialExcludeChainStore,
        warehouseId: warehouseIdToUse,
        warehouseIdFilter: false, // Not used when applying filters
        programId: selectedProgram ? parseInt(selectedProgram) : undefined,
        manufacturerId: manufacturerId ? manufacturerId : undefined,
        programTimeline: programTimeline
      });

      if (response?.voidFillDetails) {
        setFilteredData(response.voidFillDetails);
        setHasError(response.voidFillDetails.length === 0);
        // Update applied filters to match current selections
        setAppliedSalesRep(selectedSalesRep);
        setAppliedProgram(selectedProgram);

        // Update current filter values for CSV export (same as what we sent to API)
        setCurrentSalesRepIds(salesRepIdsToSend || []);
        setCurrentWarehouseIds(
          dashboardWarehouseId ? [dashboardWarehouseId] : []
        );
        setCurrentProgramId(
          selectedProgram ? parseInt(selectedProgram) : undefined
        );
      } else {
        setFilteredData([]);
        setHasError(true);
      }
    } catch (error) {
      console.error("Error fetching filtered data:", error);
      setHasError(true);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCSV = async () => {
    try {
      await exportVoidFillSummaryCSV({
        salesRepIds: currentSalesRepIds,
        excludeChainStore: currentExcludeChainStore,
        warehouseIds:
          currentWarehouseIds.length > 0 ? currentWarehouseIds : undefined,
        programId: currentProgramId
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      // Error handling is done in exportVoidFillSummaryCSV
    }
  };

  return (
    <VoidFillProgramsSummaryCard
      data={filteredData}
      salesRepOptions={preservedSalesRepOptions}
      programOptions={preservedProgramOptions}
      onFilterChange={handleFilterChange}
      onApplyFilters={handleApplyFilters}
      isLoading={isLoading}
      hasError={hasError}
      isFilterButtonEnabled={isFilterButtonEnabled}
      currentWarehouse={dashboardWarehouseId}
      handleGenerateCSV={handleGenerateCSV}
      hideSalesRepFilter={hideSalesRepFilter}
      hideMetadataFilter={hideMetadataFilter}
      salesRepId={selectedSalesRep}
      programTimeline={programTimeline}
    />
  );
};

export default VoidFillProgramsSummaryCardWrapper;
