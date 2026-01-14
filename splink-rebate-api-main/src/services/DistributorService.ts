import { writeToString } from "@fast-csv/format";
import newrelic from "newrelic";
import {
  CACHE_TTL_TIME,
  CHAIN_PROGRAMS_ENABLED,
  ENTITY_TYPE,
  PRODUCTS_INSIGHT_MAX_PRODUCTS,
  REPORT_TYPE,
  SALES_REP,
  useApiCaching
} from "../config/appConstants";
import { USER_ROLES } from "../config/roles";
import logger from "../lib/logger";
import Store from "../models/Store";
import UserRole from "../models/UserRole";
import Warehouse from "../models/Warehouse";
import ComplianceRepository from "../repositories/ComplianceRepository";
import DistributorRepository, {
  ProgramSummaryCSVData,
  SalesRepEarningsCSVData
} from "../repositories/DistributorRepository";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import SalesRepRepository from "../repositories/SalesRepRepository";
import StoreRepository from "../repositories/StoreRepository";
import UserRepository from "../repositories/UserRepository";
import ProgramService from "./ProgramService";
import {
  AggregatedResults,
  BulkEnrollmentParams,
  BulkEnrollmentResult,
  StoreEnrollmentResult
} from "../types/DistributorTypes";
import {
  KeyMetrics,
  ManufacturerProductInsights
} from "../types/KeyMetricsTypes";
import { DistSalesRepEarningsResponse } from "../types/SalesRepTypes";
import {
  MySalesResponse,
  SalesResponseWithCategories
} from "../types/SalesTypes";
import {
  ManufacturerStoreSavings,
  StoreProgramOverviewData
} from "../types/StoreProgramTypes";
import { executeWithIncreasedWorkMem } from "../utils/databaseOptimization";
import {
  calculateMetrics,
  calculateRelativeShare,
  filterResultsByProducts,
  getTopProducts,
  isDistributorFeatureEnabled,
  mapProductColors,
  sortByMonth
} from "../utils/helpers";
import { redisClient } from "../utils/redis";
import { getCurrentUser } from "../utils/requestContext";
import {
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "../utils/roles";
import {
  getStartDate,
  getStorePenetrationChartData,
  processSalesData
} from "../utils/salesUtils";

// In-memory cache to prevent multiple database calls during the same request
const requestCache = new Map<string, any>();

// Interface for store enrollment operations
interface StoreForEnrollment {
  storeId: number;
  warehouseId: number | null;
  name: string;
}

class DistributorDashboardService {
  /**
   * Retrieves the key metrics for a distributor.
   * The key metrics include:
   * - Total Savings
   * - Total Purchase Volume
   * - Stores Count
   * - Manufacturers Count
   * @param {number} distributorId The ID of the distributor
   * @returns {Promise<KeyMetrics>} The key metrics data including total savings, total purchase volume,
   * stores count, and manufacturers count
   */
  public async getKeyMetrics(
    distributorId: number,
    managerId?: number,
    isGeneralManager?: boolean,
    warehouseId?: number
  ): Promise<KeyMetrics> {
    return newrelic.startSegment(
      "DistributorService.getKeyMetrics",
      true,
      async () => {
        try {
          const startTime = process.hrtime();

          // Add custom attributes for context
          newrelic.addCustomAttribute("distributorId", distributorId);
          newrelic.addCustomAttribute("managerId", managerId || 0);
          newrelic.addCustomAttribute(
            "isGeneralManager",
            isGeneralManager || false
          );
          newrelic.addCustomAttribute("warehouseId", warehouseId || 0);
          // Step 1: Get warehouse IDs
          const warehouseIds = await newrelic.startSegment(
            "getKeyMetrics.getWarehouseIds",
            true,
            () =>
              DistributorRepository.getWarehouseIds(
                distributorId,
                managerId,
                isGeneralManager,
                warehouseId
              )
          );

          const user = getCurrentUser();
          const isMultiRole = user?.isMultiRole;

          const isSalesRepManager = isDistributorSalesRepManager(user?.role);
          const chainProgramsEnabled = isDistributorFeatureEnabled(
            distributorId,
            CHAIN_PROGRAMS_ENABLED
          );

          // Track user context
          newrelic.addCustomAttribute("userRole", user?.role || "unknown");
          newrelic.addCustomAttribute("isSalesRepManager", isSalesRepManager);
          newrelic.addCustomAttribute(
            "chainProgramsEnabled",
            chainProgramsEnabled
          );

          const [
            // rebateResponse,
            distributorStores,
            purchaseResponse,
            relevantPurchaseResponse,
            storesCount,
            authorizedManufacturers,
            // activeStoresCount,
            activeStoresProgramsEnrolled
          ] = await newrelic.startSegment(
            "getKeyMetrics.fetchInitialData",
            true,
            () =>
              Promise.all([
                // DistributorRepository.getTotalEarnedRebate(
                //   distributorId,
                //   ENTITY_TYPE.DISTRIBUTOR
                // ),

                warehouseId
                  ? []
                  : isSalesRepManager
                    ? StoreRepository.getStoresBySalesRepManagerId({
                        salesRepManagerId: user?.associatedUserId
                      })
                    : StoreRepository.getStoreIdsByDistributorId(
                        distributorId,
                        chainProgramsEnabled
                      ),
                DistributorRepository.getTotalPurchaseVolume(
                  distributorId,
                  ENTITY_TYPE.DISTRIBUTOR
                ),
                DistributorRepository.getTotalPurchaseVolume(
                  distributorId,
                  ENTITY_TYPE.DISTRIBUTOR,
                  true,
                  warehouseIds
                ),
                (isSalesRepManager
                  ? StoreRepository.getStoresBySalesRepManagerId({
                      salesRepManagerId: user?.associatedUserId,
                      getCountOnly: true
                    })
                  : DistributorRepository.countStoresForDistributor(
                      distributorId,
                      warehouseIds
                    )) as any,
                ManufacturerRepository.getAuthorizedManufacturers(
                  distributorId
                ),
                // DistributorRepository.countActiveStoresForDistributor(distributorId),
                DistributorRepository.countStoresProgramsEnrolled(
                  distributorId,
                  warehouseIds
                )
              ])
          );

          // const totalSavings = rebateResponse as number;
          // Step 3: Process store IDs
          // TODO: No longer needed as we use distributor_program_aggregations
          // const storeIds = await newrelic.startSegment(
          //   "getKeyMetrics.processStoreIds",
          //   true,
          //   () =>
          //     warehouseId
          //       ? StoreRepository.getStoreIdsByWarehouseIds(warehouseIds)
          //       : Promise.resolve(
          //           distributorStores.map((store: any) =>
          //             isSalesRepManager ? store.storeId : store.associatedUserId
          //           )
          //         )
          // );

          const authorizedManufacturerIdsForPrograms =
            authorizedManufacturers?.map((am) => Number(am.manufacturerId));

          const authorizedPrograms = await newrelic.startSegment(
            "getKeyMetrics.getAuthorizedPrograms",
            true,
            () =>
              ProgramRepository.getProgramsByManufacturerIds({
                manufacturerIds: authorizedManufacturerIdsForPrograms || [],
                distributorId
              })
          );

          let totalSavings: number;

          if (isSalesRepManager) {
            // Validate that associatedUserId exists for sales rep manager
            if (!user?.associatedUserId) {
              throw new Error(
                "Associated user ID is required for sales rep manager role"
              );
            }

            // For sales rep managers, calculate earnings through the manager relationship chain
            totalSavings = await newrelic.startSegment(
              "getKeyMetrics.getSalesRepManagerTotalEarnings",
              true,
              () =>
                DistributorRepository.getSalesRepManagerTotalEarnings({
                  salesRepManagerId: user.associatedUserId,
                  authorizedProgramIds: authorizedPrograms,
                  warehouseIds,
                  authorizedManufacturerIds:
                    authorizedManufacturerIdsForPrograms
                })
            );
          } else {
            // For other roles, use the existing compliance aggregates method
            const complianceAggregates = await newrelic.startSegment(
              "getKeyMetrics.getComplianceAggregates",
              true,
              () =>
                ComplianceRepository.getComplianceAggregates({
                  distributorId,
                  programIds: authorizedPrograms,
                  warehouseIds
                })
            );
            totalSavings = complianceAggregates.totalSavings;
          }

          const totalPurchaseVolume = purchaseResponse as number;
          const relevantPurchaseVolume = relevantPurchaseResponse as number;

          const manufacturersCount = authorizedManufacturers?.length;
          const authorizedManufacturerIds = authorizedManufacturers?.map((am) =>
            Number(am.manufacturerId)
          );

          // Step 8: Get enrolled store count
          const enrolledStoreCount = await newrelic.startSegment(
            "getKeyMetrics.getEnrolledStoreCount",
            true,
            () =>
              DistributorRepository.getDistinctEnrolledStoresCountForDistributor(
                distributorId,
                authorizedManufacturerIds,
                warehouseIds
              )
          );

          // Step 9: Calculate total sales rep earnings under the distributor
          const salesRepEarningsData = await newrelic.startSegment(
            "getKeyMetrics.getSalesRepEarningsData",
            true,
            () =>
              DistributorRepository.getSalesRepEarningsData({
                distributorId,
                selectedWarehouseId: warehouseId
              })
          );

          const salesRepTotalEarnings = salesRepEarningsData.reduce(
            (total: number, rep: any) => total + (rep.totalEarnedRebate || 0),
            0
          );

          let myEarnings = 0;
          if (isMultiRole && isSalesRepManager) {
            // ===========
            const userMultiRoles = await UserRepository.getUserCombinedRoles({
              userId: user?.id ?? 0,
              getShortEntityType: false,
              getLongEntityType: true
            });

            myEarnings = await DistributorRepository.getSalesRepManagerEarnings(
              {
                entityId: user?.associatedUserId,
                entityType: userMultiRoles,
                distributorId,
                authorizedManufacturerIds: authorizedManufacturerIdsForPrograms
              }
            );
          }

          // Hardcode sales rep manager total earnings to 0 for now
          const salesRepManagerTotalEarnings = isMultiRole ? myEarnings : 0;

          // Add custom attributes for metrics
          newrelic.addCustomAttribute("totalSavings", totalSavings);
          newrelic.addCustomAttribute(
            "totalPurchaseVolume",
            totalPurchaseVolume
          );
          newrelic.addCustomAttribute(
            "relevantPurchaseVolume",
            relevantPurchaseVolume
          );
          newrelic.addCustomAttribute("storesCount", storesCount as number);
          newrelic.addCustomAttribute(
            "manufacturersCount",
            manufacturersCount || 0
          );
          newrelic.addCustomAttribute("enrolledStoreCount", enrolledStoreCount);
          newrelic.addCustomAttribute(
            "activeStoresProgramsEnrolled",
            activeStoresProgramsEnrolled
          );
          newrelic.addCustomAttribute(
            "salesRepTotalEarnings",
            salesRepTotalEarnings
          );
          newrelic.addCustomAttribute(
            "salesRepManagerTotalEarnings",
            salesRepManagerTotalEarnings
          );

          const result = {
            totalSavings,
            totalPurchaseVolume,
            relevantPurchaseVolume,
            storesCount,
            activeStoresCount: 0,
            manufacturersCount,
            enrolledStoreCount,
            activeStoresProgramsEnrolled,
            salesRepTotalEarnings,
            salesRepManagerTotalEarnings
          };

          // Track execution time
          const [s, ns] = process.hrtime(startTime);
          newrelic.addCustomAttribute(
            "getKeyMetrics.duration_ms",
            s * 1000 + ns / 1000000
          );

          return result;
        } catch (error: unknown) {
          if (error instanceof Error) {
            newrelic.addCustomAttribute(
              "getKeyMetrics.error_distributorId",
              distributorId
            );
            newrelic.addCustomAttribute(
              "getKeyMetrics.error_managerId",
              managerId || 0
            );
            newrelic.addCustomAttribute(
              "getKeyMetrics.error_isGeneralManager",
              isGeneralManager || false
            );
            newrelic.addCustomAttribute(
              "getKeyMetrics.error_warehouseId",
              warehouseId || 0
            );
            newrelic.noticeError(error);
          }
          throw error;
        }
      }
    );
  }

  /**
   * Retrieves the top and bottom performing programs for a distributor.
   * The method returns an object with two properties: topPerformingPrograms and bottomPerformingPrograms.
   * The topPerformingPrograms property contains an array of objects with the
   * manufacturerId, manufacturerName, and total_savings.
   * The bottomPerformingPrograms property contains an array of objects with the
   * manufacturerId, manufacturerName, and total_savings.
   * If no programs are found, the method returns an object with empty arrays for both properties.
   * @param {number} distributorId The ID of the distributor
   * @param {number | undefined} salesRepId - The ID of the sales representative to filter the results
   * @returns {Promise<StoreProgramOverviewData>} The store program overview data
   */
  public async getStoreProgramOverview(
    distributorId: number,
    salesRepId?: number
  ): Promise<StoreProgramOverviewData> {
    const salesRepIds = salesRepId
      ? [salesRepId]
      : await DistributorRepository.getSalesRepIdsByDistributor([
          distributorId
        ]);

    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturers(distributorId);
    const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );
    const manufacturerStoreSavings: any[] =
      await DistributorRepository.getStoreProgramOverviewData(
        salesRepIds,
        "DESC",
        authorizedManufacturerIds
      );

    let lowestRatio = 0;
    let highestRatio = 0;
    let counter = 0;
    let ratiosSum = 0;
    let averageRatio = 0;

    for (const manufacturerStoreSaving of manufacturerStoreSavings) {
      counter++;
      const ratio =
        manufacturerStoreSaving.totalSavings /
        manufacturerStoreSaving.salesVolume;

      manufacturerStoreSaving.ratio = ratio;

      ratiosSum += ratio;

      if (lowestRatio == 0 || ratio < lowestRatio) {
        lowestRatio = ratio;
      }

      if (highestRatio == 0 || ratio > highestRatio) {
        highestRatio = ratio;
      }
    }

    averageRatio = ratiosSum / counter;

    const topThreshold = averageRatio + (highestRatio - averageRatio) / 2;
    const bottomThreshold = averageRatio - (averageRatio - lowestRatio) / 2;

    const topPerformingPrograms: ManufacturerStoreSavings[] = [];
    const bottomPerformingPrograms: ManufacturerStoreSavings[] = [];

    for (const manufacturerStoreSaving of manufacturerStoreSavings) {
      if (manufacturerStoreSaving.ratio > topThreshold) {
        topPerformingPrograms.push(
          manufacturerStoreSaving as unknown as ManufacturerStoreSavings
        );
      }

      if (manufacturerStoreSaving.ratio < bottomThreshold) {
        bottomPerformingPrograms.push(
          manufacturerStoreSaving as unknown as ManufacturerStoreSavings
        );
      }
    }

    if (
      topPerformingPrograms.length > 0 ||
      bottomPerformingPrograms.length > 0
    ) {
      const storeProgramOverviewData: StoreProgramOverviewData = {
        topPerformingPrograms: [],
        bottomPerformingPrograms: []
      };

      if (topPerformingPrograms.length > 0) {
        storeProgramOverviewData.topPerformingPrograms =
          topPerformingPrograms as unknown as ManufacturerStoreSavings[];
      } else {
        storeProgramOverviewData.topPerformingPrograms = [];
      }
      if (bottomPerformingPrograms.length > 0) {
        storeProgramOverviewData.bottomPerformingPrograms =
          bottomPerformingPrograms as unknown as ManufacturerStoreSavings[];
      } else {
        storeProgramOverviewData.bottomPerformingPrograms = [];
      }
      return storeProgramOverviewData;
    }

    return {
      topPerformingPrograms: [],
      bottomPerformingPrograms: []
    };
  }

  /**
   * Retrieves the earnings for sales representatives associated with a distributor.
   *
   * This function fetches data regarding sales representatives who are qualified
   * for rebates and calculates their total earnings. The data includes the total
   * number of sales representatives, their individual earned rebates, and the
   * aggregated total earnings.
   *
   * @param {number} parentEntityId - The ID of the parent entity (distributor).
   * @param {number} [selectedWarehouseId] - Optional warehouse ID to filter data.
   * @param {string} [sortBy] - Column to sort by ('name', 'stores', 'earnings').
   * @param {string} [sortOrder] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<DistSalesRepEarningsResponse>} - A promise that resolves to an
   * object containing the total number of sales representatives, the total earnings,
   * and individual sales representative earnings data.
   * @throws Will throw an error if unable to fetch sales representative data.
   */
  public async getSalesRepEarnings({
    parentEntityId,
    selectedWarehouseId,
    sortBy = "storesName",
    sortOrder = "ASC",
    programTimeline = "Current"
  }: {
    parentEntityId: number;
    selectedWarehouseId?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    programTimeline?: string;
  }): Promise<DistSalesRepEarningsResponse> {
    const salesRepsData = await DistributorRepository.getSalesRepEarningsData({
      distributorId: parentEntityId,
      selectedWarehouseId,
      sortBy,
      sortOrder,
      programTimeline
    });

    // Calculate total earnings
    const totalEarnings = salesRepsData?.reduce((acc, rep) => {
      return acc + parseFloat(String(rep.totalEarnedRebate || 0));
    }, 0);

    // Structure the response (data already sorted by database)
    const response: DistSalesRepEarningsResponse = {
      totalSalesReps: salesRepsData?.length || 0,
      totalEarnings: totalEarnings?.toFixed(2), // Format to 2 decimal places
      salesRepData: salesRepsData
    };

    return response;
  }

  /**
   * Retrieves sales data for a distributor.
   * @param {number} distributorId The distributor ID
   * @returns {Promise<MySalesResponse>} The sales data for the distributor,
   *     including daily sales for the current month, monthly sales for the
   *     previous 3, 6, and 12 months, and the total sales for each period
   */
  public async getSales(
    distributorId: number,
    categoryId: number,
    returnTotalSales: boolean = false,
    monthRange: string = "1",
    managerId?: number,
    isGeneralManager?: boolean,
    selectedWarehouseId?: number
  ): Promise<SalesResponseWithCategories> {
    const warehouseIds = await DistributorRepository.getWarehouseIds(
      distributorId,
      managerId,
      isGeneralManager,
      selectedWarehouseId
    );
    const categories = await ManufacturerRepository.getCategories(true);

    const yearStartDate = new Date(new Date().getFullYear(), 0, 1);

    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturers(distributorId);
    const authorizedManufacturerIds = authorizedManufacturers.map((am: any) =>
      Number(am.manufacturerId)
    );

    const latestTransactionDate =
      await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
        [distributorId],
        authorizedManufacturerIds
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

    let productIds: number[] | undefined = undefined;

    if (categoryId) {
      productIds =
        await StoreRepository.getProductIdsByManufacturerIdAndCategoryId(
          authorizedManufacturerIds,
          categoryId
        );
    }

    // Execute with increased work_mem for better performance on large aggregations
    const results = await executeWithIncreasedWorkMem(
      () =>
        DistributorRepository.getProductInsights(
          distributorId,
          startDate,
          endDate,
          authorizedManufacturerIds,
          undefined,
          productIds,
          warehouseIds
        ),
      "64MB" // Increase work_mem for complex sales summary queries
    );

    const filteredResults = filterResultsByProducts(results, undefined);

    // Grouping data by transaction_date and filtering product IDs
    const groupedData = processSalesData(
      filteredResults,
      monthRange,
      startDate,
      endDate,
      undefined,
      undefined
    );

    // Convert grouped data into an array
    const groupedArray = Object.values(groupedData);

    const filteredMetrics = calculateMetrics(filteredResults);

    return {
      result: {
        [monthRange]: {
          totalSale: filteredMetrics.totalSales,
          barChartData: groupedArray
        }
      },
      categories,
      latestTransactionDate: latestTransactionDate
    };
  }

  /**
   * Retrieves the programs enrollment details for a sales representative.
   * The enrollment details include the manufacturer information and the number of stores participating in the programs.
   * @param {number} salesRepId - The ID of the sales representative.
   * @param {number} distributorId - The ID of the distributor.
   * @returns {Promise<any>} - A promise that resolves with the programs enrollment details.
   */
  public async getProgramsEnrollment({
    salesRepId,
    distributorId,
    loggedInUser,
    selectedWarehouseId,
    excludeChainStores,
    programTimeline
  }: {
    salesRepId: number;
    distributorId: number;
    loggedInUser: UserRole;
    selectedWarehouseId?: number;
    excludeChainStores?: boolean;
    programTimeline?: string;
  }) {
    return newrelic.startSegment(
      "DistributorService.getProgramsEnrollment",
      true,
      async () => {
        try {
          const startTime = process.hrtime();

          // Add custom attributes for context
          newrelic.addCustomAttribute("distributorId", distributorId);
          newrelic.addCustomAttribute("salesRepId", salesRepId);
          newrelic.addCustomAttribute("userRole", loggedInUser.role);
          newrelic.addCustomAttribute(
            "selectedWarehouseId",
            selectedWarehouseId || 0
          );
          newrelic.addCustomAttribute(
            "excludeChainStores",
            excludeChainStores || false
          );

          // Retrieve the list of authorized manufacturers for the distributor
          // hide specific manufacturers programs for sales rep of sandstroms
          const authorizedManufacturers =
            await ManufacturerRepository.getAuthorizedManufacturersIds(
              distributorId,
              loggedInUser.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP &&
                loggedInUser.parentEntityId == 1
                ? SALES_REP.HIDE_MANUFACTURER_PROGRAMS
                : []
            );
          const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
            Number(am.manufacturerId)
          );

          const excludedProgramIds =
            await ProgramRepository.getExcludedProgramIds(distributorId);

          const storeIdsToExclude =
            await ProgramRepository.findStoreIdsWithAllProgramsIneligibleManufacturers(
              authorizedManufacturerIds,
              undefined,
              undefined,
              distributorId,
              excludedProgramIds
            );

          // Retrieve the list of store IDs associated with the manufacurers from line_items for selected warehouse
          const storeIdsByManufacturers = selectedWarehouseId
            ? await StoreRepository.getStoreIdsWithMaufacturerIdByWarehouseIds(
                [selectedWarehouseId],
                authorizedManufacturerIds
              )
            : [];

          const storeManufacturerPairs = selectedWarehouseId
            ? storeIdsByManufacturers.flatMap((item) =>
                item.store_ids.map((store_id) => ({
                  manufacturer_id: item.manufacturer_id,
                  store_id
                }))
              )
            : undefined;

          let totalStoresIds: number[] = [];
          const isSalesRepManager = isDistributorSalesRepManager(
            loggedInUser.role
          );

          if (selectedWarehouseId) {
            // When warehouse is selected, fetch stores based on role and filter by warehouse
            if (salesRepId !== 0) {
              // Sales rep: get stores for this sales rep and filter by warehouse
              const allSalesRepStores =
                await SalesRepRepository.getStoresBySalesRepId(
                  salesRepId,
                  excludeChainStores
                );
              // Filter by warehouse
              const storesInWarehouse =
                await StoreRepository.getStoreIdsByWarehouseIds([
                  selectedWarehouseId
                ]);
              totalStoresIds = allSalesRepStores.filter((storeId: number) =>
                storesInWarehouse.includes(storeId)
              );
            } else if (isSalesRepManager) {
              // Sales rep manager: get stores for this manager filtered by warehouse
              const stores = await StoreRepository.getStoresBySalesRepManagerId(
                {
                  salesRepManagerId: loggedInUser.associatedUserId,
                  warehouseId: selectedWarehouseId
                }
              );
              totalStoresIds = stores.map(
                (store: any) => store.storeId || store.id
              );
            } else if (isDistributorGeneralManager(loggedInUser.role)) {
              // General manager: get stores for this manager and filter by warehouse
              const allGeneralManagerStores =
                await StoreRepository.getStoreIdsByGeneralManager({
                  generalManagerUserId: loggedInUser.associatedUserId,
                  excludeChainStores: excludeChainStores || false
                });
              totalStoresIds = allGeneralManagerStores;
            } else {
              // Distributor admin/executive: get all stores in warehouse
              totalStoresIds = Array.from(
                new Set(
                  await StoreRepository.getStoreIdsByWarehouseIds([
                    selectedWarehouseId
                  ])
                )
              );
            }
          } else {
            // No warehouse selected: fetch stores based on role only
            if (salesRepId === 0) {
              if (isSalesRepManager) {
                const stores =
                  await StoreRepository.getStoresBySalesRepManagerId({
                    salesRepManagerId: loggedInUser.associatedUserId
                  });
                totalStoresIds = stores.map(
                  (store: any) => store.storeId || store.id
                );
              } else if (isDistributorGeneralManager(loggedInUser.role)) {
                totalStoresIds =
                  await StoreRepository.getStoreIdsByGeneralManager({
                    generalManagerUserId: loggedInUser.associatedUserId,
                    excludeChainStores: excludeChainStores || false
                  });
              } else {
                const stores = await StoreRepository.getStoreIdsByDistributorId(
                  distributorId,
                  excludeChainStores // exclude chain stores if excludeChainStores is true
                );
                totalStoresIds = stores.map(
                  (store: any) => store.associatedUserId
                );
              }
            } else {
              const stores = await SalesRepRepository.getStoresBySalesRepId(
                salesRepId,
                excludeChainStores
              );
              totalStoresIds = stores;
            }
          }

          totalStoresIds = totalStoresIds?.filter(
            (storeId: number) => !storeIdsToExclude.includes(storeId)
          );

          // Retrieve the programs with participants for the stores and authorized manufacturers
          const programs =
            await DistributorRepository.getStoreProgramsWithParticipantsOptimized(
              {
                totalStoresIds,
                authorizedManufacturerIds,
                excludedProgramIds,
                storeManufacturerPairs,
                distributorId,
                userRole: loggedInUser.role,
                excludeChainStores: excludeChainStores || false,
                selectedWarehouseId,
                programTimeline
              }
            );

          // Add metrics as custom attributes
          newrelic.addCustomAttribute(
            "authorizedManufacturersCount",
            authorizedManufacturerIds.length
          );
          newrelic.addCustomAttribute(
            "totalStoresCount",
            totalStoresIds.length
          );
          newrelic.addCustomAttribute("programsCount", programs.length);

          // Track execution time
          const [s, ns] = process.hrtime(startTime);
          newrelic.addCustomAttribute(
            "getProgramsEnrollment.duration_ms",
            s * 1000 + ns / 1000000
          );

          // return programs result with warehouse specific stores count for selected warehouse
          if (programs.length) {
            return programs.map((program: any) => ({
              ...program,
              WarehouseStoresCount: selectedWarehouseId
                ? storeIdsByManufacturers?.find(
                    (item: any) =>
                      item.manufacturer_id == program.ManufacturerId
                  )?.store_ids?.length || 0
                : 0,
              // Use TotalStores from aggregations query if available, otherwise fallback to totalStoresIds length
              totalStoresCount: program.TotalStores ?? totalStoresIds?.length
            }));
          }

          return programs;
        } catch (error: unknown) {
          if (error instanceof Error) {
            newrelic.addCustomAttribute(
              "getProgramsEnrollment.error_distributorId",
              distributorId
            );
            newrelic.addCustomAttribute(
              "getProgramsEnrollment.error_salesRepId",
              salesRepId
            );
            newrelic.noticeError(error);
          }
          throw error;
        }
      }
    );
  }

  private generateCacheKey(
    operation: string,
    distributorId: number,
    manufacturerId: number,
    monthRange?: string,
    selectedProductIds?: number[],
    distributorManagerId?: number,
    isGeneralManager?: boolean,
    selectedWarehouseId?: number,
    additionalParams?: Record<string, any>
  ): string {
    // Handle NaN and undefined values properly
    const safeManufacturerId = isNaN(manufacturerId) ? "null" : manufacturerId;
    const safeDistributorId = isNaN(distributorId) ? "null" : distributorId;

    const params = {
      operation,
      distributorId: safeDistributorId,
      manufacturerId: safeManufacturerId,
      monthRange: monthRange || "all",
      selectedProductIds:
        selectedProductIds && selectedProductIds.length > 0
          ? selectedProductIds.sort().join(",")
          : "all",
      distributorManagerId: distributorManagerId || "null",
      isGeneralManager: isGeneralManager || false,
      selectedWarehouseId: selectedWarehouseId || "null",
      ...additionalParams
    };

    const cacheKey = Object.entries(params)
      .map(([key, value]) => `${key}_${value}`)
      .join("_");

    console.log(`[CACHE] Generated cache key: ${cacheKey}`);
    return cacheKey;
  }

  private async fetchProductsInsightRawResultsWithCache(
    distributorId: number,
    manufacturerId: number,
    monthRange?: string,
    selectedProductIds?: number[],
    distributorManagerId?: number,
    isGeneralManager?: boolean,
    selectedWarehouseId?: number
  ): Promise<{
    results: any[];
    filteredResults: any[];
    latestTransactionDate: string | null;
    totalStoresCount: number;
    cacheKeyUsed: string;
  }> {
    const yearStartDate = new Date(new Date().getFullYear(), 0, 1);

    // Cache check for raw results
    let results: any[] = [];
    let cacheKeyUsed = "";

    if (useApiCaching) {
      const rawResultsCacheKey = this.generateCacheKey(
        "raw_results",
        distributorId,
        manufacturerId,
        monthRange,
        selectedProductIds,
        distributorManagerId,
        isGeneralManager,
        selectedWarehouseId
      );
      cacheKeyUsed = rawResultsCacheKey;

      // Check in-memory cache first
      if (requestCache.has(rawResultsCacheKey)) {
        console.log(
          `[CACHE] getProductInsights - In-memory cache HIT for raw results with key: ${rawResultsCacheKey}`
        );
        results = requestCache.get(rawResultsCacheKey);
      } else {
        const cachedResults = await redisClient.get(rawResultsCacheKey);

        if (cachedResults) {
          console.log(
            `[CACHE] getProductInsights - Redis cache HIT for raw results with key: ${rawResultsCacheKey}`
          );
          results = JSON.parse(cachedResults);
          // Store in memory cache for this request
          requestCache.set(rawResultsCacheKey, results);
        } else {
          console.log(
            `[CACHE] getProductInsights - Cache MISS for raw results with key: ${rawResultsCacheKey}`
          );
        }
      }
    }

    // If no cached results, fetch from database
    let latestTransactionDate: string | null = null;
    if (!results.length) {
      const authorizedManufacturers = manufacturerId
        ? []
        : await ManufacturerRepository.getAuthorizedManufacturers(
            distributorId
          );

      const authorizedManufacturerIds = authorizedManufacturers.map((am: any) =>
        Number(am.manufacturerId)
      );

      const warehouseIds = await DistributorRepository.getWarehouseIds(
        distributorId,
        distributorManagerId,
        isGeneralManager,
        selectedWarehouseId
      );

      const latestTransactionDateResult =
        await ManufacturerRepository.getLatestTransactionDateByManufacturersAndDistributors(
          [distributorId],
          manufacturerId ? [manufacturerId] : authorizedManufacturerIds
        );
      latestTransactionDate =
        latestTransactionDateResult?.toISOString() || null;

      const endDate = latestTransactionDateResult
        ? new Date(latestTransactionDateResult)
        : new Date();

      const startDate =
        monthRange == "12" ||
        (monthRange != "12" &&
          getStartDate(endDate, monthRange ?? "") < yearStartDate)
          ? yearStartDate
          : getStartDate(endDate, monthRange ?? "");

      // Execute with increased work_mem for better performance on large aggregations
      results = await executeWithIncreasedWorkMem(
        () =>
          DistributorRepository.getProductInsights(
            distributorId,
            startDate,
            endDate,
            authorizedManufacturerIds,
            manufacturerId,
            undefined,
            warehouseIds,
            monthRange == "1"
          ),
        "64MB" // Increase work_mem for complex sales summary queries
      );

      // Cache the raw results
      if (useApiCaching) {
        console.log(
          `[CACHE] getProductInsights - Caching raw results with key: ${cacheKeyUsed}`
        );
        // Store in memory cache for this request
        requestCache.set(cacheKeyUsed, results);
        await redisClient.setEx(
          cacheKeyUsed,
          CACHE_TTL_TIME,
          JSON.stringify(results)
        );
      }
    }

    // Cache check for filtered results
    let filteredResults: any[] = [];
    if (useApiCaching) {
      const filteredResultsCacheKey = this.generateCacheKey(
        "filtered_results",
        distributorId,
        manufacturerId,
        monthRange,
        selectedProductIds,
        distributorManagerId,
        isGeneralManager,
        selectedWarehouseId
      );

      const cachedFilteredResults = await redisClient.get(
        filteredResultsCacheKey
      );

      if (cachedFilteredResults) {
        console.log(
          `[CACHE] getProductInsights - Cache HIT for filtered results`
        );
        filteredResults = JSON.parse(cachedFilteredResults);
      } else {
        console.log(
          `[CACHE] getProductInsights - Cache MISS for filtered results`
        );
      }
    }

    // If no cached filtered results, process them
    if (!filteredResults.length) {
      const filteredResultsStartTime = Date.now();
      // const productColorMap = mapProductColors(selectedProductIds);
      filteredResults = filterResultsByProducts(results, selectedProductIds);
      const filteredResultsEndTime = Date.now();

      // Cache the filtered results
      if (useApiCaching) {
        const filteredResultsCacheKey = this.generateCacheKey(
          "filtered_results",
          distributorId,
          manufacturerId,
          monthRange,
          selectedProductIds,
          distributorManagerId,
          isGeneralManager,
          selectedWarehouseId
        );

        await redisClient.setEx(
          filteredResultsCacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(filteredResults)
        );
      }
    }

    const distributorWithStoreIds: any =
      await ManufacturerRepository.getDistributorWithStoreIds(
        0,
        Number(distributorId)
      );

    const totalStoresCount = new Set(
      distributorWithStoreIds.flatMap(
        (distributor: any) => distributor.storeIds
      )
    ).size;

    return {
      results,
      filteredResults,
      latestTransactionDate,
      totalStoresCount,
      cacheKeyUsed
    };
  }
  public async getProductInsightKeyMetrics(
    distributorId: number,
    manufacturerId: number,
    monthRange?: string,
    selectedProductIds?: number[],
    distributorManagerId?: number,
    isGeneralManager?: boolean,
    selectedWarehouseId?: number
  ): Promise<ManufacturerProductInsights> {
    const functionStartTime = Date.now();
    const useProductsFilter =
      selectedProductIds?.length &&
      selectedProductIds?.length <= PRODUCTS_INSIGHT_MAX_PRODUCTS;

    const {
      results,
      filteredResults,
      latestTransactionDate,
      totalStoresCount,
      cacheKeyUsed
    } = await this.fetchProductsInsightRawResultsWithCache(
      distributorId,
      manufacturerId,
      monthRange,
      selectedProductIds,
      distributorManagerId,
      isGeneralManager,
      selectedWarehouseId
    );

    const overallMetrics = calculateMetrics(
      results,
      !!selectedProductIds?.length
    );

    const filteredMetrics = calculateMetrics(filteredResults);
    const response: ManufacturerProductInsights = {
      totalSales: {
        value: filteredMetrics.totalSales
      },
      activeStores: {
        value: useProductsFilter
          ? filteredMetrics.activeStores
          : totalStoresCount
      },
      units: {
        value: filteredMetrics.units
      },
      relativeShare: selectedProductIds?.length
        ? calculateRelativeShare(
            filteredMetrics,
            overallMetrics,
            totalStoresCount
          )
        : undefined,
      latestTransactionDate: latestTransactionDate
        ? new Date(latestTransactionDate)
        : new Date()
    };

    setTimeout(() => {
      if (cacheKeyUsed && requestCache.has(cacheKeyUsed)) {
        requestCache.delete(cacheKeyUsed);
      }
    }, 60000); // Clean up after 1 minute

    return response;
  }

  public async getProductInsights(
    distributorId: number,
    manufacturerId: number,
    monthRange?: string,
    selectedProductIds?: number[],
    distributorManagerId?: number,
    isGeneralManager?: boolean,
    selectedWarehouseId?: number
  ): Promise<ManufacturerProductInsights> {
    const useProductsFilter =
      selectedProductIds?.length &&
      selectedProductIds?.length <= PRODUCTS_INSIGHT_MAX_PRODUCTS;

    const {
      results,
      filteredResults,
      latestTransactionDate,
      totalStoresCount,
      cacheKeyUsed
    } = await this.fetchProductsInsightRawResultsWithCache(
      distributorId,
      manufacturerId,
      monthRange,
      selectedProductIds,
      distributorManagerId,
      isGeneralManager,
      selectedWarehouseId
    );

    // Cache check for top products
    let topProducts: any[] = [];
    if (useApiCaching) {
      const topProductsCacheKey = this.generateCacheKey(
        "top_products",
        distributorId,
        manufacturerId,
        monthRange,
        selectedProductIds,
        distributorManagerId,
        isGeneralManager,
        selectedWarehouseId,
        { PRODUCTS_INSIGHT_MAX_PRODUCTS }
      );

      const cachedTopProducts = await redisClient.get(topProductsCacheKey);

      if (cachedTopProducts) {
        console.log(`[CACHE] getProductInsights - Cache HIT for top products`);
        topProducts = JSON.parse(cachedTopProducts);
      } else {
        console.log(`[CACHE] getProductInsights - Cache MISS for top products`);
      }
    }

    // If no cached top products, calculate them
    if (!topProducts.length) {
      const productColorMap = mapProductColors(selectedProductIds);
      topProducts = getTopProducts(
        filteredResults,
        selectedProductIds ?? [],
        productColorMap,
        !!useProductsFilter,
        PRODUCTS_INSIGHT_MAX_PRODUCTS,
        totalStoresCount
      );
      // Cache the top products
      if (useApiCaching) {
        const topProductsCacheKey = this.generateCacheKey(
          "top_products",
          distributorId,
          manufacturerId,
          monthRange,
          selectedProductIds,
          distributorManagerId,
          isGeneralManager,
          selectedWarehouseId,
          { PRODUCTS_INSIGHT_MAX_PRODUCTS }
        );

        await redisClient.setEx(
          topProductsCacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(topProducts)
        );
      }
    }

    const filteredProductIds = useProductsFilter
      ? topProducts.map((pro) => pro.id)
      : [];

    // Cache check for grouped data
    let groupedArray: any[] = [];
    if (useApiCaching) {
      const groupedDataCacheKey = this.generateCacheKey(
        "grouped_data",
        distributorId,
        manufacturerId,
        monthRange,
        selectedProductIds,
        distributorManagerId,
        isGeneralManager,
        selectedWarehouseId
      );

      const cachedGroupedData = await redisClient.get(groupedDataCacheKey);

      if (cachedGroupedData) {
        console.log(`[CACHE] getProductInsights - Cache HIT for grouped data`);
        groupedArray = JSON.parse(cachedGroupedData);
      } else {
        console.log(`[CACHE] getProductInsights - Cache MISS for grouped data`);
      }
    }

    // If no cached grouped data, calculate it
    if (!groupedArray.length) {
      const productColorMap = mapProductColors(selectedProductIds);
      const groupedData = processSalesData(
        filteredResults,
        monthRange ?? "1",
        new Date(), // startDate
        new Date(), // endDate
        filteredProductIds,
        productColorMap
      );
      groupedArray = Object.values(groupedData);

      // Cache the grouped data
      if (useApiCaching) {
        const groupedDataCacheKey = this.generateCacheKey(
          "grouped_data",
          distributorId,
          manufacturerId,
          monthRange,
          selectedProductIds,
          distributorManagerId,
          isGeneralManager,
          selectedWarehouseId
        );

        await redisClient.setEx(
          groupedDataCacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(groupedArray)
        );
      }
    }

    // Cache check for store penetration
    let storePenetrationArray: any[] = [];
    if (useApiCaching) {
      const storePenetrationCacheKey = this.generateCacheKey(
        "store_penetration",
        distributorId,
        manufacturerId,
        monthRange,
        selectedProductIds,
        distributorManagerId,
        isGeneralManager,
        selectedWarehouseId
      );

      const cachedStorePenetration = await redisClient.get(
        storePenetrationCacheKey
      );

      if (cachedStorePenetration) {
        console.log(
          `[CACHE] getProductInsights - Cache HIT for store penetration`
        );
        storePenetrationArray = JSON.parse(cachedStorePenetration);
      } else {
        console.log(
          `[CACHE] getProductInsights - Cache MISS for store penetration`
        );
      }
    }

    // If no cached store penetration, calculate it
    if (!storePenetrationArray.length) {
      const productColorMap = mapProductColors(selectedProductIds);
      const storePenetration = getStorePenetrationChartData(
        filteredResults,
        monthRange ?? "1",
        new Date(), // startDate
        new Date(), // endDate
        totalStoresCount,
        filteredProductIds,
        productColorMap
      );
      storePenetrationArray = Object.values(storePenetration);

      // Cache the store penetration
      if (useApiCaching) {
        const storePenetrationCacheKey = this.generateCacheKey(
          "store_penetration",
          distributorId,
          manufacturerId,
          monthRange,
          selectedProductIds,
          distributorManagerId,
          isGeneralManager,
          selectedWarehouseId
        );

        await redisClient.setEx(
          storePenetrationCacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(storePenetrationArray)
        );
      }
    }

    const response: ManufacturerProductInsights = {
      topProducts: topProducts,
      chartData: monthRange == "1" ? groupedArray : sortByMonth(groupedArray),
      storePenetrationChartData:
        monthRange == "1"
          ? storePenetrationArray
          : sortByMonth(storePenetrationArray),
      latestTransactionDate: latestTransactionDate
        ? new Date(latestTransactionDate)
        : new Date()
    };

    // Clean up in-memory cache after a reasonable time to prevent memory leaks
    setTimeout(() => {
      if (cacheKeyUsed && requestCache.has(cacheKeyUsed)) {
        requestCache.delete(cacheKeyUsed);
      }
    }, 60000); // Clean up after 1 minute

    return response;
  }

  public async updateStoreSalesRepRelation(
    distributorId: number,
    storeId: number,
    salesRepId: number
  ): Promise<any> {
    //check if store matched with all distributor related stores
    const stores =
      await StoreRepository.getStoreIdsByDistributorId(distributorId);
    const storeIds = stores.map((store: any) => store.associatedUserId);

    if (!storeIds.includes(storeId)) {
      throw new Error("Distributor Store found.");
    }

    //check if SalesRep matched with all distributor related Sales Rep
    const salesReps = await DistributorRepository.getSalesRepIdsByDistributor([
      distributorId
    ]);

    if (!salesReps.includes(salesRepId)) {
      throw new Error("Distributor Sales Rep not found.");
    }

    return await DistributorRepository.updateStoreSalesRepRelation(
      salesRepId,
      storeId
    );
  }

  /**
   * Retrieves the list of warehouses associated with a distributor.
   *
   * This function fetches all warehouses linked to the specified distributor ID.
   * The warehouses may include details such as warehouse names, locations, and other metadata.
   *
   * @param {number} distributorId - The ID of the distributor whose warehouses are to be retrieved.
   * @returns {Promise<any>} - A promise that resolves to the list of warehouses associated with the distributor.
   * @throws Will throw an error if the distributor ID is invalid or if the data cannot be retrieved.
   */
  public async getDistributorWarehouses(distributorId: number) {
    const distributors =
      await DistributorRepository.getDistributorWarehouses(distributorId);

    return distributors;
  }
  /**
   * Retrieves the list of warehouses assigned to a distributor manager.
   * @param {number} distributorId - The ID of the distributor.
   * @param {number} managerId - The ID of the distributor manager.
   * @returns {Promise<any>} - A promise that resolves to an object containing
   * the assigned and unassigned warehouses for the distributor manager.
   */
  public async getDistributorManagerWarehouses(
    distributorId: number,
    managerId: number,
    returnAssigned?: boolean,
    isAdminOrExecutive?: boolean,
    userRole?: string
  ): Promise<any> {
    const assignedDistributors =
      await DistributorRepository.getDistributorManagerWarehouses(
        managerId,
        distributorId,
        true,
        isAdminOrExecutive,
        userRole
      );

    if (returnAssigned) {
      return assignedDistributors;
    }

    const unassignedDistributors =
      await DistributorRepository.getDistributorManagerWarehouses(
        managerId,
        distributorId,
        false,
        undefined,
        undefined
      );

    return {
      warehouses: {
        assigned: assignedDistributors,
        unassigned: unassignedDistributors
      }
    };
  }

  public async updateDistributorManagerWarehouseAssignment(
    distributorId: number,
    managerId: number,
    warehouseId: number
  ): Promise<any> {
    return await DistributorRepository.updateDistributorManagerWarehouseAssignment(
      distributorId,
      managerId,
      warehouseId
    );
  }

  /**
   * Retrieves total store earnings and top earning stores for a specific distributor.
   *
   * This method fetches the aggregated total earnings of all stores under a distributor,
   * as well as detailed information about the top 10 highest-earning stores. The distributor
   * ID is determined based on the authenticated user's role.
   *
   * If the distributor ID is missing or invalid, a bad request error is returned.
   * @method getDistributorStoreEarnings()
   * @param {number} distributorId - The ID of the distributor for which to retrieve store earnings.
   * @param {string} [sortBy] - Column to sort by ('storeName', 'storeEarnings'). Defaults to 'storeEarnings'.
   * @param {string} [sortOrder] - Sort order ('ASC' or 'DESC'). Defaults to 'DESC'.
   * @returns {Promise<any>} - A promise that resolves to an object containing the total earnings
   * and an array of top earning stores, each with details such as store ID, name, and store earnings.
   */
  public async getDistributorStoreEarnings(
    distributorId: number,
    sortBy: string = "storeEarnings",
    sortOrder: "ASC" | "DESC" = "DESC",
    warehouseId?: string | undefined,
    programTimeline: string = "Current"
  ) {
    const user = getCurrentUser();
    const isSalesRepManager = isDistributorSalesRepManager(user?.role);
    const selectedWarehouseId = warehouseId ? Number(warehouseId) : undefined;

    // **OPTIMIZATION: Parallelize getAuthorizedManufacturers with store ID fetching**
    // Both queries only need distributorId/user info, so they can run concurrently
    const [authorizedManufacturers, storeIds] = await Promise.all([
      // Get authorized manufacturers (needed for programs query)
      ManufacturerRepository.getAuthorizedManufacturers(distributorId),
      // Get store IDs based on warehouse, sales rep manager, or distributor
      (async () => {
        if (
          selectedWarehouseId !== undefined &&
          selectedWarehouseId !== 0 &&
          selectedWarehouseId !== null &&
          (user?.role === ENTITY_TYPE.DISTRIBUTOR_ADMIN ||
            user?.role === ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE ||
            user?.role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER)
        ) {
          // Remove duplicates from the resulting storeIds array
          return Array.from(
            new Set(
              await StoreRepository.getStoreIdsByWarehouseIds([
                selectedWarehouseId as number
              ])
            )
          );
        } else if (isSalesRepManager) {
          const stores = await StoreRepository.getStoresBySalesRepManagerId({
            salesRepManagerId: user?.associatedUserId,
            warehouseId: selectedWarehouseId ? selectedWarehouseId : undefined
          });
          return stores.map((store: any) => store.storeId);
        } else {
          const stores =
            await StoreRepository.getStoreIdsByDistributorId(distributorId);
          return stores.map((store: any) => store.associatedUserId);
        }
      })()
    ]);

    // Get program IDs for authorized manufacturers to filter compliances
    const authorizedManufacturerIdsForPrograms = authorizedManufacturers?.map(
      (am) => Number(am.manufacturerId)
    );

    // Get all programs from authorized manufacturers in a single optimized query
    const authorizedPrograms =
      await ProgramRepository.getProgramsByManufacturerIds({
        manufacturerIds: authorizedManufacturerIdsForPrograms || [],
        distributorId
      });

    return await DistributorRepository.getDistributorStoreEarnings(
      storeIds,
      sortBy,
      sortOrder,
      authorizedPrograms,
      programTimeline
    );
  }

  /**
   * Get store earnings data for CSV export
   * @param distributorId - The distributor ID
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   * @returns Promise<StoreEarningsCSVData[]>
   */
  public async getStoreEarningsForCSV({
    distributorId,
    startDate,
    endDate,
    manufacturerId,
    programTimeline,
    reportType = REPORT_TYPE.STORE_EARNINGS,
    salesRepIds
  }: {
    distributorId: number;
    startDate: Date;
    endDate: Date;
    manufacturerId?: number;
    programTimeline?: string;
    reportType?: string;
    salesRepIds?: number[];
  }) {
    switch (reportType) {
      case REPORT_TYPE.SALES_REP_EARNINGS: {
        const results = await DistributorRepository.getSalesRepEarningsForCSV({
          distributorId,
          startDate,
          endDate,
          manufacturerId,
          programTimeline,
          salesRepIds
        });

        // Prepare CSV data for Sales Rep Earnings
        const csvData = results.map((item: SalesRepEarningsCSVData) => ({
          "Sales Rep Name": item.salesRepName,
          "Sales Rep Manager": item.salesRepManager,
          Manufacturer: item.manufacturerName,
          "Program Start Date": item.programStartDate
            ? new Date(item.programStartDate).toLocaleDateString("en-US")
            : "N/A",
          "Program End Date": item.programEndDate
            ? new Date(item.programEndDate).toLocaleDateString("en-US")
            : "N/A",
          "Program Earnings": `$${parseFloat(
            String(item.programEarnings || 0)
          ).toFixed(2)}`,
          "Program Name": item.programName || "N/A",
          "Program Overview": item.programOverview || "N/A",
          "Program Tier": item.programTier || "N/A",
          "Total Earnings": `$${parseFloat(String(item.totalEarnings || 0)).toFixed(2)}`
        }));

        return await writeToString(csvData, {
          headers: true
        });
      }

      case REPORT_TYPE.PROGRAM_SUMMARY: {
        const results =
          await DistributorRepository.getStoreEarningsAggregatedForCSV({
            distributorId,
            startDate,
            endDate,
            manufacturerId,
            programTimeline
          });

        // Prepare CSV data for Program Summary
        const csvData = results.map((item: ProgramSummaryCSVData) => ({
          // "Program ID": item.programId, // FOR DEBUGGING ONLY
          // "Program Detail ID": item.programDetailId, // FOR DEBUGGING ONLY
          "Program Name": item.programName,
          Tier: item.programTier || "N/A",
          "Program Start Date": new Date(
            item.programStartDate
          ).toLocaleDateString("en-US"),
          "Program End Date": new Date(item.programEndDate).toLocaleDateString(
            "en-US"
          ),
          "Stores Enrolled": item.storesEnrolled,
          "Stores in Compliance": item.storesInCompliance,
          "Total Earnings": `$${parseFloat(String(item.totalEarnings || 0)).toFixed(2)}`,
          Manufacturer: item.manufacturerName
        })); // Generate CSV using string method instead of stream

        return await writeToString(csvData, {
          headers: true
        });
      }

      case REPORT_TYPE.STORE_EARNINGS: {
        // Get store earnings data for CSV export
        const storeEarningsResults =
          await DistributorRepository.getStoreEarningsForCSV({
            distributorId,
            startDate,
            endDate,
            manufacturerId,
            programTimeline
          });

        // Prepare CSV data
        const storeEarningsCsvData = storeEarningsResults.map((item: any) => ({
          "Store ID": item.storeExternalId,
          "Store Name": item.storeDisplayName || item.storeName,
          "Sales Rep": item.salesRepName,
          Manufacturer: item.manufacturerName,
          "Program Name": item.programName,
          "Current Tier": item.programTier || "N/A",
          "Total Store Earnings": `$${parseFloat(
            String(item.totalStoreEarnings || 0)
          ).toFixed(2)}`
        }));

        return await writeToString(storeEarningsCsvData, {
          headers: true
        });
      }

      default:
        return false;
    }
  }

  /**
   * Bulk enroll stores in programs with worker job queuing
   */
  public async bulkEnrollStoresInPrograms(
    params: BulkEnrollmentParams
  ): Promise<BulkEnrollmentResult> {
    return newrelic.startSegment(
      "DistributorService.bulkEnrollStoresInPrograms",
      true,
      async () => {
        const {
          distributorId,
          action,
          programIds,
          manufacturerId,
          storeIds,
          warehouseId,
          userId,
          userRole
        } = params;

        logger.info("Starting bulk enrollment", {
          distributorId,
          action,
          programCount: programIds.length,
          specificStores: !!storeIds,
          warehouseFilter: !!warehouseId
        });

        // Step 1: Get target stores
        const targetStores = await this.getTargetStoresForEnrollment({
          distributorId,
          storeIds,
          warehouseId,
          userId,
          userRole
        });

        if (targetStores.length === 0) {
          return {
            success: true,
            message: "No stores found for enrollment",
            data: {
              totalStores: 0,
              successful: 0,
              failed: 0,
              details: {
                enrolledCount: 0,
                alreadyEnrolledCount: 0,
                errorCount: 0
              },
              distributorId,
              programIds,
              action,
              workerJobsQueued: 0
            }
          };
        }

        logger.info("Target stores identified", { count: targetStores.length });

        // Step 2: Process each store
        const results = await this.processStoreEnrollments({
          stores: targetStores,
          programIds,
          action,
          userId,
          manufacturerId,
          distributorId
        });

        // Step 3: Aggregate results
        const aggregated = this.aggregateEnrollmentResults(results);

        logger.info("Bulk enrollment completed", {
          totalStores: targetStores.length,
          successful: aggregated.successful,
          failed: aggregated.failed,
          workerJobsQueued: aggregated.workerJobsQueued
        });

        return {
          success: true,
          message: `Bulk enrollment processed for ${targetStores.length} stores`,
          data: {
            totalStores: targetStores.length,
            successful: aggregated.successful,
            failed: aggregated.failed,
            details: aggregated.details,
            distributorId,
            programIds,
            action,
            workerJobsQueued: aggregated.workerJobsQueued
          }
        };
      }
    );
  }

  /**
   * Get target stores for enrollment based on filters
   */
  private async getTargetStoresForEnrollment(params: {
    distributorId: number;
    storeIds?: number[];
    warehouseId?: number;
    userId: number;
    userRole: string;
  }): Promise<StoreForEnrollment[]> {
    const { distributorId, storeIds, warehouseId, userId, userRole } = params;

    // If specific store IDs provided, fetch those
    if (storeIds && storeIds.length > 0) {
      const stores = await Store.findAll({
        where: {
          id: storeIds
          // Note: Verify these belong to distributor via warehouse relationship
        },
        attributes: ["id", "warehouseId", "name"],
        include: [
          {
            model: Warehouse,
            as: "warehouse",
            required: true,
            where: {
              distributorId
            }
          }
        ],
        raw: true
      });

      // Map to our interface
      let mappedStores: StoreForEnrollment[] = stores.map((s: any) => ({
        storeId: s.id,
        warehouseId: s.warehouseId,
        name: s.name
      }));

      // If sales manager, filter to only their stores
      if (userRole === USER_ROLES.DISTRIBUTOR_SALES_MANAGER) {
        const managerStoreIds =
          await StoreRepository.getStoreIdsBySalesRepManagerIdOptimized({
            salesRepManagerId: userId
          });
        mappedStores = mappedStores.filter((s) =>
          managerStoreIds.includes(s.storeId)
        );
      }

      return mappedStores;
    }

    // Otherwise, get all stores for distributor
    let targetStoreIds: number[];

    if (userRole === USER_ROLES.DISTRIBUTOR_SALES_MANAGER) {
      // Sales manager: only their assigned stores
      targetStoreIds =
        await StoreRepository.getStoreIdsBySalesRepManagerIdOptimized({
          salesRepManagerId: userId
        });
    } else if (warehouseId) {
      // Warehouse filter
      targetStoreIds = await StoreRepository.getStoreIdsByWarehouseIds([
        warehouseId
      ]);
    } else {
      // All distributor stores
      targetStoreIds =
        await StoreRepository.getStoreIdsByDistributorId(distributorId);
    }

    const stores = await Store.findAll({
      where: { id: targetStoreIds },
      attributes: ["id", "warehouseId", "name"],
      raw: true
    });

    return stores.map((s: any) => ({
      storeId: s.id,
      warehouseId: s.warehouseId,
      name: s.name
    }));
  }

  /**
   * Process enrollment for each store
   */
  private async processStoreEnrollments(params: {
    stores: StoreForEnrollment[];
    programIds: number[];
    action: "enroll" | "unenroll";
    userId: number;
    manufacturerId: number;
    distributorId: number;
  }): Promise<StoreEnrollmentResult[]> {
    const {
      stores,
      programIds,
      action,
      userId,
      manufacturerId,
      distributorId
    } = params;

    // Use Promise.all for parallel processing
    return Promise.all(
      stores.map(async (store) => {
        try {
          // Step 1: Perform database enrollment/unenrollment
          const enrollmentMethod =
            action === "enroll"
              ? ProgramService.enrollStoreInPrograms.bind(ProgramService)
              : ProgramService.unenrollStoreFromPrograms.bind(ProgramService);

          const dbResult = await enrollmentMethod(
            store.storeId,
            manufacturerId,
            programIds
          );

          // Step 2: Enqueue worker job (only if changes occurred)
          let workerJobQueued = false;
          if (dbResult.enrolledCount > 0) {
            try {
              const { enqueueStoreProgramEnrollmentChanged } = await import(
                "../utils/sqsClient"
              );

              await enqueueStoreProgramEnrollmentChanged(
                store.storeId,
                programIds,
                action,
                userId,
                manufacturerId,
                {
                  reason: `Distributor ${distributorId} bulk ${action}`,
                  warehouseId: store.warehouseId || undefined,
                  distributorId
                }
              );

              workerJobQueued = true;

              logger.info("Worker job enqueued for store", {
                storeId: store.storeId,
                action,
                programCount: programIds.length
              });
            } catch (error) {
              // Log but don't fail - DB already updated
              logger.error("Failed to enqueue worker job for store", {
                storeId: store.storeId,
                error
              });
            }
          }

          return {
            storeId: store.storeId,
            success: true,
            enrolledCount: dbResult.enrolledCount,
            alreadyEnrolledCount: dbResult.alreadyEnrolledCount,
            errorCount: dbResult.errorCount,
            workerJobQueued
          };
        } catch (error) {
          logger.error("Failed to process store enrollment", {
            storeId: store.storeId,
            error
          });

          return {
            storeId: store.storeId,
            success: false,
            enrolledCount: 0,
            alreadyEnrolledCount: 0,
            errorCount: programIds.length,
            workerJobQueued: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
  }

  /**
   * Aggregate results from all stores
   */
  private aggregateEnrollmentResults(
    results: StoreEnrollmentResult[]
  ): AggregatedResults {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const workerJobsQueued = results.filter((r) => r.workerJobQueued).length;

    const details = {
      enrolledCount: results.reduce((sum, r) => sum + r.enrolledCount, 0),
      alreadyEnrolledCount: results.reduce(
        (sum, r) => sum + r.alreadyEnrolledCount,
        0
      ),
      errorCount: results.reduce((sum, r) => sum + r.errorCount, 0)
    };

    return {
      successful,
      failed,
      workerJobsQueued,
      details
    };
  }
}

export default new DistributorDashboardService();
