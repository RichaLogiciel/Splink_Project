// Import Core functionality/component
import DynamicSemiPieChart from "@/components/SemiPieChartCustom/DynamicSemiPieChart";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";

// Import Util functions
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import { DistributorProgramDetailsModalProps } from "@/types/DistributorTypes";

// Import Images
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import { apiClient } from "@/lib/axiosClient";
import { calcPercentage } from "@/utils/calculations";
import { PROGRESS_COLORS } from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import { isDistributor } from "@/utils/rolesConditions";
import { PROGRAM_CRITERIA } from "@/views/Distributor/programConstants";
import { TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CreateNewProgram from "../Buttons/CreateNewProgram";
import Card from "../Card";
import CategorizedTabProductList from "../Elements/CategorizedTabProductList";
import Loader from "../Loader";
import EstimatedSavingsWarningPopOver from "../Popovers/EstimatedSavingsWarning";
import StackedLineChartCustom from "../StackedLineChartCustom";
import WarehouseSelectFilter from "../WarehouseSelectFilter";

const DistributorProgramDetailsModal: React.FC<
  DistributorProgramDetailsModalProps
> = ({
  isOpen,
  setIsOpen,
  programData,
  criteriaType,
  showEstimatedWarning = false,
  showEstimatedEarning = true,
  totalPurchaseVolume = 0,
  allPurchasedProducts,
  showSavingsNotApplicable,
  warehouses,
  warehouseId
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [growthData, setGrowthData] = useState<any>(null);
  const [caseGrowthYAxis, setCaseGrowthYAxis] = useState<any>(null);
  const [selectedWarehousId, setSelectedWarehousId] = useState<string>(
    warehouseId || ""
  );

  // Cache for API responses
  const apiCache = useMemo(
    () => new Map<string, { data: any; timestamp: number }>(),
    []
  );
  // Cache expiration time (5 minutes)
  const CACHE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

  const user = getUserClient();

  const purchasedVolume = Number(
    programData?.complianceTotalPurchased || 0
  ).toFixed(0) as unknown as number;

  const isCategorySKUs = criteriaType == PROGRAM_CRITERIA.CATEGORY_SKUS;
  const isPOD = criteriaType == PROGRAM_CRITERIA.POD;
  const isGrowth = criteriaType == PROGRAM_CRITERIA.GROWTH;
  const isOutreach = criteriaType == PROGRAM_CRITERIA.OUTREACH;

  // Temporary fix for case growth
  const isCaseGrowth = programData?.programDetailId == 485;

  const purchaseVolume = formatNumber(totalPurchaseVolume);
  // isPOD && totalPurchaseVolume
  //   ? formatNumber(totalPurchaseVolume)
  //   : purchasedVolume && formatNumber(purchasedVolume);

  // Sort categorizedProducts and progressText in a single operation
  const { sortedCategorizedProducts, sortedProgressText } = useMemo(() => {
    // Handle empty data cases
    if (!programData?.categorizedProducts)
      return {
        sortedCategorizedProducts: {},
        sortedProgressText: programData?.progressText
      };

    // Create an array of entries, only filtering out those without a key
    const validEntries = Object.entries(programData.categorizedProducts).filter(
      ([key]) => key && key.trim() !== ""
    );

    // Sort by required products count (descending) and place flex categories at end
    validEntries.sort(([keyA, a], [keyB, b]) => {
      const aIsFlex =
        keyA.toLowerCase() === "flex" ||
        keyA.toLowerCase() === "recommended flex";
      const bIsFlex =
        keyB.toLowerCase() === "flex" ||
        keyB.toLowerCase() === "recommended flex";

      if (aIsFlex && !bIsFlex) return 1;
      if (!aIsFlex && bIsFlex) return -1;

      // Sort by the size of requiredProducts array in descending order
      return b.requiredProducts.length - a.requiredProducts.length;
    });

    // Convert back to object
    const sorted = validEntries.reduce((acc: any, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

    // Create map for progressText sorting
    const keyOrderMap = new Map();
    validEntries.forEach(([key], index) => {
      keyOrderMap.set(key.replace("_", " "), index);
    });

    // Sort progressText if available
    const sortedPT = programData?.progressText?.length
      ? [...programData.progressText].sort((a, b) => {
          const orderA = keyOrderMap.get(a.label) ?? Number.MAX_SAFE_INTEGER;
          const orderB = keyOrderMap.get(b.label) ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        })
      : programData?.progressText;

    return {
      sortedCategorizedProducts: sorted,
      sortedProgressText: sortedPT
    };
  }, [programData?.categorizedProducts, programData?.progressText]);

  const earnedRebate = formatNumber(
    programData?.earnedRebate || 0, // Real Rebate
    isCategorySKUs ? true : false, // Round Only if Category SKUs
    isCategorySKUs ? 0 : 2 // Do not show decimal places if Category SKUs
  );

  useEffect(() => {
    async function fetchData() {
      // Create cache key based on program and warehouse
      const cacheKey = `${programData?.programDetailId}-${selectedWarehousId}-${criteriaType}-${user?.associatedUserId}`;

      // Check if data is already cached
      if (apiCache.has(cacheKey)) {
        const cachedData = apiCache.get(cacheKey);
        // Check if cache is expired
        if (
          cachedData &&
          Date.now() - cachedData.timestamp < CACHE_EXPIRATION_TIME
        ) {
          setGrowthData(cachedData.data);
          setLoading(false);
          return;
        } else {
          // Clear expired cache
          apiCache.delete(cacheKey);
        }
      }

      setLoading(true);
      try {
        const { data } = await apiClient.get(
          `/programs/details/${programData?.programDetailId}/analytics?warehouseId=${selectedWarehousId}`
        );

        // Temporary fix for case growth
        if (user?.associatedUserId == 166 && isCaseGrowth) {
          const prevValue = 410648;
          // Calculate the target value by adding 5% growth to the previous value (simulating case growth)
          const targetValue = prevValue + 0.05 * prevValue;

          // Set multiple values from 0 to targetValue in 5 steps
          const steps = 5;
          const interval = targetValue / steps;
          const yAxisValues = Array.from({ length: steps + 1 }, (_, i) =>
            Math.round(i * interval)
          );
          setCaseGrowthYAxis(yAxisValues);

          data.totalSales.prevValue = prevValue;
          // data.totalSales.value = targetValue;
          // data.totalSales.yoy = 5;

          // Calculate 2024 as baseline and 2025 with actual data from screenshot
          if (data.chartData && Array.isArray(data.chartData)) {
            const total2024 = 410648;
            const ytd2024 = Math.round(total2024 / 2); // 205324 (6 months)

            // Actual 2025 monthly data from screenshot (Jan-Jul 2025)
            const actual2025Data = [
              19794, 18484, 18758, 22617, 22702, 22389, 4879
            ];
            const ytd2025 = actual2025Data.reduce((sum, val) => sum + val, 0); // 131623

            data.totalSales.value = ytd2025;

            // Calculate YoY growth based on actual 2025 vs 2024 data
            const yoyGrowth = ((ytd2025 - ytd2024) / ytd2024) * 100;
            data.totalSales.yoy = Math.round(yoyGrowth * 100) / 100;

            // Calculate monthly distribution for 2024 YTD
            const monthly2024 = Math.round(ytd2024 / data.chartData.length);
            let cumulative2024 = 0;
            let cumulative2025 = 0;

            data.chartData = data.chartData.map((item: any, idx: number) => {
              // Add monthly values to cumulative totals for 2024
              cumulative2024 += monthly2024;

              // Use actual 2025 data for the first 7 months, then 0 for remaining months
              const actual2025Value =
                idx < actual2025Data.length ? actual2025Data[idx] : 0;
              cumulative2025 += actual2025Value;

              // Set consistent 10% growth for all months
              const monthlyGrowth = 10;

              return {
                ...item,
                cumulativeSales_2024: Math.round(cumulative2024),
                cumulativeSales_2025: Math.round(cumulative2025),
                // Add mapping properties for tooltip compatibility
                sales_cumulativeSales_2024: Math.round(cumulative2024),
                sales_cumulativeSales_2025: Math.round(cumulative2025),
                growth_2024: 0, // 2024 baseline
                growth_2025: monthlyGrowth,
                growth: monthlyGrowth, // Consistent 10% growth for all months
                // Add color mappings
                color_cumulativeSales_2024: "#6B7280", // Gray for 2024
                color_cumulativeSales_2025: "#3B82F6" // Blue for 2025
              };
            });

            // Filter data to stop at July 2025
            data.chartData = data.chartData.filter((item: any, idx: number) => {
              if (item.date) {
                // Check if date is a month name (like "Jan", "Feb", etc.)
                const monthNames = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec"
                ];
                const monthIndex = monthNames.indexOf(item.date);

                if (monthIndex !== -1) {
                  // It's a month name, check if it's July or earlier (index 6 = July)
                  return monthIndex <= 6;
                }

                // Try to parse as a date
                const itemDate = new Date(item.date);
                return itemDate.getFullYear() === 2025
                  ? itemDate.getMonth() <= 6
                  : true; // Month 6 = July (0-indexed)
              }
              // If no date field, limit to first 7 months (Jan-Jul 2025)
              return idx < 7;
            });
          }
        }

        // Temporary fix for 10% YoY growth
        if (
          user?.associatedUserId == 166 &&
          (programData.programDetailId == 485 ||
            programData.programDetailId == 487) &&
          isDistributor(user.role) &&
          (isOutreach || isGrowth) &&
          !isCaseGrowth
        ) {
          // Calculate 2024 as baseline and 2025 with 10% growth from baseline
          if (data.chartData && Array.isArray(data.chartData)) {
            data.chartData = data.chartData.map((item: any) => {
              // Set 2024 as baseline (flat line at bottom)
              const sales_2024 =
                item.cumulativeSales_2025 == 0
                  ? 0
                  : (item.cumulativeSales_2025 || 0) * 0.9; // 90% of 2025 as baseline
              // Set consistent 10% growth for all months
              const monthlyGrowth = 10;

              return {
                ...item,
                cumulativeSales_2024: sales_2024,
                cumulativeSales_2025: item.cumulativeSales_2025,
                // Add mapping properties for tooltip compatibility
                sales_cumulativeSales_2024: sales_2024,
                sales_cumulativeSales_2025: item.cumulativeSales_2025,
                growth_2025: monthlyGrowth,
                growth: monthlyGrowth, // Growth between 2024 and 2025 for this month
                // Add color mappings
                color_cumulativeSales_2024: "#6B7280", // Gray for 2024
                color_cumulativeSales_2025: "#3B82F6" // Blue for 2025
              };
            });

            // Filter data to stop at July 2025
            data.chartData = data.chartData.filter((item: any, idx: number) => {
              if (item.date) {
                // Check if date is a month name (like "Jan", "Feb", etc.)
                const monthNames = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec"
                ];
                const monthIndex = monthNames.indexOf(item.date);

                if (monthIndex !== -1) {
                  // It's a month name, check if it's July or earlier (index 6 = July)
                  return monthIndex <= 6;
                }

                // Try to parse as a date
                const itemDate = new Date(item.date);
                return itemDate.getFullYear() === 2025
                  ? itemDate.getMonth() <= 6
                  : true; // Month 6 = July (0-indexed)
              }
              // If no date field, limit to first 7 months (Jan-Jul 2025)
              return idx < 7;
            });
          }

          data.totalSales.yoy = 10; // Set YoY to 10%
          data.earnedRebate = "5055.51";
        }

        // Temporary fix for 10% YoY growth
        if (
          user?.associatedUserId == 298 &&
          (programData.programDetailId == 485 ||
            programData.programDetailId == 487 ||
            programData.programDetailId == 543) &&
          isDistributor(user.role)
        ) {
          // Calculate 2024 as baseline and 2025 with 10% growth from baseline
          if (data.chartData && Array.isArray(data.chartData)) {
            data.chartData = data.chartData.map((item: any) => {
              // Set 2024 as baseline (flat line at bottom)
              const sales_2024 =
                item.cumulativeSales_2025 == 0
                  ? 0
                  : (item.cumulativeSales_2025 || 0) * 0.9; // 90% of 2025 as baseline
              // Set consistent 10% growth for all months
              const monthlyGrowth = 10;

              return {
                ...item,
                cumulativeSales_2024: sales_2024,
                cumulativeSales_2025: item.cumulativeSales_2025,
                // Add mapping properties for tooltip compatibility
                sales_cumulativeSales_2024: sales_2024,
                sales_cumulativeSales_2025: item.cumulativeSales_2025,
                growth_2025: monthlyGrowth,
                growth: monthlyGrowth, // Growth between 2024 and 2025 for this month
                // Add color mappings
                color_cumulativeSales_2024: "#6B7280", // Gray for 2024
                color_cumulativeSales_2025: "#3B82F6" // Blue for 2025
              };
            });

            // Filter data to stop at July 2025
            data.chartData = data.chartData.filter((item: any, idx: number) => {
              if (item.date) {
                // Check if date is a month name (like "Jan", "Feb", etc.)
                const monthNames = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec"
                ];
                const monthIndex = monthNames.indexOf(item.date);

                if (monthIndex !== -1) {
                  // It's a month name, check if it's July or earlier (index 6 = July)
                  return monthIndex <= 6;
                }

                // Try to parse as a date
                const itemDate = new Date(item.date);
                return itemDate.getFullYear() === 2025
                  ? itemDate.getMonth() <= 6
                  : true; // Month 6 = July (0-indexed)
              }
              // If no date field, limit to first 7 months (Jan-Jul 2025)
              return idx < 7;
            });
          }

          data.totalSales.yoy = 10; // Set YoY to 10%
          // data.earnedRebate = "5055.51";
        }

        // Temporary fix for user 298, program 485 - Hardcode -5% YoY growth
        if (
          user?.associatedUserId == 298 &&
          programData.programDetailId == 485 &&
          isDistributor(user.role)
        ) {
          let targetValue;
          // Redistribute sales data to create incremental effect without changing total sum
          if (data.chartData && Array.isArray(data.chartData)) {
            // Calculate total sales for each year
            const totalSales2024 = data.chartData.reduce(
              (sum: number, item: any) =>
                sum + (item.cumulativeSales_2025 || 0) * 0.9,
              0
            );
            const totalSales2025 = data.chartData.reduce(
              (sum: number, item: any) =>
                sum + (item.cumulativeSales_2025 || 0),
              0
            );
            targetValue = totalSales2025 / 3 || totalSales2025;

            // Calculate redistribution factors to create incremental effect
            const monthsCount = data.chartData.length;
            const triangularSum = (monthsCount * (monthsCount + 1)) / 2; // Sum of 1+2+3+...+n

            data.chartData = data.chartData.map((item: any, index: number) => {
              // Redistribute sales proportionally to create incremental effect
              // Month 1 gets 1/triangularSum of total, Month 2 gets 2/triangularSum, etc.
              const redistributionFactor = (index + 1) / triangularSum;
              const redistributedSales2024 =
                totalSales2024 * redistributionFactor;
              const redistributedSales2025 =
                totalSales2025 * redistributionFactor;

              // HARDCODE: Set consistent -5% growth for all months (negative growth)
              const monthlyGrowth = -5;

              return {
                ...item,
                cumulativeSales_2024: Math.round(redistributedSales2024),
                cumulativeSales_2025: Math.round(redistributedSales2025),
                // Add mapping properties for tooltip compatibility
                sales_cumulativeSales_2024: Math.round(redistributedSales2024),
                sales_cumulativeSales_2025: Math.round(redistributedSales2025),
                // HARDCODE: Set growth to -5% for all months
                growth: monthlyGrowth,
                growth_2025: monthlyGrowth,
                // Add color mappings
                color_cumulativeSales_2024: "#6B7280", // Gray for 2024
                color_cumulativeSales_2025: "#3B82F6" // Blue for 2025
              };
            });
          }

          // Set multiple values from 0 to targetValue in 5 steps
          const steps = 5;
          const interval = targetValue / steps;
          const yAxisValues = Array.from({ length: steps + 1 }, (_, i) =>
            Math.round(i * interval)
          );
          setCaseGrowthYAxis(yAxisValues);

          // HARDCODE: Ensure 2024 baseline shows 5% higher than 2025 (for -5% YoY)
          if (data.chartData && Array.isArray(data.chartData)) {
            data.chartData = data.chartData.map((item: any) => {
              // Set 2024 as baseline (5% higher than 2025 to show -5% decline)
              const sales_2024 =
                item.cumulativeSales_2025 == 0
                  ? 0
                  : (item.cumulativeSales_2025 || 0) * 1.05; // 105% of 2025 as baseline (showing decline)

              // HARDCODE: Set consistent -5% growth for all months
              const monthlyGrowth = -5;

              return {
                ...item,
                cumulativeSales_2024: sales_2024,
                cumulativeSales_2025: item.cumulativeSales_2025,
                // Add mapping properties for tooltip compatibility
                sales_cumulativeSales_2024: sales_2024,
                sales_cumulativeSales_2025: item.cumulativeSales_2025,
                // HARDCODE: Ensure growth is consistently -5%
                growth: monthlyGrowth,
                growth_2025: monthlyGrowth,
                // Add color mappings
                color_cumulativeSales_2024: "#6B7280", // Gray for 2024
                color_cumulativeSales_2025: "#3B82F6" // Blue for 2025
              };
            });

            // Filter data to stop at July 2025
            data.chartData = data.chartData.filter((item: any, idx: number) => {
              if (item.date) {
                // Check if date is a month name (like "Jan", "Feb", etc.)
                const monthNames = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec"
                ];
                const monthIndex = monthNames.indexOf(item.date);

                if (monthIndex !== -1) {
                  // It's a month name, check if it's July or earlier (index 6 = July)
                  return monthIndex <= 6;
                }

                // Try to parse as a date
                const itemDate = new Date(item.date);
                return itemDate.getFullYear() === 2025
                  ? itemDate.getMonth() <= 6
                  : true; // Month 6 = July (0-indexed)
              }
              // If no date field, limit to first 7 months (Jan-Jul 2025)
              return idx < 7;
            });
          }

          // HARDCODE: Set YoY to -5% and ensure it's applied
          data.totalSales.yoy = -5;
        }

        // General filter to ensure all chart data stops at July 2025
        if (data.chartData && Array.isArray(data.chartData)) {
          data.chartData = data.chartData.filter((item: any, idx: number) => {
            if (item.date) {
              // Check if date is a month name (like "Jan", "Feb", etc.)
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec"
              ];
              const monthIndex = monthNames.indexOf(item.date);

              if (monthIndex !== -1) {
                // It's a month name, check if it's July or earlier (index 6 = July)
                return monthIndex <= 6;
              }

              // Try to parse as a date
              const itemDate = new Date(item.date);
              const is2025 = itemDate.getFullYear() === 2025;
              const isJulyOrEarlier = itemDate.getMonth() <= 6;
              return is2025 ? isJulyOrEarlier : true;
            }
            // If no date field, limit to first 7 months (Jan-Jul 2025)
            return idx < 7;
          });
        }

        setGrowthData(data);
        // Cache the fetched data
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
      } catch (error: any) {
        console.error("Failed to fetch SPIFF programs for distributor:", error);
        setGrowthData(null);
      } finally {
        setLoading(false);
      }
    }

    if ((isGrowth || isOutreach || isPOD) && programData?.programDetailId) {
      fetchData();
    } else {
      setGrowthData(null);
    }
  }, [programData, selectedWarehousId, criteriaType]);

  useEffect(() => {
    if (isOpen) {
      setSelectedWarehousId(warehouseId ?? "");
    }
  }, [isOpen, warehouseId]);

  const legendFormatter = (value: any, showDollarSign = true) => {
    const chartData = growthData?.chartData || [];

    if (!chartData || chartData.length === 0) return value;

    // Calculate totals for each line
    const getTotal = (key: string) =>
      (chartData || []).reduce(
        (acc: number, curVal: any) =>
          acc + Math.round(Number(curVal[key] || 0)),
        0
      );

    // Get the last cumulative value (for cumulative data, total = last value)
    const getLastValue = (key: string) => {
      const lastValue = chartData[chartData.length - 1][key];
      return Math.round(Number(lastValue || 0));
    };

    // Handle our specific chart lines
    if (value === "cumulativeSales_2024") {
      const lastValue = getLastValue("cumulativeSales_2024");
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#6B7280" }}
          />
          <span>
            2024 (
            {showDollarSign
              ? `$${formatNumber(lastValue)}`
              : `${formatNumber(lastValue)}`}
            )
          </span>
        </div>
      );
    }

    if (value === "cumulativeSales_2025") {
      const lastValue = getLastValue("cumulativeSales_2025");
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#3B82F6" }}
          />
          <span>
            2025 (
            {showDollarSign
              ? `$${formatNumber(lastValue)}`
              : `${formatNumber(lastValue)}`}
            )
          </span>
        </div>
      );
    }

    // Handle chart component's currentYear/pastYear requests
    if (value === "currentYear") {
      const lastValue = getLastValue("cumulativeSales_2025");
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#3B82F6" }}
          />
          <span>
            2025 (
            {showDollarSign
              ? `$${formatNumber(lastValue)}`
              : `${formatNumber(lastValue)}`}
            )
          </span>
        </div>
      );
    }

    if (value === "pastYear") {
      const lastValue = getLastValue("cumulativeSales_2024");
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#6B7280" }}
          />
          <span>
            2024 (
            {showDollarSign
              ? `$${formatNumber(lastValue)}`
              : `${formatNumber(lastValue)}`}
            )
          </span>
        </div>
      );
    }

    // Fallback for any other values
    return value;
  };

  const chartLines = useMemo(() => {
    const chartGrowthData = growthData?.chartData || [];

    if (chartGrowthData?.length) {
      // Use consistent cumulative properties for both years
      return ["cumulativeSales_2024", "cumulativeSales_2025"];
    }

    return [];
  }, [growthData]);

  const growthKeys = useMemo(() => {
    const chartData = growthData?.chartData || [];

    if (!chartData?.length || (chartData.length && !isGrowth)) return [];

    const keys = Object.keys(chartData[0])
      .filter((key) => key.endsWith("_key"))
      .map((key) => chartData[0][key])
      .sort((a, b) => a - b)
      .map((key) => "_" + key);

    return isGrowth ? keys : [];
  }, [growthData, isGrowth]);

  const xAxisLabelFormatter = (label: string | number) => {
    if (label || label == 0) {
      return `No of Stores: ${formatNumber(Number(label))}`;
    } else {
      return "";
    }
  };

  const yAxisTickFormatter = (tick: number) => {
    return formatNumber(tick, true);
  };

  const customTicks = useMemo(() => {
    const steps = 5;
    const interval = growthData?.totalStoresCount / steps;
    return Array.from({ length: steps + 1 }, (_, i) =>
      Math.round(i * interval)
    );
  }, [growthData]);

  const EarningsDisplay = ({
    value,
    showEarning = false
  }: {
    value: string;
    showEarning?: boolean;
  }) => {
    const rebateValue = formatNumber(Number(value ?? "0"), false);

    if (showSavingsNotApplicable && !showEarning) {
      return <p className="font-bold text-lg mt-3">NA</p>;
    }

    return showEstimatedWarning ? (
      <div className="flex items-center gap-1.5 mt-3">
        <p className="font-bold text-lg">${rebateValue}</p>
        <EstimatedSavingsWarningPopOver />
      </div>
    ) : (
      <p className="font-bold text-lg mt-3">${rebateValue}</p>
    );
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        {/* fixed inset-0 w-screen overflow-y-auto p-4 */}
        <div
          id="distributor-program-details-modal"
          className="distributor-program-details-modal fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4"
        >
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="max-w-4xl w-full border bg-white p-4 sm:p-6 rounded-lg">
              <DialogTitle className="flex justify-between">
                <p className="font-semibold text-lg">
                  {`${programData?.type || "Core Distribution"} ${isCategorySKUs ? "Category SKUs" : ""}`}
                </p>
                <div className="flex gap-2 items-center">
                  {(isOutreach || isPOD || isGrowth) && (
                    <WarehouseSelectFilter
                      isManager={true}
                      onSelectChange={(val) => {
                        setSelectedWarehousId(val);
                      }}
                      warehouses={warehouses}
                    />
                  )}
                  {(isOutreach || isPOD) && (
                    <CreateNewProgram
                      label="Create Initiative"
                      referenceId={programData?.id?.toString()}
                    />
                  )}
                  <Image
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer"
                    src={popupCloseIcon.src}
                    alt="popupCloseIcon"
                    height={13}
                    width={13}
                  />
                </div>
              </DialogTitle>

              {programData?.additionalInfo?.description && (
                <div className="mt-4 border rounded-lg p-4 text-sm">
                  <p className="text-filter-light mb-1">Description</p>
                  <pre
                    className="text-medium text-highlighted-color overflow-y-auto pr-2 -mr-2 max-h-28 whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: programData?.additionalInfo?.description
                    }}
                  ></pre>
                </div>
              )}

              {!isGrowth && !isOutreach && (
                <div
                  className={`mt-4 grid grid-cols-1 sm:grid-cols-${showEstimatedEarning ? "3" : "2"} gap-4`}
                >
                  <div id="sku-title-card" className="border rounded-lg p-3">
                    <div className="flex gap-1.5 items-center">
                      <span className="text-sm font-medium text-highlighted-color">
                        Progress Track
                      </span>
                    </div>
                    {sortedProgressText &&
                    sortedProgressText.length &&
                    sortedProgressText.length > 0 ? (
                      <div className="mt-3 flex gap-x-2 gap-y-1 flex-wrap overflow-y-auto pr-2 -mr-2 max-h-20">
                        {sortedProgressText?.map((item, index) => (
                          <p
                            key={`cat-${index}`}
                            className="font-normal text-lg"
                          >
                            {item.sku.completed}/{item.sku.total}
                            <span className="text-filter-light text-xs ml-1">
                              {item.label}
                            </span>
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {(growthData?.graph ?? programData?.graph) &&
                      !programData?.progressText?.length &&
                      Object.keys(
                        (growthData?.graph ?? programData?.graph) || {}
                      ).map((label) => {
                        const graph = growthData?.graph ?? programData?.graph;
                        const graphData = graph?.[label];
                        let completed = 0;
                        let total = 0;

                        // Check if graphData exists and has the required properties
                        if (
                          graphData?.completed != undefined &&
                          graphData?.total != undefined
                        ) {
                          completed =
                            Number(graphData.completed) >
                              Number(graphData.total) &&
                            Number(graphData.total) !== 0
                              ? Math.round(Number(graphData.total))
                              : Math.round(Number(graphData.completed));
                          total = Math.round(Number(graphData.total));
                        }
                        // Validate graphData and render the chart
                        if (
                          completed > 0 ||
                          total > 0 ||
                          (completed == 0 && total == 0)
                        ) {
                          return (
                            <div
                              className="mt-3 flex gap-x-2 gap-y-1 flex-wrap overflow-y-auto pr-2 -mr-2 max-h-20"
                              key={label}
                            >
                              <p className="font-bold text-lg">
                                {formatNumber(completed, true)}
                                {total === 0
                                  ? ""
                                  : `/${formatNumber(total, true)}`}
                                <span className="text-filter-light text-xs font-normal ml-1">
                                  {label}
                                </span>
                              </p>
                            </div>
                          );
                        }
                      })}
                  </div>

                  <div className="PurchaseVolume border rounded-lg p-3">
                    <div className="flex gap-1.5 items-center">
                      <Image
                        height={19}
                        width={19}
                        src={GreenDollarIcon.src}
                        alt="Purchase Volume Icon"
                      />
                      <span className="text-sm font-medium text-heading-light">
                        Purchase Volume
                      </span>
                    </div>

                    <p className="font-bold text-lg mt-3">${purchaseVolume}</p>
                  </div>

                  {showEstimatedEarning && (
                    <div className="EstimatedEarnings border rounded-lg p-3">
                      <div className="flex gap-1.5 items-center">
                        <Image
                          height={19}
                          width={19}
                          src={GreenDollarIcon.src}
                          alt="Estimated Earnings Icon"
                        />
                        <span className="text-sm font-medium text-heading-light">
                          {isPOD &&
                          (user?.associatedUserId == 166 ||
                            user?.associatedUserId == 298) // Temporary fix for POD
                            ? "Earnings Opportunity"
                            : "Estimated Earnings"}
                        </span>
                      </div>
                      <EarningsDisplay
                        value={
                          isPOD &&
                          (user?.associatedUserId == 166 ||
                            user?.associatedUserId == 298) // Temporary fix for POD
                            ? "5055.51"
                            : earnedRebate
                        }
                      />
                    </div>
                  )}
                </div>
              )}
              {isPOD && (
                <div className="border border-slate-200 mt-4 rounded-md">
                  <div className="w-full lg:w-1/2 xl:w-full flex-1 p-0">
                    <Card className="sku-distribution-bar-chart relative h-full">
                      {(growthData?.graph ?? programData?.graph) &&
                        Object.keys(
                          (growthData?.graph ?? programData?.graph) || {}
                        ).map((label) => {
                          const graph = growthData?.graph ?? programData?.graph;
                          const graphData = graph ? graph[label] : "";
                          let completed = 0;
                          let total = 0;
                          const dollarSign = label == "Spend" ? "$" : "";
                          if (
                            graphData &&
                            graphData.completed !== undefined &&
                            graphData.total !== undefined
                          ) {
                            completed =
                              Number(graphData.completed) >
                                Number(graphData.total) &&
                              Number(graphData.total) != 0
                                ? Math.round(Number(graphData.total))
                                : Math.round(Number(graphData.completed));
                            total = Math.round(Number(graphData.total));
                          }

                          const semiPieChartColor =
                            programData?.complianceStatus
                              ? PROGRESS_COLORS.COMPLETED
                              : PROGRESS_COLORS.PENDING;
                          return typeof graphData === "object" &&
                            graphData.completed !== undefined &&
                            graphData.total !== undefined ? (
                            <div
                              key={`tierDetail-${label}`}
                              className="chart mt-3 cursor-pointer"
                            >
                              {total == 0 ? (
                                <p className="font-bold text-lg mt-3">
                                  {formatNumber(completed, true)}
                                  <span className="text-filter-light text-xs font-normal ml-1 capitalize">
                                    {label}
                                  </span>
                                </p>
                              ) : (
                                <DynamicSemiPieChart
                                  percentage={calcPercentage(completed, total)}
                                  title={`${dollarSign + formatNumber(completed)}/${dollarSign + formatNumber(total)}`}
                                  desc={label}
                                  pieColor={semiPieChartColor}
                                  cx={100}
                                  height={90}
                                  width={210}
                                  textX={105}
                                />
                              )}
                            </div>
                          ) : null;
                        })}
                    </Card>
                  </div>
                </div>
              )}
              {/* Show Distribution Growth Graph*/}
              {isGrowth || isOutreach ? (
                loading ? (
                  <div
                    className={`mt-4 grid grid-cols-1 sm:grid-cols-1 gap-4 min-h-[20vh]`}
                  >
                    <Loader
                      className="top-[calc(50%-60px)] left-1/2 z-50"
                      show={loading}
                    />
                  </div>
                ) : (
                  <>
                    {isOutreach ? (
                      <div
                        className={`mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4`}
                      >
                        <div className="PurchaseVolume border rounded-lg p-3">
                          <div className="flex gap-1.5 items-center">
                            <span className="text-sm font-medium text-heading-light">
                              Progress Track
                            </span>
                          </div>

                          <p className="font-bold text-lg mt-3">
                            {formatNumber(
                              growthData?.qualifiedStoresCount ?? 0,
                              true
                            )}
                            /
                            {formatNumber(
                              growthData?.totalStoresCount ?? 0,
                              true
                            )}
                          </p>
                        </div>

                        <div className="EstimatedEarnings border rounded-lg p-3">
                          <div className="flex gap-1.5 items-center">
                            <Image
                              height={19}
                              width={19}
                              src={GreenDollarIcon.src}
                              alt="Estimated Earnings Icon"
                            />
                            <span className="text-sm font-medium text-heading-light">
                              Estimated Earnings
                            </span>
                          </div>
                          <EarningsDisplay value={earnedRebate} />
                        </div>

                        <div className="EstimatedEarnings border rounded-lg p-3">
                          <div className="flex gap-1.5 items-center">
                            <Image
                              height={19}
                              width={19}
                              src={GreenDollarIcon.src}
                              alt="Estimated Earnings Icon"
                            />
                            <span className="text-sm font-medium text-heading-light">
                              Earnings Opportunity
                            </span>
                          </div>
                          <EarningsDisplay
                            value={growthData?.rebateOppertunity}
                            showEarning
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`mt-4 grid grid-cols-1 sm:grid-cols-${showEstimatedEarning ? "3" : "2"} gap-4`}
                      >
                        <div className="PurchaseVolume border rounded-lg p-3">
                          <div className="flex gap-1.5 items-center">
                            <Image
                              height={19}
                              width={19}
                              src={GreenDollarIcon.src}
                              alt="Purchase Volume Icon"
                            />
                            <span className="text-sm font-medium text-heading-light">
                              {isCaseGrowth ? "Case Volume " : "Sales Volume "}(
                              {new Date().getFullYear().toString()})
                            </span>
                          </div>

                          <p className="font-bold text-lg mt-3">
                            {isCaseGrowth ? "" : "$"}
                            {formatNumber(growthData?.totalSales?.value ?? 0)}
                          </p>
                        </div>

                        <div className="EstimatedEarnings border rounded-lg p-3">
                          <div className="flex gap-1.5 items-center">
                            <TrendingUp
                              width={19}
                              height={19}
                              color="#18B368"
                            />
                            <span className="text-sm font-medium text-heading-light">
                              Growth %
                            </span>
                          </div>

                          <p className="font-bold text-lg mt-3">
                            {formatNumber(growthData?.totalSales?.yoy ?? 0) +
                              "%"}
                          </p>
                        </div>

                        <div className="EstimatedEarnings border rounded-lg p-3">
                          <div className="flex gap-1.5 items-center">
                            <Image
                              height={19}
                              width={19}
                              src={GreenDollarIcon.src}
                              alt="Estimated Earnings Icon"
                            />
                            <span className="text-sm font-medium text-heading-light">
                              Earnings Opportunity
                            </span>
                          </div>
                          <EarningsDisplay
                            value={
                              isOutreach
                                ? earnedRebate
                                : growthData?.earnedRebate
                            }
                            showEarning={isOutreach}
                          />
                        </div>
                      </div>
                    )}
                    <div className="border border-slate-200 mt-4 rounded-md">
                      <StackedLineChartCustom
                        chartData={growthData?.chartData ?? []}
                        xAxisKey="date"
                        lineColor={"#FF9900"}
                        yAxisKey={isOutreach ? "storesCount" : `sales`}
                        isShowGrowth={!isOutreach}
                        yAxisTickSuffix={undefined}
                        distributorId={""}
                        showGrowthOption={false}
                        showCategories={false}
                        disableAPICall
                        hideDateRange={true}
                        customTicks={
                          isOutreach
                            ? customTicks
                            : isCaseGrowth
                              ? caseGrowthYAxis
                              : undefined
                        }
                        isShowGrowthDistributorData
                        selectedMonthRange={0}
                        chartLines={chartLines}
                        legendFormatter={(value) =>
                          isCaseGrowth
                            ? legendFormatter(value, false)
                            : legendFormatter(value)
                        }
                        yAxisKeyPrefix={isOutreach ? "storesCount_" : "sales_"}
                        xAxisLabelFormatter={
                          isOutreach ? xAxisLabelFormatter : undefined
                        }
                        yAxisTickFormatter={
                          isOutreach ? yAxisTickFormatter : undefined
                        }
                        hideDollarSign={isCaseGrowth}
                      />
                    </div>
                  </>
                )
              ) : null}

              {/* Show Products */}
              {isCategorySKUs &&
                !!programData?.categorizedProducts &&
                sortedCategorizedProducts &&
                !!Object.keys(programData?.categorizedProducts || {})
                  ?.length && (
                  <CategorizedTabProductList
                    categorizedProducts={sortedCategorizedProducts}
                    tabSearchParamKey={"storeDetailProductTab"}
                    resetTabs={!isOpen}
                    showPurchasedProductsButton
                    showUpcCode
                    canSortCategorizedProducts={false}
                    allPurchasedProducts={allPurchasedProducts}
                    showAddIcon={false}
                  />
                )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};
export default DistributorProgramDetailsModal;
