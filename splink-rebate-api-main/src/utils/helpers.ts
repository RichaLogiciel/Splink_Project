import csv from "csv-parser";
import fs from "fs";
import {
  CHARTCOLORS,
  CHARTDEFAULTCOLOR,
  DATE_STRING_LOCALE,
  DEFAULT_INACTIVE_THRESHOLD_DAYS,
  DISTRIBUTOR_INACTIVE_THRESHOLD_DAYS,
  PAYMENT_TERMS,
  PROGRAM_PAYMENT_TERMS
} from "../config/appConstants";
import LineItem from "../models/LineItem";
import Product from "../models/Product";
import ProductCategoryTag from "../models/ProductCategoryTags";
import ProductCodeMapping from "../models/ProductCodeMapping";
import { ManufacturerTopSellingProduct } from "../types/KeyMetricsTypes";

const bcrypt = require("bcrypt");

// Environment identification based on FRONTEND_URL
export function getEnvironment():
  | "development"
  | "staging"
  | "production"
  | "demo" {
  const frontendUrl = process.env.FRONTEND_URL || "";

  switch (true) {
    case !frontendUrl:
      return "development";
    case frontendUrl.includes("localhost"):
    case frontendUrl.includes("dev.splinktechnologies.com"):
      return "development";
    case frontendUrl.includes("stage.splinktechnologies.com"):
      return "staging";
    case frontendUrl.includes("demo.splinktechnologies.com"):
      return "demo";
    case frontendUrl.includes("app.splinktechnologies.com"):
      return "production";
    default:
      return "development"; // Default fallback
  }
}

export const createRateLimitConfig = (
  windowMinutes: number,
  maxRequests: number
) => {
  return {
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: `Too many requests from this IP, please try again after ${windowMinutes} minutes`
  };
};

// Function to validate email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return emailRegex.test(email);
}

export const getHashedPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  return passwordHash;
};

/**
 * Reads a CSV file and returns an array of objects representing its rows.
 * The function is generic to accommodate any CSV structure.
 *
 * @param filePath - The path to the CSV file.
 * @returns Promise resolving to an array of objects representing the CSV rows.
 */
export const readCsvFile = <T = Record<string, unknown>>(
  filePath: string
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
};

/**
 * Selects a random city and state pair from a predefined list.
 *
 * @returns An object containing a random city and its corresponding state.
 */
export const getRandomCityState = () => {
  const cities = [
    { city: "Caldwell", state: "ID" },
    { city: "Austin", state: "TX" },
    { city: "Orlando", state: "FL" },
    { city: "San Francisco", state: "CA" },
    { city: "Phoenix", state: "AZ" }
  ];
  return cities[Math.floor(Math.random() * cities.length)];
};

/**
 * Returns a Date object representing the expiration time, by default set to 1 day from now.
 * @param {number} [seconds=86400] - The number of seconds until expiration.
 * @returns {Date} - The expiration date.
 */
export const getExpiresAtTime = (seconds: number = 86400): Date => {
  const expiresAt = new Date();
  const expiresInSeconds = seconds;
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);
  return expiresAt;
};

export const sortPrograms = (programs: any, details: boolean = false) => {
  // Sort each program's details by tier
  programs.forEach((program: any) => {
    if (details) {
      program.programDetails.sort((a: any, b: any) => a.tier - b.tier); // Sort ProgramDetails by tier
    } else {
      program.ProgramDetails?.sort((a: any, b: any) => a.tier - b.tier); // Sort ProgramDetails by tier
    }
  });
};

export const sortProgramsByTier = (data: any[]) => {
  return data.sort((a, b) => {
    // Extract base program name without tier suffix
    const getBaseName = (name: string) => name.split(" - Tier")[0];

    // Extract tier number from tier name
    const getTierNumber = (tier: string) =>
      parseInt(tier.replace(/[^0-9]/g, ""), 10);

    const programA = getBaseName(a.programName);
    const programB = getBaseName(b.programName);

    if (programA < programB) return -1;
    if (programA > programB) return 1;

    // If same program, sort by tier number
    return getTierNumber(a.tierName) - getTierNumber(b.tierName);
  });
};

/**
 * Sort manufacturers by their authorization status, with authorized manufacturers first
 * @param items - List of items containing manufacturer information, either directly or nested
 * @returns Sorted list with authorized manufacturers first
 */
export const sortManufacturersByAuthStatus = (items: any[]): any[] => {
  return [...items].sort((a, b) => {
    // Handle both data structures:
    // 1. authManufacturer property directly on the object (for distributor programs)
    // 2. manufacturer.authorized property in a nested object (for store programs)
    const aIsAuthorized =
      a.authManufacturer === true || a.manufacturer?.authorized === true;
    const bIsAuthorized =
      b.authManufacturer === true || b.manufacturer?.authorized === true;

    // If a is authorized and b is not, a comes first
    if (aIsAuthorized && !bIsAuthorized) {
      return -1;
    }
    // If b is authorized and a is not, b comes first
    if (bIsAuthorized && !aIsAuthorized) {
      return 1;
    }
    // If both have same authorization status, maintain original order
    return 0;
  });
};

export const generateRandomString = (length: number = 10): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

export const getDateMinusDays = (daysToMinus: number) => {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - daysToMinus);
  return currentDate.toLocaleDateString(DATE_STRING_LOCALE);
};

export const getStartAndEndDateByTerm = (
  term: string,
  returnString: boolean = true
) => {
  const now = new Date();
  const currentYear = now.getFullYear();

  let startDate: Date | string;
  let endDate: Date | string;
  const quarter = Math.floor(now.getMonth() / 3);

  switch (term) {
    case PAYMENT_TERMS.ANNUAL:
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31);
      break;

    case PAYMENT_TERMS.SEMI_ANNUAL:
      if (now.getMonth() < 6) {
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 5, 30);
      } else {
        startDate = new Date(currentYear, 6, 1);
        endDate = new Date(currentYear, 11, 31);
      }
      break;

    case PAYMENT_TERMS.QUARTERLY:
      startDate = new Date(currentYear, quarter * 3, 1);
      endDate = new Date(currentYear, quarter * 3 + 3, 0);
      break;
    default:
      throw new Error(`Invalid term: ${term}`);
  }
  if (returnString) {
    startDate = startDate.toLocaleDateString(DATE_STRING_LOCALE);
    endDate = endDate.toLocaleDateString(DATE_STRING_LOCALE);
  }
  return { startDate, endDate };
};

export const mapProductColors = (
  selectedProductIds?: number[]
): Record<number, string> => {
  return Object.fromEntries(
    (selectedProductIds ?? []).map((id, index) => [
      id,
      CHARTCOLORS[index % CHARTCOLORS.length]
    ])
  );
};

export const filterResultsByProducts = (
  results: any[],
  selectedProductIds?: number[]
): any[] => {
  return selectedProductIds?.length
    ? results.filter((row: any) => selectedProductIds.includes(row.product_id))
    : results;
};

export const calculateMetrics = (
  results: any[],
  hasSelection: boolean = true
) => {
  return {
    totalSales: hasSelection
      ? results.reduce((sum, item) => sum + parseFloat(item.sales), 0)
      : 0,
    activeStores: hasSelection
      ? new Set(results.map((item) => item.store_id)).size
      : 0,
    units: hasSelection
      ? results.reduce((sum, item) => sum + parseFloat(item.total_units), 0)
      : 0
  };
};

export const calculateRelativeShare = (
  filtered: any,
  overall: any,
  totalStores: number
) => {
  return {
    totalSales: (filtered.totalSales / overall.totalSales) * 100,
    activeStores: (filtered.activeStores / totalStores) * 100,
    units: (filtered.units / overall.units) * 100
  };
};

export const getTopProducts = (
  filteredResults: any[],
  selectedProductIds: number[],
  productColorMap: Record<number, string>,
  useProductsFilter: boolean,
  maxProducts: number,
  totalStoresCount: number = 0,
  prevYearSalesData?: any[]
): ManufacturerTopSellingProduct[] => {
  // Pre-aggregate data for O(1) lookups
  const productAggregation = new Map<
    number,
    {
      totalSales: number;
      totalUnits: number;
      storeIds: Set<number>;
      salesByStore: Map<number, number>;
      unitsByStore: Map<number, number>;
    }
  >();

  // Single pass to aggregate all data
  for (const item of filteredResults) {
    const productId = item.product_id;
    const sales = parseFloat(item.sales) || 0;
    const units = parseFloat(item.total_units) || 0;
    const storeId = item.store_id;

    if (!productAggregation.has(productId)) {
      productAggregation.set(productId, {
        totalSales: 0,
        totalUnits: 0,
        storeIds: new Set(),
        salesByStore: new Map(),
        unitsByStore: new Map()
      });
    }

    const product = productAggregation.get(productId)!;
    product.totalSales += sales;
    product.totalUnits += units;
    product.storeIds.add(storeId);
    product.salesByStore.set(
      storeId,
      (product.salesByStore.get(storeId) || 0) + sales
    );
    product.unitsByStore.set(
      storeId,
      (product.unitsByStore.get(storeId) || 0) + units
    );
  }
  // Pre-aggregate previous year data if available
  const prevYearAggregation = new Map<
    number,
    {
      totalSales: number;
      totalUnits: number;
      storeIds: Set<number>;
    }
  >();

  if (prevYearSalesData) {
    for (const item of prevYearSalesData) {
      const productId = item.product_id;
      const sales = parseFloat(item.sales) || 0;
      const units = parseFloat(item.total_units) || 0;
      const storeId = item.store_id;

      if (!prevYearAggregation.has(productId)) {
        prevYearAggregation.set(productId, {
          totalSales: 0,
          totalUnits: 0,
          storeIds: new Set()
        });
      }

      const product = prevYearAggregation.get(productId)!;
      product.totalSales += sales;
      product.totalUnits += units;
      product.storeIds.add(storeId);
    }
  }

  // Process top products from pre-aggregated data
  const topProducts = Array.from(productAggregation.entries())
    .map(([productId, product]) => {
      let salesYoy = 0;
      let untisYoy = 0;
      let storePenetrationYoy = 0;

      const storePenetration =
        totalStoresCount > 0
          ? (product.storeIds.size / totalStoresCount) * 100
          : 0;

      if (prevYearSalesData) {
        const prevYearProduct = prevYearAggregation.get(productId);
        const prevSales = prevYearProduct?.totalSales || 0;
        const prevUnits = prevYearProduct?.totalUnits || 0;
        const prevStorePenetration =
          totalStoresCount > 0
            ? ((prevYearProduct?.storeIds.size || 0) / totalStoresCount) * 100
            : 0;

        salesYoy = calculateYOYGrowth(product.totalSales, prevSales) ?? 0;
        untisYoy = calculateYOYGrowth(product.totalUnits, prevUnits) ?? 0;
        storePenetrationYoy =
          calculateYOYGrowth(storePenetration, prevStorePenetration) ?? 0;
      }

      return {
        id: productId,
        color: useProductsFilter ? productColorMap[productId] : "",
        units: product.totalUnits,
        unitsYoy: untisYoy,
        storePenetration: storePenetration.toFixed(2),
        storePenetrationYoy: storePenetrationYoy.toFixed(2),
        sales: product.totalSales,
        salesYoy: salesYoy
      } as ManufacturerTopSellingProduct;
    })
    .sort((a: any, b: any) => b.sales - a.sales)
    .slice(0, maxProducts);

  // Add selected products if needed
  if (selectedProductIds.length > topProducts.length) {
    const existingIds = new Set(topProducts.map((pro) => pro.id));
    selectedProductIds
      .filter((id) => !existingIds.has(id))
      .slice(0, maxProducts - topProducts.length)
      .forEach((id) =>
        topProducts.push({
          id,
          color: useProductsFilter ? productColorMap[id] : "",
          units: 0,
          sales: 0
        })
      );
  }

  return topProducts;
};

/**
 * Function to calculate the Year Over Year (YOY) growth percentage.
 * @param {number} currentYearValue - value for the current year (e.g., 2024).
 * @param {number} previousYearValue - value for the previous year (e.g., 2023).
 * @returns {number} - The YOY growth percentage.
 */
export const calculateYOYGrowth = (
  currentYearValue: number,
  previousYearValue: number
): number | undefined => {
  // Check if the previous year's sales is 0 to avoid division by zero
  if (currentYearValue === 0) {
    return undefined; // Return null or handle as needed
  }

  if (previousYearValue === 0) {
    return 100; // Return 100%
  }

  // Calculate the YOY growth percentage
  const growth =
    ((currentYearValue - previousYearValue) / previousYearValue) * 100;
  return growth;
};

// Function to get the same date but for the previous year
export const getPreviousYearDate = (date: Date) => {
  const previousYearDate = new Date(date); // Create a new Date object to avoid mutating the original
  previousYearDate.setFullYear(previousYearDate.getFullYear() - 1); // Subtract one year
  return previousYearDate;
};

/**
 * Calculates date ranges for a given year and its previous year with week-boundary adjustments.
 * Adjusts dates to avoid weeks that span year boundaries, preventing data exclusion issues
 * with materialized views that exclude Dec 30-31 transactions when the week contains Jan 1.
 *
 * Logic:
 * - Start Date (Jan 1): If Jan 1 is Sunday, use Jan 1. If Jan 1 is mid-week (Mon-Fri),
 *   skip that week and use the Monday of the next week (don't go back to December).
 * - End Date (Dec 31): If Dec 31 is mid-week (Mon-Fri), use the previous Sunday
 *   (end of previous complete week). If Dec 31 is Sat/Sun, use Dec 31 as-is.
 * - Previous Year: Apply the same logic to previous year dates for YoY comparison.
 *
 * @param {number} year - The year to calculate dates for (e.g., 2025)
 * @returns {Object} Object containing start and end dates for current and previous years
 */
export const calculateYearBasedDates = (
  year: number
): {
  currentYearStartDate: Date;
  currentYearEndDate: Date;
  previousYearStartDate: Date;
  previousYearEndDate: Date;
} => {
  // Helper function to adjust Jan 1 date based on day of week
  const adjustStartDate = (jan1Date: Date): Date => {
    const dayOfWeek = jan1Date.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // If Jan 1 is Sunday (0) or Saturday (6), use Jan 1 as-is
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return jan1Date;
    }

    // If Jan 1 is mid-week (Mon-Fri, 1-5), skip that week and use Monday of next week
    // Calculate: Jan 1 + (8 - dayOfWeek) days to get to next Monday
    // Examples: Mon (1) → +7 days = Jan 8, Tue (2) → +6 days = Jan 7, Wed (3) → +5 days = Jan 6
    const daysToAdd = 8 - dayOfWeek;
    const adjustedDate = new Date(jan1Date);
    adjustedDate.setUTCDate(adjustedDate.getUTCDate() + daysToAdd);
    adjustedDate.setUTCHours(0, 0, 0, 0);
    return adjustedDate;
  };

  // Helper function to adjust Dec 31 date based on day of week
  const adjustEndDate = (dec31Date: Date): Date => {
    const dayOfWeek = dec31Date.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // If Dec 31 is Saturday (6) or Sunday (0), use Dec 31 as-is
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return dec31Date;
    }

    // If Dec 31 is mid-week (Mon-Fri, 1-5), use the previous Sunday
    // Calculate: Dec 31 - dayOfWeek days to get to Sunday of that week
    const adjustedDate = new Date(dec31Date);
    adjustedDate.setUTCDate(adjustedDate.getUTCDate() - dayOfWeek);
    adjustedDate.setUTCHours(23, 59, 59, 999);
    return adjustedDate;
  };

  // Current year: January 1 to December 31 with week-boundary adjustments
  const jan1Current = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const dec31Current = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  const currentYearStartDate = adjustStartDate(jan1Current);
  const currentYearEndDate = adjustEndDate(dec31Current);

  // Previous year: January 1 to December 31 with week-boundary adjustments
  const previousYear = year - 1;
  const jan1Previous = new Date(Date.UTC(previousYear, 0, 1, 0, 0, 0, 0));
  const dec31Previous = new Date(
    Date.UTC(previousYear, 11, 31, 23, 59, 59, 999)
  );
  const previousYearStartDate = adjustStartDate(jan1Previous);
  const previousYearEndDate = adjustEndDate(dec31Previous);

  return {
    currentYearStartDate,
    currentYearEndDate,
    previousYearStartDate,
    previousYearEndDate
  };
};

export const buildGrowthProgramData = (prevData: any[], currData: any[]) => {
  const result: any[] = [];

  // Create a mapping of all available dates from both datasets
  const allDates = [
    ...new Set([
      ...prevData.map((item) => item.date),
      ...currData.map((item) => item.date)
    ])
  ];

  // Iterate over all dates
  allDates.forEach((date) => {
    // Find the corresponding month data from prevData and currData
    const prevMonth = prevData.find((item) => item.date === date) || null;
    const currMonth = currData.find((item) => item.date === date) || null;
    const currKey = new Date().getFullYear();
    const prevKey = new Date().getFullYear() - 1;

    // Create a new object for the current date
    const mergedData: any = { date };

    if (!prevMonth || !currMonth) return;

    // For growth programs, we want to show:
    // 1. Individual month sales for both years
    // 2. Cumulative sales for both years
    // 3. Growth difference (current cumulative - previous cumulative)

    // Individual month sales
    mergedData[`sales_${currKey}`] = currMonth.sales || 0;
    mergedData[`sales_${prevKey}`] = prevMonth.sales || 0;

    // Cumulative sales
    mergedData[`cumulativeSales_${currKey}`] = currMonth.cumulativeSales || 0;
    mergedData[`cumulativeSales_${prevKey}`] = prevMonth.cumulativeSales || 0;

    // Growth difference (current cumulative - previous cumulative)
    const growthDifference =
      (currMonth.cumulativeSales || 0) - (prevMonth.cumulativeSales || 0);
    mergedData[`growthDifference`] = parseFloat(growthDifference.toFixed(2));

    // Add colors for chart
    mergedData[`color_${currKey}`] = "#3B82F6"; // Blue for current year
    mergedData[`color_${prevKey}`] = "#6B7280"; // Gray for previous year

    // Add the merged data for this date to the result array
    result.push(mergedData);
  });

  return result;
};

export const buildGrowthData = (
  prevData: any[],
  currData: any[],
  includeMonthlyGrowth?: boolean
) => {
  const result: any[] = [];

  // Create a mapping of all available dates from both datasets
  const allDates = [
    ...new Set([
      ...prevData.map((item) => item.date),
      ...currData.map((item) => item.date)
    ])
  ];

  // Iterate over all dates
  allDates.forEach((date) => {
    // Find the corresponding month data from prevData and currData
    let prevMonth = prevData.find((item) => item.date === date) || null;
    let currMonth = currData.find((item) => item.date === date) || null;

    // If no exact match found, try to find the closest week match
    if (!prevMonth || !currMonth) {
      // Extract month and day from the date string
      const dateMatch = date.match(/(\w+)\s+(\d+)-(\d+)/);
      if (dateMatch) {
        const [, month, startDay] = dateMatch;
        const startDayNum = parseInt(startDay);

        // Try to find data with similar week characteristics (within 3 days)
        if (!prevMonth) {
          prevMonth =
            prevData.find((item) => {
              const itemMatch = item.date.match(/(\w+)\s+(\d+)-(\d+)/);
              if (itemMatch) {
                const [, itemMonth, itemStartDay] = itemMatch;
                const itemStartDayNum = parseInt(itemStartDay);
                return (
                  itemMonth === month &&
                  Math.abs(itemStartDayNum - startDayNum) <= 3
                );
              }
              return false;
            }) || null;
        }

        if (!currMonth) {
          currMonth =
            currData.find((item) => {
              const itemMatch = item.date.match(/(\w+)\s+(\d+)-(\d+)/);
              if (itemMatch) {
                const [, itemMonth, itemStartDay] = itemMatch;
                const itemStartDayNum = parseInt(itemStartDay);
                return (
                  itemMonth === month &&
                  Math.abs(itemStartDayNum - startDayNum) <= 3
                );
              }
              return false;
            }) || null;
        }
      }
    }

    const currKey = new Date().getFullYear();
    const prevKey = new Date().getFullYear() - 1;

    // Create a new object for the current date
    const mergedData: any = { date };

    // Handle cases where one dataset might be missing data for a specific date
    if (!prevMonth && !currMonth) return;

    // Iterate over all product IDs from the available data
    const sourceData = currMonth || prevMonth;
    if (!sourceData) return;

    Object.keys(sourceData).forEach((key) => {
      if (key == "date") {
        mergedData[`curr_key`] = currKey;
        mergedData[`Prev_key`] = prevKey;
        return;
      }

      if (key.startsWith("sales_")) {
        const productId = key.split("_")[1]; // Extract product ID (e.g., 1109)

        // Prepare sales, units, and color values, ensuring they exist in both prev and curr
        const salesPrev = prevMonth?.[`sales_${productId}`] || 0;
        const salesCurr = currMonth?.[`sales_${productId}`] || 0;
        const unitsPrev = prevMonth?.[`units_${productId}`] || 0;
        const unitsCurr = currMonth?.[`units_${productId}`] || 0;
        const color =
          currMonth?.[`color_${productId}`] ||
          prevMonth?.[`color_${productId}`] ||
          "#000000"; // Default color if not found

        // Merge the data for each product
        mergedData[`sales_${prevKey}_${productId}`] = salesPrev;
        mergedData[`sales_${currKey}_${productId}`] = salesCurr;
        mergedData[`units_${prevKey}_${productId}`] = unitsPrev;
        mergedData[`units_${currKey}_${productId}`] = unitsCurr;
        mergedData[`color_${prevKey}_${productId}`] = color + "80";
        mergedData[`color_${currKey}_${productId}`] = color;
      } else if (key.startsWith("value_")) {
        const productId = key.split("_")[1]; // Extract product ID (e.g., 1109)

        // Prepare sales, units, and color values, ensuring they exist in both prev and curr
        const salesPrev = prevMonth?.[`storesCount_value_${productId}`] || 0;
        const salesCurr = currMonth?.[`storesCount_value_${productId}`] || 0;
        const unitsPrev = prevMonth?.[`value_${productId}`] || 0;
        const unitsCurr = currMonth?.[`value_${productId}`] || 0;
        const color =
          currMonth?.[`color_${productId}`] ||
          prevMonth?.[`color_${productId}`] ||
          CHARTDEFAULTCOLOR; // Default color if not found

        // Merge the data for each product
        mergedData[`storesCount_value_${prevKey}_${productId}`] = salesPrev;
        mergedData[`storesCount_value_${currKey}_${productId}`] = salesCurr;
        mergedData[`value_${prevKey}_${productId}`] = unitsPrev;
        mergedData[`value_${currKey}_${productId}`] = unitsCurr;
        mergedData[`color_${prevKey}_${productId}`] = color;
        mergedData[`color_${currKey}_${productId}`] = color;
      } else {
        if (key.includes("_")) return;
        // Prepare sales, units, and color values, ensuring they exist in both prev and curr
        const prev = prevMonth?.[key] || 0;
        const curr = currMonth?.[key] || 0;
        const isStoreCountKey = key == "storesCount";

        const keyStr = isStoreCountKey ? key + "_value" : key;

        if (isStoreCountKey || keyStr == "sales" || keyStr == "pod") {
          // add default color
          mergedData[`color_${currKey}`] = CHARTDEFAULTCOLOR;
          mergedData[`color_${prevKey}`] = CHARTDEFAULTCOLOR + "80";
        }

        if (keyStr == "sales" && includeMonthlyGrowth) {
          mergedData[`growth`] = getGrowthPercent(prev, curr);
        }
        // Merge the data for each product
        mergedData[`${keyStr}_${currKey}`] = curr;
        mergedData[`${keyStr}_${prevKey}`] = prev;
      }
    });

    // Add the merged data for this date to the result array
    result.push(mergedData);
  });

  return result;
};

const getGrowthPercent = (prev: number, curr: number) => {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0; // avoid divide by 0
  return ((curr - prev) / prev) * 100;
};

export const isListPriceApplicable = (rebateCalculationType: string) => {
  return rebateCalculationType?.toLowerCase() === "list_value";
};

export const formatPaymentTermLabel = (term: string): string => {
  const normalized = term?.trim();
  return PROGRAM_PAYMENT_TERMS[normalized] || term?.trim()?.toLowerCase();
};

export const getTierToAchieve = (text: string): number | null => {
  const match = text.match(/Tier\s(III|II|I|3|2|1)/);

  if (match) {
    const tier = match[1];

    if (tier === "I" || tier === "1") return 1;
    if (tier === "II" || tier === "2") return 2;
    if (tier === "III" || tier === "3") return 3;
  }

  return null;
};

/**
 *
 * @method parseBooleanFromQuery() : Parse query params to check whether allowed History Programs data, future programs data or no effect (return without any change)
 * @returns boolean | undefined
 *
 **/
export function parseBooleanFromQuery(paramValue: string) {
  return paramValue?.toLowerCase() === "true"
    ? true
    : paramValue?.toLowerCase() === "false"
      ? false
      : undefined;
}
// Helper function to check if string is numeric (equivalent to Python's isdigit())
export const isNumeric = (str: string): boolean => /^\d+$/.test(str.trim());

// Helper function to check if string is float (equivalent to Python's is_float())
export const isFloat = (str: string): boolean =>
  !isNaN(parseFloat(str)) && isFinite(Number(str));

export const parseNumberArray = (str?: string): number[] =>
  str
    ?.split(",")
    .map((s) => parseInt(s.trim()))
    .filter((n) => !isNaN(n)) ?? [];

export function updateProductInternalCodesByPurchasedItems(
  products: Product[],
  transactionLineItems: LineItem[] = []
): Product[] {
  if (!products?.length) return [];

  return products.map((product: any) => {
    const productIds = [
      product.case_skus_id || product.caseSkusId,
      product.unit_skus_id || product.unitSkusId,
      product.box_skus_id || product.boxSkusId
    ];

    const matchedItem: any = transactionLineItems.find((item) =>
      productIds.includes(item.product_id || item.productId)
    );

    return {
      ...product,
      internal_code: matchedItem
        ? matchedItem?.internal_code
        : product.internal_code
    } as Product;
  });
}

export function mapTagsToCategoryObjects(
  tagsString: string | undefined,
  categoryTagList: ProductCategoryTag[]
): ProductCategoryTag[] {
  if (!tagsString || !categoryTagList?.length) return [];

  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .map((tag) => categoryTagList.find((cat) => cat.tagKey === tag))
    .filter((tag): tag is ProductCategoryTag => !!tag); // type-safe filter
}

export function getProductCodeMappingInclude(
  distributorId?: number,
  selectedWarehouseId?: number
) {
  if (!distributorId) return [];
  return [
    {
      model: ProductCodeMapping,
      as: "ProductCodeMapping",
      required: false,
      attributes: [], // Empty attributes - we aggregate columns in the main query
      where: {
        distributor_id: distributorId,
        ...(selectedWarehouseId ? { warehouse_id: selectedWarehouseId } : {})
      }
    }
  ];
}

/**
 * Get the inactive threshold days for a distributor
 * @param distributorId - The distributor ID
 * @returns The number of days threshold (default: 56 days)
 */
export function getDistributorInactiveThresholdDays(
  distributorId?: number
): number {
  if (!distributorId) {
    return DEFAULT_INACTIVE_THRESHOLD_DAYS;
  }
  return (
    DISTRIBUTOR_INACTIVE_THRESHOLD_DAYS[distributorId] ||
    DEFAULT_INACTIVE_THRESHOLD_DAYS
  );
}

/**
 * Get the active internal code for a product based on last transaction date
 * Returns null if the product should be greyed out (inactive), otherwise returns the internalCode
 * @param internalCode - The internal code for the product
 * @param lastTransactionDate - The last transaction date from product_code_mappings
 * @param distributorId - The distributor ID to determine threshold
 * @returns null if should grey out (inactive), otherwise returns the internalCode
 */
export function getActiveInternalCode(
  internalCode: string | null | undefined,
  lastTransactionDate: Date | string | null | undefined,
  distributorId?: number
): string | null {
  // If no internal code, return null
  if (!internalCode) {
    return null;
  }

  // If last_transaction_date is NULL, grey out (no sales ever)
  if (!lastTransactionDate) {
    return null;
  }

  // Get threshold for this distributor
  const thresholdDays = getDistributorInactiveThresholdDays(distributorId);

  // Convert lastTransactionDate to Date if it's a string
  const transactionDate =
    typeof lastTransactionDate === "string"
      ? new Date(lastTransactionDate)
      : lastTransactionDate;

  // Calculate days since last transaction
  const now = new Date();
  const daysSinceTransaction = Math.floor(
    (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // If days since transaction exceeds threshold, grey out
  if (daysSinceTransaction > thresholdDays) {
    return null;
  }

  // Otherwise, return the internal code
  return internalCode;
}

/**
 * Extract last transaction date from a product object, handling both camelCase and snake_case property names
 * This is needed because Sequelize can return data in different formats:
 * - With raw: true -> returns database column names (snake_case): last_transaction_date
 * - Without raw -> returns model property names (camelCase): lastTransactionDate
 * @param product - Product object that may have lastTransactionDate or last_transaction_date
 * @returns The last transaction date or null
 */
export function getLastTransactionDate(product: any): Date | string | null {
  return product?.lastTransactionDate || product?.last_transaction_date || null;
}

/**
 * Extract internal code from a product object, handling both camelCase and snake_case property names
 * @param product - Product object that may have internalCode or internal_code
 * @returns The internal code or null
 */
export function getInternalCode(product: any): string | null {
  return product?.internalCode || product?.internal_code || null;
}

/**
 * Resolves product name based on user role and warehouse-specific data
 * - For Manufacturer Users: Always returns products.name, sets is_warehouse_specific_product to false
 * - For Distributor Roles: Returns warehouse-specific product_name if available, otherwise falls back to products.name
 * @param product - Product object with name and optional product_name (from product_code_mappings)
 * @param isManufacturerUser - Whether the user is a manufacturer (true) or distributor role (false)
 * @returns Object with resolved name and is_warehouse_specific_product flag
 */
export function resolveProductName(
  product: any,
  isManufacturerUser: boolean = false
): { name: string; is_warehouse_specific_product: boolean } {
  // Manufacturer users always see the default product name
  if (isManufacturerUser) {
    return {
      name: product?.name || "",
      is_warehouse_specific_product: false
    };
  }

  // For distributor roles, check if warehouse-specific name exists
  const warehouseSpecificName =
    product?.product_name || product?.productName || null;

  if (warehouseSpecificName && warehouseSpecificName.trim() !== "") {
    return {
      name: warehouseSpecificName,
      is_warehouse_specific_product: true
    };
  }

  // Fallback to default product name
  return {
    name: product?.name || "",
    is_warehouse_specific_product: false
  };
}

export function getMinMaxProgramDates(programs: any[]): {
  startDate: string;
  endDate: string;
} {
  const term = { startDate: "0", endDate: "0" };
  if (!programs.length) return term;

  const startTimes = programs.map((p) =>
    new Date(p.startDate || p.start_date).getTime()
  );
  const endTimes = programs.map((p) =>
    new Date(p.endDate || p.end_date).getTime()
  );

  if (!startTimes.length || !endTimes.length) return term;

  const startDate = new Date(Math.min(...startTimes)).toString();
  const endDate = new Date(Math.max(...endTimes)).toString();

  return { startDate, endDate };
}

export function getMinMaxProgramDatesWithManufacturerId({
  programs,
  useCurrentYear = false
}: {
  programs: any[];
  useCurrentYear?: boolean;
}): Record<number, { startDate: string; endDate: string }> {
  const result: Record<number, { startDate: string; endDate: string }> = {};

  if (!programs.length) return result;

  // Group programs by manufacturer_id
  const grouped: Record<number, any[]> = {};
  programs.forEach((p) => {
    const manufacturerId = p.manufacturer_id;
    if (!grouped[manufacturerId]) grouped[manufacturerId] = [];
    grouped[manufacturerId].push(p);
  });

  Object.entries(grouped).forEach(([manufacturer_id, progs]) => {
    if (useCurrentYear) {
      // Use current year for broader transaction inclusion (for ProgramService)
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1); // January 1st of current year
      const endDate = new Date(currentYear, 11, 31, 23, 59, 59); // December 31st of current year

      result[Number(manufacturer_id)] = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
    } else {
      // Use actual program dates (original logic for other services)
      const startTimes = progs
        .map((p) => new Date(p.startDate || p.start_date).getTime())
        .filter((d) => !isNaN(d));
      const endTimes = progs
        .map((p) => new Date(p.endDate || p.end_date).getTime())
        .filter((d) => !isNaN(d));

      if (startTimes.length && endTimes.length) {
        result[Number(manufacturer_id)] = {
          startDate: new Date(Math.min(...startTimes)).toISOString(),
          endDate: new Date(Math.max(...endTimes)).toISOString()
        };
      }
    }
  });

  return result;
}

/**
 * Extracts year-over-year growth range from a given string.
 *
 * @param {string} text - Text to extract year-over-year growth range from.
 * @returns {{min: number | null, max: number | null}} - Object with min and max
 *    year-over-year growth values. If no range or single value is specified
 *    in the text, returns an object with both min and max as null.
 */
export const extractYOYGrowthRange = (
  text: string
): { min: number | null; max: number | null } => {
  const rangeMatch = text.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)%/);
  const singleMatch = text.match(/(\d+(\.\d+)?)%/);

  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[3])
    };
  } else if (singleMatch) {
    return {
      min: parseFloat(singleMatch[1]),
      max: null
    };
  }

  return {
    min: null,
    max: null
  };
};
// Helper to chunk an array into groups of n
export function chunkArray(arr: any[], size: number) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function sortByMonth(arr: any[]) {
  const monthOrder = [
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
  return arr
    .slice()
    .sort((a, b) => monthOrder.indexOf(a.date) - monthOrder.indexOf(b.date));
}

export const parseDistributorIdCsv = (csv?: string | null): number[] => {
  if (!csv) return [];
  return csv
    .split(",")
    .map((id) => parseInt(id.trim()))
    .filter((n) => !isNaN(n));
};

export const isDistributorFeatureEnabled = (
  distributorId?: number | null,
  enabledIdsCsv?: string | null
): boolean => {
  if (!distributorId) return false;
  const enabledIds = parseDistributorIdCsv(enabledIdsCsv);
  return enabledIds.includes(distributorId);
};

export const processSkuData = (
  data: any[],
  skuCountKey: string,
  storeCountKey: string
) => {
  const skuCounts = data.map((item) => item.sku_count);

  // Use a Map for better performance with numeric keys
  const aggregation = new Map<number, number>();

  for (const count of skuCounts) {
    aggregation.set(count, (aggregation.get(count) || 0) + 1);
  }

  // Convert Map to array format
  const skuCountsArray = Array.from(aggregation, ([skuCount, storeCount]) => ({
    [skuCountKey]: parseInt(skuCount.toString()),
    [storeCountKey]: parseInt(storeCount.toString())
  }));

  return {
    skuCounts: skuCountsArray,
    rawSkuCounts: skuCounts
  };
};

/**
 * Build SQL timeline filter condition for program queries
 * Uses DATE() functions to ensure date-only comparisons (not timestamps)
 *
 * @param programTimeline - Timeline filter: "Historical", "Upcoming", "Current", or undefined
 * @param tableAlias - Optional table alias (default: "p"). Use empty string for subqueries without alias
 * @returns SQL condition string with AND prefix, or empty string if no filter/invalid timeline
 *
 * @example
 * // With table alias
 * buildProgramTimelineSqlCondition("Upcoming", "p")
 * // Returns: "AND DATE(p.start_date) >= DATE(NOW()) AND DATE(p.start_date) <= DATE_ADD(DATE(NOW()), INTERVAL 30 DAY)"
 *
 * @example
 * // Without table alias (for subqueries)
 * buildProgramTimelineSqlCondition("Current", "")
 * // Returns: "AND DATE(end_date) >= DATE(NOW()) AND DATE(start_date) <= DATE(NOW())"
 */
export function buildProgramTimelineSqlCondition(
  programTimeline?: string,
  tableAlias: string = "p"
): string {
  // Return empty string if no timeline provided
  if (!programTimeline) return "";

  const timeline = programTimeline.toLowerCase().trim();
  // Handle empty alias (for subqueries without table alias)
  const prefix = tableAlias ? `${tableAlias}.` : "";

  // Use switch statement for cleaner, more maintainable code
  // Only one case will be active at a time
  switch (timeline) {
    case "historical":
      // Historical: programs that ended before today (date-only comparison)
      return `AND DATE(${prefix}end_date) < DATE(NOW())`;

    case "upcoming":
      // Upcoming: programs that start within 30 days from today (inclusive of today)
      // This matches the requirement: "start_date is within 30 days from today"
      // Using PostgreSQL syntax: DATE(NOW()) + INTERVAL '30 days'
      return `AND DATE(${prefix}start_date) >= DATE(NOW()) AND DATE(${prefix}start_date) <= DATE(NOW()) + INTERVAL '30 days'`;

    case "current":
      // Current: programs that are active today (date-only comparison)
      // start_date <= today AND end_date >= today
      return `AND DATE(${prefix}end_date) >= DATE(NOW()) AND DATE(${prefix}start_date) <= DATE(NOW())`;

    default:
      // Invalid timeline value - return empty string to avoid breaking queries
      // This allows graceful degradation rather than throwing errors
      return "";
  }
}

/**
 * Generate CSV buffer from data rows
 * @param data Array of data objects to convert to CSV
 * @param headers Array of header names (exact column names)
 * @returns Promise resolving to CSV buffer
 */
export async function generateCSV(
  data: Record<string, any>[],
  headers: string[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];

    // Add header row
    rows.push(headers);

    // Add data rows
    data.forEach((row) => {
      const csvRow = headers.map((header) => {
        // Map common header names to property names
        const propertyMap: Record<string, string> = {
          "Internal Store ID": "internalStoreId",
          "Internal Product ID": "internalProductId",
          Quantity: "quantity",
          "Order Date": "orderDate"
        };

        const propertyName = propertyMap[header] || header;
        let value = row[propertyName];

        // Format date as MM/DD/YYYY
        if (header === "Order Date" && value instanceof Date) {
          const month = String(value.getMonth() + 1).padStart(2, "0");
          const day = String(value.getDate()).padStart(2, "0");
          const year = value.getFullYear();
          value = `${month}/${day}/${year}`;
        }

        // Handle null/undefined values
        if (value === null || value === undefined) {
          return "";
        }

        return String(value);
      });
      rows.push(csvRow);
    });

    // Generate CSV string manually (simple implementation)
    const csvString = rows
      .map((row) => {
        return row
          .map((cell: any) => {
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const cellStr = String(cell || "");
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",");
      })
      .join("\n");

    resolve(Buffer.from(csvString, "utf-8"));
  });
}

/**
 * Interface for J-Polep report row data
 */
export interface JPolepReportRow {
  customerId: string | null; // Store ID (6 digits, may include leading zeros)
  itemId: string | null; // Product ID (6 digits)
  quantity: number;
  orderDate: Date;
  productName: string | null; // Product description/name
}

/**
 * Generates a fixed-width text buffer from J-Polep report data.
 * Each line is exactly 85 characters with specific field formatting:
 * - Customer: 10 chars (LEFT justified, 6-char ID with leading zeros, 4 trailing blanks)
 * - Item: 10 chars (LEFT justified, 6-char ID, 4 trailing blanks)
 * - Qty: 3 chars (LEADING zeros)
 * - Usr: 4 chars (BLANKS - "    ")
 * - Date: 8 chars (MMDDYYYY format)
 * - Description: 50 chars (LEFT justified, padded with trailing blanks)
 *
 * @param data Array of JPolepReportRow objects to convert to fixed-width text
 * @returns Promise resolving to a Buffer containing the fixed-width text data
 */
export async function generateFixedWidthText(
  data: JPolepReportRow[]
): Promise<Buffer> {
  const lines: string[] = [];

  data.forEach((row) => {
    // Customer: 10 chars - LEFT justified, 6-char ID with leading zeros, 4 trailing blanks
    // Extract only numeric characters and take first 6 characters
    const customerId = (row.customerId || "")
      .replace(/\D/g, "") // Remove all non-digit characters
      .slice(0, 6); // Take only first 6 characters
    const customerFormatted = customerId
      .padStart(6, "0") // Ensure 6 digits with leading zeros
      .padEnd(10, " "); // Add 4 trailing blanks to make 10 chars

    // Item: 10 chars - LEFT justified, 6-char ID, 4 trailing blanks
    // Extract only numeric characters and take first 6 characters
    const itemId = (row.itemId || "")
      .replace(/\D/g, "") // Remove all non-digit characters
      .slice(0, 6); // Take only first 6 characters
    const itemFormatted = itemId
      .padStart(6, "0") // Ensure 6 digits with leading zeros
      .padEnd(10, " "); // Add 4 trailing blanks to make 10 chars

    // Qty: 3 chars - LEADING zeros
    const qtyFormatted = String(row.quantity || 0)
      .padStart(3, "0")
      .slice(0, 3); // Ensure exactly 3 chars

    // Usr: 4 chars - BLANKS (always "    ")
    const usrFormatted = "    ";

    // Date: 8 chars - MMDDYYYY format
    const orderDate = row.orderDate || new Date();
    const month = String(orderDate.getMonth() + 1).padStart(2, "0");
    const day = String(orderDate.getDate()).padStart(2, "0");
    const year = orderDate.getFullYear();
    const dateFormatted = `${month}${day}${year}`; // MMDDYYYY

    // Description: 50 chars - LEFT justified, padded with trailing blanks
    const productName = row.productName || "";
    const descriptionFormatted = productName
      .slice(0, 50) // Truncate if longer than 50 chars
      .padEnd(50, " "); // Pad with trailing blanks to make 50 chars

    // Combine all fields: 10 + 10 + 3 + 4 + 8 + 50 = 85 characters
    const line = `${customerFormatted}${itemFormatted}${qtyFormatted}${usrFormatted}${dateFormatted}${descriptionFormatted}`;

    // Validate line length (should be exactly 85)
    if (line.length !== 85) {
      throw new Error(
        `Invalid line length: expected 85, got ${line.length}. Line: ${line}`
      );
    }

    lines.push(line);
  });

  // Join lines with UNIX line endings (\n)
  const textContent = lines.join("\n");

  return Buffer.from(textContent, "utf-8");
}
