import { MONTH_NAMES } from "../config/appConstants";
import DistributorRepository from "../repositories/DistributorRepository";
import {
  MySalesResponse,
  MySalesResponseItem,
  SalesDataItem
} from "../types/SalesTypes";

const startOfDay = (date: Date): Date => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
};

const endOfDay = (date: Date): Date => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
};

// Function to generate week ranges between startDate and endDate
export const generateWeekRanges = (
  startDate: Date,
  endDate: Date
): { startWeekDate: Date; endWeekDate: Date }[] => {
  const ranges: { startWeekDate: Date; endWeekDate: Date }[] = [];
  let currentStart = startOfDay(new Date(startDate));
  const finalEnd = endOfDay(new Date(endDate));

  while (currentStart <= finalEnd) {
    // Find the next Sunday after currentStart
    const dayOfWeek = currentStart.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const daysToSunday = (7 - dayOfWeek) % 7 || 7; // Days to next Sunday
    const nextSunday = new Date(currentStart);
    nextSunday.setDate(currentStart.getDate() + daysToSunday);
    nextSunday.setHours(23, 59, 59, 999);

    // If nextSunday exceeds endDate, use endDate as the range end
    const rangeEnd = nextSunday > finalEnd ? finalEnd : nextSunday;
    ranges.push({
      startWeekDate: new Date(currentStart),
      endWeekDate: new Date(rangeEnd)
    });
    // Move currentStart to the next Monday (day after rangeEnd)
    currentStart = new Date(rangeEnd);
    currentStart.setDate(currentStart.getDate() + 1);
    currentStart.setHours(0, 0, 0, 0);
  }

  return ranges;
};

// Function to format the week label
export const formatWeekLabel = (start: Date, end: Date): string => {
  const startMonth = MONTH_NAMES[start.getMonth()];
  const endMonth = MONTH_NAMES[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startDayStr = startDay < 10 ? `0${startDay}` : startDay.toString();
  const endDayStr = endDay < 10 ? `0${endDay}` : endDay.toString();

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDayStr}-${endDayStr}`;
  } else {
    return `${startMonth} ${startDayStr}-${endMonth} ${endDayStr}`;
  }
};

// Function to find the week range for a given transaction date
const findWeekRange = (
  transactionDate: Date,
  weekRanges: { startWeekDate: Date; endWeekDate: Date }[],
  returnWeekIndex: boolean = false
): { startWeekDate: Date; endWeekDate: Date } | number | null => {
  let weekIndex = 0;
  for (const range of weekRanges) {
    if (
      transactionDate >= range.startWeekDate &&
      transactionDate <= range.endWeekDate
    ) {
      return returnWeekIndex ? weekIndex : range;
    }
    weekIndex++;
  }
  return null;
};

export const formatDate = (date: Date): string =>
  date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .replace(",", "");

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Date(0, month).toLocaleString("default", { month: "long" })
);

/**
 * Generic function to fetch and process sales data for either a manufacturer or distributor.
 * @param entityId - ID of the manufacturer or distributor.
 * @param startDate - Start date of the sales data period.
 * @param endDate - End date of the sales data period.
 * @param isDaily - Whether the data is daily or monthly.
 * @param resultKey - Key to store the result (e.g., "1", "3", "6", "12").
 * @param result - The result object to store processed sales data.
 * @param entityType - Type of entity ('manufacturer' or 'distributor').
 * @param categoryId - Optional category ID.
 * @param distributorId - Optional distributor ID, used only if entityType is 'manufacturer'.
 * @param manufactDist -
 * @param returnTotalSales - Optional for returning total sales or relevant sales.
 */
export async function fetchSalesData(
  entityId: number,
  startDate: Date,
  endDate: Date,
  isDaily: boolean,
  resultKey: string,
  result: MySalesResponse,
  entityType: string,
  categoryId?: number,
  distributorId?: number,
  manufactDist?: boolean,
  returnTotalSales?: boolean
): Promise<void> {
  // Select the appropriate repository method based on entityType

  // if (entityType === ENTITY_TYPE.MANUFACTURER) {
  //   if (manufactDist) {
  //     // Get total distributor IDs if manufactDist is true
  //     const totalDistributorIds = distributorId
  //       ? [{ associatedUserId: distributorId }]
  //       : await ManufacturerRepository.getDistributors(entityId, distributorId);

  //     const distributorIds = totalDistributorIds.map(
  //       (distributor: { associatedUserId: number }) =>
  //         distributor.associatedUserId
  //     );

  //     // Fetch sales for all distributors of the manufacturer
  //     salesData = await DistributorRepository.getSalesForDistributor(
  //       distributorIds,
  //       startDate,
  //       endDate,
  //       isDaily,
  //       categoryId,
  //       entityId
  //     );
  //   } else {
  //     // Fetch sales for the manufacturer
  //     salesData = await ManufacturerRepository.getSalesForManufacturer(
  //       entityId,
  //       startDate,
  //       endDate,
  //       isDaily,
  //       categoryId,
  //       distributorId
  //     );
  //   }
  // } else {
  // Fetch sales for the distributor
  const salesData = await DistributorRepository.getSalesForDistributor(
    entityId,
    startDate,
    endDate,
    isDaily,
    categoryId,
    undefined,
    !returnTotalSales
  );
  // }

  if (resultKey != "1") {
    // add missing months to salesData
    const existingMonths = salesData.map(
      (item) => monthNames[(item.date as Date).getMonth()]
    );

    // Identify missing months
    const missingMonths = monthNames.filter(
      (month) => !existingMonths.includes(month)
    );

    // Add missing months to existingMonths
    const allMonths = [...existingMonths, ...missingMonths];

    // Display based on resultKey
    const resultCount = Number(resultKey);
    const relevantMonths: string[] = [];

    // Maintain order of months as data
    for (let i = 0; i < resultCount; i++) {
      const index = i % allMonths.length;
      relevantMonths.push(allMonths[index]);
    }

    if (resultKey == "12") {
      // for YTD maintain chronological order
      relevantMonths.sort(
        (a, b) => monthNames.indexOf(a) - monthNames.indexOf(b)
      );
    }

    // Create a map of existing sales data
    const salesDataByMonth = new Map<string, number>();
    salesData.forEach((item: SalesDataItem) => {
      const month = monthNames[(item.date as Date).getMonth()];
      const sales = parseFloat(item.total_sales);
      salesDataByMonth.set(month, sales >= 0 ? sales : 0);
    });

    // Generate `barChartData` with missing months added
    const barChartData: { date: string; sales: number }[] = relevantMonths.map(
      (month) => ({
        date: month.slice(0, 3),
        sales: salesDataByMonth.get(month) || 0
      })
    );

    // Calculate total sales
    const totalSale = barChartData.reduce((sum, item) => sum + item.sales, 0);

    // Assign to result
    result[resultKey] = {
      totalSale,
      barChartData
    };
  } else {
    // Generate all required dates
    const allDates: string[] = generateDateRange(startDate, endDate);

    allDates.forEach((date: string) => {
      const item: SalesDataItem | undefined = salesData.find(
        (st: SalesDataItem) =>
          new Date(st.date).toISOString().split("T")[0] ===
          new Date(date).toISOString().split("T")[0]
      );

      const dateLabel = isDaily
        ? formatDate((item?.date ?? new Date(date)) as Date)
        : monthNames[((item?.date ?? new Date(date)) as Date).getMonth()];

      (result[resultKey] as MySalesResponseItem).barChartData.push({
        date: dateLabel,
        sales:
          item && parseFloat(item.total_sales) >= 0
            ? parseFloat(item.total_sales)
            : 0
      });

      result[resultKey].totalSale += item ? parseFloat(item.total_sales) : 0;
    });
  }
}

export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];

  while (start <= end) {
    dates.push(start.toISOString().slice(0, 10));
    start.setDate(start.getDate() + 1);
  }

  return dates;
}

export function getStartOfWeek(date: Date): Date {
  const day = date.getDay(); // Get the day of the week (0-Sunday, 1-Monday, ..., 6-Saturday)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust the date to the start of the week (Monday)
  const startOfWeek = new Date(date.setDate(diff)); // Set the date to the start of the week
  startOfWeek.setHours(0, 0, 0, 0); // Set time to 00:00:00 for consistency
  return startOfWeek;
}

export function generateWeekRange(startDate: Date, endDate: Date): string[] {
  const weeks: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const currentStartDate = new Date(start); // Initialize the starting date
  let weekCount = 1;

  while (currentStartDate <= end) {
    weeks.push(`Week ${weekCount}`);
    // Move to the start of the next week (7 days later)
    currentStartDate.setDate(currentStartDate.getDate() + 7);
    weekCount++;
  }

  return weeks;
}

export function processSalesData(
  salesData: any[],
  monthRange: string,
  startDate: Date,
  endDate: Date,
  productIds?: number[],
  productColorMap?: any,
  weekRanges: any[] = [],
  weekLabels: any[] = [],
  fetchPrevYearData: boolean = false
) {
  const hasProductIds = !!productIds?.length;

  const initializeEntry = (entry: any, key: string) => {
    if (hasProductIds) {
      productIds.map((id) => {
        entry[`sales_${id}`] = 0;
        entry[`units_${id}`] = 0;
      });
    } else {
      entry = { sales: 0, units: 0 };
    }
    return entry;
  };

  const calculateTotals = (entry: any, item: any) => {
    if (hasProductIds) {
      entry[`sales_${item.product_id}`] += parseFloat(item.sales);
      entry[`units_${item.product_id}`] += parseFloat(item.total_units);
    } else {
      entry.sales += parseFloat(item.sales);
      entry.units += parseFloat(item.total_units);
    }
    return entry;
  };

  const generateFormattedData = (
    data: any,
    labels: string[],
    isMonthView: boolean,
    reduceLableSize: boolean = true
  ) => {
    return labels.map((label, index) => {
      const key = isMonthView ? label : formatDate(new Date(label));
      const dateLabel =
        isMonthView && reduceLableSize ? label.slice(0, 3) : key;
      const entry: any = { date: dateLabel };

      if (hasProductIds) {
        productIds.forEach((id) => {
          entry[`sales_${id}`] =
            data?.[key]?.[`sales_${id}`] >= 0
              ? data?.[key]?.[`sales_${id}`]
              : 0;
          entry[`units_${id}`] =
            data?.[key]?.[`units_${id}`] >= 0
              ? data?.[key]?.[`units_${id}`]
              : 0;
          entry[`color_${id}`] = productColorMap?.[id] || "";
        });
      } else {
        entry.sales = data?.[key]?.sales >= 0 ? data?.[key]?.sales : 0;
        entry.units = data?.[key]?.units >= 0 ? data?.[key]?.units : 0;
      }

      return entry;
    });
  };

  if (monthRange != "1") {
    // Get existing months from sales data
    const existingMonths = salesData.map(
      (item) => monthNames[new Date(item.transaction_date).getMonth()]
    );

    const currentMonth = new Date(endDate).getMonth() + 1;

    // Identify missing months
    const missingMonths = monthNames
      .filter((month) => !existingMonths.includes(month))
      .slice(0, currentMonth);

    const allMonths = existingMonths?.length
      ? [...new Set([...existingMonths])]
      : [...missingMonths];

    // Display based on resultKey
    const resultCount = Number(12);

    // Sort months chronologically for YTD (monthRange == "12")
    const relevantMonths =
      monthRange == "12"
        ? allMonths
            .slice(0, resultCount)
            .sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
        : allMonths.slice(0, resultCount);

    const data = salesData.reduce((acc, item) => {
      if (hasProductIds && !productIds.includes(item.product_id)) return acc;

      const month = monthNames[new Date(item.transaction_date).getMonth()];
      if (!acc[month]) {
        acc[month] = { transaction_date: month };
        acc[month] = initializeEntry(acc[month], month);
      }
      acc[month] = calculateTotals(acc[month], item);

      return acc;
    }, {});

    // Generate `barChartData` with missing months added
    return generateFormattedData(data, relevantMonths, true);
  }

  if (weekRanges.length == 0) {
    weekRanges = generateWeekRanges(startDate, endDate);
  }

  if (weekLabels.length == 0) {
    for (const weekRange of weekRanges) {
      const weekLabel = formatWeekLabel(
        weekRange.startWeekDate,
        weekRange.endWeekDate
      );
      weekLabels.push(weekLabel);
    }
  }

  let salesDataCounter = 0;
  const weekRangesToFetchData = generateWeekRanges(startDate, endDate);

  const data = salesData.reduce((acc, item) => {
    // initialize all week labels
    salesDataCounter++;
    if (salesDataCounter == 1) {
      for (const weekRange of weekRanges) {
        const weekLabel = formatWeekLabel(
          weekRange.startWeekDate,
          weekRange.endWeekDate
        );
        acc[weekLabel] = { week: weekLabel };
        acc[weekLabel] = initializeEntry(acc[weekLabel], weekLabel);
      }
    }
    if (hasProductIds && !productIds.includes(item.product_id)) return acc;

    // Get the date of the transaction
    const transactionDate = new Date(item.transaction_date);

    const weekRange: any = findWeekRange(
      transactionDate,
      weekRangesToFetchData,
      fetchPrevYearData
    );

    // Calculate the number of days since the start date
    const diffInTime = transactionDate.getTime() - startDate.getTime();
    const diffInDays = diffInTime / (1000 * 3600 * 24); // Difference in days
    const weekNumber = Math.floor(diffInDays / 7) + 1; // Calculate the week number (1-based index)

    if (weekRange !== null) {
      const weekLabel = formatWeekLabel(
        fetchPrevYearData
          ? weekRanges[weekRange].startWeekDate
          : weekRange.startWeekDate,
        fetchPrevYearData
          ? weekRanges[weekRange].endWeekDate
          : weekRange.endWeekDate
      );

      // Aggregate data for that week
      acc[weekLabel] = calculateTotals(acc[weekLabel], item);
    }

    return acc;
  }, {});
  return generateFormattedData(data, weekLabels, true, false);
}

export function getStorePenetrationChartData(
  salesData: any[],
  monthRange: string,
  startDate: Date,
  endDate: Date,
  totalStores: number,
  productIds?: number[],
  productColorMap?: any
) {
  const hasProductIds = !!productIds?.length;

  if (monthRange != "1") {
    // Get existing months from sales data
    const existingMonths = salesData.map(
      (item) => monthNames[new Date(item.transaction_date).getMonth()]
    );

    const currentMonth = new Date(endDate).getMonth() + 1;
    // Identify missing months
    const missingMonths = monthNames
      .filter((month) => !existingMonths.includes(month))
      .slice(0, currentMonth);

    const allMonths = existingMonths?.length
      ? [...new Set([...existingMonths])]
      : [...missingMonths];

    // Display based on resultKey
    const resultCount = allMonths.length;
    const relevantMonths = [];

    // Maintain order of months as data
    for (let i = 0; i < resultCount; i++) {
      const index = i % allMonths.length;
      relevantMonths.push(allMonths[index]);
    }

    const data = salesData.reduce(
      (acc, item) => {
        const month = monthNames[new Date(item.transaction_date).getMonth()];

        // Initialize if not exists
        if (!acc[month]) {
          acc[month] = {};
        }

        if (hasProductIds) {
          if (!acc[month][item.product_id]) {
            acc[month][item.product_id] = new Set(); // Unique store IDs per product
          }
          acc[month][item.product_id].add(item.store_id);
        } else {
          if (!acc[month]["all"]) {
            acc[month]["all"] = new Set();
          }
          acc[month]["all"].add(item.store_id);
        }
        return acc;
      },
      {} as Record<string, Record<number | "all", Set<number>>>
    );

    // Object to track cumulative values per product ID
    const cumulativeValues: Record<string, number> = {};
    const cumulativeStores: Record<string, number> = {};
    const cumulativeStoreIdsArray: Record<string, number[]> = {};
    const uniqueStores = new Set(); // Track all unique store IDs globally

    // Generate `barChartData` with missing months added
    return relevantMonths.map((month) => {
      const monthLabel = month.slice(0, 3);

      if (hasProductIds) {
        const entry: Record<string, any> = { date: monthLabel };
        productIds.forEach((id) => {
          if (!cumulativeStoreIdsArray[id]) {
            cumulativeStoreIdsArray[id] = []; // Initialize storeIdsArray
          }

          const currentStores = data?.[month]?.[id] || new Set();

          // Filter only new store IDs
          const newStores = [...currentStores];
          // .filter(
          //   (storeId) => !uniqueStores.has(storeId)
          // );

          // Add new store IDs to the global set
          newStores.forEach((storeId) => uniqueStores.add(storeId));

          // Accumulate the previous value for this specific product ID
          cumulativeStoreIdsArray[id] = [
            ...cumulativeStoreIdsArray[id],
            ...newStores
          ];

          const uniquesStoresCount = new Set(cumulativeStoreIdsArray[id]).size;
          const currentValue =
            uniquesStoresCount > 0
              ? Math.min((uniquesStoresCount / totalStores) * 100, 100)
              : 0;

          entry[`value_${id}`] = currentValue;
          entry[`storesCount_value_${id}`] = uniquesStoresCount;
          entry[`color_${id}`] = productColorMap[id] ? productColorMap[id] : "";
        });

        return entry;
      }

      // Get store IDs for the current month
      const currentStores = data?.[month]?.["all"] || new Set();

      // Count only new store IDs that were not seen before
      const newStores = [...currentStores].filter(
        (storeId) => !uniqueStores.has(storeId)
      );

      // Add new store IDs to the global set
      newStores.forEach((storeId) => uniqueStores.add(storeId));

      const storeCount = new Set(newStores).size;

      if (!cumulativeValues["all"]) {
        cumulativeValues["all"] = 0;
        cumulativeStores["all"] = 0; // Initialize per product ID
      }

      cumulativeValues["all"] +=
        storeCount > 0 ? (storeCount / totalStores) * 100 : 0;

      cumulativeStores["all"] += storeCount;

      return {
        date: monthLabel,
        storesCount: cumulativeStores["all"],
        value: cumulativeValues["all"]
      };
    });
  }

  // Object to track cumulative values per product ID
  const cumulativeValues: Record<string, number> = {};
  const cumulativeStores: Record<string, number> = {};
  const cumulativeStoreIdsArray: Record<string, number[]> = {};
  const uniqueStores = new Set(); // Track all unique store IDs globally

  // Generate all required dates
  const allDates: string[] = generateDateRange(startDate, endDate);

  const data = salesData.reduce(
    (acc, item) => {
      const dateLabel = formatDate(new Date(item.transaction_date));

      // Initialize if not exists
      if (!acc[dateLabel]) {
        acc[dateLabel] = {};
      }

      if (hasProductIds) {
        if (!acc[dateLabel][item.product_id]) {
          acc[dateLabel][item.product_id] = new Set(); // Unique store IDs per product
        }
        acc[dateLabel][item.product_id].add(item.store_id);
      } else {
        if (!acc[dateLabel]["all"]) {
          acc[dateLabel]["all"] = new Set();
        }
        acc[dateLabel]["all"].add(item.store_id);
      }
      return acc;
    },
    {} as Record<string, Record<number | "all", Set<number>>>
  );

  return allDates.map((date: string) => {
    const dateLabel = formatDate(new Date(date));

    if (hasProductIds) {
      const entry: Record<string, any> = { date: dateLabel };

      productIds.forEach((id) => {
        if (!cumulativeStoreIdsArray[id]) {
          cumulativeStoreIdsArray[id] = []; // Initialize storeIdsArray
        }

        const currentStores = data?.[dateLabel]?.[id] || new Set();

        // Filter only new store IDs
        const newStores = [...currentStores];
        // .filter(
        //   (storeId) => !uniqueStores.has(storeId)
        // );

        // Add new store IDs to the global set
        newStores.forEach((storeId) => uniqueStores.add(storeId));

        // Accumulate the previous value for this specific product ID
        cumulativeStoreIdsArray[id] = [
          ...cumulativeStoreIdsArray[id],
          ...newStores
        ];

        const uniquesStoresCount = new Set(cumulativeStoreIdsArray[id]).size;
        const currentValue =
          uniquesStoresCount > 0 ? (uniquesStoresCount / totalStores) * 100 : 0;

        entry[`value_${id}`] = currentValue;
        entry[`storesCount_value_${id}`] = uniquesStoresCount;
        entry[`color_${id}`] = productColorMap[id] ? productColorMap[id] : "";
      });

      return entry;
    }

    const currentStores = data?.[dateLabel]?.["all"] || new Set();

    // Filter only new store IDs
    const newStores = [...currentStores].filter(
      (storeId) => !uniqueStores.has(storeId)
    );

    const storeCount = new Set(newStores).size;

    // Add new store IDs to the global set
    newStores.forEach((storeId) => uniqueStores.add(storeId));

    if (!cumulativeValues["all"]) {
      cumulativeValues["all"] = 0; // Initialize if not exists
      cumulativeStores["all"] = 0; // Initialize if not exists
    }

    // Accumulate the previous value
    cumulativeValues["all"] +=
      storeCount > 0 ? (storeCount / totalStores) * 100 : 0;
    cumulativeStores["all"] += storeCount; // Initialize if not exists

    return {
      date: dateLabel,
      storesCount: cumulativeStores["all"],
      value: cumulativeValues["all"]
    };
  });
}

export function processGrowthProgramChartData(
  salesData: any[],
  startDate: Date,
  endDate: Date
) {
  const initializeEntry = () => ({ sales: 0 });

  const calculateTotals = (entry: any, item: any) => {
    entry.sales += parseFloat(item.sales);
    return entry;
  };

  const generateFormattedData = (
    data: any,
    labels: string[],
    isMonthView: boolean,
    reduceLableSize: boolean = true
  ) => {
    let cumulativeSales = 0;

    return labels.map((label) => {
      const key = isMonthView ? label : formatDate(new Date(label));
      const dateLabel =
        isMonthView && reduceLableSize ? label.slice(0, 3) : key;

      const monthData = data?.[key] || { sales: 0 };

      // For growth programs, we want cumulative/incremental data
      cumulativeSales += monthData.sales;

      return {
        date: dateLabel,
        sales: monthData.sales, // Individual month sales
        cumulativeSales: parseFloat(cumulativeSales.toFixed(2)) // Cumulative total
      };
    });
  };

  // Helper to generate month labels between two dates
  const getMonthsInRange = (start: Date, end: Date): string[] => {
    const months: string[] = [];
    const date = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (date <= last) {
      months.push(monthNames[date.getMonth()]);
      date.setMonth(date.getMonth() + 1);
    }

    return months;
  };

  // Step 1: Filter sales data within the date range
  const filteredSalesData = salesData.filter((item) => {
    const txDate = new Date(item.transaction_date);
    return txDate >= startDate && txDate <= endDate;
  });

  // Step 2: Get month labels in range
  const monthsInRange = getMonthsInRange(startDate, endDate);

  // Step 3: Aggregate data
  const data = filteredSalesData.reduce(
    (acc, item) => {
      const txDate = new Date(item.transaction_date);
      const month = monthNames[txDate.getMonth()];
      if (!acc[month]) {
        acc[month] = initializeEntry();
      }
      acc[month] = calculateTotals(acc[month], item);
      return acc;
    },
    {} as Record<string, { sales: number }>
  );

  // Step 4: Format for chart
  return generateFormattedData(data, monthsInRange, true);
}

export function processProgramChartData(
  salesData: any[],
  totalSales: number,
  startDate: Date,
  endDate: Date
) {
  const initializeEntry = () => ({ sales: 0 });

  const calculateTotals = (entry: any, item: any) => {
    entry.sales += parseFloat(item.sales);
    return entry;
  };

  const generateFormattedData = (
    data: any,
    labels: string[],
    isMonthView: boolean,
    reduceLableSize: boolean = true
  ) => {
    let cumulativeSales = 0;

    return labels.map((label) => {
      const key = isMonthView ? label : formatDate(new Date(label));
      const dateLabel =
        isMonthView && reduceLableSize ? label.slice(0, 3) : key;

      const monthData = data?.[key] || { sales: 0 };

      cumulativeSales += monthData.sales;

      const growth = totalSales > 0 ? (cumulativeSales / totalSales) * 100 : 0;

      return {
        date: dateLabel,
        sales: monthData.sales,
        growth: parseFloat(growth.toFixed(2)) // Keep growth to 2 decimals
      };
    });
  };

  // Helper to generate month labels between two dates
  const getMonthsInRange = (start: Date, end: Date): string[] => {
    const months: string[] = [];
    const date = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (date <= last) {
      months.push(monthNames[date.getMonth()]);
      date.setMonth(date.getMonth() + 1);
    }

    return months;
  };

  // Step 1: Filter sales data within the date range
  const filteredSalesData = salesData.filter((item) => {
    const txDate = new Date(item.transaction_date);
    return txDate >= startDate && txDate <= endDate;
  });

  // Step 2: Get month labels in range
  const monthsInRange = getMonthsInRange(startDate, endDate);

  // Step 3: Aggregate data
  const data = filteredSalesData.reduce(
    (acc, item) => {
      const txDate = new Date(item.transaction_date);
      const month = monthNames[txDate.getMonth()];
      if (!acc[month]) {
        acc[month] = initializeEntry();
      }
      acc[month] = calculateTotals(acc[month], item);
      return acc;
    },
    {} as Record<string, { sales: number }>
  );

  // Step 4: Format for chart
  return generateFormattedData(data, monthsInRange, true);
}

export function getStartDate(endDate: Date, monthRange: string) {
  return new Date(
    new Date(endDate).setDate(
      new Date(endDate).getDate() - Number(monthRange ?? "1") * 30
    )
  );
}

// Month-based date calculation methods for optimized APIs
export function getMonthBasedStartDate(endDate: Date, monthRange: string) {
  const end = new Date(endDate);
  const months = Number(monthRange ?? "1");

  // Calculate the start month by going back (months - 1) from endDate's month
  // For 1 month: go back 0 months (current month)
  // For 3 months: go back 2 months
  // For 6 months: go back 5 months
  // For 12 months: go back 11 months
  const startYear = end.getFullYear();
  const startMonth = end.getMonth() - months + 1;

  // If the calculated start month goes back to previous year,
  // start from January 1st of the current year instead
  if (startMonth < 0) {
    // Start from January 1st of the current year
    const result = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0));
    return result;
  } else {
    // Use the calculated start month
    const result = new Date(Date.UTC(startYear, startMonth, 1, 0, 0, 0, 0));
    return result;
  }
}

export function getMonthBasedEndDate(startDate: Date, monthRange: string) {
  const start = new Date(startDate);
  const months = Number(monthRange ?? "1");

  // Calculate the end month
  const endYear = start.getFullYear();
  const endMonth = start.getMonth() + months - 1;

  // Handle year rollover
  const actualYear = endMonth > 11 ? endYear + 1 : endYear;
  const actualMonth = endMonth > 11 ? endMonth - 12 : endMonth;

  // Return last day of the end month in UTC to avoid timezone issues
  return new Date(Date.UTC(actualYear, actualMonth + 1, 0, 23, 59, 59, 999));
}

// Helper function to get month-based date range
export function getMonthBasedDateRange(endDate: Date, monthRange: string) {
  const startDate = getMonthBasedStartDate(endDate, monthRange);

  // Always end on the last day of the same month as the latest transaction date
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();
  const finalEndDate = new Date(
    Date.UTC(endYear, endMonth + 1, 0, 23, 59, 59, 999)
  );

  return {
    startDate,
    endDate: finalEndDate
  };
}

// Helper function to find the previous Saturday from a given date
export function getPreviousSaturday(date: Date): Date {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // If it's already Saturday, return the same date
  if (dayOfWeek === 6) {
    return targetDate;
  }

  // Calculate days to subtract to get to previous Saturday
  // If it's Sunday (0), go back 1 day
  // If it's Monday (1), go back 2 days
  // If it's Tuesday (2), go back 3 days
  // If it's Wednesday (3), go back 4 days
  // If it's Thursday (4), go back 5 days
  // If it's Friday (5), go back 6 days
  const daysToSubtract = (dayOfWeek + 1) % 7;

  targetDate.setDate(targetDate.getDate() - daysToSubtract);
  return targetDate;
}

// Helper function to find the nearest Sunday from a given date (rounds forward)
// This ensures endDate aligns with week boundaries for consistency between
// line_items queries and product_insights_aggregated_view queries
export function getNearestSunday(date: Date): Date {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // If it's already Sunday, return the same date
  if (dayOfWeek === 0) {
    return targetDate;
  }

  // Calculate days to add to get to the next Sunday
  // If it's Monday (1), add 6 days
  // If it's Tuesday (2), add 5 days
  // If it's Wednesday (3), add 4 days
  // If it's Thursday (4), add 3 days
  // If it's Friday (5), add 2 days
  // If it's Saturday (6), add 1 day
  const daysToAdd = 7 - dayOfWeek;

  targetDate.setDate(targetDate.getDate() + daysToAdd);
  return targetDate;
}

// Helper function to find the nearest Monday from a given date (rounds forward)
// This ensures startDate aligns with week boundaries (Monday-Sunday) for
// product_insights_aggregated_view queries for month ranges 1, 3, 6
export function getNearestMonday(date: Date): Date {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // If it's already Monday, return the same date
  if (dayOfWeek === 1) {
    return targetDate;
  }

  // Calculate days to add to get to the next Monday
  // If it's Sunday (0), add 1 day -> Monday
  // If it's Tuesday (2), add 6 days -> next Monday
  // If it's Wednesday (3), add 5 days -> next Monday
  // If it's Thursday (4), add 4 days -> next Monday
  // If it's Friday (5), add 3 days -> next Monday
  // If it's Saturday (6), add 2 days -> next Monday
  const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  targetDate.setDate(targetDate.getDate() + daysToAdd);
  return targetDate;
}

// Function to get start date with nearest Monday logic for 1,3,6 month ranges
// For YTD (monthRange = "12"), returns January 1st
// For month ranges 1, 3, 6: calculates date and rounds forward to nearest Monday
// Ensures that if the calculated date goes back to previous year, it adjusts to Jan 1 of the current year
export function getStartDateWithPreviousMonday(
  endDate: Date,
  monthRange: string
): Date {
  const months = Number(monthRange);
  const endYear = endDate.getFullYear();
  const jan1OfEndYear = new Date(Date.UTC(endYear, 0, 1, 0, 0, 0, 0));

  // For 1, 3, 6 month ranges: go back 30, 90, 180 days and round to nearest Monday
  if (months === 1 || months === 3 || months === 6) {
    const daysToSubtract = months * 30; // 30, 90, 180 days
    const calculatedDate = new Date(endDate);
    calculatedDate.setDate(calculatedDate.getDate() - daysToSubtract);

    // Round forward to the nearest Monday to align with week boundaries
    let result = getNearestMonday(calculatedDate);

    // If the result goes back to previous year, adjust to January 1st of the current year
    if (result < jan1OfEndYear) {
      result = jan1OfEndYear;
    }

    return result;
  }

  // For YTD (monthRange = "12") or other month ranges, use the existing month-based logic
  // This returns January 1st for YTD and handles year boundaries
  const result = getMonthBasedStartDate(endDate, monthRange);
  return result;
}
