import newrelic from "newrelic";
import { Op } from "sequelize";
import {
  CACHE_TTL_TIME,
  CHARTCOLORS,
  DATE_STRING_LOCALE,
  DEFAULT_PAGE_SIZE,
  ENTITY_TYPE,
  GROUP_PERIOD,
  MONTH_NAMES,
  ProgramsComplianceStatus,
  SKU_COUNT_KEYS,
  SORT_KEYS,
  STORE_COUNT_KEYS,
  useApiCaching
} from "../config/appConstants";
import DistributorRepository from "../repositories/DistributorRepository";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import ProductsRepository from "../repositories/ProductsRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import StoreRepository from "../repositories/StoreRepository";
import ManufacturerProgramROI from "../models/ManufacturerProgramROI";
import Program from "../models/Program";
import { DistributorDetails } from "../types/DistributorTypes";
import {
  CustomBarChartDataItem,
  ManufacturerDistributorSales,
  ManufacturerKeyMetrics,
  ManufacturerProductInsights,
  ManufacturerProductInsightsKeyMetrics,
  ManufacturerStorePenetration,
  ManufacturerTopProductsOptimized
} from "../types/KeyMetricsTypes";
import { ProgramComplianceDetails } from "../types/ManufacturerTypes";
import { ProgramCompliance } from "../types/ProgramCompliance";
import {
  MySalesResponse,
  SalesResponseWithCategories
} from "../types/SalesTypes";
import { FormattedStoredData, Store } from "../types/StoreTypes";
import {
  buildGrowthData,
  calculateYOYGrowth,
  getDateMinusDays,
  getMinMaxProgramDatesWithManufacturerId,
  getPreviousYearDate,
  getTopProducts,
  isListPriceApplicable,
  processSkuData,
  sortProgramsByTier
} from "../utils/helpers";
import { getCacheKey, redisClient } from "../utils/redis";
import { executeWithIncreasedWorkMem } from "../utils/databaseOptimization";
import {
  fetchSalesData,
  formatDate,
  formatWeekLabel,
  generateDateRange,
  generateWeekRanges,
  getMonthBasedStartDate,
  getNearestSunday,
  getStartDate,
  getStartDateWithPreviousSaturday,
  getStorePenetrationChartData,
  processSalesData
} from "../utils/salesUtils";

interface SkuCountCurrentYear {
  skuCount: number;
  storeCount: number;
}

interface SkuCountLastYear {
  skuCountLastYear: number;
  storeCountLastYear: number;
}

interface MergedSkuCount {
  skuCount: number;
  storeCount?: number;
  storeCountLastYear?: number;
}

interface Category {
  id: number;
  name: string;
}

class ManufacturerDashboardService {
  /**
   * Retrieves the key metrics for a manufacturer.
   * The key metrics include:
   * - totalSales: The total sales (earned rebate) for the manufacturer.
   * - totalDistributors: The total number of distributors associated with the manufacturer.
   * - storesCount: The total number of stores associated with the manufacturer.
   * - activeProgramsCount: The total number of active programs associated with the manufacturer.
   * @param {number} manufacturerId The ID of the manufacturer for whom to retrieve key metrics.
   * @returns {Promise<ManufacturerKeyMetrics>} The key metrics data including total sales, total distributors, stores count, and active programs count.
   */
  public async getKeyMetrics(
    manufacturerId: number,
    distributorId: number
  ): Promise<ManufacturerKeyMetrics> {
    const [totalDistributorsResponse /*,totalSaleResponse*/] =
      await Promise.all([
        distributorId
          ? [{ associatedUserId: distributorId }]
          : ManufacturerRepository.getDistributors(
              manufacturerId,
              distributorId
            )
      ]);

    // set total sales
    // const totalSales = totalSaleResponse;
    const totalSales = {
      result: {
        "1": { totalSale: 0, barChartData: [] },
        "3": { totalSale: 0, barChartData: [] },
        "6": { totalSale: 0, barChartData: [] },
        "12": { totalSale: 0, barChartData: [] }
      },
      categories: []
    };

    // set total distributors
    const distributorIds = totalDistributorsResponse.map(
      (userRole) => userRole.associatedUserId
    );
    const totalDistributors = totalDistributorsResponse.length;

    // set total and active stores count
    const storesResponse =
      await ManufacturerRepository.getTotalStores(distributorIds);
    const stores = storesResponse.map((userRole) => userRole.associatedUserId);
    const storesCount = stores.length;

    const activeStoresResponse = await ManufacturerRepository.getActiveStores(
      stores,
      manufacturerId
    );
    const activeStores = activeStoresResponse.length;

    const totalStores = {
      storesCount: storesCount,
      activeStores: activeStores
    };
    // get stores enrolled in programs
    const storesEnrolledInProgramsResponse =
      await ManufacturerRepository.getStoresEnrolledInPrograms(
        stores,
        manufacturerId
      );

    const storesEnrolledInProgramsCount =
      storesEnrolledInProgramsResponse.length;

    const response = {
      totalSales,
      totalDistributors,
      totalStores,
      storesEnrolledInProgramsCount
    };

    return response;
  }

  public async getProductInsights(
    manufacturerId: number,
    distributorId: number,
    monthRange?: string,
    selectedProductIds?: number[],
    accountManagerId?: number
  ): Promise<ManufacturerProductInsights> {
    const MAX_PRODUCTS = 1000;
    const yearStartDate = new Date(new Date().getFullYear(), 0, 1);
    const useProductsFilter =
      selectedProductIds?.length && selectedProductIds?.length <= MAX_PRODUCTS;

    // Add Redis caching
    const cacheStartTime = Date.now();
    const cacheKey: string = getCacheKey(
      "manufacturer",
      "product-insights",
      manufacturerId.toString(),
      distributorId.toString(),
      monthRange || "all",
      selectedProductIds?.sort().join(",") || "all",
      accountManagerId?.toString() || "all"
    );
    if (useApiCaching) {
      try {
        const cached: string | null = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as ManufacturerProductInsights;
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    }
    const distributors = distributorId
      ? []
      : await this.getDistributors(manufacturerId, accountManagerId);

    const distributorIds = distributorId
      ? []
      : distributors.map((dt: any) => dt.associatedUserId);

    const latestTransactionDate =
      await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
        distributorId ? [distributorId] : distributorIds,
        [manufacturerId]
      );

    const endDate = latestTransactionDate
      ? new Date(latestTransactionDate)
      : new Date();
    const startDate =
      monthRange == "12" ||
      (monthRange != "12" &&
        getStartDate(endDate, monthRange ?? "") < yearStartDate)
        ? yearStartDate
        : getStartDate(endDate, monthRange ?? "");

    const prevYearStartDate = getPreviousYearDate(startDate);
    const prevYearEndDate = getPreviousYearDate(endDate);

    const results = await ManufacturerRepository.getProductInsights(
      manufacturerId,
      startDate,
      endDate,
      distributorIds,
      distributorId
    );

    // fetch previous year result from view

    const prevYearResults = await ManufacturerRepository.getProductInsights(
      manufacturerId,
      prevYearStartDate,
      prevYearEndDate,
      distributorIds,
      distributorId
    );

    const distributorWithStoreIds: any =
      await ManufacturerRepository.getDistributorWithStoreIds(
        manufacturerId,
        distributorId ? Number(distributorId) : 0,
        distributorIds
      );

    const totalStoresCount = new Set(
      distributorWithStoreIds.flatMap(
        (distributor: any) => distributor.storeIds
      )
    ).size;

    // map the 10 color to seect products
    const productColorMap = this.mapProductColors(selectedProductIds);

    const filteredResults = this.filterResultsByProducts(
      results,
      selectedProductIds
    );

    // filter previous year results based on selected products
    const filteredPrevYearResults = this.filterResultsByProducts(
      prevYearResults,
      selectedProductIds
    );

    const overallMetrics = this.calculateMetrics(
      results,
      !!selectedProductIds?.length
    );
    const filteredMetrics = this.calculateMetrics(filteredResults);

    // calculate Metrics for filtered previous year results
    const filteredPrevYearMetrics = this.calculateMetrics(
      filteredPrevYearResults
    );

    const topProducts = getTopProducts(
      filteredResults,
      selectedProductIds ?? [],
      productColorMap,
      !!useProductsFilter,
      MAX_PRODUCTS,
      totalStoresCount,
      filteredPrevYearResults
    );

    const filteredProductIds = useProductsFilter
      ? topProducts.map((pro) => pro.id)
      : [];

    const weekRanges = generateWeekRanges(startDate, endDate);
    const weekLabels: string[] = [];
    for (const weekRange of weekRanges) {
      const weekLabel = formatWeekLabel(
        weekRange.startWeekDate,
        weekRange.endWeekDate
      );
      weekLabels.push(weekLabel);
    }

    // Grouping data by transaction_date and filtering product IDs
    const groupedData = processSalesData(
      filteredResults,
      monthRange ?? "1",
      startDate,
      endDate,
      filteredProductIds,
      productColorMap,
      weekRanges,
      weekLabels
    );

    const fetchPrevYearData = true;
    const prevYearGroupedData = processSalesData(
      filteredPrevYearResults,
      monthRange ?? "1",
      prevYearStartDate,
      prevYearEndDate,
      filteredProductIds,
      productColorMap,
      weekRanges,
      weekLabels,
      fetchPrevYearData
    );

    const growthChartData = buildGrowthData(prevYearGroupedData, groupedData);
    // Convert grouped data into an array
    const groupedArray = Object.values(groupedData);

    const storePenetration = getStorePenetrationChartData(
      filteredResults,
      monthRange ?? "1",
      startDate,
      endDate,
      totalStoresCount,
      filteredProductIds,
      productColorMap
    );

    const prevYearStorePenetration = getStorePenetrationChartData(
      filteredPrevYearResults,
      monthRange ?? "1",
      prevYearStartDate,
      prevYearEndDate,
      totalStoresCount,
      filteredProductIds,
      productColorMap
    );

    const response: ManufacturerProductInsights = {
      totalSales: {
        value: filteredMetrics.totalSales,
        yoy: calculateYOYGrowth(
          filteredMetrics.totalSales,
          filteredPrevYearMetrics.totalSales
        )
      },
      activeStores: {
        value: filteredMetrics.activeStores,
        yoy: calculateYOYGrowth(
          filteredMetrics.activeStores,
          filteredPrevYearMetrics.activeStores
        )
      },
      units: {
        value: filteredMetrics.units,
        yoy: calculateYOYGrowth(
          filteredMetrics.units,
          filteredPrevYearMetrics.units
        )
      },
      topProducts: topProducts,
      chartData: groupedArray,
      storePenetrationChartData: storePenetration,
      relativeShare: this.calculateRelativeShare(
        filteredMetrics,
        overallMetrics,
        totalStoresCount,
        selectedProductIds?.length ? false : true
      ),
      growth: {
        chartData: growthChartData,
        storePenetrationChartData: this.buildStorePenetrationGrowthData(
          prevYearStorePenetration,
          storePenetration
        )
      },
      latestTransactionDate: latestTransactionDate
    };

    // Cache the response
    const cacheSetStartTime = Date.now();
    if (useApiCaching) {
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL_TIME,
        JSON.stringify(response)
      );
    }

    return response;
  }

  public async getKeyMetricsOptimized({
    manufacturerId,
    distributorIds,
    monthRange,
    selectedProductIds
  }: {
    manufacturerId: number;
    distributorIds: number[];
    monthRange?: string;
    selectedProductIds?: number[];
  }): Promise<ManufacturerProductInsightsKeyMetrics> {
    const allowedDistributorIds =
      await ManufacturerRepository.filterAllowedDistributorIds(
        manufacturerId,
        distributorIds
      );

    const cacheKey: string = getCacheKey(
      "manufacturer",
      "key-metrics-optimized",
      manufacturerId.toString(),
      allowedDistributorIds.length ? allowedDistributorIds.join(",") : "none",
      monthRange || "all",
      selectedProductIds?.sort().join(",") || "all"
    );

    if (allowedDistributorIds.length === 0) {
      const emptyResponse: ManufacturerProductInsightsKeyMetrics = {
        totalSales: { value: 0, yoy: 0 },
        activeStores: { value: 0, yoy: 0 },
        units: { value: 0, yoy: 0 },
        relativeShare: {
          totalSales: 0,
          activeStores: 0,
          units: 0
        },
        latestTransactionDate: null
      };

      if (useApiCaching) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(emptyResponse)
        );
      }

      return emptyResponse;
    }

    const totalStoresCountResult: any =
      await ManufacturerRepository.getDistributorStoresCount({
        managerDistributors: allowedDistributorIds
      });
    const totalStoresCount = totalStoresCountResult?.storeCount || 0;

    const latestTransactionDate =
      await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
        allowedDistributorIds,
        [manufacturerId]
      );

    // Round endDate to nearest Saturday to ensure consistency between line_items and product_insights queries
    // This ensures both queries use the same week boundary
    const rawEndDate = latestTransactionDate
      ? new Date(latestTransactionDate)
      : new Date();
    const endDate = getNearestSunday(rawEndDate);

    // Use proper date calculation with previous Saturday logic for 1,3,6 month ranges
    const startDate = getStartDateWithPreviousSaturday(
      endDate,
      monthRange ?? "1"
    );

    // The getStartDateWithPreviousSaturday handles year boundaries and previous Saturday logic
    const actualStartDate = startDate;
    const actualEndDate = endDate;

    const prevYearStartDate = getPreviousYearDate(actualStartDate);
    const prevYearEndDate = getPreviousYearDate(actualEndDate);

    // Fetch grouped data based on month range
    // Execute with increased work_mem for better performance on large aggregations
    // Fetch ALL products data for overallMetrics calculation
    const allProductsDataResult = await executeWithIncreasedWorkMem(
      () =>
        newrelic.startSegment(
          "ManufacturerService.getProductInsightsOptimized.getGroupedSalesData.allProducts",
          true,
          async () => {
            let groupedData: any[] = [];
            let prevYearGroupedData: any[] = [];

            if (String(monthRange) === "1") {
              // Use weekly grouping for 1 month filter
              const { current, previous } =
                await ManufacturerRepository.getGroupedSalesDataByWeekOptimized(
                  manufacturerId,
                  allowedDistributorIds,
                  actualStartDate,
                  actualEndDate,
                  prevYearStartDate,
                  prevYearEndDate,
                  undefined // No product filter for overall metrics
                );

              groupedData = current;
              prevYearGroupedData = previous;
            } else {
              // Use weekly grouping for other month ranges (since materialized view is now weekly)
              const { current, previous } =
                await ManufacturerRepository.getGroupedSalesDataByMonthOptimized(
                  manufacturerId,
                  allowedDistributorIds,
                  actualStartDate,
                  actualEndDate,
                  prevYearStartDate,
                  prevYearEndDate,
                  undefined // No product filter for overall metrics
                );

              groupedData = current;
              prevYearGroupedData = previous;
            }

            return { groupedData, prevYearGroupedData };
          }
        ),
      "64MB" // Increase work_mem for complex manufacturer key metrics queries
    );

    // Fetch SELECTED products data for filteredMetrics calculation (if products are selected)
    let selectedProductsDataResult = allProductsDataResult; // Default to all products

    if (selectedProductIds && selectedProductIds.length > 0) {
      selectedProductsDataResult = await executeWithIncreasedWorkMem(
        () =>
          newrelic.startSegment(
            "ManufacturerService.getProductInsightsOptimized.getGroupedSalesData.selectedProducts",
            true,
            async () => {
              let groupedData: any[] = [];
              let prevYearGroupedData: any[] = [];

              if (String(monthRange) === "1") {
                // Use weekly grouping for 1 month filter
                const { current, previous } =
                  await ManufacturerRepository.getGroupedSalesDataByWeekOptimized(
                    manufacturerId,
                    allowedDistributorIds,
                    actualStartDate,
                    actualEndDate,
                    prevYearStartDate,
                    prevYearEndDate,
                    selectedProductIds
                  );

                groupedData = current;
                prevYearGroupedData = previous;
              } else {
                // Use weekly grouping for other month ranges (since materialized view is now weekly)
                const { current, previous } =
                  await ManufacturerRepository.getGroupedSalesDataByMonthOptimized(
                    manufacturerId,
                    allowedDistributorIds,
                    actualStartDate,
                    actualEndDate,
                    prevYearStartDate,
                    prevYearEndDate,
                    selectedProductIds
                  );

                groupedData = current;
                prevYearGroupedData = previous;
              }

              return { groupedData, prevYearGroupedData };
            }
          ),
        "64MB" // Increase work_mem for complex manufacturer key metrics queries
      );
    }

    const filteredProductIds =
      selectedProductIds && selectedProductIds.length > 0
        ? selectedProductIds
        : [];

    const activeStoresData = await newrelic.startSegment(
      "ManufacturerService.getProductInsightsOptimized.getUniqueActiveStoresData.combined",
      true,
      async () => {
        return await ManufacturerRepository.getUniqueActiveStoresDataCombined(
          manufacturerId,
          actualStartDate,
          actualEndDate,
          allowedDistributorIds,
          undefined,
          filteredProductIds,
          prevYearStartDate,
          prevYearEndDate
        );
      }
    );

    // Access the data
    const overallActiveStoresData = activeStoresData.overall;
    const filteredActiveStoresData = activeStoresData.filtered;

    // Overall metrics should always be calculated from all products data
    const overallMetrics = this.calculateMetricsFromTopProductsUpdated(
      allProductsDataResult.groupedData,
      true,
      overallActiveStoresData
    );

    // For filtered metrics, use the filtered products data if selectedProductIds are provided
    let filteredMetrics = overallMetrics; // Default to overall metrics

    if (selectedProductIds && selectedProductIds.length > 0) {
      filteredMetrics = this.calculateMetricsFromTopProductsUpdated(
        selectedProductsDataResult.groupedData,
        true,
        filteredActiveStoresData
      );
    }

    // Calculate metrics for filtered previous year results
    const filteredPrevYearMetrics = this.calculateMetricsFromTopProductsUpdated(
      selectedProductsDataResult.prevYearGroupedData,
      true,
      filteredActiveStoresData
    );

    const response: ManufacturerProductInsightsKeyMetrics = {
      totalSales: {
        value: filteredMetrics.totalSales,
        yoy: calculateYOYGrowth(
          filteredMetrics.totalSales,
          filteredPrevYearMetrics.totalSales
        )
      },
      activeStores: {
        value: parseInt(filteredMetrics.activeStores.toString()),
        yoy: calculateYOYGrowth(
          filteredActiveStoresData.current,
          filteredActiveStoresData.previous
        )
      },
      units: {
        value: filteredMetrics.units,
        yoy: calculateYOYGrowth(
          filteredMetrics.units,
          filteredPrevYearMetrics.units
        )
      },
      relativeShare: this.calculateRelativeShare(
        filteredMetrics,
        overallMetrics,
        totalStoresCount,
        selectedProductIds?.length ? false : true
      ),
      latestTransactionDate: latestTransactionDate
    };

    // Cache the response
    if (useApiCaching) {
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL_TIME,
        JSON.stringify(response)
      );
    }

    return response;
  }

  public async getTopProductsOptimized({
    manufacturerId,
    distributorIds,
    monthRange,
    selectedProductIds
  }: {
    manufacturerId: number;
    distributorIds: number[];
    monthRange?: string;
    selectedProductIds?: number[];
  }): Promise<ManufacturerTopProductsOptimized> {
    const MAX_PRODUCTS = 1000;
    const useProductsFilter =
      selectedProductIds?.length && selectedProductIds?.length <= MAX_PRODUCTS;

    const cacheKey: string = getCacheKey(
      "manufacturer",
      "top-products-optimized",
      manufacturerId.toString(),
      distributorIds.join(","),
      monthRange || "all",
      selectedProductIds?.sort().join(",") || "all"
    );

    const latestTransactionDate =
      await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
        distributorIds,
        [manufacturerId]
      );

    // Round endDate to nearest Saturday to ensure consistency between line_items and product_insights queries
    // This ensures both queries use the same week boundary
    const rawEndDate = latestTransactionDate
      ? new Date(latestTransactionDate)
      : new Date();
    const endDate = getNearestSunday(rawEndDate);

    // Use proper date calculation with previous Saturday logic for 1,3,6 month ranges
    const startDate = getStartDateWithPreviousSaturday(
      endDate,
      monthRange ?? "1"
    );

    // The getStartDateWithPreviousSaturday handles year boundaries and previous Saturday logic
    const actualStartDate = startDate;
    const actualEndDate = endDate;

    const prevYearStartDate = getPreviousYearDate(actualStartDate);
    const prevYearEndDate = getPreviousYearDate(actualEndDate);

    // map the 10 color to seect products
    const productColorMap = this.mapProductColors(selectedProductIds);

    // Fetch top products from the aggregated view with both current and previous year data
    // Execute with increased work_mem for better performance on large aggregations
    const topProductsData =
      await ManufacturerRepository.getTopProductsFromAggregatedViewOptimized(
        manufacturerId,
        actualStartDate,
        actualEndDate,
        distributorIds,
        undefined,
        MAX_PRODUCTS,
        prevYearStartDate,
        prevYearEndDate,
        undefined // Get all products for overall metrics
      );

    // Create a map of previous year data for quick lookup
    const prevYearDataMap = new Map();
    topProductsData.previous.forEach((product: any) => {
      prevYearDataMap.set(product.id, product);
    });

    // Filter products at service level based on selectedProductIds
    let filteredCurrentProducts = topProductsData.current;
    let filteredPreviousProducts = topProductsData.previous;

    if (selectedProductIds && selectedProductIds.length > 0) {
      // Filter current year products
      filteredCurrentProducts = topProductsData.current.filter((product: any) =>
        selectedProductIds.includes(product.id)
      );

      // Filter previous year products
      filteredPreviousProducts = topProductsData.previous.filter(
        (product: any) => selectedProductIds.includes(product.id)
      );
    }

    // Create filtered products data structure
    const filteredProductsData = {
      current: filteredCurrentProducts,
      previous: filteredPreviousProducts
    };

    // Transform the results to match the expected format with YoY calculations
    // Use filtered products data when selectedProductIds are provided
    const productsDataToUse =
      selectedProductIds && selectedProductIds.length > 0
        ? filteredProductsData
        : topProductsData;

    const topProducts = productsDataToUse.current.map(
      (product: any, index: number) => {
        const prevYearProduct = prevYearDataMap.get(product.id);

        // Calculate YoY values using the same logic as getTopProducts utility
        let salesYoy = 0;
        let unitsYoy = 0;
        let storePenetrationYoy = 0;

        if (prevYearProduct) {
          const currentSales = parseFloat(product.sales) || 0;
          const prevSales = parseFloat(prevYearProduct.sales) || 0;
          const currentUnits = parseFloat(product.units) || 0;
          const prevUnits = parseFloat(prevYearProduct.units) || 0;
          const currentStorePenetration =
            parseFloat(product.store_penetration) || 0;
          const prevStorePenetration =
            parseFloat(prevYearProduct.store_penetration) || 0;

          salesYoy = calculateYOYGrowth(currentSales, prevSales) ?? 0;
          unitsYoy = calculateYOYGrowth(currentUnits, prevUnits) ?? 0;
          storePenetrationYoy =
            calculateYOYGrowth(currentStorePenetration, prevStorePenetration) ??
            0;
        }

        return {
          id: product.id,
          color: useProductsFilter
            ? productColorMap[product.id]
            : CHARTCOLORS[index % CHARTCOLORS.length],
          units: parseFloat(product.units) || 0,
          unitsYoy: unitsYoy,
          storePenetration: (
            parseFloat(product.store_penetration) || 0
          ).toFixed(2),
          storePenetrationYoy: storePenetrationYoy.toFixed(2),
          sales: parseFloat(product.sales) || 0,
          salesYoy: salesYoy
        };
      }
    );

    const response: ManufacturerTopProductsOptimized = {
      topProducts: topProducts
    };

    // Cache the response
    if (useApiCaching) {
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL_TIME,
        JSON.stringify(response)
      );
    }

    return response;
  }

  public async getDistributorSales({
    manufacturerId,
    distributorIds,
    monthRange,
    selectedProductIds
  }: {
    manufacturerId: number;
    distributorIds: number[];
    monthRange?: string;
    selectedProductIds?: number[];
  }): Promise<ManufacturerDistributorSales> {
    const allowedDistributorIds =
      await ManufacturerRepository.filterAllowedDistributorIds(
        manufacturerId,
        distributorIds
      );

    const cacheKey: string = getCacheKey(
      "manufacturer",
      "distributor-sales",
      manufacturerId.toString(),
      allowedDistributorIds.length ? allowedDistributorIds.join(",") : "none",
      monthRange || "all",
      selectedProductIds?.sort().join(",") || "all"
    );

    if (allowedDistributorIds.length === 0) {
      const emptyResponse: ManufacturerDistributorSales = {
        chartData: [],
        growth: {
          chartData: []
        }
      };

      if (useApiCaching) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(emptyResponse)
        );
      }

      return emptyResponse;
    }

    const latestTransactionDate =
      await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
        allowedDistributorIds,
        [manufacturerId]
      );

    const rawEndDate = latestTransactionDate
      ? new Date(latestTransactionDate)
      : new Date();
    const endDate = getNearestSunday(rawEndDate);

    // Use proper date calculation with previous Saturday logic for 1,3,6 month ranges
    const startDate = getStartDateWithPreviousSaturday(
      endDate,
      monthRange ?? "1"
    );

    // The getStartDateWithPreviousSaturday handles year boundaries and previous Saturday logic
    const actualStartDate = startDate;
    const actualEndDate = endDate;

    const prevYearStartDate = getPreviousYearDate(actualStartDate);
    const prevYearEndDate = getPreviousYearDate(actualEndDate);

    // map the 10 color to seect products
    const productColorMap = this.mapProductColors(selectedProductIds);
    // Fetch grouped data based on month range
    // Execute with increased work_mem for better performance on large aggregations
    const groupedDataResult = await executeWithIncreasedWorkMem(
      () =>
        newrelic.startSegment(
          "ManufacturerService.getProductInsightsOptimized.getGroupedSalesData",
          true,
          async () => {
            let groupedData: any[] = [];
            let prevYearGroupedData: any[] = [];

            if (String(monthRange) === "1") {
              // Use weekly grouping for 1 month filter
              const { current, previous } =
                await ManufacturerRepository.getGroupedSalesDataByWeekOptimized(
                  manufacturerId,
                  allowedDistributorIds,
                  actualStartDate,
                  actualEndDate,
                  prevYearStartDate,
                  prevYearEndDate,
                  selectedProductIds
                );

              groupedData = current;
              prevYearGroupedData = previous;
            } else {
              // Use weekly grouping for other month ranges (since materialized view is now weekly)
              const { current, previous } =
                await ManufacturerRepository.getGroupedSalesDataByMonthOptimized(
                  manufacturerId,
                  allowedDistributorIds,
                  actualStartDate,
                  actualEndDate,
                  prevYearStartDate,
                  prevYearEndDate,
                  selectedProductIds
                );

              groupedData = current;
              prevYearGroupedData = previous;
            }

            return { groupedData, prevYearGroupedData };
          }
        ),
      "64MB" // Increase work_mem for complex distributor sales queries
    );

    const groupedData = groupedDataResult.groupedData;
    const prevYearGroupedData = groupedDataResult.prevYearGroupedData;

    // Transform the data to match expected format with product-specific keys when selectedProductIds are provided
    const transformedGroupedData = this.transformGroupedDataForChart(
      groupedData,
      monthRange ?? "1",
      selectedProductIds,
      productColorMap
    );

    const transformedPrevYearGroupedData = this.transformGroupedDataForChart(
      prevYearGroupedData,
      monthRange ?? "1",
      selectedProductIds,
      productColorMap
    );

    const growthChartData = buildGrowthData(
      transformedPrevYearGroupedData,
      transformedGroupedData
    );

    // Convert grouped data into an array
    const groupedArray = transformedGroupedData;

    const response: ManufacturerDistributorSales = {
      chartData: groupedArray,
      growth: {
        chartData: growthChartData
      }
    };

    if (useApiCaching) {
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL_TIME,
        JSON.stringify(response)
      );
    }

    return response;
  }

  public async getStorePenetration({
    manufacturerId,
    distributorIds,
    monthRange,
    selectedProductIds
  }: {
    manufacturerId: number;
    distributorIds: number[];
    monthRange?: string;
    selectedProductIds?: number[];
  }): Promise<ManufacturerStorePenetration> {
    const allowedDistributorIds =
      await ManufacturerRepository.filterAllowedDistributorIds(
        manufacturerId,
        distributorIds
      );

    const cacheKey: string = getCacheKey(
      "manufacturer",
      "store-penetration",
      manufacturerId.toString(),
      allowedDistributorIds.length ? allowedDistributorIds.join(",") : "none",
      monthRange || "all",
      selectedProductIds?.sort().join(",") || "all"
    );

    if (allowedDistributorIds.length === 0) {
      const emptyResponse: ManufacturerStorePenetration = {
        storePenetrationChartData: [],
        growth: {
          storePenetrationChartData: []
        }
      };

      if (useApiCaching) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(emptyResponse)
        );
      }

      return emptyResponse;
    }

    const latestTransactionDate =
      await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
        allowedDistributorIds,
        [manufacturerId]
      );

    const rawEndDate = latestTransactionDate
      ? new Date(latestTransactionDate)
      : new Date();
    const endDate = getNearestSunday(rawEndDate);

    // Use proper date calculation with previous Saturday logic for 1,3,6 month ranges
    const startDate = getStartDateWithPreviousSaturday(
      endDate,
      monthRange ?? "1"
    );

    // The getStartDateWithPreviousSaturday handles year boundaries and previous Saturday logic
    const actualStartDate = startDate;
    const actualEndDate = endDate;

    const prevYearStartDate = getPreviousYearDate(actualStartDate);
    const prevYearEndDate = getPreviousYearDate(actualEndDate);

    // Fetch store penetration data using new repository methods
    // Execute with increased work_mem for better performance on large aggregations
    const storePenetrationResult = await executeWithIncreasedWorkMem(
      () =>
        newrelic.startSegment(
          "ManufacturerService.getProductInsightsOptimized.getStorePenetrationData",
          true,
          async () => {
            let storePenetrationData: any[] = [];
            let prevYearStorePenetrationData: any[] = [];

            const isDaily = String(monthRange) === "1"; // Use daily data for 1 month range

            const { current, previous } =
              await ManufacturerRepository.getStorePenetrationDataOptimized(
                manufacturerId,
                allowedDistributorIds,
                startDate,
                endDate,
                prevYearStartDate,
                prevYearEndDate,
                isDaily,
                selectedProductIds
              );

            storePenetrationData = current;
            prevYearStorePenetrationData = previous;

            return { storePenetrationData, prevYearStorePenetrationData };
          }
        ),
      "64MB" // Increase work_mem for complex store penetration queries
    );

    const storePenetrationData = storePenetrationResult.storePenetrationData;
    const prevYearStorePenetrationData =
      storePenetrationResult.prevYearStorePenetrationData;

    const totalStoresCountResult: any =
      await ManufacturerRepository.getDistributorStoresCount({
        managerDistributors: allowedDistributorIds
      });
    const totalStoresCount = totalStoresCountResult?.storeCount || 0;

    // map the 10 color to seect products
    const productColorMap = this.mapProductColors(selectedProductIds);

    // Transform store penetration data to handle product-specific keys when selectedProductIds are provided
    const storePenetration = this.transformStorePenetrationDataForChart(
      storePenetrationData,
      monthRange ?? "1",
      totalStoresCount,
      selectedProductIds,
      productColorMap
    );

    const prevYearStorePenetration = this.transformStorePenetrationDataForChart(
      prevYearStorePenetrationData,
      monthRange ?? "1",
      totalStoresCount,
      selectedProductIds,
      productColorMap
    );

    const response: ManufacturerStorePenetration = {
      storePenetrationChartData: storePenetration,
      growth: {
        storePenetrationChartData: this.buildStorePenetrationGrowthData(
          prevYearStorePenetration,
          storePenetration
        )
      }
    };

    if (useApiCaching) {
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL_TIME,
        JSON.stringify(response)
      );
    }

    return response;
  }

  public async getProductInsightsOptimized(
    manufacturerId: number,
    distributorId: number,
    monthRange?: string,
    selectedProductIds?: number[],
    accountManagerId?: number
  ): Promise<ManufacturerProductInsights> {
    return newrelic.startSegment(
      "ManufacturerService.getProductInsightsOptimized",
      true,
      async () => {
        const MAX_PRODUCTS = 1000;
        const useProductsFilter =
          selectedProductIds?.length &&
          selectedProductIds?.length <= MAX_PRODUCTS;

        // Add Redis caching
        const cacheKey: string = getCacheKey(
          "manufacturer",
          "product-insights",
          manufacturerId.toString(),
          distributorId.toString(),
          monthRange || "all",
          selectedProductIds?.sort().join(",") || "all",
          accountManagerId?.toString() || "all"
        );
        if (useApiCaching) {
          try {
            const cached: string | null = await redisClient.get(cacheKey);
            if (cached) {
              return JSON.parse(cached) as ManufacturerProductInsights;
            }
          } catch (error) {
            console.error("Cache error:", error);
          }
        }

        const distributors =
          distributorId && distributorId > 0
            ? []
            : await this.getDistributorsOptimized(
                manufacturerId,
                accountManagerId
              );
        const distributorIds =
          distributorId && distributorId > 0
            ? []
            : distributors.map((dt: any) => dt.associatedUserId);

        const latestTransactionDate =
          await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
            distributorId ? [distributorId] : distributorIds,
            [manufacturerId]
          );

        const rawEndDate = latestTransactionDate
          ? new Date(latestTransactionDate)
          : new Date();
        const endDate = getNearestSunday(rawEndDate);

        // Use proper date calculation with previous Saturday logic for 1,3,6 month ranges
        const startDate = getStartDateWithPreviousSaturday(
          endDate,
          monthRange ?? "1"
        );

        // The getStartDateWithPreviousSaturday handles year boundaries and previous Saturday logic
        const actualStartDate = startDate;
        const actualEndDate = endDate;

        const prevYearStartDate = getPreviousYearDate(actualStartDate);
        const prevYearEndDate = getPreviousYearDate(actualEndDate);

        const totalStoresCountResult: any =
          await ManufacturerRepository.getDistributorStoresCount({
            distributorId: distributorId ? Number(distributorId) : 0,
            managerDistributors: distributorIds
          });
        const totalStoresCount = totalStoresCountResult?.storeCount || 0;

        // map the 10 color to seect products
        const productColorMap = this.mapProductColors(selectedProductIds);

        // Fetch top products from the aggregated view with both current and previous year data
        const topProductsData = await newrelic.startSegment(
          "ManufacturerService.getProductInsightsOptimized.getTopProductsFromAggregatedView",
          true,
          async () => {
            return await ManufacturerRepository.getTopProductsFromAggregatedViewOptimized(
              manufacturerId,
              actualStartDate,
              actualEndDate,
              distributorIds,
              distributorId,
              MAX_PRODUCTS,
              prevYearStartDate,
              prevYearEndDate,
              undefined // Get all products for overall metrics
            );
          }
        );

        // Create a map of previous year data for quick lookup
        const prevYearDataMap = new Map();
        topProductsData.previous.forEach((product: any) => {
          prevYearDataMap.set(product.id, product);
        });

        // Filter products at service level based on selectedProductIds
        let filteredCurrentProducts = topProductsData.current;
        let filteredPreviousProducts = topProductsData.previous;

        if (selectedProductIds && selectedProductIds.length > 0) {
          // Filter current year products
          filteredCurrentProducts = topProductsData.current.filter(
            (product: any) => selectedProductIds.includes(product.id)
          );

          // Filter previous year products
          filteredPreviousProducts = topProductsData.previous.filter(
            (product: any) => selectedProductIds.includes(product.id)
          );
        }

        // Create filtered products data structure
        const filteredProductsData = {
          current: filteredCurrentProducts,
          previous: filteredPreviousProducts
        };

        // Transform the results to match the expected format with YoY calculations
        // Use filtered products data when selectedProductIds are provided
        const productsDataToUse =
          selectedProductIds && selectedProductIds.length > 0
            ? filteredProductsData
            : topProductsData;

        const topProducts = productsDataToUse.current.map(
          (product: any, index: number) => {
            const prevYearProduct = prevYearDataMap.get(product.id);

            // Calculate YoY values using the same logic as getTopProducts utility
            let salesYoy = 0;
            let unitsYoy = 0;
            let storePenetrationYoy = 0;

            if (prevYearProduct) {
              const currentSales = parseFloat(product.sales) || 0;
              const prevSales = parseFloat(prevYearProduct.sales) || 0;
              const currentUnits = parseFloat(product.units) || 0;
              const prevUnits = parseFloat(prevYearProduct.units) || 0;
              const currentStorePenetration =
                parseFloat(product.store_penetration) || 0;
              const prevStorePenetration =
                parseFloat(prevYearProduct.store_penetration) || 0;

              salesYoy = calculateYOYGrowth(currentSales, prevSales) ?? 0;
              unitsYoy = calculateYOYGrowth(currentUnits, prevUnits) ?? 0;
              storePenetrationYoy =
                calculateYOYGrowth(
                  currentStorePenetration,
                  prevStorePenetration
                ) ?? 0;
            }

            return {
              id: product.id,
              color: useProductsFilter
                ? productColorMap[product.id]
                : CHARTCOLORS[index % CHARTCOLORS.length],
              units: parseFloat(product.units) || 0,
              unitsYoy: unitsYoy,
              storePenetration: (
                parseFloat(product.store_penetration) || 0
              ).toFixed(2),
              storePenetrationYoy: storePenetrationYoy.toFixed(2),
              sales: parseFloat(product.sales) || 0,
              salesYoy: salesYoy
            };
          }
        );

        // Calculate metrics after top products calculation
        // Get unique active stores data for both overall and filtered metrics in one call
        const filteredProductIds =
          selectedProductIds && selectedProductIds.length > 0
            ? selectedProductIds
            : useProductsFilter
              ? topProductsData.current.map((pro: any) => pro.id)
              : [];

        const activeStoresData = await newrelic.startSegment(
          "ManufacturerService.getProductInsightsOptimized.getUniqueActiveStoresData.combined",
          true,
          async () => {
            return await ManufacturerRepository.getUniqueActiveStoresDataCombined(
              manufacturerId,
              actualStartDate,
              actualEndDate,
              distributorIds,
              distributorId,
              filteredProductIds,
              prevYearStartDate,
              prevYearEndDate
            );
          }
        );

        // Access the data
        const overallActiveStoresData = activeStoresData.overall;
        const filteredActiveStoresData = activeStoresData.filtered;

        const weekRanges = generateWeekRanges(actualStartDate, actualEndDate);
        const weekLabels: string[] = [];
        for (const weekRange of weekRanges) {
          const weekLabel = formatWeekLabel(
            weekRange.startWeekDate,
            weekRange.endWeekDate
          );
          weekLabels.push(weekLabel);
        }

        // Grouping data by transaction_date using new repository methods

        // Fetch grouped data based on month range
        const groupedDataResult = await newrelic.startSegment(
          "ManufacturerService.getProductInsightsOptimized.getGroupedSalesData",
          true,
          async () => {
            let groupedData: any[] = [];
            let prevYearGroupedData: any[] = [];

            if (String(monthRange) === "1") {
              // Use weekly grouping for 1 month filter
              const { current, previous } =
                await ManufacturerRepository.getGroupedSalesDataByWeekOptimized(
                  manufacturerId,
                  distributorId ? [distributorId] : distributorIds,
                  actualStartDate,
                  actualEndDate,
                  prevYearStartDate,
                  prevYearEndDate,
                  selectedProductIds
                );

              groupedData = current;
              prevYearGroupedData = previous;
            } else {
              // Use weekly grouping for other month ranges (since materialized view is now weekly)
              const { current, previous } =
                await ManufacturerRepository.getGroupedSalesDataByMonthOptimized(
                  manufacturerId,
                  distributorId ? [distributorId] : distributorIds,
                  actualStartDate,
                  actualEndDate,
                  prevYearStartDate,
                  prevYearEndDate,
                  selectedProductIds
                );

              groupedData = current;
              prevYearGroupedData = previous;
            }

            return { groupedData, prevYearGroupedData };
          }
        );

        const groupedData = groupedDataResult.groupedData;
        const prevYearGroupedData = groupedDataResult.prevYearGroupedData;

        // Fetch units data
        const unitsDataResult = await newrelic.startSegment(
          "ManufacturerService.getProductInsightsOptimized.getUnitsData",
          true,
          async () => {
            let unitsData: any[] = [];
            let prevYearUnitsData: any[] = [];

            if (String(monthRange) === "1") {
              // Use weekly grouping for 1 month filter
              const { current, previous } =
                await ManufacturerRepository.getUnitsDataByWeekOptimized(
                  manufacturerId,
                  distributorId ? [distributorId] : distributorIds,
                  actualStartDate,
                  actualEndDate,
                  prevYearStartDate,
                  prevYearEndDate,
                  selectedProductIds
                );

              unitsData = current;
              prevYearUnitsData = previous;
            } else {
              // Use weekly grouping for other month ranges (since materialized view is now weekly)
              const { current, previous } =
                await ManufacturerRepository.getUnitsDataByMonthOptimized(
                  manufacturerId,
                  distributorId ? [distributorId] : distributorIds,
                  actualStartDate,
                  actualEndDate,
                  prevYearStartDate,
                  prevYearEndDate
                );

              unitsData = current;
              prevYearUnitsData = previous;
            }

            return { unitsData, prevYearUnitsData };
          }
        );

        // Overall metrics should always be calculated from all products data
        const overallMetrics = this.calculateMetricsFromTopProductsUpdated(
          groupedDataResult.groupedData,
          true,
          overallActiveStoresData
        );

        // For filtered metrics, use the filtered products data if selectedProductIds are provided
        let filteredMetrics = overallMetrics; // Default to overall metrics

        if (selectedProductIds && selectedProductIds.length > 0) {
          filteredMetrics = this.calculateMetricsFromTopProductsUpdated(
            groupedDataResult.groupedData,
            true,
            filteredActiveStoresData
          );
        }

        // Calculate metrics for filtered previous year results
        const filteredPrevYearMetrics =
          this.calculateMetricsFromTopProductsUpdated(
            groupedDataResult.prevYearGroupedData,
            true,
            filteredActiveStoresData
          );

        const unitsData = unitsDataResult.unitsData;
        const prevYearUnitsData = unitsDataResult.prevYearUnitsData;

        // Create maps for units data lookup
        const unitsDataMap = new Map();
        unitsData.forEach((item: any) => {
          const key = new Date(item.week_start).toISOString();
          unitsDataMap.set(key, item.total_units);
        });

        const prevYearUnitsDataMap = new Map();
        prevYearUnitsData.forEach((item: any) => {
          const key = new Date(item.week_start).toISOString();
          prevYearUnitsDataMap.set(key, item.total_units);
        });

        // Transform the data to match expected format with product-specific keys when selectedProductIds are provided
        const transformedGroupedData = this.transformGroupedDataForChart(
          groupedData,
          monthRange ?? "1",
          selectedProductIds,
          productColorMap
        );

        const transformedPrevYearGroupedData =
          this.transformGroupedDataForChart(
            prevYearGroupedData,
            monthRange ?? "1",
            selectedProductIds,
            productColorMap
          );

        const growthChartData = buildGrowthData(
          transformedPrevYearGroupedData,
          transformedGroupedData
        );
        // Convert grouped data into an array
        const groupedArray = transformedGroupedData;

        // Fetch store penetration data using new repository methods
        const storePenetrationResult = await newrelic.startSegment(
          "ManufacturerService.getProductInsightsOptimized.getStorePenetrationData",
          true,
          async () => {
            let storePenetrationData: any[] = [];
            let prevYearStorePenetrationData: any[] = [];

            const isDaily = String(monthRange) === "1"; // Use daily data for 1 month range

            const { current, previous } =
              await ManufacturerRepository.getStorePenetrationDataOptimized(
                manufacturerId,
                distributorId ? [distributorId] : distributorIds,
                startDate,
                endDate,
                prevYearStartDate,
                prevYearEndDate,
                isDaily,
                selectedProductIds
              );

            storePenetrationData = current;
            prevYearStorePenetrationData = previous;

            return { storePenetrationData, prevYearStorePenetrationData };
          }
        );

        const storePenetrationData =
          storePenetrationResult.storePenetrationData;
        const prevYearStorePenetrationData =
          storePenetrationResult.prevYearStorePenetrationData;

        // Transform store penetration data to handle product-specific keys when selectedProductIds are provided
        const storePenetration = this.transformStorePenetrationDataForChart(
          storePenetrationData,
          monthRange ?? "1",
          totalStoresCount,
          selectedProductIds,
          productColorMap
        );

        const prevYearStorePenetration =
          this.transformStorePenetrationDataForChart(
            prevYearStorePenetrationData,
            monthRange ?? "1",
            totalStoresCount,
            selectedProductIds,
            productColorMap
          );

        const response: ManufacturerProductInsights = {
          totalSales: {
            value: filteredMetrics.totalSales,
            yoy: calculateYOYGrowth(
              filteredMetrics.totalSales,
              filteredPrevYearMetrics.totalSales
            )
          },
          activeStores: {
            value: parseInt(filteredMetrics.activeStores.toString()),
            yoy: calculateYOYGrowth(
              filteredActiveStoresData.current,
              filteredActiveStoresData.previous
            )
          },
          units: {
            value: filteredMetrics.units,
            yoy: calculateYOYGrowth(
              filteredMetrics.units,
              filteredPrevYearMetrics.units
            )
          },
          topProducts: topProducts,
          chartData: groupedArray,
          storePenetrationChartData: storePenetration,
          relativeShare: this.calculateRelativeShare(
            filteredMetrics,
            overallMetrics,
            totalStoresCount,
            selectedProductIds?.length ? false : true
          ),
          growth: {
            chartData: growthChartData,
            storePenetrationChartData: this.buildStorePenetrationGrowthData(
              prevYearStorePenetration,
              storePenetration
            )
          },
          latestTransactionDate: latestTransactionDate
        };

        // Cache the response
        if (useApiCaching) {
          await redisClient.setEx(
            cacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(response)
          );
        }

        return response;
      }
    );
  }

  private mapProductColors(
    selectedProductIds?: number[]
  ): Record<number, string> {
    return Object.fromEntries(
      (selectedProductIds ?? []).map((id, index) => [
        id,
        CHARTCOLORS[index % CHARTCOLORS.length]
      ])
    );
  }

  private filterResultsByProducts(
    results: any[],
    selectedProductIds?: number[]
  ): any[] {
    return selectedProductIds?.length
      ? results.filter((row: any) =>
          selectedProductIds.includes(row.id || row.product_id)
        )
      : results;
  }

  private calculateMetrics(results: any[], hasSelection: boolean = true) {
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
  }

  private calculateMetricsFromTopProducts(
    results: any[],
    hasSelection: boolean = true,
    activeStoresData?: { current: number; previous: number }
  ) {
    return {
      totalSales: results.reduce(
        (sum, item) => sum + parseFloat(item.sales),
        0
      ),
      activeStores: activeStoresData ? activeStoresData.current : 0,
      units: results.reduce((sum, item) => sum + parseFloat(item.units), 0)
    };
  }

  private calculateMetricsFromTopProductsUpdated(
    results: any[],
    hasSelection: boolean = true,
    activeStoresData?: { current: number; previous: number }
  ) {
    return {
      totalSales: results.reduce(
        (sum, item) => sum + parseFloat(item.total_sales),
        0
      ),
      activeStores: activeStoresData ? activeStoresData.current : 0,
      units: results.reduce(
        (sum, item) => sum + parseFloat(item.total_units),
        0
      )
    };
  }

  /**
   * Builds store penetration growth data by comparing current and previous year data
   * @param {any[]} prevYearData - Previous year store penetration data
   * @param {any[]} currentData - Current year store penetration data
   * @returns {any[]} - Growth data for store penetration
   */
  private buildStorePenetrationGrowthData(
    prevYearData: any[],
    currentData: any[]
  ) {
    const result: any[] = [];

    // Create a mapping of all available dates from both datasets
    const allDates = [
      ...new Set([
        ...prevYearData.map((item) => item.date),
        ...currentData.map((item) => item.date)
      ])
    ];

    // Iterate over all dates
    allDates.forEach((date) => {
      // Find the corresponding data from prevYearData and currentData
      const prevMonth = prevYearData.find((item) => item.date === date) || null;
      const currMonth = currentData.find((item) => item.date === date) || null;

      if (!prevMonth || !currMonth) return;

      const currKey = new Date().getFullYear();
      const prevKey = new Date().getFullYear() - 1;

      // Create a new object for the current date
      const mergedData: any = {
        date,
        [`curr_key`]: currKey,
        [`Prev_key`]: prevKey
      };

      // Add store penetration data
      mergedData[`storesCount_value_${prevKey}`] = prevMonth.storesCount || 0;
      mergedData[`storesCount_value_${currKey}`] = currMonth.storesCount || 0;
      mergedData[`value_${prevKey}`] = prevMonth.value || 0;
      mergedData[`value_${currKey}`] = currMonth.value || 0;

      result.push(mergedData);
    });

    return result;
  }

  private calculateRelativeShare(
    filtered: any,
    overall: any,
    totalStores: number,
    showOnlyStoreData?: boolean
  ) {
    if (showOnlyStoreData) {
      return {
        totalSales: undefined,
        activeStores: (filtered.activeStores / totalStores) * 100,
        units: undefined
      };
    }
    return {
      totalSales: (filtered.totalSales / overall.totalSales) * 100,
      activeStores: (filtered.activeStores / totalStores) * 100,
      units: (filtered.units / overall.units) * 100
    };
  }

  /**
   * Retrieves the total sales data for a manufacturer over specified time periods.
   *
   * This method calculates the total sales for the current month (daily sales)
   * and for the previous 3, 6, and 12 months (monthly sales). It queries the
   * sales data from the ManufacturerRepository and aggregates the sales
   * totals for each period.
   *
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve sales data.
   * @returns {Promise<MySalesResponse>} - A promise that resolves with an object containing
   * total sales data for the specified periods.
   */
  public async getTotalSales(
    manufacturerId: number,
    categoryId?: number,
    distributorId?: number,
    manufactDist?: boolean,
    month: string = "1"
  ): Promise<SalesResponseWithCategories> {
    const result: MySalesResponse = {
      "1": { totalSale: 0, barChartData: [] },
      "3": { totalSale: 0, barChartData: [] },
      "6": { totalSale: 0, barChartData: [] },
      "12": { totalSale: 0, barChartData: [] }
    };

    const categories = await ManufacturerRepository.getCategories(true);

    const yearStartDate = new Date(new Date().getFullYear(), 0, 1);
    const yearEndDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    const endDate = new Date();
    const startDate = new Date(getDateMinusDays(Number(month) * 30));

    await fetchSalesData(
      manufacturerId,
      month == "12" ? yearStartDate : startDate,
      month == "12" ? yearEndDate : endDate,
      month == "1" ? true : false,
      month,
      result,
      ENTITY_TYPE.MANUFACTURER,
      categoryId,
      distributorId,
      manufactDist
    );

    return { result, categories };
  }

  /**
   * Retrieves a list of distributors associated with a manufacturer.
   * @param {number} manufacturerId The ID of the manufacturer for whom to retrieve distributors.
   * @returns {Promise<{name: string, userId: number, associatedUserId: number}[]>} A promise that resolves to
   *     an array of objects containing the name, user ID, and associated user ID of each distributor.
   */
  public async getDistributors(
    manufacturerId: number,
    accountManagerId?: number
  ) {
    const distributors = await ManufacturerRepository.getDistributorsOptimized(
      manufacturerId,
      accountManagerId
    );

    return distributors;
  }

  /**
   * Optimized version of getDistributors for product insights optimized API
   * Uses materialized view for better performance
   */
  public async getDistributorsOptimized(
    manufacturerId: number,
    accountManagerId?: number
  ) {
    const distributors = await ManufacturerRepository.getDistributorsOptimized(
      manufacturerId,
      accountManagerId
    );

    return distributors;
  }

  public async getProducts(manufacturerId: number) {
    const products = await ManufacturerRepository.getProducts(manufacturerId);

    return products;
  }

  public async getDistributorSalesOverview({
    manufacturerId,
    distributorId = null,
    categoryId = null,
    month = 1
  }: {
    manufacturerId: number;
    distributorId?: number | null;
    categoryId?: number | null;
    month?: number;
  }) {
    // Fetch the list of distributors based on manufacturerId
    const distributors = distributorId
      ? []
      : await ManufacturerRepository.getDistributors(manufacturerId);

    // If a distributorId is provided, filter the distributor list by that ID
    const distributorIds = distributorId
      ? [distributorId] // If distributorId is provided, filter to that specific distributor
      : distributors.map((distributor: any) => distributor.associatedUserId); // Otherwise, include all distributors

    // Fetch the sales rep IDs associated with the filtered distributors
    const totalSalesRep =
      await DistributorRepository.getSalesRepIdsByDistributor(distributorIds);

    const yearStartDate = new Date(
      new Date().getFullYear(),
      0,
      1
    ).toLocaleDateString(DATE_STRING_LOCALE);
    const yearEndDate = new Date(
      new Date().getFullYear(),
      11,
      31,
      23,
      59,
      59
    ).toLocaleDateString(DATE_STRING_LOCALE);

    const endDate = new Date().toLocaleDateString(DATE_STRING_LOCALE);
    const startDate = getDateMinusDays(month * 30);
    const groupBy = month == 1 ? GROUP_PERIOD.DAY : GROUP_PERIOD.MONTH;

    // Fetch the sales data, passing the filtered distributor, sales rep IDs, and categoryId if available
    const salesData = await ManufacturerRepository.getDistributorSalesOverview({
      manufacturerId,
      distributorIds,
      salesRepIds: totalSalesRep,
      categoryId,
      endDate: month == 12 ? yearEndDate : endDate,
      startDate: month == 12 ? yearStartDate : startDate,
      groupBy
    });

    // Fetch the list of categories for the filter
    const categories = await ManufacturerRepository.getCategories(true);

    let totalStores: number = 0;

    // Generate all required dates
    const allDates: string[] = generateDateRange(
      new Date(startDate),
      new Date(endDate)
    );

    const processSalesData = (item: any, date: any = null) => {
      const groupPeriod = date ? new Date(date).getDate() : item.groupPeriod;
      const matchedItem: any | undefined = salesData.find(
        (st: any) => st.groupPeriod == groupPeriod
      );

      const currentStores = parseFloat(matchedItem?.total_stores) || 0;
      const increasedStoresPercent =
        matchedItem && totalStores > 0 && currentStores > 0
          ? ((currentStores / totalStores) * 100).toFixed(2)
          : "0";

      totalStores += currentStores;
      const month = MONTH_NAMES[groupPeriod - 1];

      return {
        salePeriod: `${groupBy == GROUP_PERIOD.MONTH ? month : formatDate(new Date(date))}`,
        increased_sales_percent: increasedStoresPercent,
        total_stores: totalStores
      };
    };

    const salesDataResults =
      month == 1
        ? allDates.map((date) => processSalesData(null, date))
        : salesData.map((item) => processSalesData(item));
    // Include all months
    // const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
    // let lastCumulativeSales = 0;

    // const completeSalesData = allMonths.map((month) => {
    //   const matchingSales = salesDataResults.find(
    //     (sale) => parseInt(sale.sale_month) === month
    //   );

    //   if (matchingSales) {
    //     lastCumulativeSales = matchingSales.total_sales;
    //     return matchingSales;
    //   }

    //   return {
    //     sale_month: month.toString(),
    //     total_sales: lastCumulativeSales,
    //     increased_sales_percent: "0"
    //   };
    // });

    // Return the sales data and categories
    return {
      salesData: salesDataResults,
      categories: categories // Categories are fetched separately in the service
    };
  }

  /**
   * Calculates the total earned rebate and number of completed programs for a given store.
   * @param {ProgramCompliance[]} programCompliances The list of program compliance records.
   * @param {number} storeId The ID of the store for which to calculate the earned rebate and completed programs.
   * @returns {{ earnedRebate: number, completedPrograms: number }} An object containing the total earned rebate and number of completed programs.
   */
  public calculateRebateAndCompletedPrograms(
    programCompliances: ProgramCompliance[],
    storeId: number,
    programs?: any[]
  ): { earnedRebate: number; completedPrograms: number } {
    return programCompliances.reduce(
      (acc, compliance) => {
        // Only process compliances for the current store
        if (compliance.storeid !== storeId) return acc;

        // Find the program once and reuse it
        const pr = programs?.find(
          (pro: any) =>
            pro.program_id === compliance.programid &&
            pro.program_detail_id === compliance.programdetailid
        );

        if (!pr) {
          return acc;
        }

        // Skip if no program found or if program visibility conditions are not met
        const isVisibilityStore =
          pr.visibility_entity_type === ENTITY_TYPE.STORE;
        const isStoreExcluded = !pr.visible_entity_ids?.includes(
          compliance.storeid
        );

        if (isVisibilityStore && isStoreExcluded) {
          return acc;
        }

        if (compliance.isqualified) {
          acc.earnedRebate +=
            compliance.status == ProgramsComplianceStatus.Active
              ? parseFloat(compliance?.earnedrebate ?? "0")
              : 0;
          acc.completedPrograms += 1;
        }

        return acc;
      },
      { earnedRebate: 0, completedPrograms: 0 }
    );
  }

  /**
   * Retrieves a list of stores and their sales volumes for a given manufacturer.
   *
   * This method retrieves sales representatives along with their associated stores and total amount,
   * grouped by store ID. It then fetches program compliances using the grouped store IDs and combines
   * the data based on storeId. The results include the store name, location, sales representative's name,
   * distributor name, purchase volume, total savings, purchased SKUs, completed programs, and total enrolled.
   *
   * The query can be filtered by a specific distributor ID if provided.
   *
   * @param {number} manufacturerId The ID of the manufacturer for whom to retrieve stores.
   * @param {number | null} distributorId Optional distributor ID to filter the results.
   * @param {number} page The page number for pagination.
   * @param {string} sort The order in which the results should be sorted, either DESC or ASC.
   * @param {string | null} searchQuery Optional search query to filter the store results.
   *
   * @returns {Promise<FormattedStoredData>} A promise that resolves to an object containing the list of stores,
   *     total stores, current page, and total pages.
   */
  public async getStoresListing(
    manufacturerId: number,
    distributorId: number | null = null,
    page: number,
    sort: string,
    searchQuery: string | null = null,
    sortKey: string = "sort",
    accountManagerId?: number,
    programTimeline?: string,
    excludeChainStores?: boolean
  ) {
    let distributorIds: number[] = distributorId ? [distributorId] : [];

    if (!distributorId) {
      const distributors: any[] =
        await ManufacturerRepository.getDistributorsOptimized(
          manufacturerId,
          accountManagerId
        );
      distributorIds = distributors.map(
        (distributor: any) => distributor.associatedUserId
      );
    }

    if (manufacturerId === 4) {
      distributorIds = distributorIds.filter((id) => id !== 51);
    }

    const manufacturerProductsData =
      await StoreRepository.getManufacturerProducts({
        manufacturerId,
        excludeCategoryFlags: true
      });
    const manufacturerProductsIds: number[] = manufacturerProductsData.map(
      (product) => product.id
    );

    const programsResult = await StoreRepository.getManufacturerProgramsById(
      manufacturerId,
      undefined,
      undefined,
      undefined,
      [manufacturerId],
      ENTITY_TYPE.MANUFACTURER,
      undefined,
      undefined,
      programTimeline,
      undefined // isInternalInitiative - not available in this context
    );

    const storeIdsToExclude =
      await ProgramRepository.findStoreIdsWithAllProgramsIneligibleManufacturers(
        [manufacturerId],
        programsResult?.map((pro: any) => pro.program_id)
      );

    // When sorting by program compliance, SKUs, or purchase volume, we need to fetch ALL stores first,
    // calculate compliance/SKU count/purchase volume, sort, then paginate manually
    const needsManualPagination =
      sortKey === SORT_KEYS.PROGRAM_COMPLIANCE ||
      sortKey === SORT_KEYS.SKUS ||
      sortKey === SORT_KEYS.PURCHASE_VOLUME_SORT;
    const fetchPage = needsManualPagination ? 1 : page;
    const fetchLimit = needsManualPagination ? 9999 : DEFAULT_PAGE_SIZE;

    const programIdsToCheckEnrollment =
      programsResult?.map((pro) => pro.program_id) || [];

    const {
      rows: distributorsData,
      count: totalRecordsCount
    }: { rows: any[]; count: number } =
      await StoreRepository.getSalesRepWithStoresAndTotalAmount(
        distributorIds,
        null,
        searchQuery,
        null,
        fetchPage,
        sort,
        null,
        fetchLimit,
        manufacturerProductsIds,
        programIdsToCheckEnrollment.length > 0 ? true : null, // Only require enrollment if there are programs
        programIdsToCheckEnrollment.length > 0
          ? programIdsToCheckEnrollment
          : undefined, // Only pass programIds if not empty
        true,
        sortKey,
        manufacturerId,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
        getMinMaxProgramDatesWithManufacturerId({
          programs: programsResult,
          useCurrentYear: false
        }),
        undefined,
        excludeChainStores,
        storeIdsToExclude,
        true // returnSkuIds: true - needed for store listing to show purchasedSkus
      );

    const storeIds = distributorsData.map((ds) => ds.storeid); // Extract storeIds from distributors

    const ExcludedDistributors: any[] =
      await ProgramRepository.getExcludedDistributorsByProgramId(
        manufacturerId
      );

    // Identify core product programs
    // const targetId = programsResult.find(
    //   (pr) => pr.program_type === PROGRAM_TYPE.TIER && pr.program_detail_id
    // )?.program_id;

    const programIds = programsResult
      // .filter((pr) => (targetId && pr.program_id === targetId) || !targetId)
      .map((pr) => {
        return pr.program_id;
      });

    // Fetch program compliances using the grouped store IDs
    const programCompliances: ProgramCompliance[] =
      programIds.length == 0 || storeIds.length == 0
        ? []
        : await StoreRepository.getProgramCompliances(storeIds, programIds);

    // Combine the data based on storeId
    const combinedData: Store[] = [];
    for (const distributor of distributorsData) {
      const skuIds = distributor?.skus_ids?.filter(
        (skuId: number | null) => skuId !== null
      );

      const enrolledPrograms = programsResult.filter((pr) => {
        // if (targetId && pr.program_id !== targetId) return false;

        if (!distributor.enrolled_programs_ids.includes(pr.program_id)) {
          return false;
        }

        if (
          pr?.visibility_entity_type &&
          pr?.visibility_entity_type == ENTITY_TYPE.STORE &&
          !pr?.visible_entity_ids?.includes(distributor.storeid)
        ) {
          return false;
        }

        const excludedProgram = ExcludedDistributors?.find(
          (ed: any) => ed.program_detail_id == pr.program_detail_id
        );

        return (
          !excludedProgram?.distributor_ids?.length ||
          !excludedProgram?.distributor_ids.includes(distributor.distributorid)
        );
      });

      const enrolledProgramsCount = enrolledPrograms
        .filter(
          (pr: any) => !pr?.ineligible_store_ids?.includes(distributor.storeid)
        )
        .reduce((total, program) => {
          return (
            total +
            (program.program_details_ids
              ? program.program_details_ids.length
              : 1)
          );
        }, 0);

      const { earnedRebate, completedPrograms } =
        this.calculateRebateAndCompletedPrograms(
          programCompliances,
          distributor.storeid,
          enrolledPrograms
        );

      const isEnrolled =
        programsResult.filter((pr) =>
          // ((targetId && pr.program_id === targetId) || !targetId) &&
          distributor?.enrolled_programs_ids?.includes(pr.program_id)
        ).length > 0;
      const store: Store = {
        id: distributor.storeid,
        userInfo: {
          id: distributor.store_user_id,
          status: distributor.store_user_status
        },
        storeInfo: {
          name: distributor.storename,
          location: `${distributor.store_city ? distributor.store_city : ""}${distributor.store_state ? ", " + distributor.store_state : ""}`,
          rep: {
            name: distributor.name
          },
          distributor: {
            id: distributor.distributorid,
            name: distributor.distributor_name
          }
        },
        salesData: {
          purchaseVolume: {
            amount: Number(Number(distributor.totalamount).toFixed(2))
          },
          totalSavings: {
            amount: Number(distributor.earned_rebate)
          },
          purchasedSkus: skuIds,
          totalOppSavings: {
            amount: Number(distributor.earning_opportunity)
          }
        },
        programData: {
          completedPrograms: completedPrograms,
          totalEnrolled: enrolledProgramsCount,
          isEnrolled: isEnrolled
        },
        chainNames: distributor?.chain_names
      };

      combinedData.push(store);
    }

    // Sort by completed programs if sortKey is programCompliance
    if (sortKey === SORT_KEYS.PROGRAM_COMPLIANCE) {
      combinedData.sort((a, b) => {
        const aCompleted = a.programData?.completedPrograms ?? 0;
        const bCompleted = b.programData?.completedPrograms ?? 0;

        // Sort based on the sort parameter (DESC or ASC)
        if (sort?.toUpperCase() === "ASC") {
          return aCompleted - bCompleted;
        } else {
          // Default to DESC (highest compliance first)
          return bCompleted - aCompleted;
        }
      });
    }

    // Sort by SKU count if sortKey is SKUS
    if (sortKey === SORT_KEYS.SKUS) {
      combinedData.sort((a, b) => {
        const aSkuCount = a.salesData?.purchasedSkus?.length ?? 0;
        const bSkuCount = b.salesData?.purchasedSkus?.length ?? 0;

        // Sort based on the sort parameter (DESC or ASC)
        if (sort?.toUpperCase() === "ASC") {
          return aSkuCount - bSkuCount;
        } else {
          // Default to DESC (highest SKU count first)
          return bSkuCount - aSkuCount;
        }
      });
    }

    // Note: Purchase volume sorting is handled at the repository level (DB-level sorting)
    // The repository fetches all stores, sorts by purchase volume, then we paginate manually

    // Manually paginate if we fetched all stores for compliance, SKU, or purchase volume sorting
    let paginatedStores = combinedData;
    let actualTotalCount = totalRecordsCount;

    if (needsManualPagination) {
      actualTotalCount = combinedData.length;
      const startIndex = (page - 1) * DEFAULT_PAGE_SIZE;
      const endIndex = startIndex + DEFAULT_PAGE_SIZE;
      paginatedStores = combinedData.slice(startIndex, endIndex);
    }

    const formattedData: FormattedStoredData = {
      stores: paginatedStores,
      totalStores: actualTotalCount,
      currentPage: page,
      totalPages: Math.ceil(actualTotalCount / DEFAULT_PAGE_SIZE)
    };

    return formattedData;
  }

  /**
   * Retrieves the monthly purchase details for a specific store and manufacturer.
   *
   * This method fetches the products and categories associated with a manufacturer
   * and store, and calculates the store's purchase data aggregated by month for the
   * current year. It formats the purchase data into chart data with month names.
   *
   * @param {number} manufacturerId - The ID of the manufacturer to retrieve purchase details for.
   * @param {number} storeId - The ID of the store to retrieve purchase details for.
   * @param {number} distributorId - The ID of the distributor associated with the store.
   * @param {number} [categoryId] - Optional category ID to filter the products.
   * @returns {Promise<{ chartData: CustomBarChartDataItem[], categories: any[] }>} - A promise that resolves to an object
   * containing formatted chart data and categories.
   */
  public async getStorePurchasesDetails(
    manufacturerId: number,
    storeId: number,
    distributorId: number,
    categoryId?: number
  ) {
    // Fetch Store Programs and Manufacturer Products
    const [products, categories] = await Promise.all([
      StoreRepository.getManufacturerProducts({
        manufacturerId,
        categoriesId: categoryId,
        excludeCategoryFlags: true
      }),
      ManufacturerRepository.getCategories(true)
    ]);

    const productIds = products.map((pro) => pro.id);

    // get current month and currrent year for store purchase data
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const storeMonthlyPurchase: any[] =
      await ManufacturerRepository.getStoreMonthlyPurchaseByDistributorId(
        distributorId,
        storeId,
        productIds,
        currentYear
      );

    // Generate the list of months for the current year
    const months = Array.from({ length: currentMonth + 1 }, (_, i) => ({
      month: MONTH_NAMES[i],
      year: currentYear
    }));

    // Create a map of purchase data by month (e.g., "2024-01")
    const purchaseMap = storeMonthlyPurchase.reduce(
      (acc, { month, total_purchase }) => {
        const monthIndex = parseInt(month.split("-")[1], 10) - 1;
        const formattedMonth = MONTH_NAMES[monthIndex];

        acc[formattedMonth] = parseFloat(total_purchase);

        return acc;
      },
      {}
    );

    // Build the final result with formatted month names for the current year
    const result: CustomBarChartDataItem[] = months.map(({ month }) => ({
      date: month,
      purchase: purchaseMap[month] || 0
    }));

    return {
      chartData: result,
      categories
    };
  }

  /**
   * Retrieves compliance details for a manufacturer's programs and their distributors.
   *
   * This method fetches compliance details for programs associated with a manufacturer,
   * optionally filtered by a distributor ID. It identifies core product programs and calculates
   * the compliance percentage and total rebate for each program tier. The function can return
   * compliance details for individual distributors if not excluded.
   *
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve compliance details.
   * @param {number} [distributorId] - Optional ID of the distributor to filter the compliance details.
   * @param {boolean} [excludeDistributorList] - Whether to exclude detailed distributor compliance information.
   * @param {number[]} managerDistributors The IDs of the distributors assigned to manufacturer account manager
   * @returns {Promise<{distributorList: DistributorDetails[], allComplianceDetails: any[]}>} - A promise that resolves to an object
   * containing distributor compliance details and aggregated compliance details for the manufacturer.
   */
  public async getManufactureProgramComplianceDetails(
    manufacturerId: number,
    distributorId?: number,
    excludeDistributorList?: boolean,
    ExcludedDistributors?: any[],
    managerDistributors?: number[],
    programTimeline?: string,
    authorizedDistributorIds?: number[]
  ) {
    const data: any[] = await ManufacturerRepository.getDistributorWithStoreIds(
      manufacturerId,
      distributorId,
      managerDistributors,
      authorizedDistributorIds
    );

    // Extract and flatten store IDs
    const storeIds = data.flatMap((item) => item.storeIds);
    const distributorIds = data.map((item) => item.distributorId);

    const validProgramIds =
      await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
        participantType: ENTITY_TYPE.STORE,
        creatorIds: [manufacturerId],
        creatorType: ENTITY_TYPE.MANUFACTURER,
        visibilityEntitieIds: storeIds,
        getInternalInitiative: false,
        programTimeline: programTimeline || "Current"
      });

    // Fetch programs once and use for both compliance and terms
    const programsResult = await StoreRepository.getManufacturerProgramsById(
      manufacturerId,
      undefined,
      undefined,
      undefined,
      [manufacturerId],
      ENTITY_TYPE.MANUFACTURER,
      undefined,
      undefined,
      programTimeline || "Current",
      undefined
    );

    const programTerms = getMinMaxProgramDatesWithManufacturerId({
      programs: programsResult,
      useCurrentYear: false
    });

    // Get manufacturer products once for consistent filtering
    const manufacturerProductsData =
      await StoreRepository.getManufacturerProducts({
        manufacturerId,
        excludeCategoryFlags: true
      });
    const manufacturerProductsIds: number[] = manufacturerProductsData.map(
      (product) => product.id
    );

    const storeIdsToExclude =
      await ProgramRepository.findStoreIdsWithAllProgramsIneligibleManufacturers(
        [manufacturerId],
        validProgramIds
      );

    // Use getSalesRepWithStoresAndTotalAmount for consistent filtering
    const { rows: distributorsData } =
      await StoreRepository.getSalesRepWithStoresAndTotalAmount(
        distributorIds,
        null, // storeId
        null, // searchQuery
        null, // selectedSalesRepId
        1, // page
        "ASC", // sort
        null, // chainId
        10000, // large page size to get all stores
        manufacturerProductsIds, // manufacturerProductsIds
        true, // enrolled = true
        validProgramIds, // programIds
        true, // excludedStoreWithNoTransaction = true
        "sort", // sortKey
        manufacturerId,
        undefined, // authorizedDistManufacturerIds
        undefined, // warehouseIds
        undefined, // programs
        undefined, // returnSpiffEarning
        undefined, // returnEnrolledProgramsEarning
        programTerms, // programTerms
        undefined, // isInternalInitiative
        false, // excludeChainStores - set to false for Programs API
        storeIdsToExclude
      );

    const storeIdsFromDistributors = distributorsData.map(
      (ds: any) => ds.storeid
    );
    const manufacturerStoreIds = new Set(storeIdsFromDistributors);
    const enrolledStoreIds = new Set(storeIdsFromDistributors);

    // Fetch program compliances using the grouped store IDs
    const programCompliances: ProgramCompliance[] =
      await StoreRepository.getProgramCompliances(storeIdsFromDistributors);

    const distributorList: DistributorDetails[] = [];
    let mainanufacturerDetails: any[] = [];

    const processDistributorDetails = async (programs: any[]) => {
      const manufacturerComplianceDetails: Record<
        string,
        ProgramComplianceDetails
      > = {};

      // Use manufacturerProductsIds from outer scope (already fetched)

      const distributorIdWithTotalSales =
        await DistributorRepository.getDistributorTotalSale(
          data.map((d) => d.distributorId),
          manufacturerProductsIds
        );

      const prorgamIds = programs?.map((pr: any) => pr.program_id);

      const ineligibleStoreIdswithProgramIds: any[] =
        await ProgramRepository.getIneligibleStoreIdsGroupByProgramId(
          prorgamIds
        );

      programs.forEach((pr) => {
        const useProgramData = pr.tier > 0 ? true : false;

        const ineligibleStoreIds =
          ineligibleStoreIdswithProgramIds?.find(
            (item: any) => item.program_id === pr.program_id
          )?.store_ids || [];

        const visibilityEntityType = pr?.visibility_entity_type;
        const visibilityEntityIds = pr?.visible_entity_ids;

        const ExcludedDistributorIds = ExcludedDistributors?.find(
          (ed: any) => ed.program_detail_id == pr.program_detail_id
        )?.distributor_ids;

        const title = useProgramData
          ? `${pr.program_header} - Tier ${pr.tier}`
          : `${pr.program_header}`;

        const startDateString = pr.start_date;
        const endDateString = pr.end_date;

        // Initialize the compliance details only if not already exists
        // This prevents programs with the same title from overwriting each other
        if (!manufacturerComplianceDetails[title]) {
          manufacturerComplianceDetails[title] = {
            tierName: useProgramData ? `Tier ${pr.tier}` : "N/A",
            programName: title,
            programId: pr.program_id,
            programStartDate: startDateString,
            programEndDate: endDateString,
            overview: pr?.overview,
            rebate_percentage: pr?.rebate_percentage,
            rebate_type: pr?.rebate_type,
            rebate_amount: pr?.rebate_amount,
            isRebateBasedOnListPrice: isListPriceApplicable(
              pr?.rebate_calculation_type ?? ""
            ),
            totalStores: 0,
            qualifiedStores: 0,
            compliancePercentage: 0,
            totalRebate: 0
          };
        }

        for (const item of data) {
          let distributorComplianceDetails: DistributorDetails | null = null;

          const storeIds = ExcludedDistributorIds?.includes(item.distributorId)
            ? []
            : item.storeIds?.filter(
                (id: number) =>
                  manufacturerStoreIds.has(id) &&
                  enrolledStoreIds.has(id) &&
                  !ineligibleStoreIds.includes(id)
              );

          if (!excludeDistributorList) {
            const distributorTotalSale =
              distributorIdWithTotalSales.find(
                (dt) => dt.seller_id == item.distributorId
              )?.totalAmount || 0;

            distributorComplianceDetails = {
              id: item.distributorId,
              name: item.name,
              totalStores: storeIds.length ?? 0,
              totalSales: distributorTotalSale,
              location: item.city + (item.state ? `, ${item.state}` : ""),
              details: []
            };
          }

          // Filter compliance based on program ID and store IDs
          const completedProgramCompliances = useProgramData
            ? programCompliances.filter(
                (pc) =>
                  pc.programid === pr.program_id &&
                  storeIds.includes(pc.storeid) &&
                  enrolledStoreIds.has(pc.storeid) &&
                  pc.currenttierid === pr.program_detail_id &&
                  pc.isqualified &&
                  (visibilityEntityType
                    ? visibilityEntityIds?.includes(pc.storeid)
                    : true)
              )
            : programCompliances.filter(
                (pc) =>
                  pc.programid === pr.program_id &&
                  storeIds.includes(pc.storeid) &&
                  enrolledStoreIds.has(pc.storeid) &&
                  pc.isqualified &&
                  (visibilityEntityType
                    ? visibilityEntityIds?.includes(pc.storeid)
                    : true)
              );

          // Calculate compliance percentage
          const compltedPercentage = useProgramData
            ? (completedProgramCompliances?.length / storeIds.length) * 100
            : (completedProgramCompliances?.length / storeIds.length) * 100;

          // Calculate rebate for both tier and base programs
          const rebate = completedProgramCompliances.reduce(
            (acc, pc) =>
              pc.status == ProgramsComplianceStatus.Active
                ? acc + (Number(pc.earnedrebate) || 0)
                : acc,
            0
          );

          // Store the compliance details
          // Note: compliancePercentage will be recalculated at the end using qualifiedStores/totalStores
          manufacturerComplianceDetails[title].totalRebate =
            (manufacturerComplianceDetails[title]?.totalRebate || 0) + rebate;

          // Calculate totalStores with proper visibility filtering
          const filteredStoreIds =
            visibilityEntityType && visibilityEntityIds
              ? storeIds.filter((id: number) =>
                  visibilityEntityIds.includes(id)
                )
              : storeIds;

          manufacturerComplianceDetails[title].totalStores =
            (manufacturerComplianceDetails[title].totalStores ?? 0) +
            filteredStoreIds.length;

          manufacturerComplianceDetails[title].qualifiedStores =
            (manufacturerComplianceDetails[title]?.qualifiedStores || 0) +
            completedProgramCompliances?.length;

          if (distributorComplianceDetails) {
            const detail: ProgramComplianceDetails = {
              tierName: useProgramData ? `Tier ${pr.tier}` : "N/A",
              programName: title,
              programId: pr.program_id,
              compliancePercentage: compltedPercentage,
              totalRebate: rebate
            };

            distributorComplianceDetails.details.push(detail);
          }

          if (distributorComplianceDetails)
            if (
              distributorList.find(
                (dt) => dt.id === distributorComplianceDetails.id
              )
            ) {
              distributorList[
                distributorList.findIndex(
                  (dt) => dt.id === distributorComplianceDetails.id
                )
              ].details.push(distributorComplianceDetails.details[0]);
            } else {
              distributorList.push(distributorComplianceDetails);
            }
        }
      });

      mainanufacturerDetails = Object.entries(
        manufacturerComplianceDetails
      ).map(([, value]) => ({
        ...value,
        compliancePercentage:
          value.totalStores && value.totalStores > 0
            ? ((value.qualifiedStores ?? 0) / value.totalStores) * 100
            : 0
      }));
    };

    // Process details using the fetched programs
    // Process details using core programs (Tier Programs), or base program (non-tier programs)
    // if (coreProductPrograms.length > 0 && !excludeDistributorList) {
    //   // Process details using core programs (Tier programs)
    //   await processDistributorDetails(coreProductPrograms);
    // } else if (baseProgram && !excludeDistributorList) {
    //   // Process details using base program (non-tier programs)
    //   await processDistributorDetails([baseProgram]);
    // } else {
    // Process details with no programs (fallback case)
    await processDistributorDetails(programsResult);
    // }

    sortProgramsByTier(mainanufacturerDetails);
    return {
      distributorList,
      allComplianceDetails: mainanufacturerDetails
    };
  }

  /**
   * Retrieves the number of stores for each unique SKU count for a manufacturer.
   * The result is an array of objects, where each object contains the SKU count and
   * the number of stores that have that SKU count.
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve SKU counts
   * @returns {Promise<{skuCount: number, storeCount: number}[]>} - A promise that resolves to an array of objects containing the SKU count and store count.
   */
  public async getSkusPerStore(
    manufacturerId: number,
    distributorId: number | null,
    categoryId: string | null,
    monthRange: string | null,
    lastYear: boolean = false,
    managerId: number | null,
    warehouseIds?: number[]
  ) {
    // Add simple cache key
    const cacheKey = getCacheKey(
      "skus_per_store",
      manufacturerId.toString(),
      distributorId?.toString() || "all",
      categoryId?.toString() || "all",
      monthRange?.toString() || "all",
      lastYear.toString(),
      managerId?.toString() || "all"
    );

    // Try to get from cache first
    if (useApiCaching) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    const skuCountKey = lastYear ? "skuCountLastYear" : "skuCount";
    const storeCountKey = lastYear ? "storeCountLastYear" : "storeCount";

    const yearStartDate = new Date(new Date().getFullYear(), 0, 1);

    let distributorIds = distributorId ? [distributorId] : [];

    if (!distributorId) {
      const distributors = await ManufacturerRepository.getDistributors(
        manufacturerId,
        distributorId
      );
      distributorIds = distributors.map((dt: any) => dt.associatedUserId);
    }

    const latestTransactionDate =
      await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
        distributorId ? [distributorId] : distributorIds,
        !isNaN(manufacturerId) ? [manufacturerId] : undefined
      );

    const endDate = latestTransactionDate
      ? new Date(latestTransactionDate)
      : new Date();
    const startDate =
      monthRange == "12" ||
      (monthRange != "12" &&
        getStartDate(endDate, monthRange ?? "") < yearStartDate)
        ? yearStartDate
        : getStartDate(endDate, monthRange ?? "");

    if (lastYear) {
      endDate.setFullYear(endDate.getFullYear() - 1);
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Fetch SKU data with distributor and category filters
    const skusPerStoreData = await ManufacturerRepository.getSkusPerStore(
      manufacturerId,
      distributorId,
      categoryId,
      startDate,
      endDate,
      managerId ? managerId : undefined,
      warehouseIds
    );

    // Fetch category data (assuming getCategories will return the list of categories)
    const categories = await ManufacturerRepository.getCategories(true);

    // return default chart data when no skuperstores found
    if (!skusPerStoreData?.length) {
      // Return both arrays as separate results
      return {
        skuCounts: [],
        categories: categories // Return categories as a separate array
      };
    }
    // Process the data to get SKU counts and store counts
    const skuCounts = skusPerStoreData.map((item: any) => item.sku_count);

    // Aggregate the SKU counts by category
    const skuCountAggregation = skuCounts.reduce((acc: any, count: number) => {
      if (acc[count]) {
        acc[count] += 1;
      } else {
        acc[count] = 1;
      }
      return acc;
    }, {});

    // Format the SKU counts into a separate array
    const skuCountResults = Object.keys(skuCountAggregation).map(
      (sku_count) => ({
        [skuCountKey]: parseInt(sku_count, 10),
        [storeCountKey]: skuCountAggregation[sku_count]
      })
    );

    // Return both arrays as separate results
    const result = {
      skuCounts: skuCountResults,
      categories: categories
    };

    // Cache the result before returning
    if (useApiCaching) {
      try {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(result)
        );
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    return result;
  }

  private getMonthBasedDate(endDate: Date, monthRange: string) {
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

  /**
   * Retrieves the number of SKUs associated with each store for a given manufacturer (optimized version).
   * The result is a list of objects, each containing the store ID and the number of associated SKUs.
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve SKU counts
   * @param {number | null} distributorId - Optional distributor ID to filter the data
   * @param {string | null} categoryId - Optional category ID to filter the data
   * @param {string | null} monthRange - Optional month range for the data
   * @param {boolean} lastYear - Whether to fetch last year's data
   * @param {number | null} managerId - Optional manager ID for filtering
   * @param {number[]} [warehouseIds] - Optional warehouse IDs for filtering
   * @returns {Promise<{skuCount: number, storeCount: number}[]>} - A promise that resolves to an array of objects containing the SKU count and store count.
   */
  public async getSkusPerStoreOptimized(
    manufacturerId: number,
    categoryId: string | null,
    startDate: Date,
    endDate: Date,
    managerId: number | null,
    warehouseIds?: number[],
    distributorIds?: number[],
    lastYearStartDate?: Date,
    lastYearEndDate?: Date
  ) {
    // Add simple cache key
    const cacheKey = getCacheKey(
      "skus_per_store_optimized",
      manufacturerId.toString(),
      categoryId?.toString() || "all",
      startDate.toString(),
      endDate.toString(),
      managerId?.toString() || "all",
      warehouseIds?.toString() || "all",
      distributorIds?.toString() || "all",
      lastYearStartDate?.toString(),
      lastYearEndDate?.toString()
    );

    // Try to get from cache first
    if (useApiCaching) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    const skusPerStoreData =
      await ManufacturerRepository.getSkusPerStoreCombinedOptimized(
        manufacturerId,
        categoryId,
        startDate,
        endDate,
        lastYearStartDate,
        lastYearEndDate,
        managerId ? managerId : undefined,
        warehouseIds,
        distributorIds
      );

    const { previous, current } = skusPerStoreData;

    const skuCountKeyCurrent = SKU_COUNT_KEYS.CURRENT;
    const storeCountKeyCurrent = STORE_COUNT_KEYS.CURRENT;
    const skuCountKeyPrevious = SKU_COUNT_KEYS.PREVIOUS;
    const storeCountKeyPrevious = STORE_COUNT_KEYS.PREVIOUS;

    // Process both datasets
    const combinedResult = {
      currentYear: processSkuData(
        current,
        skuCountKeyCurrent,
        storeCountKeyCurrent
      ),
      lastYear: processSkuData(
        previous,
        skuCountKeyPrevious,
        storeCountKeyPrevious
      )
    };

    // Cache the result before returning
    if (useApiCaching) {
      try {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(combinedResult)
        );
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    return combinedResult;
  }

  /**
   * Retrieves an overview of programs for a given manufacturer.
   *
   * This method fetches a list of programs associated with a manufacturer,
   * including details on the number of completed and total compliances,
   * total rebate earned, and the program's start and end dates.
   *
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve the program overview.
   * @param {number} [distributorId] - Optional ID of the distributor to filter the compliance details.
   * @param {number} [managerId] - Optional ID of the manufacturer account manager to filter the compliance details.
   * @returns {Promise<Array<{programName: string, completedCompliances: number, totalCompliances: number, rebate: number, programStartDate: Date, programEndDate: Date}>>}
   * A promise that resolves to an array of objects, each containing the program's name,
   * the number of completed compliances, total compliances, total rebate, start date, and end date.
   */
  public async getProgramsOverview(
    manufacturerId: number,
    selectedDistributorId?: number,
    managerId?: number,
    programTimeline?: string
  ) {
    let distributorId = selectedDistributorId;
    let managerDistributorIds: number[] | undefined = undefined;

    // manufacturer account manager fetch all related distributor ids
    if (managerId) {
      const managerDistributors = await ManufacturerRepository.getDistributors(
        manufacturerId,
        undefined,
        managerId
      );

      managerDistributorIds = managerDistributors
        .map((distributor) => {
          return distributor.associatedUserId;
        })
        .filter((id: number) => (distributorId ? distributorId == id : true));

      distributorId =
        distributorId && managerDistributorIds?.length
          ? distributorId
          : undefined;
    }

    let distributorsCount = distributorId ? 1 : 0;

    let manufacturerDistributors: any[] = [];
    if (distributorsCount === 0) {
      manufacturerDistributors = await ManufacturerRepository.getDistributors(
        manufacturerId,
        undefined,
        managerId
      );
      distributorsCount = manufacturerDistributors.length;
    }

    const distributorIds = distributorId
      ? [distributorId]
      : manufacturerDistributors.map((distributor) => {
          return distributor.associatedUserId;
        });

    // Add Redis caching
    const cacheKey = getCacheKey(
      "manufacturer",
      "programs",
      manufacturerId.toString(),
      distributorId?.toString() || "all",
      managerId?.toString() || "all",
      programTimeline?.toString() || "all"
    );
    if (useApiCaching) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    const programsOverviewDistributors =
      await ProgramRepository.getProgramsOverview(
        manufacturerId,
        distributorId ? [distributorId] : undefined,
        ENTITY_TYPE.DISTRIBUTOR,
        managerDistributorIds,
        [manufacturerId],
        [ENTITY_TYPE.MANUFACTURER],
        undefined,
        programTimeline
      );

    const excludedDistributorsByProgramId =
      await ProgramRepository.getExcludedDistributorsByProgramId(
        manufacturerId,
        distributorId,
        managerDistributorIds
      );

    const excludedProgramDetailIds =
      await ProgramRepository.getNonApprovedProgramIdsByDistributor({
        manufacturerId,
        distributorIds
      });

    const ExcludedDistributorsByProgramId = Array.from(
      new Set([...excludedDistributorsByProgramId, ...excludedProgramDetailIds])
    );

    const distributorsSalesReps =
      await DistributorRepository.getSalesRepIdsArrayByDistributorId(
        distributorIds
      );

    const programsOverviewSalesReps =
      await ProgramRepository.getProgramsOverview(
        manufacturerId,
        distributorsSalesReps?.length
          ? distributorsSalesReps.reduce(
              (acc, item) => acc.concat(item.sales_rep_ids),
              []
            )
          : undefined,
        ENTITY_TYPE.SALES_REP,
        managerDistributorIds,
        [manufacturerId],
        [ENTITY_TYPE.MANUFACTURER],
        undefined,
        programTimeline,
        ENTITY_TYPE.MANUFACTURER
      );

    const programsOverviewDistributorsData =
      await this.formatProgramsOverviewData(
        programsOverviewDistributors,
        distributorsCount,
        ExcludedDistributorsByProgramId,
        undefined,
        selectedDistributorId
      );

    const programsOverviewSalesRepsData = await this.formatProgramsOverviewData(
      programsOverviewSalesReps,
      0,
      ExcludedDistributorsByProgramId,
      distributorsSalesReps,
      selectedDistributorId
    );

    const result = await this.getManufactureProgramComplianceDetails(
      manufacturerId,
      distributorId,
      true,
      ExcludedDistributorsByProgramId,
      managerDistributorIds,
      programTimeline,
      distributorIds
    );

    const response = {
      distributorProgramsData: programsOverviewDistributorsData,
      storeProgramsData: result.allComplianceDetails,
      salesRepsProgramsData: programsOverviewSalesRepsData
    };

    // Cache the response
    if (useApiCaching) {
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL_TIME,
        JSON.stringify(response)
      );
    }

    return response;
  }

  /**
   * Formats the programs overview data into a standardized format.
   *
   * The function takes an array of objects, where each object contains the program details
   * and the total enrollments, and formats the data into a standardized format.
   *
   * The standardized format is an array of objects, where each object has the following properties:
   *  - programName: The name of the program, including the tier number if applicable.
   *  - completedCompliances: The number of completed compliances for the program.
   *  - totalEnrollments: The total number of enrollments for the program.
   *  - rebate: The total rebate earned for the program.
   *  - programStartDate: The start date of the program.
   *  - programEndDate: The end date of the program.
   *
   * @param {Array<any>} data - The array of objects containing the program details and total enrollments.
   * @param {number} [totalEnrollments=0] - The total number of enrollments for the program.
   * @returns {Promise<Array<{programName: string, completedCompliances: number, totalEnrollments: number, rebate: number, programStartDate: Date, programEndDate: Date}>>} - A promise that resolves to an array of objects containing the formatted data.
   */
  public async formatProgramsOverviewData(
    data: any,
    totalEnrollments: number = 0,
    ExcludedDistributors?: any[],
    distributorsSalesReps?: any[],
    selectedDistributorId?: number
  ) {
    const getTotalEnrollments = (
      programDetailId: number,
      eligibleDistributorIds?: number[]
    ) => {
      const distributorIds = ExcludedDistributors?.find(
        (ed: any) => ed.program_detail_id == programDetailId
      )?.distributor_ids;

      if (eligibleDistributorIds != undefined) {
        const eligibleDistributorsCount = selectedDistributorId
          ? eligibleDistributorIds.filter((id) => id == selectedDistributorId)
              ?.length
          : eligibleDistributorIds?.length;

        return eligibleDistributorsCount;
      }

      if (!distributorIds) {
        const totalSalesRepCount = distributorsSalesReps?.reduce(
          (count, item) => count + item.sales_rep_ids.length,
          0
        );

        return totalSalesRepCount ?? totalEnrollments;
      }

      if (distributorsSalesReps) {
        const totalSalesRepCount = distributorsSalesReps
          ?.filter((dts: any) => !distributorIds.includes(dts.distributor_id))
          ?.reduce((count, item) => count + item?.sales_rep_ids?.length, 0);

        return totalSalesRepCount;
      }

      return totalEnrollments - distributorIds.length;
    };

    // Filter out programs where the selected distributor is excluded
    const filteredData = selectedDistributorId
      ? data.filter((item: any) => {
          const excludedDistributorIds = ExcludedDistributors?.find(
            (ed: any) => ed.program_detail_id == item.program_detail_id
          )?.distributor_ids;

          // Keep the program if the distributor is NOT in the excluded list
          return !excludedDistributorIds?.includes(selectedDistributorId);
        })
      : data;

    const formattedData = filteredData.map((item: any) => {
      const startDateString = item.start_date;
      const endDateString = item.end_date;

      const visibilityEntityType = item?.visibility_entity_type;
      const visibilityEntityIds = item?.visible_entity_ids;

      const programName =
        item.tier > 0
          ? `${item.program_header} - Tier ${item.tier}`
          : item.program_header;

      return {
        programId: item.id,
        programName,
        completedCompliances: item.completed,
        totalEnrollments: getTotalEnrollments(
          item.program_detail_id,
          visibilityEntityType ? visibilityEntityIds : undefined
        ),
        rebate: item.total_rebate,
        programStartDate: startDateString,
        programEndDate: endDateString,
        overview: item.overview,
        rebate_amount: item.rebate_amount,
        rebate_percentage: item.rebate_percentage,
        rebate_type: item.rebate_type
      };
    });

    // When no specific distributor is selected, aggregate programs with the same name
    if (!selectedDistributorId) {
      const aggregatedMap = new Map<string, any>();

      formattedData.forEach((program: any) => {
        const existing = aggregatedMap.get(program.programName);

        if (existing) {
          // Aggregate metrics for duplicate program names
          existing.completedCompliances = String(
            Number(existing.completedCompliances) +
              Number(program.completedCompliances)
          );
          existing.totalEnrollments += program.totalEnrollments;
          existing.rebate = String(
            (parseFloat(existing.rebate) + parseFloat(program.rebate)).toFixed(
              2
            )
          );
        } else {
          // First occurrence - add to map
          aggregatedMap.set(program.programName, { ...program });
        }
      });

      return Array.from(aggregatedMap.values());
    }

    return formattedData;
  }
  public async getManufacturerNameAndLogo(manufacturerId: number) {
    return await ManufacturerRepository.getManufacturerDetails(manufacturerId, [
      "id",
      "name",
      "logo",
      "authorized"
    ]);
  }

  public async getAuthorized(distributorId: number) {
    return await ManufacturerRepository.getAuthorizedManufacturers(
      distributorId
    );
  }

  /**
   * Retrieves the merged data for the number of stores for each unique SKU count for a manufacturer.
   * The result is an array of objects, where each object contains the SKU count and the number of stores that have that SKU count.
   *
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve SKU counts
   * @param {number | null} distributorId - The ID of the distributor for whom to filter the results
   * @param {string | null} categoryId - The ID of the category for whom to filter the results
   * @param {string | null} monthRange - The month range for which to retrieve the data
   *
   * @returns {Promise<{skuCounts: MergedSkuCount[], categories: Category[]}>} - A promise that resolves to an object containing the merged SKU counts and categories.
   */
  public async getMergedSkusPerStoreData(
    manufacturerId: number,
    distributorId: number | null,
    categoryId: string | null,
    monthRange: string | null,
    managerId: number | null,
    distributorManagerId?: number,
    isGeneralManager?: boolean,
    selectedWarehouseId?: number
  ) {
    // Generate cache key for this specific request
    const cacheKey = getCacheKey(
      "getMergedSkusPerStoreData",
      manufacturerId.toString(),
      distributorId?.toString() || "null",
      categoryId || "null",
      monthRange || "null",
      managerId?.toString() || "null",
      distributorManagerId?.toString() || "null",
      isGeneralManager?.toString() || "null",
      selectedWarehouseId?.toString() || "null"
    );

    // Check cache first if caching is enabled
    if (useApiCaching) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log(
            `[CACHE] getMergedSkusPerStoreData - Cache HIT for key: ${cacheKey}`
          );
          return JSON.parse(cached);
        }
        console.log(
          `[CACHE] getMergedSkusPerStoreData - Cache MISS for key: ${cacheKey}`
        );
      } catch (error) {
        console.error("Cache error in getMergedSkusPerStoreData:", error);
      }
    }

    let warehouseIds = undefined;
    if (distributorId && distributorManagerId) {
      warehouseIds = await DistributorRepository.getWarehouseIds(
        distributorId,
        distributorManagerId,
        isGeneralManager,
        selectedWarehouseId
      );
    }

    const currentYear = await this.getSkusPerStore(
      manufacturerId,
      distributorId,
      categoryId,
      monthRange,
      false,
      managerId,
      warehouseIds
    );

    const fetchDataOfLastYear = true;
    const lastYear = await this.getSkusPerStore(
      manufacturerId,
      distributorId,
      categoryId,
      monthRange,
      fetchDataOfLastYear,
      managerId,
      warehouseIds
    );

    // Merge skuCounts
    const skuMap = new Map<number, MergedSkuCount>(
      currentYear.skuCounts.map((item: any) => [
        (item as SkuCountCurrentYear).skuCount,
        { ...(item as SkuCountCurrentYear) }
      ])
    );

    // Track data merging operations
    const mergeSegment = newrelic.startSegment(
      "mergeSKUsData",
      false,
      async () => {
        // Track SKU counts merging
        const skuMergeSegment = newrelic.startSegment(
          "mergeSKUCounts",
          false,
          () => {
            const skuMap = new Map<number, MergedSkuCount>(
              currentYear.skuCounts.map((item: any) => [
                (item as SkuCountCurrentYear).skuCount,
                { ...(item as SkuCountCurrentYear) }
              ])
            );

            lastYear.skuCounts.forEach((item: any) => {
              const { skuCountLastYear, storeCountLastYear } =
                item as SkuCountLastYear;
              if (skuMap.has(skuCountLastYear)) {
                skuMap.get(skuCountLastYear)!.storeCountLastYear =
                  storeCountLastYear;
              } else if (skuCountLastYear) {
                skuMap.set(skuCountLastYear, {
                  skuCount: skuCountLastYear,
                  storeCountLastYear: storeCountLastYear
                });
              }
            });

            return Array.from(skuMap.values()).sort(
              (a, b) => a.skuCount - b.skuCount
            );
          }
        );

        const mergedSkuCounts = await skuMergeSegment;

        // Track categories merging
        const categoryMergeSegment = newrelic.startSegment(
          "mergeCategories",
          false,
          () => {
            const categoryMap = new Map<number, Category>();
            currentYear.categories.forEach((cat: any) =>
              categoryMap.set(cat.id, { ...cat })
            );
            lastYear.categories.forEach((cat: any) => {
              if (!categoryMap.has(cat.id)) {
                categoryMap.set(cat.id, { ...cat });
              }
            });

            return Array.from(categoryMap.values()).sort((a, b) => a.id - b.id);
          }
        );

        const mergedCategories = await categoryMergeSegment;

        // Track final data preparation
        const finalPrepSegment = newrelic.startSegment(
          "prepareFinalData",
          false,
          () => {
            const currentYearSkuCounts = currentYear.skuCounts.map(
              (item: { skuCount: any }) => {
                return item.skuCount;
              }
            );
            const lastYearSkuCounts = lastYear.skuCounts.map(
              (item: { skuCountLastYear: any }) => {
                return item.skuCountLastYear;
              }
            );
            return {
              currentYearSkuCounts: currentYearSkuCounts,
              lastYearSkuCounts: lastYearSkuCounts,
              skuCounts: mergedSkuCounts,
              categories: mergedCategories
            };
          }
        );
        return await finalPrepSegment;
      }
    );

    const result = await mergeSegment;

    // Cache the result if caching is enabled
    if (useApiCaching) {
      try {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(result)
        );
        console.log(
          `[CACHE] getMergedSkusPerStoreData - Cached result for key: ${cacheKey}`
        );
      } catch (error) {
        console.error("Error caching getMergedSkusPerStoreData result:", error);
      }
    }

    return result;
  }

  /**
   * Retrieves the merged SKUs per store data for a manufacturer (optimized version).
   * This method combines current year and last year data for SKU counts and categories.
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve SKU data
   * @param {number | null} distributorId - Optional distributor ID to filter the data
   * @param {string | null} categoryId - Optional category ID to filter the data
   * @param {string | null} monthRange - Optional month range for the data
   * @param {number | null} managerId - Optional manager ID for filtering
   * @param {number} [distributorManagerId] - Optional distributor manager ID
   * @param {boolean} [isGeneralManager] - Whether the user is a general manager
   * @param {number} [selectedWarehouseId] - Optional warehouse ID for filtering
   * @returns {Promise<any>} - A promise that resolves to the merged SKU data
   */
  public async getMergedSkusPerStoreDataOptimized({
    manufacturerId,
    distributorId,
    categoryId,
    monthRange,
    managerId,
    distributorManagerId,
    isGeneralManager,
    selectedWarehouseId,
    parsedDistributorIds
  }: {
    manufacturerId: number;
    distributorId: number | null;
    categoryId: string | null;
    monthRange: string | null;
    managerId: number | null;
    distributorManagerId?: number;
    isGeneralManager?: boolean;
    selectedWarehouseId?: number;
    parsedDistributorIds?: number[];
  }) {
    let warehouseIds = undefined;
    if (distributorId && distributorManagerId) {
      warehouseIds = await DistributorRepository.getWarehouseIds(
        distributorId,
        distributorManagerId,
        isGeneralManager,
        selectedWarehouseId
      );
    }

    // Calculate distributor IDs once
    const distributorIds: number[] = distributorId
      ? [distributorId]
      : parsedDistributorIds || [];

    // Get latest transaction date once
    const latestTransactionDate =
      await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
        distributorIds,
        !isNaN(manufacturerId) ? [manufacturerId] : undefined
      );

    const rawEndDate = latestTransactionDate
      ? new Date(latestTransactionDate)
      : new Date();
    const endDate = getNearestSunday(rawEndDate);
    // Calculate base dates once
    const baseEndDate = endDate;
    const baseStartDate =
      monthRange == "12"
        ? this.getMonthBasedDate(baseEndDate, monthRange ?? "")
        : getStartDate(baseEndDate, monthRange ?? "");

    // Calculate current year and last year dates
    const currentYearStartDate = new Date(baseStartDate);
    const currentYearEndDate = new Date(baseEndDate);

    // For last year, we want the exact same dates but in the previous year
    const lastYearStartDate = new Date(
      baseStartDate.getFullYear() - 1,
      baseStartDate.getMonth(),
      baseStartDate.getDate(),
      baseStartDate.getHours(),
      baseStartDate.getMinutes(),
      baseStartDate.getSeconds(),
      baseStartDate.getMilliseconds()
    );

    const lastYearEndDate = new Date(
      baseEndDate.getFullYear() - 1,
      baseEndDate.getMonth(),
      baseEndDate.getDate(),
      baseEndDate.getHours(),
      baseEndDate.getMinutes(),
      baseEndDate.getSeconds(),
      baseEndDate.getMilliseconds()
    );

    // Fetch all data in parallel using Promise.all
    const skusCountResultCombined: any = await this.getSkusPerStoreOptimized(
      manufacturerId,
      categoryId,
      currentYearStartDate,
      currentYearEndDate,
      managerId,
      warehouseIds,
      distributorIds,
      lastYearStartDate,
      lastYearEndDate
    );

    const { currentYear, lastYear } = skusCountResultCombined;

    // Track data merging operations
    const mergeSegment = newrelic.startSegment(
      "mergeSKUsDataOptimized",
      false,
      async () => {
        // Track SKU counts merging
        const skuMergeSegment = newrelic.startSegment(
          "mergeSKUCountsOptimized",
          false,
          () => {
            const skuMap = new Map<number, MergedSkuCount>(
              currentYear.skuCounts.map((item: any) => [
                (item as SkuCountCurrentYear).skuCount,
                { ...(item as SkuCountCurrentYear) }
              ])
            );

            lastYear.skuCounts.forEach((item: any) => {
              const { skuCountLastYear, storeCountLastYear } =
                item as SkuCountLastYear;
              if (skuMap.has(skuCountLastYear)) {
                skuMap.get(skuCountLastYear)!.storeCountLastYear =
                  storeCountLastYear;
              } else if (skuCountLastYear) {
                skuMap.set(skuCountLastYear, {
                  skuCount: skuCountLastYear,
                  storeCountLastYear: storeCountLastYear
                });
              }
            });

            return Array.from(skuMap.values()).sort(
              (a, b) => a.skuCount - b.skuCount
            );
          }
        );

        const mergedSkuCounts = await skuMergeSegment;

        // Track final data preparation
        const finalPrepSegment = newrelic.startSegment(
          "prepareFinalDataOptimized",
          false,
          () => {
            const currentYearSkuCounts = currentYear.skuCounts.map(
              (item: { skuCount: any }) => {
                return item.skuCount;
              }
            );
            const lastYearSkuCounts = lastYear.skuCounts.map(
              (item: { skuCountLastYear: any }) => {
                return item.skuCountLastYear;
              }
            );
            return {
              currentYearSkuCounts: currentYearSkuCounts,
              lastYearSkuCounts: lastYearSkuCounts,
              skuCounts: mergedSkuCounts
            };
          }
        );
        return await finalPrepSegment;
      }
    );
    return await mergeSegment;
  }

  /**
   * Retrieves products associated with a specific program.
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve products.
   * @param {number} [programId] - The ID of the program for which to retrieve products.
   * @returns {Promise<any>} - A promise that resolves with the products.
   */
  public async getCategoriesProducts(
    manufacturerId: number,
    programId?: number
  ): Promise<any> {
    return await ProductsRepository.getCategoriesProducts(
      manufacturerId,
      programId
    );
  }

  public async getManagerDistributors(
    manufacturerId: number,
    managerId: number
  ): Promise<any> {
    const assignedDistributors =
      await ManufacturerRepository.getManagerDistributors(
        managerId,
        manufacturerId
      );
    const unassignedDistributors =
      await ManufacturerRepository.getManagerDistributors(
        managerId,
        manufacturerId,
        false
      );

    return {
      distributors: {
        assigned: assignedDistributors,
        unassigned: unassignedDistributors
      }
    };
  }

  public async updateManagerDistributorRelation(
    manufacturerId: number,
    managerId: number,
    distributorId: number
  ): Promise<any> {
    return await ManufacturerRepository.updateManagerDistributorRelation(
      manufacturerId,
      managerId,
      distributorId
    );
  }

  /**
   * Transforms grouped data from repository methods to chart data format
   * Handles product-specific keys when selectedProductIds are provided
   */
  private transformGroupedDataForChart(
    groupedData: any[],
    monthRange: string,
    selectedProductIds?: number[],
    productColorMap?: any
  ) {
    const hasProductIds = !!selectedProductIds?.length;

    if (hasProductIds) {
      if (String(monthRange) === "1") {
        // For 1 month range, group data by week and create product-specific keys
        const groupedByWeek = groupedData.reduce((acc, item) => {
          const weekKey = item.week_start;
          if (!acc[weekKey]) {
            acc[weekKey] = {
              date: weekKey,
              week_start: item.week_start
            };
          }

          // Add product-specific data
          acc[weekKey][`sales_${item.product_id}`] =
            parseFloat(item.total_sales) || 0;
          acc[weekKey][`units_${item.product_id}`] =
            parseFloat(item.total_units) || 0;
          acc[weekKey][`color_${item.product_id}`] =
            productColorMap?.[item.product_id] || "";

          return acc;
        }, {});

        // Convert to array and format dates
        return Object.values(groupedByWeek).map((item: any) => {
          let dateLabel: string;

          // For 1 month range, format as "Aug 14-17", "Aug 18-24", etc.
          if (item.week_start) {
            const startDate = new Date(item.week_start);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Add 6 days to get end of week

            const startMonth = startDate.toLocaleDateString("en-US", {
              month: "short"
            });
            const startDay = startDate.getDate();
            const endMonth = endDate.toLocaleDateString("en-US", {
              month: "short"
            });
            const endDay = endDate.getDate();

            if (startMonth === endMonth) {
              dateLabel = `${startMonth} ${startDay}-${endDay}`;
            } else {
              dateLabel = `${startMonth} ${startDay}-${endMonth} ${endDay}`;
            }
          } else {
            dateLabel = "Invalid Date";
          }

          return {
            ...item,
            date: dateLabel
          };
        });
      } else {
        // For month ranges, aggregate weekly data by month and create product-specific keys
        const groupedByMonth = groupedData.reduce((acc, item) => {
          const date = new Date(item.week_start);
          const monthKey = date.toLocaleDateString("en-US", { month: "short" });

          if (!acc[monthKey]) {
            acc[monthKey] = {
              date: monthKey,
              month: monthKey
            };
          }

          // Add product-specific data (aggregate by month)
          const productId = item.product_id;
          if (!acc[monthKey][`sales_${productId}`]) {
            acc[monthKey][`sales_${productId}`] = 0;
            acc[monthKey][`units_${productId}`] = 0;
            acc[monthKey][`color_${productId}`] =
              productColorMap?.[productId] || "";
          }

          acc[monthKey][`sales_${productId}`] +=
            parseFloat(item.total_sales) || 0;
          acc[monthKey][`units_${productId}`] +=
            parseFloat(item.total_units) || 0;

          return acc;
        }, {});

        return Object.values(groupedByMonth);
      }
    } else {
      //else condition
      // When no selectedProductIds, use the original logic
      if (String(monthRange) === "1") {
        // For 1 month range, return weekly data as is
        return groupedData.map((item: any) => {
          let dateLabel: string;
          if (item.week_start) {
            const startDate = new Date(item.week_start);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Add 6 days to get end of week

            const startMonth = startDate.toLocaleDateString("en-US", {
              month: "short"
            });
            const startDay = startDate.getDate();
            const endMonth = endDate.toLocaleDateString("en-US", {
              month: "short"
            });
            const endDay = endDate.getDate();

            if (startMonth === endMonth) {
              dateLabel = `${startMonth} ${startDay}-${endDay}`;
            } else {
              dateLabel = `${startMonth} ${startDay}-${endMonth} ${endDay}`;
            }
          } else {
            dateLabel = "Invalid Date";
          }

          return {
            date: dateLabel,
            sales: parseFloat(item.total_sales) || 0,
            units: parseFloat(item.total_units) || 0
          };
        });
      } else {
        // For month ranges, aggregate weekly data by month
        const groupedByMonth = groupedData.reduce((acc, item) => {
          const date = new Date(item.week_start);
          const monthKey = date.toLocaleDateString("en-US", { month: "short" });

          if (!acc[monthKey]) {
            acc[monthKey] = {
              date: monthKey,
              sales: 0,
              units: 0
            };
          }

          acc[monthKey].sales += parseFloat(item.total_sales) || 0;
          acc[monthKey].units += parseFloat(item.total_units) || 0;

          return acc;
        }, {});

        return Object.values(groupedByMonth);
      }
    }
  }

  /**
   * Transforms store penetration data to chart data format
   * Handles product-specific keys when selectedProductIds are provided
   */
  private transformStorePenetrationDataForChart(
    storePenetrationData: any[],
    monthRange: string,
    totalStoresCount: number,
    selectedProductIds?: number[],
    productColorMap?: any
  ) {
    const hasProductIds = !!selectedProductIds?.length;
    const isDaily = String(monthRange) === "1";

    if (hasProductIds) {
      // When selectedProductIds are provided, group data by month and create product-specific keys
      const groupedByMonth = storePenetrationData.reduce((acc, item) => {
        const monthKey = item.month || item.day;
        if (!acc[monthKey]) {
          acc[monthKey] = {
            date: monthKey,
            month: item.month,
            day: item.day
          };
        }

        // Add product-specific data
        const productId = item.product_id;
        if (productId) {
          const value =
            totalStoresCount > 0
              ? (item.cumulative_buyers / totalStoresCount) * 100
              : 0;

          acc[monthKey][`value_${productId}`] = value;
          acc[monthKey][`storesCount_value_${productId}`] = parseInt(
            item.cumulative_buyers
          );
          acc[monthKey][`color_${productId}`] =
            productColorMap?.[productId] || "";
        }

        return acc;
      }, {});

      // Convert to array and format dates
      return Object.values(groupedByMonth).map((item: any) => {
        let dateLabel: string;
        const dateField = isDaily ? item.day : item.month;

        if (String(monthRange) === "1") {
          // For 1 month range, format as "Aug 14", "Aug 15", etc.
          const date = new Date(dateField);
          const month = date.toLocaleDateString("en-US", { month: "short" });
          const day = date.getDate();
          dateLabel = `${month} ${day}`;
        } else {
          // For month ranges, format as "Jan", "Feb", etc.
          const date = new Date(dateField);
          dateLabel = date.toLocaleDateString("en-US", { month: "short" });
        }

        return {
          ...item,
          date: dateLabel
        };
      });
    } else {
      // When no selectedProductIds, use the original logic
      return storePenetrationData.map((item: any) => {
        let dateLabel: string;
        const dateField = isDaily ? item.day : item.month;

        if (String(monthRange) === "1") {
          // For 1 month range, format as "Aug 14", "Aug 15", etc.
          const date = new Date(dateField);
          const month = date.toLocaleDateString("en-US", { month: "short" });
          const day = date.getDate();
          dateLabel = `${month} ${day}`;
        } else {
          // For month ranges, format as "Jan", "Feb", etc.
          const date = new Date(dateField);
          dateLabel = date.toLocaleDateString("en-US", { month: "short" });
        }

        // Calculate percentage value (cumulative_buyers / totalStoresCount * 100)
        const value =
          totalStoresCount > 0
            ? (item.cumulative_buyers / totalStoresCount) * 100
            : 0;

        return {
          date: dateLabel,
          storesCount: parseInt(item.cumulative_buyers),
          value: value
        };
      });
    }
  }

  /**
   * Retrieves ROI metrics for a manufacturer program.
   * Optionally filters by distributor ID.
   * When no distributor is selected, only returns ROI data for authorized distributors.
   * Calculates derived metrics like sales/cost ratio, incremental sales lift, and percentage metrics.
   * @param {number} programId - The ID of the program.
   * @param {number} [distributorId] - Optional distributor ID to filter results.
   * @returns {Promise<any[]>} - Array of ROI data with calculated metrics.
   */
  public async getROI(
    programId: number,
    distributorId?: number
  ): Promise<any[]> {
    // Get the program to retrieve manufacturerId
    const program = await Program.findByPk(programId, {
      attributes: ["manufacturerId"]
    });

    if (!program) {
      return [];
    }

    const manufacturerId = program.manufacturerId;

    // Get authorized distributor IDs for this manufacturer
    const authorizedDistributorIds =
      await ManufacturerRepository.getActiveAuthorizedDistributorIds(
        manufacturerId
      );

    const whereClause: any = { programId };

    if (distributorId) {
      // Validate that the requested distributor is authorized
      if (!authorizedDistributorIds.includes(distributorId)) {
        // Return empty array if distributor is not authorized
        return [];
      }
      whereClause.distributorId = distributorId;
    } else {
      // When no distributor is selected, only return:
      // 1. Aggregate records (distributorId IS NULL)
      // 2. Records for authorized distributors
      if (authorizedDistributorIds.length > 0) {
        whereClause.distributorId = {
          [Op.or]: [{ [Op.is]: null }, { [Op.in]: authorizedDistributorIds }]
        };
      } else {
        // If no authorized distributors, only return aggregate records (NULL)
        whereClause.distributorId = { [Op.is]: null };
      }
    }

    const roiData = await ManufacturerProgramROI.findAll({
      where: whereClause,
      order: [["rebateType", "ASC"]]
    });

    // Transform the data to include calculated metrics
    return roiData.map((record: any) => {
      const data = record.toJSON();

      // Calculate sales to cost ratio
      const salesToCostRatio =
        data.costOfProgram && parseFloat(data.costOfProgram) > 0
          ? parseFloat(data.currentYearProgramProductSales || 0) /
            parseFloat(data.costOfProgram)
          : null;

      // Calculate incremental sales lift percentage
      const previousYearSales = parseFloat(
        data.previousYearProgramProductSales || 0
      );
      const currentYearSales = parseFloat(
        data.currentYearProgramProductSales || 0
      );

      let incrementalSalesLift: number;
      if (previousYearSales > 0) {
        // Normal calculation: (current - previous) / previous * 100
        incrementalSalesLift =
          ((currentYearSales - previousYearSales) / previousYearSales) * 100;
      } else if (previousYearSales === 0 && currentYearSales > 0) {
        // If previous year is zero but current year has sales, return 100%
        incrementalSalesLift = 100;
      } else {
        // Both are zero or previous is missing, return 0%
        incrementalSalesLift = 0;
      }

      // Calculate new doors percentage
      const lastYearsDoorsCount = parseFloat(data.lastYearsDoorsCount || 0);
      const newDoorsCount = parseFloat(data.newDoorsCount || 0);
      let newDoorsPercentage: number;
      if (lastYearsDoorsCount > 0) {
        // Normal calculation: (new doors / last year doors) * 100
        newDoorsPercentage = (newDoorsCount / lastYearsDoorsCount) * 100;
      } else if (lastYearsDoorsCount === 0 && newDoorsCount > 0) {
        // If last year is zero but this year has new doors, return 100%
        newDoorsPercentage = 100;
      } else {
        // Both are zero or last year is missing, return 0%
        newDoorsPercentage = 0;
      }

      // Calculate new POD percentage
      const newPodPercentage =
        data.totalPodCount > 0
          ? (data.newPodCount / data.totalPodCount) * 100
          : 0;

      return {
        ...data,
        salesToCostRatio:
          salesToCostRatio !== null
            ? parseFloat(salesToCostRatio.toFixed(2))
            : null,
        incrementalSalesLift: parseFloat(incrementalSalesLift.toFixed(2)),
        newDoorsPercentage: parseFloat(newDoorsPercentage.toFixed(2)),
        newPodPercentage: parseFloat(newPodPercentage.toFixed(2))
      };
    });
  }
}

export default new ManufacturerDashboardService();
