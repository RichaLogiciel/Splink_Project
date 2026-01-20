import { Op, QueryTypes } from "sequelize";
import sequelize from "../db";
import {
  CACHE_TTL_TIME,
  DEFAULT_PAGE_SIZE,
  ENTITY_TYPE,
  PROGRAM_TIER_MODAL,
  PROGRAM_TYPE,
  ProgramsComplianceStatus,
  ProgramsDetailCriteria,
  PURCHASE_QUANTITY_WITH_PER_CATEGORY_ITEM_TRACKER_DISTRIBUTOR_IDS,
  skuFieldMapping,
  SORT_KEYS,
  useApiCaching
} from "../config/appConstants";
import LineItem from "../models/LineItem";
import Product from "../models/Product";
import ProgramAgreement from "../models/ProgramAgreement";
import StoreModel from "../models/Store";
import StoreSalesRep from "../models/StoreSalesRep";
import UserRole from "../models/UserRole";
import type { StoreEnrollmentStatusValue } from "../models/StoreEnrollmentStatus";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import StoreEnrollmentStatusRepository from "../repositories/StoreEnrollmentStatusRepository";
import StoreRepository from "../repositories/StoreRepository";
import { ProgramCompliance } from "../types/ProgramCompliance";
import {
  CategorizedProducts,
  ManufacturerProduct,
  ManufacturerTierDetail,
  StoreProgramData,
  StoresListingData
} from "../types/SalesRepTypes";
import { FormattedStoredData, Store } from "../types/StoreTypes";
import ProgramService from "./ProgramService";

import newrelic from "newrelic";
import ProductCategoryTag from "../models/ProductCategoryTags";
import DistributorRepository from "../repositories/DistributorRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import { createCacheKey } from "../utils/cacheUtils";
import {
  getMinMaxProgramDates,
  getMinMaxProgramDatesWithManufacturerId,
  isListPriceApplicable,
  mapTagsToCategoryObjects,
  parseNumberArray,
  getActiveInternalCode,
  getLastTransactionDate,
  getInternalCode,
  sortManufacturersByAuthStatus,
  updateProductInternalCodesByPurchasedItems,
  resolveProductName
} from "../utils/helpers";
import { redisClient, addUserCacheKey } from "../utils/redis";
import { getCurrentUser } from "../utils/requestContext";
import { ApiError } from "../lib/errors/APIError";
import { ERROR_MESSAGES } from "../config/errorMessages";

class StoreService {
  /**
   * Utility method to create a sort function based on sort direction
   * @param sort - The sort direction ("ASC" or "DESC")
   * @returns A function that returns the appropriate comparison result
   */
  private createSortFunction(sort: string) {
    return (ascResult: number) => (sort === "ASC" ? ascResult : -ascResult);
  }

  /**
   * Helper method to determine if a distributor is a DSD (Direct Store Delivery) distributor.
   * DSD distributors are identified by only having Sales Rep Programs and no Store Programs.
   *
   * @param distributorId - The ID of the distributor to check
   * @param authorizedManufacturerIds - List of authorized manufacturer IDs for the distributor
   * @param excludedProgramDetailIds - List of excluded program detail IDs
   * @param programTimeline - Optional program timeline filter
   * @param isInternalInitiative - Optional flag for internal initiatives
   * @returns Promise<boolean> - True if distributor only has Sales Rep Programs, false otherwise
   */
  private async isDSDDistributor(
    distributorId: number,
    authorizedManufacturerIds: number[],
    excludedProgramDetailIds: number[],
    programTimeline?: string,
    isInternalInitiative?: boolean
  ): Promise<boolean> {
    try {
      // Fetch Sales Rep Programs
      const salesRepPrograms =
        await ProgramRepository.getProgramsByParticipantType({
          participantType: ENTITY_TYPE.SALES_REP,
          authorizedManufacturerIds,
          excludedProgramDetailIds,
          programIds: undefined,
          programDetailIds: undefined,
          programTimeline,
          isInternalInitiative
        });

      // Fetch Store Programs
      const storePrograms = await StoreRepository.getManufacturerProgramsById(
        authorizedManufacturerIds,
        ENTITY_TYPE.STORE,
        undefined,
        excludedProgramDetailIds,
        authorizedManufacturerIds,
        ENTITY_TYPE.MANUFACTURER,
        [distributorId],
        ENTITY_TYPE.DISTRIBUTOR,
        programTimeline,
        isInternalInitiative,
        distributorId
      );

      // DSD distributor has Sales Rep Programs but NO Store Programs
      return salesRepPrograms.length > 0 && storePrograms.length === 0;
    } catch (error) {
      console.error("Error determining if distributor is DSD:", error);
      return false;
    }
  }

  /**
   * Retrieves a list of stores and their sales volumes for a given distributor.
   *
   * @param {number} distributorId The ID of the distributor for whom to retrieve key metrics.
   * @param {number | null} storeId The ID of the store to filter the results.
   * @param {number} page - The page number for pagination.
   * @param {string} sort - The order in which the results should be sorted, either DESC or ASC.
   * @param {string | null} searchQuery The search query to filter the results.
   * @param {number | null} selectedSalesRepId The ID of the selected sales representative to filter stores.
   * @param {number | null} chainId The ID of the selected chain to filter stores.
   *
   * @returns {Promise<StoresListingData[]>} A promise that resolves to an array of objects containing
   *                                         store information and sales volumes.
   */
  public async getListing(
    distributorId: number,
    storeId: number | null = null,
    page: number,
    sort: string,
    searchQuery: string | null = null,
    selectedSalesRepId: number | null = null,
    chainId: number | null = null,
    enrolled: boolean | null = null,
    programIds?: number[],
    productIds: number[] = [],
    sortKey: string = "sort",
    manufacturerId?: number,
    warehouseIds?: number[],
    returnSpiffEarning?: boolean,
    programTimeline?: string,
    isInternalInitiative?: boolean,
    excludeChainStores?: boolean,
    isChainStore?: boolean,
    excludeIneligibleStores?: boolean,
    pageSize?: number
  ) {
    return this.getFormattedStoresListing(
      distributorId,
      storeId,
      page,
      sort,
      searchQuery,
      selectedSalesRepId,
      chainId,
      enrolled,
      programIds,
      productIds,
      sortKey,
      manufacturerId,
      warehouseIds,
      returnSpiffEarning,
      programTimeline,
      isInternalInitiative,
      excludeChainStores,
      isChainStore,
      excludeIneligibleStores,
      pageSize
    );
  }

  /**
   * Retrieves a list of stores and their sales volumes for a given distributor (v2 API).
   * This method returns the response for the v2 store listings endpoint.
   *
   * @param {number} distributorId - The ID of the distributor for whom to retrieve store listings.
   * @param {number} page - The page number for pagination.
   * @param {string} sort - The order in which the results should be sorted, either DESC or ASC.
   * @param {string | null} searchQuery - Optional search query to filter the store results.
   * @param {number | null} selectedSalesRepId - Optional ID of the selected sales representative to filter stores.
   * @param {string} [sortKey] - The key to sort by. Defaults to "sort".
   * @param {number} [warehouseId] - The warehouse ID to filter by.
   * @param {string} [programTimeline] - The program timeline to filter by.
   * @param {boolean} [isInternalInitiative] - Whether to filter by internal initiative status.
   * @param {boolean} [excludeChainStores] - Whether to exclude chain stores.
   * @returns {Promise<FormattedStoredData>} A promise that resolves to an object containing formatted store data,
   *                                        including stores, total stores count, current page, and total pages.
   */
  public async getListingV2({
    distributorId,
    page,
    sort,
    sortKey,
    searchQuery,
    selectedSalesRepId,
    warehouseId,
    programTimeline,
    isInternalInitiative,
    excludeChainStores,
    salesManagerId,
    generalManagerId,
    loggedInUser
  }: {
    distributorId: number;
    page: number;
    sort: string;
    searchQuery: string | null;
    selectedSalesRepId: number | null;
    sortKey: string;
    warehouseId?: number | null;
    programTimeline?: string;
    isInternalInitiative?: boolean;
    excludeChainStores?: boolean;
    salesManagerId?: number;
    generalManagerId?: number;
    loggedInUser?: any;
  }): Promise<FormattedStoredData> {
    return newrelic.startSegment(
      "StoreService.getListingV2",
      true,
      async () => {
        try {
          // Default values
          const currentPage = page || 1;
          const sortDirection = sort?.toUpperCase() === "DESC" ? "DESC" : "ASC";
          const currentSortKey = sortKey || "sort";
          const currentProgramTimeline = programTimeline || "CURRENT";

          // Get current user for cache key
          const user = getCurrentUser();
          const userId = user?.id?.toString() || "null";

          // Create cache key with userId prefix for targeted invalidation
          const hashedKey = createCacheKey("getListingV2", {
            getListingV2: [
              distributorId.toString(),
              userId,
              user?.role || "null",
              currentPage.toString(),
              sortDirection,
              currentSortKey,
              searchQuery || "null",
              selectedSalesRepId?.toString() || "null",
              warehouseId?.toString() || "null",
              currentProgramTimeline,
              isInternalInitiative ? "true" : "false",
              excludeChainStores ? "true" : "false",
              generalManagerId?.toString() || "null"
            ]
          });
          // Prepend userId to make cache keys queryable by user
          const cacheKey = `getListingV2_${userId}_${hashedKey.replace("getListingV2_", "")}`;

          // Check cache if caching is enabled
          if (useApiCaching) {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
              return JSON.parse(cached);
            }
          }

          // Step 1: Get authorized manufacturer IDs for distributor
          const authorizedManufacturers =
            await ManufacturerRepository.getAuthorizedManufacturersIds(
              distributorId
            );

          if (
            !authorizedManufacturers ||
            authorizedManufacturers.length === 0
          ) {
            const emptyResult = {
              stores: [],
              totalStores: 0,
              currentPage: currentPage,
              totalPages: 0
            };

            // Cache empty result as well
            if (useApiCaching) {
              await redisClient.setEx(
                cacheKey,
                CACHE_TTL_TIME,
                JSON.stringify(emptyResult)
              );

              // Add to user cache index for efficient invalidation
              try {
                await addUserCacheKey(Number(userId), cacheKey);
              } catch (indexError) {
                // Log but don't throw - indexing is non-critical
                console.debug("[CACHE] Failed to add key to user index", {
                  userId,
                  cacheKey,
                  error:
                    indexError instanceof Error
                      ? indexError.message
                      : String(indexError)
                });
              }
            }

            return emptyResult;
          }

          const manufacturerIds = authorizedManufacturers.map((am: any) =>
            Number(am.manufacturerId)
          );

          // Step 2: Get filtered stores with all data (filtered, sorted, paginated)
          const { stores, totalCount } =
            await StoreRepository.getFilteredStoreIdsFromAggregates({
              distributorId,
              manufacturerIds,
              page: currentPage,
              limit: DEFAULT_PAGE_SIZE,
              sortKey: currentSortKey,
              sort: sortDirection,
              searchQuery,
              selectedSalesRepId,
              warehouseId: warehouseId || null,
              programTimeline: currentProgramTimeline,
              excludeChainStores: excludeChainStores || false,
              salesManagerId,
              generalManagerId,
              loggedInUser
            });

          // Step 3: Format response to match the expected structure
          const formattedStores: Store[] = stores.map((store: any) => {
            const hasAnnualVolumeOnly = store.has_annual_volume_only === true;

            return {
              id: store.store_id,
              externalStoreId: store.external_store_id || "",
              userInfo: {
                id: store.user_id || 0,
                status: store.user_status || "INVITATION_PENDING"
              },
              storeInfo: {
                name: store.store_name || "",
                location: store.store_location || "",
                rep: {
                  name: store.sales_rep_name || "",
                  associatedUserId:
                    store.sales_rep_associated_user_id || undefined
                }
              },
              salesData: hasAnnualVolumeOnly
                ? {
                    purchaseVolume: {
                      amount: 0
                    },
                    totalSavings: {
                      amount: 0
                    },
                    totalOppSavings: {
                      amount: 0
                    },
                    annualPurchaseVolume: {
                      amount: Number(store.total_purchase_volume || 0)
                    }
                  }
                : {
                    purchaseVolume: {
                      amount: Number(store.total_purchase_volume || 0)
                    },
                    totalSavings: {
                      amount: Number(store.total_earnings || 0)
                    },
                    totalOppSavings: {
                      amount: 0
                    }
                  },
              programData: hasAnnualVolumeOnly
                ? {
                    completedPrograms: 0,
                    totalEnrolled: 0,
                    enrolledProgram: [],
                    remainingProgram: [],
                    enrolledProgramIds: []
                  }
                : {
                    completedPrograms: Number(store.completed_programs || 0),
                    totalEnrolled: Number(store.total_enrolled || 0),
                    enrolledProgram: [],
                    remainingProgram: [],
                    enrolledProgramIds: []
                  },
              chainId: store.chain_id || 0,
              chainNames: store.chain_name || "",
              nearComplianceData: {
                manufacturerId: 0,
                manufacturerName: "",
                programId: 0,
                programName: "",
                tier: 0,
                requiredCount: 0,
                purchasedCount: 0,
                highestCompliancePercentage: 0
              }
            };
          });

          const totalPages = Math.ceil(totalCount / DEFAULT_PAGE_SIZE);

          const formattedData: FormattedStoredData = {
            stores: formattedStores,
            totalStores: totalCount,
            currentPage: currentPage,
            totalPages: totalPages
          };

          // Store in cache if caching is enabled
          if (useApiCaching) {
            await redisClient.setEx(
              cacheKey,
              CACHE_TTL_TIME,
              JSON.stringify(formattedData)
            );

            // Add to user cache index for efficient invalidation
            try {
              await addUserCacheKey(Number(userId), cacheKey);
            } catch (indexError) {
              // Log but don't throw - indexing is non-critical
              console.debug("[CACHE] Failed to add key to user index", {
                userId,
                cacheKey,
                error:
                  indexError instanceof Error
                    ? indexError.message
                    : String(indexError)
              });
            }
          }

          return formattedData;
        } catch (error) {
          console.error("Error in getListingV2:", error);
          throw error;
        }
      }
    );
  }

  /**
   * Formats and retrieves a list of stores with detailed sales and program data.
   *
   * This method gathers combined data for stores, including sales volume, savings,
   * and program information, and formats it into a structured response.
   *
   * @param {number} distributorId - The ID of the distributor for whom to format the store data.
   * @param {number | null} storeId - Optional ID of the store to filter the results.
   * @param {number} page - The page number for pagination.
   * @param {string} sort - The order in which the results should be sorted, either DESC or ASC.
   * @param {string | null} searchQuery - Optional search query to filter the store results.
   * @param {number | null} selectedSalesRepId - Optional ID of the selected sales representative to filter stores.
   * @param {number | null} chainId The ID of the selected chain to filter stores.
   * @param {boolean} [enrolled] - Whether to filter by enrollment status.
   * @param {number[]} [programIds] - Array of program IDs to filter by.
   * @param {number[]} [productIds] - Array of product IDs to filter by.
   * @param {string} [sortKey] - The key to sort by. Defaults to "sort".
   * @param {number} [manufacturerId] - The manufacturer ID to filter by.
   * @param {number[]} [warehouseIds] - Array of warehouse IDs to filter by.
   * @param {boolean} [returnSpiffEarning] - Whether to return SPIFF earning data.
   * @param {string} [programTimeline] - The program timeline to filter by.
   * @param {boolean} [isInternalInitiative] - Whether to filter by internal initiative status.
   * @param {boolean} [excludeChainStores] - Whether to exclude chain stores.
   * @param {boolean} [isChainStore] - Whether to filter for chain stores only.
   * @param {boolean} [excludeIneligibleStores] - Whether to exclude ineligible stores.
   * @param {boolean} [use_cache=true] - Whether to use cache for this request. Defaults to true.
   *
   * @returns {Promise<FormattedStoredData>} A promise that resolves to an object containing formatted store data,
   *                                        including stores, total stores count, current page, and total pages.
   */
  public async getFormattedStoresListing(
    distributorId: number,
    storeId: number | null = null,
    page: number,
    sort: string,
    searchQuery: string | null = null,
    selectedSalesRepId: number | null = null,
    chainId: number | null = null,
    enrolled: boolean | null = null,
    programIds?: number[],
    productIds: number[] = [],
    sortKey: string = "sort",
    manufacturerId?: number,
    warehouseIds?: number[],
    returnSpiffEarning?: boolean,
    programTimeline?: string,
    isInternalInitiative?: boolean,
    excludeChainStores?: boolean,
    isChainStore?: boolean,
    excludeIneligibleStores?: boolean,
    pageSize?: number
  ) {
    return newrelic.startSegment(
      "getFormattedStoresListing",
      true,
      async () => {
        const startTime = process.hrtime();

        try {
          const user = getCurrentUser();
          const userId = user?.id?.toString() || "null";
          const hashedKey = createCacheKey("getFormattedStoresListing", {
            userId: userId,
            userRole: user?.role || "null",
            enrollmentStatusVersion: "v2",
            pageSize: pageSize?.toString() || "null",
            distributorId: distributorId.toString(),
            storeId: storeId?.toString() || "null",
            page: page.toString(),
            sort: sort,
            searchQuery: searchQuery || "null",
            selectedSalesRepId: selectedSalesRepId?.toString() || "null",
            chainId: chainId?.toString() || "null",
            enrolled: enrolled ? "true" : "false",
            programIds: programIds ? programIds.sort().toString() : "none",
            productIds: productIds ? productIds.sort().toString() : "none",
            sortKey: sortKey,
            manufacturerId: manufacturerId?.toString() || "null",
            warehouseIds:
              warehouseIds && warehouseIds?.length > 0
                ? warehouseIds.sort().toString()
                : "none",
            returnSpiffEarning: returnSpiffEarning ? "true" : "false",
            programTimeline: programTimeline || "null",
            isInternalInitiative: isInternalInitiative ? "true" : "false",
            excludeChainStores: excludeChainStores ? "true" : "false",
            isChainStore: isChainStore ? "true" : "false",
            excludeIneligibleStores: excludeIneligibleStores ? "true" : "false"
          });
          // Prepend userId to make cache keys queryable by user
          const cacheKey = `getFormattedStoresListing_${userId}_${hashedKey.replace("getFormattedStoresListing_", "")}`;

          // Check cache only if use_cache is true and API caching is enabled
          if (useApiCaching) {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
              return JSON.parse(cached);
            }
          }

          const effectivePageSize = pageSize || DEFAULT_PAGE_SIZE;
          const { combinedData, totalRecordsCount } =
            await newrelic.startSegment("fetchCombinedData", true, () =>
              this.fetchCombinedData(
                distributorId,
                storeId,
                page,
                sort,
                searchQuery,
                selectedSalesRepId,
                chainId,
                enrolled,
                programIds,
                productIds,
                sortKey,
                manufacturerId,
                warehouseIds,
                returnSpiffEarning,
                programTimeline,
                isInternalInitiative,
                excludeChainStores,
                isChainStore,
                excludeIneligibleStores,
                effectivePageSize
              )
            );

          // Calculate start of today in UTC for enrollment status filtering
          const startOfToday = new Date();
          startOfToday.setUTCHours(0, 0, 0, 0);

          let enrollmentStatusByStoreId: Map<
            number,
            StoreEnrollmentStatusValue
          > = new Map();
          if (manufacturerId) {
            const storeIds = combinedData
              .map((storeData: any) => Number(storeData.storeId))
              .filter((id: number) => !Number.isNaN(id));

            enrollmentStatusByStoreId =
              await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
                {
                  storeIds,
                  manufacturerId,
                  startDate: startOfToday
                }
              );
          }

          const formattedData: FormattedStoredData = {
            stores: [],
            totalStores: totalRecordsCount,
            currentPage: page,
            totalPages: Math.ceil(totalRecordsCount / effectivePageSize)
          };
          for (const storeData of combinedData) {
            const store: Store = {
              id: storeData.storeId,
              externalStoreId: storeData.externalStoreId,
              enrollmentStatus: enrollmentStatusByStoreId.get(
                Number(storeData.storeId)
              ),
              userInfo: {
                id: storeData.storUserId,
                status: storeData.storeUserStatus
              },
              storeInfo: {
                name: storeData.storeName,
                location: storeData.storeLocation,
                rep: {
                  name: storeData.salesRepName,
                  associatedUserId: storeData.salesRepAssociatedUserId
                }
              },
              salesData: {
                purchaseVolume: {
                  amount: Number(storeData.totalAmountSum.toFixed(2))
                },
                totalSavings: {
                  amount: Number(storeData.earnedRebate)
                },
                totalOppSavings: {
                  amount: Number(storeData.earningOpportunity)
                }
              },
              programData: {
                completedPrograms: storeData.completedPrograms,
                totalEnrolled: storeData.totalPrograms || 0,
                enrolledProgram: sortManufacturersByAuthStatus(
                  storeData.programs?.filter((pro: any) => pro.isEnrolled) ?? []
                ),
                remainingProgram: sortManufacturersByAuthStatus(
                  storeData.programs?.filter((pro: any) => !pro.isEnrolled) ??
                    []
                ),
                enrolledProgramIds: storeData.enrolledProgramIds ?? []
              },
              chainId: storeData.chainId ?? 0,
              chainNames: storeData.chainNames ?? "",
              salesRepSpiffData: returnSpiffEarning
                ? {
                    totalSpiffEarning: storeData?.totalSpiffEarning,
                    totalSpiffPrograms: storeData?.availableSpiffPrograms
                  }
                : undefined,
              nearComplianceData: storeData.nearComplianceData ?? {
                manufacturerId: 0,
                manufacturerName: "",
                highestCompliancePercentage: 0,
                programId: 0,
                programName: "",
                tier: 0,
                requiredCount: 0,
                purchasedCount: 0
              }
            };
            formattedData.stores.push(store);
          }

          switch (sortKey) {
            case SORT_KEYS.SORT:
              formattedData.stores?.sort((a, b) => {
                const comparison = a?.storeInfo?.name.localeCompare(
                  b?.storeInfo?.name
                );
                return this.createSortFunction(sort)(comparison);
              });
              break;

            case SORT_KEYS.NEAR_COMPLIANCE_PERCENTAGE:
              formattedData.stores?.sort((a, b) => {
                const valA =
                  a?.nearComplianceData?.highestCompliancePercentage ?? 0;
                const valB =
                  b?.nearComplianceData?.highestCompliancePercentage ?? 0;

                return this.createSortFunction(sort)(valA - valB);
              });
              break;
            case SORT_KEYS.PURCHASE_VOLUME_SORT:
            case SORT_KEYS.ESTIMATED_SAVINGS:
            case SORT_KEYS.POTENTIAL_SAVINGS:
            case SORT_KEYS.PROGRAM_COMPLIANCE:
            case SORT_KEYS.SAVINGS_Opp:
              // Database-level sorting is now handled in StoreRepository.buildSorting()
              // No need for manual sorting here
              break;

            case SORT_KEYS.PR_AVAILABLE:
              formattedData.stores?.sort((a, b) => {
                const aAmount =
                  Number(a?.salesRepSpiffData?.totalSpiffPrograms) || 0;
                const bAmount =
                  Number(b?.salesRepSpiffData?.totalSpiffPrograms) || 0;

                // Handle zeros first for both ASC and DESC
                const aIsZero = aAmount === 0;
                const bIsZero = bAmount === 0;

                if (aIsZero && !bIsZero) return sort === "ASC" ? -1 : 1;
                if (!aIsZero && bIsZero) return sort === "ASC" ? 1 : -1;

                // Normal comparison for non-zero values
                return sort === "ASC" ? aAmount - bAmount : bAmount - aAmount;
              });
              break;

            case SORT_KEYS.CHAIN:
              formattedData.stores?.sort((a, b) => {
                const chainA = a?.chainNames ?? "";
                const chainB = b?.chainNames ?? "";

                // Handle nulls/empty strings last
                if (!chainA && !chainB) return 0;
                if (!chainA) return 1;
                if (!chainB) return -1;

                // Normal string comparison
                const comparison = chainA.localeCompare(chainB);
                return this.createSortFunction(sort)(comparison);
              });
              break;

            case SORT_KEYS.SALES_REP:
              formattedData.stores?.sort((a, b) => {
                const comparison = a?.storeInfo?.rep?.name.localeCompare(
                  b?.storeInfo?.rep?.name
                );
                return this.createSortFunction(sort)(comparison);
              });
              break;
          }
          if (useApiCaching) {
            await redisClient.setEx(
              cacheKey,
              CACHE_TTL_TIME,
              JSON.stringify(formattedData)
            );

            // Add to user cache index for efficient invalidation
            try {
              await addUserCacheKey(Number(userId), cacheKey);
            } catch (indexError) {
              // Log but don't throw - indexing is non-critical
              console.debug("[CACHE] Failed to add key to user index", {
                userId,
                cacheKey,
                error:
                  indexError instanceof Error
                    ? indexError.message
                    : String(indexError)
              });
            }
          }

          const [s, ns] = process.hrtime(startTime);
          newrelic.addCustomAttribute(
            "getFormattedStoresListing.duration_ms",
            s * 1000 + ns / 1000000
          );

          return formattedData;
        } catch (error) {
          newrelic.noticeError(error as Error);
          throw error;
        }
      }
    );
  }

  /**
   * Retrieves sales representatives along with their associated stores and total amount, grouped by store ID.
   *
   * This method executes a query to fetch data about sales representatives, their associated
   * stores, and the total sales amount. It joins multiple tables including user roles, transactions,
   * stores, and program participants to gather detailed information. The results include the store name,
   * store location, total amount of sales, sales representative's name, role, and enrolled program IDs.
   *
   * The query can be filtered by a specific store ID if provided.
   *
   * @param {number} distributorId - The ID of the distributor to filter the sales representatives.
   * @param {number | null} storeId - Optional ID of the store to filter the results.
   * @param {number} page - The page number for pagination.
   * @param {string} sort - The order in which the results should be sorted, either DESC or ASC.
   * @param {string | null} searchQuery - Optional search query to filter the store results.
   * @param {number | null} selectedSalesRepId - Optional ID of the selected sales representative to filter stores.
   * @param {number | null} chainId The ID of the selected chain to filter stores.
   *
   * @returns {Promise<StoresListingData[]>} A promise that resolves to an array of objects containing sales rep
   *                                         and store information, grouped by store ID.
   */
  public async getGroupedSalesReps(
    distributorId: number,
    storeId: number | null = null,
    page: number,
    sort: string,
    searchQuery: string | null = null,
    selectedSalesRepId: number | null = null,
    chainId: number | null = null,
    enrolled: boolean | null = null,
    programIds?: number[],
    productIds: number[] = [],
    sortKey: string = "sort",
    manufacturerId?: number,
    authorizedDistManufacturerIds?: number[],
    warehouseIds?: number[],
    programs?: any[],
    returnSpiffEarning?: boolean,
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    isInternalInitiative?: boolean,
    excludeChainStores?: boolean,
    storeIdsToExclude?: number[],
    pageSize: number = DEFAULT_PAGE_SIZE
  ) {
    const repoResult =
      await StoreRepository.getSalesRepWithStoresAndTotalAmount(
        distributorId != 0 ? [distributorId] : [],
        storeId,
        searchQuery,
        selectedSalesRepId,
        page,
        sort,
        chainId,
        pageSize,
        productIds,
        enrolled,
        programIds,
        false,
        sortKey,
        manufacturerId,
        authorizedDistManufacturerIds,
        warehouseIds,
        programs,
        returnSpiffEarning,
        storeId || (enrolled == undefined && manufacturerId) || !manufacturerId
          ? true
          : false,
        programTerms,
        isInternalInitiative,
        excludeChainStores,
        storeIdsToExclude
      );

    if (
      !repoResult ||
      repoResult.rows === undefined ||
      repoResult.count === undefined
    ) {
      console.error(
        "[ERROR] getGroupedSalesReps - Invalid result structure from getSalesRepWithStoresAndTotalAmount:",
        repoResult
      );
      throw new Error(
        "Failed to retrieve stores data from repository - invalid result structure"
      );
    }

    const {
      count: totalRecordsCount,
      rows: rawSalesReps
    }: { rows: any[]; count: number } = repoResult;
    // Type cast the raw data to StoresListingData[]
    const salesReps: StoresListingData[] = rawSalesReps as StoresListingData[];
    const groupedData = salesReps.reduce(
      (acc, curr: any) => {
        const { storeid, totalamount, storename } = curr;
        const totalAmountNum = parseFloat(totalamount); // Convert totalamount to a number

        // Check if a group for the storeId already exists
        if (!acc[storeid]) {
          acc[storeid] = {
            salesRepId: curr.distributorid, // Include distributorId
            salesRepName: curr.name.trim(),
            salesRepAssociatedUserId: curr.sales_rep_associated_user_id,
            storeId: storeid,
            storeName: storename, // Store name for the first entry
            storeLocation: `${curr.store_city ? curr.store_city : ""}${curr.store_state ? ", " + curr.store_state : ""}`,
            totalAmountSum: 0, // Initialize the totalAmountSum
            earnedRebate: curr.earned_rebate ?? 0,
            isQualified: false,
            enrolledProgramIds: curr.enrolled_programs_ids,
            completedPrograms: curr.completed_programs ?? 0,
            programs: null,
            totalPrograms: 0,
            chainId: curr.chain_id,
            chainNames: curr.chain_names,
            storUserId: curr.store_user_id,
            externalStoreId: curr.externalStoreId,
            storeUserStatus: curr.store_user_status,
            earningOpportunity: curr.earning_opportunity ?? 0,
            totalSpiffEarning: curr.totalSpiffEarning ?? 0,
            availableSpiffPrograms: curr?.program_count ?? 0,
            nearComplianceData: curr.nearComplianceData ?? {
              manufacturerId: 0,
              manufacturerName: "",
              highestCompliancePercentage: 0,
              programId: 0,
              programName: "",
              tier: 0,
              requiredCount: 0,
              purchasedCount: 0
            }
          };
        }

        // Add the current totalamount to the sum
        acc[storeid].totalAmountSum += totalAmountNum;

        return acc;
      },
      {} as Record<
        number,
        {
          salesRepId: number;
          salesRepName: string;
          salesRepAssociatedUserId: number;
          storeId: number;
          storeName: string;
          storeLocation: string;
          totalAmountSum: number;
          earnedRebate: number;
          isQualified: boolean;
          enrolledProgramIds: number[];
          completedPrograms: number;
          programs: StoreProgramData[] | null;
          totalPrograms: number;
          storUserId: number;
          storeUserStatus: string;
          chainId?: number;
          chainNames?: string;
          externalStoreId?: string | number;
          earningOpportunity?: number;
          totalSpiffEarning?: number;
          availableSpiffPrograms?: number;
          nearComplianceData?: Array<{
            manufacturerId: number;
            manufacturerName: string;
            highestCompliancePercentage: number;
            programId: number;
            programName: string;
            tier: number;
            requiredCount: number;
            purchasedCount: number;
          }>;
        }
      >
    );

    // Convert the grouped data back into an array while preserving the original sorted order
    const result: any[] = [];
    const processedStoreIds = new Set<number>();

    // First, add stores in the original sorted order from rawSalesReps
    for (const rawSalesRep of rawSalesReps) {
      if (!processedStoreIds.has(rawSalesRep.storeid)) {
        const groupedItem = groupedData[rawSalesRep.storeid];
        if (groupedItem) {
          result.push(groupedItem);
          processedStoreIds.add(rawSalesRep.storeid);
        }
      }
    }

    // Add any remaining stores that might not have been in the original array
    for (const [storeId, groupedItem] of Object.entries(groupedData)) {
      if (!processedStoreIds.has(Number(storeId))) {
        result.push(groupedItem);
      }
    }

    return { result, totalRecordsCount };
  }

  /**
   * Fetches combined data for sales representatives and their associated stores.
   * The method groups sales representatives by store ID and fetches program
   * compliance data using the grouped store IDs. The results are then combined
   * based on store ID and enriched with program compliance data.
   *
   * @param {number} distributorId - The ID of the distributor to filter the sales representatives.
   * @param {number | null} storeId - Optional ID of the store to filter the results.
   * @param {number} page - The page number for pagination.
   * @param {string} sort - The order in which the results should be sorted, either DESC or ASC.
   * @param {string | null} searchQuery - Optional search query to filter the results.
   * @param {number | null} selectedSalesRepId - Optional ID of the sales representative to filter the results.
   * @param {number | null} chainId The ID of the selected chain to filter stores.
   * @returns {Promise<StoresListingData[]>} - A promise that resolves to an array of combined data.
   */
  public async fetchCombinedData(
    distributorId: number,
    storeId: number | null = null,
    page: number,
    sort: string,
    searchQuery: string | null = null,
    selectedSalesRepId: number | null = null,
    chainId: number | null = null,
    enrolled: boolean | null = null,
    programIds?: number[],
    productIds: number[] = [],
    sortKey: string = "sort",
    manufacturerId?: number,
    warehouseIds?: number[],
    returnSpiffEarning?: boolean,
    programTimeline?: string,
    isInternalInitiative?: boolean,
    excludeChainStores?: boolean,
    isChainStore?: boolean,
    excludeIneligibleStores?: boolean,
    pageSize: number = DEFAULT_PAGE_SIZE
  ) {
    // Assume you already have a function to get sales reps and group them by storeId

    let programs: StoreProgramData[] = [];
    let salesRepPrograms: any[] = [];

    // Calculate near compliance data for each manufacturer
    let nearComplianceData: Record<
      number,
      {
        manufacturerId: number;
        manufacturerName: string;
        highestCompliancePercentage: number;
        programId: number;
        programName: string;
        tier: number;
        requiredCount: number;
        purchasedCount: number;
      }
    > = {};

    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturers(distributorId);

    const authorizedDistManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );

    let excludedProgramDetailIds = [];
    if (distributorId != 0) {
      excludedProgramDetailIds =
        await ProgramRepository.getExcludedProgramDetailIds([distributorId]);
    }

    if (storeId && storeId != 0) {
      const ineligibleProgramDetailIds =
        await ProgramRepository.getIneligibleProgramDetailIds(storeId);

      excludedProgramDetailIds = [
        ...excludedProgramDetailIds,
        ...ineligibleProgramDetailIds
      ];
    }

    let storesSavingsOpp = [];
    if (storeId && distributorId != 0) {
      storesSavingsOpp = await StoreRepository.getStoresEarningOpportunity(
        [storeId],
        distributorId
      );
    }

    const programsResult = await StoreRepository.getManufacturerProgramsById(
      authorizedDistManufacturerIds,
      isChainStore
        ? ENTITY_TYPE.CHAIN
        : returnSpiffEarning
          ? ENTITY_TYPE.SALES_REP
          : ENTITY_TYPE.STORE,
      programIds,
      excludedProgramDetailIds,
      manufacturerId ? [manufacturerId] : authorizedDistManufacturerIds,
      ENTITY_TYPE.MANUFACTURER,
      [distributorId],
      ENTITY_TYPE.DISTRIBUTOR,
      programTimeline,
      isInternalInitiative,
      distributorId
    );

    const filteredProgramIds = programsResult.map((p) => p.program_id);

    let storeIdsToExclude: number[] = [];
    if (excludeIneligibleStores && manufacturerId && distributorId != 0) {
      storeIdsToExclude =
        await ProgramRepository.findStoreIdsWithAllProgramsIneligibleManufacturers(
          [manufacturerId],
          filteredProgramIds
        );
    }

    // ============================================================================
    // DSD DETECTION - Must happen BEFORE getGroupedSalesReps to get correct
    // program terms for purchase volume calculations
    // ============================================================================
    const isDSD = await this.isDSDDistributor(
      distributorId,
      authorizedDistManufacturerIds,
      excludedProgramDetailIds,
      programTimeline,
      isInternalInitiative
    );

    // Fetch Sales Rep Programs early if DSD (needed for correct program terms)
    // This ensures getGroupedSalesReps uses the right date ranges for purchase volume
    if (isDSD) {
      salesRepPrograms = await ProgramRepository.getProgramsByParticipantType({
        participantType: ENTITY_TYPE.SALES_REP,
        authorizedManufacturerIds: authorizedDistManufacturerIds,
        excludedProgramDetailIds,
        programIds: undefined,
        programDetailIds: undefined,
        programTimeline,
        isInternalInitiative
      });
    }

    // Calculate program terms based on distributor type
    // DSD: Use Sales Rep Program dates
    // Regular: Use Store Program dates
    const programTermsForGroupedSalesReps =
      isDSD && salesRepPrograms.length > 0
        ? getMinMaxProgramDatesWithManufacturerId({
            programs: salesRepPrograms,
            useCurrentYear: false
          })
        : getMinMaxProgramDatesWithManufacturerId({
            programs: programsResult,
            useCurrentYear: false
          });

    // Extract manufacturer IDs based on distributor type
    // For DSD: Get from Sales Rep Programs
    // For Regular: Get from Store Programs
    const manufacturerIdsForRepo =
      isDSD && salesRepPrograms.length > 0
        ? Array.from(
            new Set(
              salesRepPrograms
                .map((p: any) => p.manufacturerId || p.manufacturer_id)
                .filter(Boolean)
            )
          )
        : programsResult?.map((pro) => pro?.manufacturer_id ?? 0);

    const { result: salesReps, totalRecordsCount } =
      await this.getGroupedSalesReps(
        distributorId,
        storeId,
        page,
        sort,
        searchQuery,
        selectedSalesRepId,
        chainId,
        enrolled,
        filteredProgramIds,
        productIds,
        sortKey,
        manufacturerId,
        manufacturerIdsForRepo, // Use DSD-aware manufacturer IDs
        warehouseIds,
        programsResult,
        returnSpiffEarning,
        programTermsForGroupedSalesReps, // Use pre-calculated terms (DSD-aware)
        isInternalInitiative,
        excludeChainStores,
        storeIdsToExclude,
        pageSize
      );
    const storeIds = salesReps.map((rep: any) => rep.storeId); // Extract storeIds from salesReps

    // Fetch Sales Rep Programs if not already fetched (for non-DSD cases)
    // DSD distributors already have salesRepPrograms fetched above
    // But we also need them for old Sales Rep Programs (returnSpiffEarning)
    if (
      returnSpiffEarning &&
      isInternalInitiative == false &&
      salesRepPrograms.length === 0
    ) {
      salesRepPrograms = await ProgramRepository.getProgramsByParticipantType({
        participantType: ENTITY_TYPE.SALES_REP,
        authorizedManufacturerIds: authorizedDistManufacturerIds,
        excludedProgramDetailIds,
        programIds: undefined,
        programDetailIds: undefined,
        programTimeline,
        isInternalInitiative
      });
    }

    const programTerms = getMinMaxProgramDatesWithManufacturerId({
      programs: programsResult,
      useCurrentYear: false
    });

    // For DSD distributors, use Sales Rep Program terms for purchase volume calculation
    // This ensures we calculate purchase volume based on the Sales Rep Program dates
    // instead of Store Program dates (which don't exist for DSD distributors)
    let programTermsForTransactions = programTerms;

    if (isDSD && salesRepPrograms.length > 0) {
      programTermsForTransactions = getMinMaxProgramDatesWithManufacturerId({
        programs: salesRepPrograms,
        useCurrentYear: false
      });
    }

    // Fetch category tags reference once
    const productCategoryTags =
      await StoreRepository.getCategoryTagsReference();

    if (storeId) {
      const eligibleProgramIds = isChainStore ? productIds : filteredProgramIds;
      // Fetch program compliances using the grouped store IDs
      const programCompliances: ProgramCompliance[] =
        await StoreRepository.getProgramCompliances(
          storeIds,
          eligibleProgramIds,
          undefined,
          isChainStore
        );

      const enrolledProgramIds = salesReps[0].enrolledProgramIds;

      const manufacturerIds = programsResult.map(
        (pro) => pro?.manufacturer_id ?? 0
      );

      const transactionLineItemsResult =
        await StoreRepository.getTransactionsByManufacturerIdAndProgramTerms(
          [storeId],
          manufacturerIds,
          ENTITY_TYPE.STORE,
          false,
          undefined,
          undefined,
          true,
          undefined,
          programTermsForTransactions, // Use DSD-specific terms if applicable
          true // includeInternalCode
        );

      if (storeId && programsResult.length > 0) {
        try {
          const manufacturerIds = programsResult.map(
            (pro) => pro.manufacturer_id
          );

          const uniqueManufacturerIds = [...new Set(manufacturerIds)];

          // Aggregate transaction line items by product_id to calculate net prices
          // This handles returns and multiple purchases correctly
          // Business Rule: Count products where net price > 0 (matching SQL)
          const productAggregateMap = new Map<
            number,
            {
              totalPrice: number;
              totalQuantity: number;
              internalCode?: string;
            }
          >();

          transactionLineItemsResult.forEach((item: any) => {
            const productId = item.product_id;
            const totalPrice = parseFloat(item?.total_price || "0");
            const quantity = parseFloat(item?.quantity || "0");

            if (productId) {
              const current = productAggregateMap.get(productId) || {
                totalPrice: 0,
                totalQuantity: 0,
                internalCode: item.internal_code
              };
              productAggregateMap.set(productId, {
                totalPrice: current.totalPrice + totalPrice,
                totalQuantity: current.totalQuantity + quantity,
                // Preserve internal_code from first item (or existing value)
                internalCode: current.internalCode || item.internal_code
              });
            }
          });

          // Create aggregated line items (one per SKU) with net positive price
          const aggregatedLineItems = Array.from(productAggregateMap.entries())
            .filter(([, agg]) => agg.totalPrice > 0)
            .map(([productId, agg]) => ({
              product_id: productId,
              total_price: agg.totalPrice.toString(),
              quantity: agg.totalQuantity.toString(),
              internal_code: agg.internalCode || "NA"
            }));

          // Extract purchased product IDs from aggregated items
          const purchasedProductIds = aggregatedLineItems.map(
            (item) => item.product_id
          );

          // Calculate compliance for each program
          for (const program of programsResult) {
            // const manufacturerId = program.manufacturer_id;

            // Calculate compliance percentage for this program
            // Pass aggregated line items for accurate counting
            const complianceDataForAllManufacturers =
              await StoreRepository.getStoresHighestComplianceByManufacturer({
                storeIds: [storeId],
                manufacturerIds: uniqueManufacturerIds,
                distributorIds: [distributorId],
                enrolled: false,
                programIds: [],
                programTimeline: programTimeline
              });

            nearComplianceData = complianceDataForAllManufacturers.reduce(
              (acc, item) => {
                acc[item.manufacturerId] = item;
                return acc;
              },
              {} as Record<
                number,
                (typeof complianceDataForAllManufacturers)[0]
              >
            );
          }
        } catch (error) {
          console.error("Error calculating near compliance:", error);
        }
      }

      programs = programsResult
        .filter((pro: any) =>
          pro.visibility_entity_type &&
          pro.visibility_entity_type === ENTITY_TYPE.STORE
            ? pro.visible_entity_ids.includes(storeId)
            : true
        )
        .reduce(
          (acc, curr) => {
            const compliance = programCompliances.find(
              (pc) =>
                pc.programid === curr.program_id &&
                pc.programdetailid === curr.program_detail_id
            );

            const manufacturerId = curr.manufacturer_id;
            const programTierCount = curr?.program_details_ids?.length ?? 1;

            const purchaseVolume =
              ProgramService.getTotalSumFromDistributorSaleTransacions(
                transactionLineItemsResult,
                curr?.manufacturer_id
              );
            const earnedRebate =
              compliance?.status == ProgramsComplianceStatus.Active
                ? parseFloat(compliance?.earnedrebate ?? "0")
                : 0;
            const isEnrolled = enrolledProgramIds?.includes(curr.program_id);
            const key = manufacturerId + "-" + isEnrolled;
            const savingsOpps = storesSavingsOpp.find(
              (er: any) =>
                er.manufacturer_id == manufacturerId &&
                er.program_detail_id == curr.program_detail_id &&
                er.highest_tier
            );

            // Check if a group for the manufacturerId already exists
            if (!acc[key]) {
              acc[key] = {
                manufacturer: {
                  id: manufacturerId,
                  name: curr.manufacturer_name,
                  avatar: curr.manufacturer_logo,
                  authorized: curr.manufacturer_authorized
                },
                programCompliance: {
                  completed: 0,
                  total: 0
                },
                purchaseVolume: {
                  amount: 0
                },
                totalSavings: {
                  amount: 0
                },
                totalOppSavings: {
                  amount: 0
                },
                isEnrolled: isEnrolled
              };
            }

            let completed = compliance?.isqualified ? 1 : 0;

            // if program type tier get completed compliance for the program id of diff tiers.
            if (programTierCount > 1) {
              completed =
                programCompliances.filter(
                  (pc) =>
                    pc.programid === curr.program_id &&
                    compliance?.isqualified &&
                    curr?.program_details_ids?.includes(pc.currenttierid)
                ).length ?? 0;
            }

            acc[key].programCompliance.total += programTierCount;
            acc[key].programCompliance.completed += completed;
            acc[key].purchaseVolume.amount = purchaseVolume || 0;
            acc[key].totalSavings.amount += earnedRebate || 0;
            acc[key].totalOppSavings.amount += parseFloat(
              savingsOpps?.rebate_opportunity ?? "0"
            );

            if (nearComplianceData[manufacturerId]) {
              acc[key].nearComplianceData = nearComplianceData[manufacturerId];
            }

            return acc;
          },
          {} as Record<number, StoreProgramData>
        );
    }

    // Combine the data based on storeId
    const combinedData = [];

    for (const salesRep of salesReps) {
      // add programs when store id provided
      if (programs)
        salesRep.programs = Object.entries(programs).map(([, value]) => ({
          ...value
        }));

      salesRep.totalPrograms = programsResult
        .filter((pr) => {
          if (
            pr?.visibility_entity_type &&
            pr?.visibility_entity_type == ENTITY_TYPE.STORE &&
            !pr?.visible_entity_ids?.includes(salesRep.storeId)
          ) {
            return false;
          }

          if (pr?.ineligible_store_ids?.includes(salesRep.storeId))
            return false;

          return !excludedProgramDetailIds?.includes(pr.program_detail_id);
        })
        .reduce((total, program) => {
          return (
            total +
            (program.program_details_ids
              ? program.program_details_ids.length
              : 1)
          );
        }, 0);

      if (salesRepPrograms?.length && isInternalInitiative == false) {
        salesRep.availableSpiffPrograms = salesRepPrograms?.reduce(
          (sum, p) =>
            sum +
            (p?.dataValues?.ProgramDetails?.length ||
              p?.ProgramDetails?.length ||
              0),
          0
        );
      }

      // Add near compliance data to the salesRep object
      ////this is for the store breakdown page
      if (storeId && Object.keys(nearComplianceData).length > 0) {
        salesRep.nearComplianceData = Object.values(nearComplianceData);
      }

      combinedData.push(salesRep);
    }

    return { combinedData, totalRecordsCount };
  }

  /**
   * Calculates partial compliance data for a given program under a specific manufacturer.
   *
   * This function is used to determine how close a store is to reaching full compliance
   * with the requirements of a program, based on the purchased products and category tags.
   * It returns `null` if the store has already achieved full (100%) compliance.
   *
   * @param {any} program - The program configuration including required product tags and quantities.
   * @param {number} manufacturerId - The ID of the manufacturer associated with the program.
   * @param {any[]} manufacturerProducts - The list of all products tied to the manufacturer.
   * @param {any[]} transactionLineItemsResult - List of purchased products (transaction data).
   * @param {number[]} purchasedProductIds - List of IDs for products that have been purchased.
   * @param {any[]} productCategoryTags - Metadata representing product categories/tags.
   *
   * @returns {{
   *   manufacturerId: number,
   *   manufacturerName: string,
   *   highestCompliancePercentage: number,
   *   programId: number,
   *   programName: string,
   *   tier: string,
   *   requiredCount: number,
   *   purchasedCount: number
   * } | null} An object containing compliance progress data, or `null` if 100% compliance is achieved.
   */
  private calculateProgramComplianceData(
    program: any,
    manufacturerId: number,
    manufacturerProducts: any[],
    transactionLineItemsResult: any[],
    purchasedProductIds: number[],
    productCategoryTags: any[]
  ) {
    const compliancePercentage = this.calculateCompliancePercentage(
      program,
      manufacturerProducts,
      transactionLineItemsResult,
      purchasedProductIds,
      productCategoryTags
    );

    if (compliancePercentage >= 100) return null;

    const diffCatQty: string[] = program.products_tags_qty?.split(",") ?? [];
    const totalRequired = diffCatQty.reduce(
      (sum, qty) => sum + parseInt(qty || "0"),
      0
    );
    const totalPurchased = Math.round(
      (compliancePercentage / 100) * totalRequired
    );

    return {
      manufacturerId,
      manufacturerName: program.manufacturer_name,
      highestCompliancePercentage: compliancePercentage,
      programId: program.program_id,
      programName: program.name,
      tier: program.tier,
      requiredCount: totalRequired,
      purchasedCount: totalPurchased
    };
  }

  /**
   * Retrieves the details of a single store by its unique ID.
   * Calls `getListing` with the store ID and a limit of 1.
   * @param {number} distributorId The ID of the distributor to retrieve related store details for.
   * @param {number} storeId The ID of the store to retrieve details for.
   * @param {number} salesRepId - Optional ID of the sales representative to filter the store results.
   * @return {Promise<StoreTableData>} A promise that resolves to an array of a single `Store` object.
   */
  public async getStoreDetails(
    storeId: number,
    distributorId: number,
    salesRepId?: number,
    programTimeline?: string,
    isChainStore?: boolean
  ) {
    const validProgramIds =
      await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
        participantType: isChainStore ? ENTITY_TYPE.CHAIN : ENTITY_TYPE.STORE,
        visibilityEntitieIds: [storeId],
        programTimeline,
        distributorId
      });

    return this.getListing(
      distributorId,
      storeId,
      1,
      "ASC",
      null,
      salesRepId,
      undefined,
      undefined,
      isChainStore ? undefined : validProgramIds,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      programTimeline,
      undefined,
      undefined,
      isChainStore
    );
  }

  /**
   * Gets manufacturer data grouped by agreement with program-level enrollment status.
   * Returns data split by agreement so manufacturers can appear in both enrolled and remaining sections.
   *
   * @param {number} storeId - The ID of the store
   * @param {number[]} manufacturerIds - Array of manufacturer IDs
   * @param {string} [programTimeline] - Optional timeline filter for programs
   * @returns {Promise<any[]>} - Returns array of manufacturer data grouped by agreement
   */
  private async getManufacturerDataByAgreement(
    storeId: number,
    manufacturerIds: number[],
    programTimeline?: string
  ): Promise<any[]> {
    try {
      // Map programTimeline to program_type filter
      const programTypeFilter =
        programTimeline?.toUpperCase() === "HISTORICAL"
          ? "HISTORICAL"
          : programTimeline?.toUpperCase() === "UPCOMING"
            ? "UPCOMING"
            : programTimeline?.toUpperCase() === "CURRENT"
              ? "CURRENT"
              : "CURRENT"; // Default to CURRENT

      const programTypeCondition = programTypeFilter
        ? "AND sla.program_type = :programType"
        : "";

      // Query to get manufacturer data grouped by agreement
      const query = `
        WITH agreement_programs AS (
          SELECT 
            sla.store_id,
            sla.manufacturer_id,
            COALESCE(pa.agreement_id, pa.id) as agreement_id,
            BOOL_AND(sla.program_enrolled) as agreement_enrolled,
            MAX(sla.purchase_volume) as agreement_purchase_volume,
            SUM(sla.earnings) as agreement_total_earnings,
            SUM(sla.earning_opp) as agreement_total_earnings_opp,
            MAX(sla.compliance_percentage) as max_compliance_percentage,
            SUM(
              CASE 
                WHEN sla.program_compliance_achieved ~ '^[0-9]+/[0-9]+$' 
                THEN CAST(SPLIT_PART(sla.program_compliance_achieved, '/', 1) AS INTEGER)
                ELSE 0
              END
            )::INTEGER as purchased_count,
            SUM(
              CASE 
                WHEN sla.program_compliance_achieved ~ '^[0-9]+/[0-9]+$' 
                THEN CAST(SPLIT_PART(sla.program_compliance_achieved, '/', 2) AS INTEGER)
                ELSE 0
              END
            )::INTEGER as required_count,
            ARRAY_AGG(DISTINCT sla.program_id ORDER BY sla.program_id) FILTER (WHERE sla.program_id != -1) as program_ids
          FROM store_listing_aggregates sla
          INNER JOIN program_agreements pa ON pa.program_id = sla.program_id
            AND pa.deleted_at IS NULL
          WHERE sla.store_id = :storeId
            AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
            AND sla.program_id != -1
            ${programTypeCondition}
          GROUP BY sla.store_id, sla.manufacturer_id, COALESCE(pa.agreement_id, pa.id)
        ),
        programs_without_agreements AS (
          SELECT 
            sla.store_id,
            sla.manufacturer_id,
            NULL::INTEGER as agreement_id,
            BOOL_AND(sla.program_enrolled) as agreement_enrolled,
            MAX(sla.purchase_volume) as agreement_purchase_volume,
            SUM(sla.earnings) as agreement_total_earnings,
            SUM(sla.earning_opp) as agreement_total_earnings_opp,
            MAX(sla.compliance_percentage) as max_compliance_percentage,
            SUM(
              CASE 
                WHEN sla.program_compliance_achieved ~ '^[0-9]+/[0-9]+$' 
                THEN CAST(SPLIT_PART(sla.program_compliance_achieved, '/', 1) AS INTEGER)
                ELSE 0
              END
            )::INTEGER as purchased_count,
            SUM(
              CASE 
                WHEN sla.program_compliance_achieved ~ '^[0-9]+/[0-9]+$' 
                THEN CAST(SPLIT_PART(sla.program_compliance_achieved, '/', 2) AS INTEGER)
                ELSE 0
              END
            )::INTEGER as required_count,
            ARRAY_AGG(DISTINCT sla.program_id ORDER BY sla.program_id) FILTER (WHERE sla.program_id != -1) as program_ids
          FROM store_listing_aggregates sla
          LEFT JOIN program_agreements pa ON pa.program_id = sla.program_id
            AND pa.deleted_at IS NULL
          WHERE sla.store_id = :storeId
            AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
            AND sla.program_id != -1
            AND pa.id IS NULL
            ${programTypeCondition}
          GROUP BY sla.store_id, sla.manufacturer_id
        ),
        all_agreement_data AS (
          SELECT * FROM agreement_programs
          UNION ALL
          SELECT * FROM programs_without_agreements
        )
        SELECT 
          aad.*,
          m.name as manufacturer_name,
          m.logo as manufacturer_logo,
          (
            SELECT sla.program_id
            FROM store_listing_aggregates sla
            WHERE sla.store_id = aad.store_id
              AND sla.manufacturer_id = aad.manufacturer_id
              AND sla.compliance_percentage = aad.max_compliance_percentage
              AND sla.program_id != -1
              ${programTypeCondition}
            ORDER BY sla.program_id
            LIMIT 1
          ) as program_id_for_max_compliance
        FROM all_agreement_data aad
        INNER JOIN manufacturers m ON m.id = aad.manufacturer_id
        ORDER BY aad.manufacturer_id, aad.agreement_id
      `;

      const replacements: any = {
        storeId,
        manufacturerIds
      };

      if (programTypeFilter) {
        replacements.programType = programTypeFilter;
      }

      const results: any[] = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements
      });

      return results;
    } catch (error) {
      console.error(
        "[ERROR] Failed to get manufacturer data by agreement:",
        error
      );
      // On error, return empty array (will fallback to existing logic)
      return [];
    }
  }

  /**
   * Retrieves the details of a single store by its unique ID (v2 API).
   * This method returns the response for the v2 store details endpoint.
   *
   * @param {number} storeId - The ID of the store to retrieve details for.
   * @param {number} distributorId - The ID of the distributor.
   * @param {number} [salesRepId] - Optional ID of the sales representative.
   * @param {string} [programTimeline] - Optional timeline filter for programs.
   * @param {boolean} [isChainStore] - Optional flag indicating if the store is a chain store.
   * @returns {Promise<any>} - A promise that resolves with the store details response.
   */
  public async getStoreDetailsV2(
    storeId: number,
    distributorId: number,
    salesRepId?: number,
    programTimeline?: string,
    isChainStore?: boolean
  ) {
    return newrelic.startSegment(
      "StoreService.getStoreDetailsV2",
      true,
      async () => {
        try {
          // Get current user for cache key
          // const user = getCurrentUser();

          // Create cache key
          // const cacheKey = createCacheKey("getStoreDetailsV2", {
          //   getStoreDetailsV2: [
          //     storeId.toString(),
          //     distributorId.toString(),
          //     user?.id?.toString() || "null",
          //     user?.role || "null",
          //     salesRepId?.toString() || "null",
          //     programTimeline || "CURRENT",
          //     isChainStore ? "true" : "false"
          //   ]
          // });

          // Check cache if caching is enabled
          // if (useApiCaching) {
          //   const cached = await redisClient.get(cacheKey);
          //   if (cached) {
          //     return JSON.parse(cached);
          //   }
          // }

          // Get authorized manufacturers for the distributor
          const authorizedManufacturers =
            await ManufacturerRepository.getAuthorizedManufacturers(
              distributorId
            );
          const manufacturerIds = authorizedManufacturers.map(
            (manufacturer: any) => manufacturer.manufacturerId
          );

          if (manufacturerIds.length === 0) {
            const emptyResult = {
              stores: [],
              totalStores: 0,
              currentPage: 1,
              totalPages: 1
            };

            // Cache empty result as well
            // if (useApiCaching) {
            //   await redisClient.setEx(
            //     cacheKey,
            //     CACHE_TTL_TIME,
            //     JSON.stringify(emptyResult)
            //   );
            // }

            return emptyResult;
          }

          // Get store details from aggregates table
          const aggregateData =
            await StoreRepository.getStoreDetailsFromAggregates(
              storeId,
              manufacturerIds,
              distributorId,
              programTimeline
            );

          if (!aggregateData || aggregateData.length === 0) {
            // If no aggregate data, check if store exists by querying basic store info
            const basicStoreInfo =
              await StoreRepository.getStoreBasicInfoById(storeId);

            // If store doesn't exist, return 404
            if (!basicStoreInfo) {
              throw ApiError.notFound(
                ERROR_MESSAGES.ENTITY.NOT_FOUND("Store", storeId)
              );
            }

            // Store exists but has no aggregate data - return minimal response
            const minimalStoreData = {
              id: storeId,
              externalStoreId: basicStoreInfo.external_store_id || "",
              userInfo: {
                id: basicStoreInfo.user_id || 0,
                status: basicStoreInfo.user_status || "INVITATION_PENDING"
              },
              storeInfo: {
                name: basicStoreInfo.store_name || "",
                location: basicStoreInfo.location || "",
                rep: {
                  name: basicStoreInfo.sales_rep_name || "",
                  associatedUserId:
                    basicStoreInfo.sales_rep_associated_user_id || undefined
                }
              },
              salesData: {
                purchaseVolume: {
                  amount: 0
                },
                totalSavings: {
                  amount: 0
                },
                totalOppSavings: {
                  amount: 0
                }
              },
              programData: {
                completedPrograms: 0,
                totalEnrolled: 0,
                enrolledProgram: [],
                remainingProgram: [],
                enrolledProgramIds: []
              },
              chainId: 0,
              chainNames: "",
              nearComplianceData: []
            };

            const minimalResult = {
              stores: [minimalStoreData],
              totalStores: 1,
              currentPage: 1,
              totalPages: 1
            };

            // Cache minimal result
            // if (useApiCaching) {
            //   await redisClient.setEx(
            //     cacheKey,
            //     CACHE_TTL_TIME,
            //     JSON.stringify(minimalResult)
            //   );
            // }

            return minimalResult;
          }

          // Process the first row for store basic info
          const firstRow = aggregateData[0];

          // Check if this store should use annual volume only
          const hasAnnualVolumeOnly = firstRow.has_annual_volume_only === true;

          // If annual volume only, return simplified response
          if (hasAnnualVolumeOnly) {
            const store = {
              id: storeId,
              externalStoreId: firstRow.external_store_id || "",
              userInfo: {
                id: firstRow.user_id || 0,
                status: firstRow.user_status || ""
              },
              storeInfo: {
                name: firstRow.store_name || "",
                location: firstRow.store_location || "",
                rep: {
                  name: firstRow.sales_rep_name || "",
                  associatedUserId: firstRow.sales_rep_associated_user_id || 0
                }
              },
              salesData: {
                purchaseVolume: {
                  amount: 0
                },
                totalSavings: {
                  amount: 0
                },
                totalOppSavings: {
                  amount: 0
                },
                annualPurchaseVolume: {
                  amount: Number(firstRow.total_annual_purchase_volume || 0)
                }
              },
              programData: {
                completedPrograms: 0,
                totalEnrolled: 0,
                enrolledProgram: [],
                remainingProgram: [],
                enrolledProgramIds: []
              },
              chainId: 0,
              chainNames: "",
              nearComplianceData: []
            };

            const formattedData = {
              stores: [store],
              totalStores: 1,
              currentPage: 1,
              totalPages: 1
            };

            // Store in cache if caching is enabled
            // if (useApiCaching) {
            //   await redisClient.setEx(
            //     cacheKey,
            //     CACHE_TTL_TIME,
            //     JSON.stringify(formattedData)
            //   );
            // }

            return formattedData;
          }

          // Get enrolled program IDs from aggregates data (first row should have the array)
          const enrolledProgramIds = firstRow.enrolled_program_ids || [];
          const storeLocation = firstRow.store_location || "";

          // Get manufacturer IDs from aggregate data
          const manufacturerIdsFromAggregates: number[] = Array.from(
            new Set(
              aggregateData
                .map((row: any) => Number(row.manufacturer_id))
                .filter((id: number) => id && id !== 0)
            )
          );

          // Get manufacturer data grouped by agreement
          const agreementData: any[] =
            await this.getManufacturerDataByAgreement(
              storeId,
              manufacturerIdsFromAggregates,
              programTimeline
            );

          // Separate enrolled and remaining programs by agreement, then aggregate by manufacturer
          const enrolledProgramsMap = new Map<number, any>();
          const remainingProgramsMap = new Map<number, any>();
          const nearComplianceDataMap = new Map<number, any>();

          // Process agreement-level data and aggregate by manufacturer
          agreementData.forEach((row: any) => {
            if (!row.manufacturer_id || row.manufacturer_id === 0) return;

            const isEnrolled = row.agreement_enrolled === true;
            const manufacturerId = row.manufacturer_id;

            // Track near compliance data (max per manufacturer across all agreements)
            if (
              !nearComplianceDataMap.has(manufacturerId) ||
              (row.max_compliance_percentage || 0) >
                (nearComplianceDataMap.get(manufacturerId)
                  ?.highestCompliancePercentage || 0)
            ) {
              nearComplianceDataMap.set(manufacturerId, {
                storeId: storeId,
                manufacturerId: manufacturerId,
                programId: row.program_id_for_max_compliance || 0,
                requiredCount: row.required_count || 0,
                purchasedCount: row.purchased_count || 0,
                highestCompliancePercentage: Math.round(
                  row.max_compliance_percentage || 0
                )
              });
            }

            // Aggregate by manufacturer in the appropriate section
            if (isEnrolled) {
              if (!enrolledProgramsMap.has(manufacturerId)) {
                enrolledProgramsMap.set(manufacturerId, {
                  manufacturer: {
                    id: manufacturerId,
                    name: row.manufacturer_name,
                    avatar: row.manufacturer_logo || "",
                    authorized: true
                  },
                  programCompliance: {
                    completed: 0,
                    total: 0
                  },
                  purchaseVolume: {
                    amount: Number(row.agreement_purchase_volume || 0)
                  },
                  totalSavings: {
                    amount: 0
                  },
                  totalOppSavings: {
                    amount: 0
                  },
                  isEnrolled: true,
                  nearComplianceData: {
                    storeId: storeId,
                    manufacturerId: manufacturerId,
                    programId: row.program_id_for_max_compliance || 0,
                    requiredCount: row.required_count || 0,
                    purchasedCount: row.purchased_count || 0,
                    highestCompliancePercentage: Math.round(
                      row.max_compliance_percentage || 0
                    )
                  }
                });
              }
              const existing = enrolledProgramsMap.get(manufacturerId)!;
              existing.programCompliance.completed += row.purchased_count || 0;
              existing.programCompliance.total += row.required_count || 0;
              // Purchase volume is the same across all programs, so use MAX (or first value)
              existing.purchaseVolume.amount = Math.max(
                existing.purchaseVolume.amount,
                Number(row.agreement_purchase_volume || 0)
              );
              existing.totalSavings.amount += Number(
                row.agreement_total_earnings || 0
              );
              existing.totalOppSavings.amount += Number(
                row.agreement_total_earnings_opp || 0
              );
            } else {
              if (!remainingProgramsMap.has(manufacturerId)) {
                remainingProgramsMap.set(manufacturerId, {
                  manufacturer: {
                    id: manufacturerId,
                    name: row.manufacturer_name,
                    avatar: row.manufacturer_logo || "",
                    authorized: true
                  },
                  programCompliance: {
                    completed: 0,
                    total: 0
                  },
                  purchaseVolume: {
                    amount: Number(row.agreement_purchase_volume || 0)
                  },
                  totalSavings: {
                    amount: 0
                  },
                  totalOppSavings: {
                    amount: 0
                  },
                  isEnrolled: false,
                  nearComplianceData: {
                    storeId: storeId,
                    manufacturerId: manufacturerId,
                    programId: row.program_id_for_max_compliance || 0,
                    requiredCount: row.required_count || 0,
                    purchasedCount: row.purchased_count || 0,
                    highestCompliancePercentage: Math.round(
                      row.max_compliance_percentage || 0
                    )
                  }
                });
              }
              const existing = remainingProgramsMap.get(manufacturerId)!;
              existing.programCompliance.completed += row.purchased_count || 0;
              existing.programCompliance.total += row.required_count || 0;
              // Purchase volume is the same across all programs, so use MAX (or first value)
              existing.purchaseVolume.amount = Math.max(
                existing.purchaseVolume.amount,
                Number(row.agreement_purchase_volume || 0)
              );
              existing.totalSavings.amount += Number(
                row.agreement_total_earnings || 0
              );
              existing.totalOppSavings.amount += Number(
                row.agreement_total_earnings_opp || 0
              );
            }
          });

          // Convert maps to arrays
          const enrolledPrograms = Array.from(enrolledProgramsMap.values());
          const remainingPrograms = Array.from(remainingProgramsMap.values());

          // Also process manufacturers without agreements (fallback to existing logic)
          // This handles manufacturers that don't have any programs in program_agreements
          const processedManufacturerIds = new Set<number>([
            ...enrolledProgramsMap.keys(),
            ...remainingProgramsMap.keys()
          ]);

          aggregateData.forEach((row: any) => {
            if (
              !row.manufacturer_id ||
              row.manufacturer_id === 0 ||
              processedManufacturerIds.has(row.manufacturer_id)
            ) {
              return; // Skip if already processed by agreement logic
            }

            // Parse program_compliance_achieved (format: "0/2" -> completed: 0, total: 2)
            const complianceParts = (
              row.program_compliance_achieved || "0/0"
            ).split("/");
            const completed = parseInt(complianceParts[0] || "0", 10);
            const total = parseInt(complianceParts[1] || "0", 10);

            // Build manufacturer object
            const manufacturerData = {
              manufacturer: {
                id: row.manufacturer_id,
                name: row.manufacturer_name,
                avatar: row.manufacturer_logo || "",
                authorized: row.authorized !== false
              },
              programCompliance: {
                completed,
                total
              },
              purchaseVolume: {
                amount: Number(row.manufacturer_purchase_volume || 0)
              },
              totalSavings: {
                amount: Number(row.manufacturer_total_earnings || 0)
              },
              totalOppSavings: {
                amount: Number(row.manufacturer_total_earnings_opp || 0)
              },
              isEnrolled: row.program_enrolled === true,
              nearComplianceData: {
                storeId: storeId,
                manufacturerId: row.manufacturer_id,
                programId: row.program_id || 0,
                requiredCount: row.required_count || 0,
                purchasedCount: row.purchased_count || 0,
                highestCompliancePercentage: row.max_compliance_percentage || 0
              }
            };

            // Track near compliance data (max per manufacturer)
            if (
              !nearComplianceDataMap.has(row.manufacturer_id) ||
              (row.max_compliance_percentage || 0) >
                (nearComplianceDataMap.get(row.manufacturer_id)
                  ?.highestCompliancePercentage || 0)
            ) {
              nearComplianceDataMap.set(row.manufacturer_id, {
                storeId: storeId,
                manufacturerId: row.manufacturer_id,
                programId: row.program_id || 0,
                requiredCount: row.required_count || 0,
                purchasedCount: row.purchased_count || 0,
                highestCompliancePercentage: row.max_compliance_percentage || 0
              });
            }

            // Separate enrolled and remaining programs
            if (row.program_enrolled === true) {
              enrolledPrograms.push(manufacturerData);
            } else {
              remainingPrograms.push(manufacturerData);
            }
          });

          // Sort manufacturers by name
          const sortManufacturers = (a: any, b: any) =>
            a.manufacturer.name.localeCompare(b.manufacturer.name);
          enrolledPrograms.sort(sortManufacturers);
          remainingPrograms.sort(sortManufacturers);

          // Calculate total enrolled programs count
          const totalEnrolled = enrolledPrograms.reduce(
            (sum, prog) => sum + prog.programCompliance.total,
            0
          );

          // Calculate completed programs count
          const completedPrograms = enrolledPrograms.reduce(
            (sum, prog) => sum + prog.programCompliance.completed,
            0
          );

          // Build the store object
          const store = {
            id: storeId,
            externalStoreId: firstRow.external_store_id || "",
            userInfo: {
              id: firstRow.user_id || 0,
              status: firstRow.user_status || ""
            },
            storeInfo: {
              name: firstRow.store_name || "",
              location: storeLocation,
              rep: {
                name: firstRow.sales_rep_name || "",
                associatedUserId: firstRow.sales_rep_associated_user_id || 0
              }
            },
            salesData: {
              purchaseVolume: {
                amount: Number(firstRow.total_purchase_volume || 0)
              },
              totalSavings: {
                amount: Number(firstRow.total_savings || 0)
              },
              totalOppSavings: {
                amount: Number(firstRow.total_opp_savings || 0)
              }
            },
            programData: {
              completedPrograms,
              totalEnrolled,
              enrolledProgram: enrolledPrograms,
              remainingProgram: remainingPrograms,
              enrolledProgramIds: enrolledProgramIds || []
            },
            chainId: 0,
            chainNames: "",
            nearComplianceData: Array.from(nearComplianceDataMap.values())
          };

          const formattedData = {
            stores: [store],
            totalStores: 1,
            currentPage: 1,
            totalPages: 1
          };

          // Store in cache if caching is enabled
          // if (useApiCaching) {
          //   await redisClient.setEx(
          //     cacheKey,
          //     CACHE_TTL_TIME,
          //     JSON.stringify(formattedData)
          //   );
          // }

          return formattedData;
        } catch (error) {
          console.error("Error in getStoreDetailsV2:", error);
          throw error;
        }
      }
    );
  }

  /**
   * Retrieves the details of a store's programs by its unique Manufacturer ID and Store ID.
   *
   * This method fetches the programs and products associated with a manufacturer and store.
   * It filters the programs to determine the selected program ID for the tier programs.
   * It fetches the purchased product IDs for the selected program ID.
   * It constructs the tier details based on the core programs and purchased product SKUs.
   * It constructs the recommended and purchased products based on the products and purchased product IDs.
   *
   * @param {number} storeId - The ID of the store to retrieve details for.
   * @param {number} manufacturerId - The ID of the manufacturer to retrieve details for.
   * @param {boolean} isEnrolledPrograms - Whether to filter the result by the store's enrolled programs. Default is false.
   * @returns {Promise<{tierDetails: ManufacturerTierDetail[], additionalInfo: {note: string, recommendedProducts: ManufacturerProduct[], purchasedProducts: ManufacturerProduct[]}}>} - A promise that resolves to an object containing the tier details and additional information.
   */
  public async getStoreProgramsDetailsByManufacturerId({
    storeId,
    manufacturerId,
    isEnrolledPrograms,
    programDetailId,
    includeProgramDetailInTier,
    isManufacturerUser,
    programTimeline,
    isInternalInitiative,
    isChainPrograms = false,
    agreementId
  }: {
    storeId: number;
    manufacturerId: number;
    isEnrolledPrograms: boolean | null;
    programDetailId?: number;
    includeProgramDetailInTier?: boolean;
    isManufacturerUser?: boolean;
    programTimeline?: string;
    isInternalInitiative?: boolean;
    isChainPrograms?: boolean;
    agreementId?: number | number[];
  }) {
    try {
      const distributorId = await StoreRepository.getDistributorId(storeId);

      // Fetch store name and external_store_id
      const store = await StoreModel.findByPk(storeId);
      const storeName = store?.name || null;
      const externalStoreId = (store as any)?.externalStoreId || null;

      // Get warehouse ID directly from the store
      let warehouseId = await StoreRepository.getWarehouseId(storeId);

      // if no warehouse id, get it from the distributor
      if (!warehouseId) {
        const warehouseIds = await DistributorRepository.getWarehouseIds(
          distributorId,
          undefined,
          undefined,
          undefined,
          true
        );
        warehouseId = warehouseIds?.length ? warehouseIds[0] : undefined;
      }

      const ExcludedDistributorsByProgramId =
        await ProgramRepository.getExcludedDistributorsByProgramId(
          manufacturerId,
          distributorId
        );

      let ExcludedProgramDetailIds = isManufacturerUser
        ? []
        : ExcludedDistributorsByProgramId?.map(
            (ed: any) => ed.program_detail_id
          );

      // If distributorId is 0, we can't apply distributor-specific exclusions
      if (distributorId === 0) {
        ExcludedProgramDetailIds = [];
      }

      if (storeId != 0) {
        const ineligibleProgramDetailIds =
          await ProgramRepository.getIneligibleProgramDetailIds(storeId);

        ExcludedProgramDetailIds = [
          ...ExcludedProgramDetailIds,
          ...ineligibleProgramDetailIds
        ];
      }

      // Get program IDs based on isChainPrograms parameter
      let validProgramIds =
        await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
          participantType: isChainPrograms
            ? ENTITY_TYPE.CHAIN
            : ENTITY_TYPE.STORE,
          creatorIds: [manufacturerId],
          creatorType: ENTITY_TYPE.MANUFACTURER,
          secondaryCreatorIds: isManufacturerUser
            ? undefined
            : distributorId === 0
              ? undefined
              : [distributorId],
          secondaryCreatorType: isManufacturerUser
            ? undefined
            : ENTITY_TYPE.DISTRIBUTOR,
          visibilityEntitieIds: [storeId],
          programTimeline,
          getInternalInitiative: isInternalInitiative,
          distributorId: distributorId === 0 ? undefined : distributorId
        });

      // If agreementId is provided, filter validProgramIds to only include agreement's programs
      if (agreementId) {
        try {
          const agreementIdsArray = Array.isArray(agreementId)
            ? agreementId
            : [agreementId];
          const agreementPrograms = await ProgramAgreement.findAll({
            where: {
              agreementId: { [Op.in]: agreementIdsArray },
              deletedAt: null
            },
            attributes: ["programId"],
            raw: true
          });

          // Extract distinct program IDs from agreement
          const agreementProgramIds = [
            ...new Set(agreementPrograms.map((ap: any) => ap.programId))
          ];

          // Filter validProgramIds to only include program IDs that are in the agreement's programs
          // and belong to this manufacturer
          validProgramIds = validProgramIds.filter((programId) =>
            agreementProgramIds.includes(programId)
          );

          // If no valid programs found for agreement, return empty tier details
          if (validProgramIds.length === 0) {
            return {
              storeName: store?.name || null,
              externalStoreId: (store as any)?.externalStoreId || null,
              tierDetails: [],
              additionalInfo: {
                note: null,
                recommendedProducts: [],
                purchasedProducts: []
              }
            };
          }
        } catch (agreementError) {
          console.error(
            "[ERROR] Failed to fetch programs from agreement:",
            agreementError
          );
          // Fallback to all programs if agreement query fails
        }
      }

      // Fetch unique tags for these program IDs
      // TODO: CHECK FOR DISTRIBUTOR PROGRAMS as well
      // const uniqueTags: string[] =
      //   await ProgramRepository.getUniqueProductTagsByProgramIds(
      //     validProgramIds
      //   );
      // Fetch Store Programs and Manufacturer Products
      const [programsResult, productsResult, compliances, manufacturer] =
        await Promise.all([
          isEnrolledPrograms === null
            ? await StoreRepository.getManufacturerProgramsById(
                manufacturerId,
                isChainPrograms ? ENTITY_TYPE.CHAIN : ENTITY_TYPE.STORE, // Added Support for Chain Programs
                validProgramIds,
                ExcludedProgramDetailIds,
                [manufacturerId],
                ENTITY_TYPE.MANUFACTURER,
                isManufacturerUser ? undefined : [distributorId],
                isManufacturerUser ? undefined : ENTITY_TYPE.DISTRIBUTOR,
                programTimeline,
                isInternalInitiative
              )
            : StoreRepository.getStoreManufacturerPrograms(
                manufacturerId,
                isChainPrograms ? ENTITY_TYPE.CHAIN : ENTITY_TYPE.STORE, // Added Support for Chain Programs
                storeId,
                isEnrolledPrograms,
                ExcludedProgramDetailIds,
                validProgramIds,
                programTimeline
              ),
          StoreRepository.getManufacturerProducts({
            manufacturerId,
            storeId,
            distributorId,
            selectedWarehouseId: warehouseId ?? undefined
            // categoryTagsJSON: uniqueTags
          }),
          StoreRepository.getProgramCompliances(
            [storeId],
            undefined,
            manufacturerId,
            isChainPrograms
          ),
          ManufacturerRepository.getManufacturerDetails(manufacturerId, [
            "authorized"
          ])
        ]);

      const isManufacturerAuthorized = manufacturer?.authorized;

      const { coreProductPrograms, allNonTierPrograms } =
        this.filterPrograms(programsResult);

      const productIds = productsResult.map((pr) => pr.id);

      const purchasedProductLineItems =
        (await StoreRepository.getPurchasedProductIdsByProgramIds(
          storeId,
          isChainPrograms ? ENTITY_TYPE.CHAIN : ENTITY_TYPE.STORE, // Added Support for Chain Programs
          productIds,
          undefined,
          true,
          getMinMaxProgramDates(programsResult)
        )) as LineItem[];

      // Extract purchased SKU IDs from line items
      // Note: productId in line items is actually a SKU ID (unit_skus_id, box_skus_id, or case_skus_id)
      // Convert to numbers for consistent comparison
      const purchasedProductIds = purchasedProductLineItems
        .map((item) => Number(item.productId ?? 0))
        .filter((id) => id > 0);

      // Note: Variant mapping is handled in processProducts and getCategorizedProducts methods
      // which use the helper functions mapVariantToPrimaryProduct and getProductToDisplayForPurchase

      const products = updateProductInternalCodesByPurchasedItems(
        productsResult,
        purchasedProductLineItems
      );

      const { recommendedProducts, purchasedProducts } = this.processProducts(
        products,
        purchasedProductIds,
        undefined,
        distributorId,
        isManufacturerUser
      );

      if (!coreProductPrograms.length && !allNonTierPrograms?.length) {
        return {
          storeName,
          externalStoreId,
          tierDetails: [],
          additionalInfo: {
            note: "",
            recommendedProducts: recommendedProducts.slice(0, 20),
            purchasedProducts: purchasedProducts
          }
        };
      }

      const tierDetails: ManufacturerTierDetail[] = await this.getTierDetails(
        coreProductPrograms,
        productsResult,
        includeProgramDetailInTier,
        compliances,
        isManufacturerAuthorized,
        storeId,
        manufacturerId,
        undefined,
        isManufacturerUser
      );

      // Add base program details
      const baseProgramDetails = await Promise.all(
        this.getBaseProgramDetails(
          allNonTierPrograms,
          productsResult,
          includeProgramDetailInTier,
          compliances,
          isManufacturerAuthorized,
          storeId,
          manufacturerId,
          undefined,
          isManufacturerUser
        )
      );

      const tierDetailsResponse = [...tierDetails, ...baseProgramDetails];

      // Simple sort by programId first, then by tier
      const tierDetailsResponseSorted = tierDetailsResponse.sort(
        (a: any, b: any) => {
          // First sort by programId
          const programIdDiff = (a.programId || 0) - (b.programId || 0);
          if (programIdDiff !== 0) return programIdDiff;

          // Then sort by tier within the same program
          return (a.tier || 0) - (b.tier || 0);
        }
      );

      return {
        storeName,
        externalStoreId,
        tierDetails: tierDetailsResponseSorted,
        additionalInfo: {
          recommendedProducts: recommendedProducts,
          purchasedProducts: purchasedProducts
        }
      };
    } catch (error) {
      console.error("Error in getStoreProgramsDetailsByManufacturerId:", error);
      throw error;
    }
  }

  /**
   * Filters the programs results into two categories: core product programs
   * and non-core product programs.
   *
   * @param {any[]} programsResult The list of programs result from the database.
   * @returns {{coreProductPrograms: any[], allNonTierPrograms: any[]}} An object
   * containing two properties: coreProductPrograms and allNonTierPrograms.
   */
  public filterPrograms(programsResult: any[]) {
    const coreProductPrograms = programsResult.filter((pr) => {
      return pr.program_type === PROGRAM_TYPE.TIER;
    });

    const allNonTierPrograms = programsResult.filter(
      (pr) => pr.program_type !== PROGRAM_TYPE.TIER
    );

    return { coreProductPrograms, allNonTierPrograms };
  }

  /**
   * Processes the products result and purchased product IDs to separate
   * products into two categories: recommended products and purchased products.
   *
   * @param {any[]} productsResult The list of products result from the database.
   * @param {number[]} purchasedProductIds The list of purchased product IDs.
   * @returns {{recommendedProducts: ManufacturerProduct[], purchasedProducts: ManufacturerProduct[]}}
   * An object containing two properties: recommendedProducts and purchasedProducts.
   */
  /**
   * Maps a variant product to its primary product.
   * If the product is already primary, returns itself.
   * If the product is a variant, returns the primary product it belongs to.
   *
   * @param {any} product - The product to map (can be variant or primary)
   * @param {any[]} allProducts - Array of all products to search for primary
   * @returns {any | null} - The primary product, or the original product if already primary, or null if not found
   */
  /**
   * Helper function to check if a product is a primary variant
   */
  private isPrimaryVariant(primaryVariant: any): boolean {
    return (
      primaryVariant === true ||
      primaryVariant === 1 ||
      primaryVariant === "1" ||
      primaryVariant === "true" ||
      primaryVariant === "t"
    );
  }

  /**
   * Checks if a product has the required category flag
   * @param product - The product to check
   * @param categoryKey - The category key to check for
   * @param isFlex - Whether this is a Flex category
   * @returns true if the product has the required flag
   */
  private checkCategoryFlag(
    product: any,
    categoryKey: string,
    isFlex: boolean
  ): boolean {
    if (isFlex) {
      return this.isFlexProduct(product);
    }

    // For non-Flex products, check category_flags
    const categoryFlagValue = product.category_flags?.[categoryKey];
    if (categoryFlagValue === true || categoryFlagValue === "true") {
      return true;
    }

    // Check category_tags_json if available
    if (product.category_tags_json) {
      if (Array.isArray(product.category_tags_json)) {
        return product.category_tags_json.includes(categoryKey);
      }
      if (typeof product.category_tags_json === "object") {
        return Object.keys(product.category_tags_json).includes(categoryKey);
      }
    }

    return false;
  }

  /**
   * Determines whether a product should be treated as Flex.
   * This mirrors the logic in filterFlexProducts so categorized products and
   * progress tracking remain aligned.
   */
  private isFlexProduct(product: any): boolean {
    const hasFlexFlag = product.category_flags?.["Flex"] === true;
    const hasFlexDirect = product?.is_flex === true;
    const hasFlexTag =
      Array.isArray(product.category_tags_json) &&
      product.category_tags_json.includes("Flex");

    return hasFlexFlag || hasFlexDirect || hasFlexTag;
  }

  /**
   * Determines which product variant to display based on purchased SKU types
   * Business rules:
   * - If unit SKU of PRIMARY product purchased, always show primary
   * - If only box/case SKUs of VARIANT purchased (no unit SKU), show variant
   * - Otherwise, show primary
   * @param variantProduct - The variant product being evaluated
   * @param primaryProduct - The primary product
   * @param purchasedProductIdsNormalized - Normalized array of purchased product IDs
   * @returns The product to display (primary or variant)
   */
  private determineProductToDisplay(
    variantProduct: any,
    primaryProduct: any,
    purchasedProductIdsNormalized: number[]
  ): any {
    // Check if unit SKU of PRIMARY product was purchased
    const hasPrimaryUnitSKUPurchased =
      primaryProduct.unit_skus_id &&
      purchasedProductIdsNormalized.includes(
        Number(primaryProduct.unit_skus_id)
      );

    // Check if box/case SKUs of VARIANT were purchased (only if different from primary)
    const hasVariantBoxSKUPurchased =
      variantProduct.box_skus_id &&
      variantProduct.box_skus_id !== primaryProduct.box_skus_id &&
      purchasedProductIdsNormalized.includes(
        Number(variantProduct.box_skus_id)
      );

    const hasVariantCaseSKUPurchased =
      variantProduct.case_skus_id &&
      variantProduct.case_skus_id !== primaryProduct.case_skus_id &&
      purchasedProductIdsNormalized.includes(
        Number(variantProduct.case_skus_id)
      );

    // If unit SKU purchased, always show primary
    // If only variant box/case SKUs purchased (no unit), show variant
    // Otherwise, show primary
    return hasPrimaryUnitSKUPurchased ||
      !(hasVariantBoxSKUPurchased || hasVariantCaseSKUPurchased)
      ? primaryProduct
      : variantProduct;
  }

  private mapVariantToPrimaryProduct(
    product: any,
    allProducts: any[]
  ): any | null {
    // Handle both camelCase (parentProductId) and snake_case (parent_product_id) field names
    const parentProductId =
      product.parentProductId ?? product.parent_product_id;
    const primaryVariant = product.primaryVariant ?? product.primary_variant;

    // If product is already primary, return itself
    const isPrimary = this.isPrimaryVariant(primaryVariant);
    const hasNoParent = !parentProductId || parentProductId === null;

    if (isPrimary && hasNoParent) {
      return product;
    }

    // If product has a parent_product_id, find the primary product
    if (parentProductId) {
      const parentId = Number(parentProductId);
      const primaryProduct = allProducts.find((p) => {
        const pIsPrimary = this.isPrimaryVariant(
          p.primaryVariant ?? p.primary_variant
        );
        return Number(p.id) === parentId && pIsPrimary;
      });

      if (primaryProduct) {
        return primaryProduct;
      }
    }

    // Fallback: If no parent_product_id or primary not found by parent, try to find by matching unit_skus_id
    // This handles cases where parent_product_id is not populated but products share the same unit_skus_id
    if (product.unit_skus_id) {
      const primaryByUnitSKU = allProducts.find((p) => {
        const pIsPrimary = this.isPrimaryVariant(
          p.primaryVariant ?? p.primary_variant
        );
        const pParentId = p.parentProductId ?? p.parent_product_id;
        const hasNoParent = !pParentId || pParentId === null;
        const unitSkuMatch =
          Number(p.unit_skus_id) === Number(product.unit_skus_id);
        return unitSkuMatch && pIsPrimary && hasNoParent;
      });

      if (primaryByUnitSKU) {
        return primaryByUnitSKU;
      }
    }

    // If no parent_product_id and not primary, return as-is
    return product;
  }

  /**
   * Determines which product (primary or variant) to display based on purchased SKU types.
   * Business rules:
   * - If unit SKU is purchased (alone or with box/case), show primary product
   * - If only box/case SKUs are purchased (no unit), show variant product
   * - If product is already primary, always show primary
   *
   * @param {number[]} purchasedSKUIds - Array of purchased SKU IDs from line items
   * @param {any} product - The product (variant or primary) to evaluate
   * @param {any[]} allProducts - Array of all products to find primary product
   * @returns {any} - The product to display (primary or variant)
   */
  private getProductToDisplayForPurchase(
    purchasedSKUIds: number[],
    product: any,
    allProducts: any[]
  ): any {
    // Check if SKU IDs match (handle both string and number types)
    const unitSkuId = product.unit_skus_id;
    const boxSkuId = product.box_skus_id;
    const caseSkuId = product.case_skus_id;

    // Normalize purchased SKU IDs to numbers for comparison
    const purchasedSKUIdsNormalized = purchasedSKUIds.map((id) => Number(id));

    const hasUnitSKU =
      unitSkuId && purchasedSKUIdsNormalized.includes(Number(unitSkuId));
    const hasBoxSKU =
      boxSkuId && purchasedSKUIdsNormalized.includes(Number(boxSkuId));
    const hasCaseSKU =
      caseSkuId && purchasedSKUIdsNormalized.includes(Number(caseSkuId));

    const primaryProduct = this.mapVariantToPrimaryProduct(
      product,
      allProducts
    );

    // If unit SKU purchased (alone or with box/case), show primary
    // If only box/case SKUs purchased (no unit), show variant
    // Otherwise, default to primary product
    return hasUnitSKU || !(hasBoxSKU || hasCaseSKU) ? primaryProduct : product;
  }

  public processProducts(
    productsResult: any[],
    purchasedProductIds: number[],
    includeCaseSKUsId?: boolean,
    distributorId?: number,
    isManufacturerUser?: boolean
  ): {
    recommendedProducts: ManufacturerProduct[];
    purchasedProducts: ManufacturerProduct[];
  } {
    const recommendedProducts: ManufacturerProduct[] = [];
    const purchasedProducts: ManufacturerProduct[] = [];
    const uniquePrimaryProductIds = new Set<number>();

    productsResult?.forEach((pr) => {
      // Check if any SKU of this product was purchased
      // IMPORTANT: Keep as strings to avoid precision loss for large integers
      const productSKUIds = [pr.unit_skus_id, pr.case_skus_id, pr.box_skus_id]
        .filter(Boolean)
        .map((id) => String(id)); // Keep as strings!

      // Convert purchasedProductIds to strings for comparison
      const purchasedProductIdsAsStrings = purchasedProductIds.map((id) =>
        String(id)
      );

      const hasPurchasedSKU = productSKUIds.some((skuId) =>
        purchasedProductIdsAsStrings.includes(skuId)
      );

      if (hasPurchasedSKU) {
        // Determine which product to display (primary or variant)
        const productToDisplay = this.getProductToDisplayForPurchase(
          purchasedProductIds,
          pr,
          productsResult
        );

        // Map to primary product for tracking unique counts
        const primaryProduct = this.mapVariantToPrimaryProduct(
          productToDisplay,
          productsResult
        );

        // Only add if we haven't already added this primary product
        if (primaryProduct && !uniquePrimaryProductIds.has(primaryProduct.id)) {
          uniquePrimaryProductIds.add(primaryProduct.id);

          const lastTransactionDate = getLastTransactionDate(productToDisplay);
          const originalCode = getInternalCode(productToDisplay);
          const internalCode = getActiveInternalCode(
            originalCode,
            lastTransactionDate,
            distributorId
          );
          // oldInternalCode should always contain the original code for reference/troubleshooting
          // It should be NULL only if there was no original code in the database
          const oldInternalCode = originalCode;

          // Resolve product name based on user role and warehouse-specific data
          const { name, is_warehouse_specific_product } = resolveProductName(
            productToDisplay,
            isManufacturerUser || false
          );

          const detail: any = {
            id: productToDisplay.id,
            name: name,
            is_warehouse_specific_product: is_warehouse_specific_product,
            size: productToDisplay.size,
            unitSkusId: productToDisplay.unit_skus_id,
            boxSkusId: productToDisplay.box_skus_id,
            caseSkusId: includeCaseSKUsId
              ? productToDisplay.case_skus_id != null
                ? String(productToDisplay.case_skus_id)
                : null // Ensure it's a string or null
              : undefined,
            internalCode: internalCode,
            oldInternalCode: oldInternalCode,
            lastTransactionDate: lastTransactionDate,
            wishlist: productToDisplay.wishlist || false
          };

          purchasedProducts.push(detail);
        }
      }

      // Flex Products (not purchased)
      // Use string comparison to avoid precision loss (reuse the same variable from above)
      if (
        this.isFlexProduct(pr) &&
        !purchasedProductIdsAsStrings.includes(String(pr.case_skus_id)) &&
        !purchasedProductIdsAsStrings.includes(String(pr.unit_skus_id)) &&
        !purchasedProductIdsAsStrings.includes(String(pr.box_skus_id))
      ) {
        const lastTransactionDate = getLastTransactionDate(pr);
        const originalCode = getInternalCode(pr);
        const internalCode = getActiveInternalCode(
          originalCode,
          lastTransactionDate,
          distributorId
        );
        // oldInternalCode should always contain the original code for reference/troubleshooting
        // It should be NULL only if there was no original code in the database
        const oldInternalCode = originalCode;

        // Resolve product name based on user role and warehouse-specific data
        const { name, is_warehouse_specific_product } = resolveProductName(
          pr,
          isManufacturerUser || false
        );

        const detail: ManufacturerProduct = {
          id: pr.id,
          name: name,
          is_warehouse_specific_product: is_warehouse_specific_product,
          size: pr.size,
          caseSkusId: includeCaseSKUsId
            ? pr?.case_skus_id != null
              ? String(pr.case_skus_id)
              : null
            : undefined,
          internalCode: internalCode,
          oldInternalCode: oldInternalCode,
          lastTransactionDate: lastTransactionDate,
          wishlist: pr.wishlist
        };
        recommendedProducts.push(detail);
      }
    });

    return { recommendedProducts, purchasedProducts };
  }

  /**
   * This method takes a list of core programs, products, and other required parameters
   * and returns a list of tier details.
   *
   * @param {any[]} corePrograms The list of core programs.
   * @param {any[]} products The list of products.
   * @param {boolean} [includeDetails=false] A boolean indicating whether to include
   * details in the tier details response.
   * @param {any[]} [compliances] The list of compliances.
   * @param {boolean} [isManufacturerAuthorized=false] A boolean indicating whether
   * the manufacturer is authorized.
   * @param {number} [storeId] The ID of the store.
   * @param {number} [manufacturerId] The ID of the manufacturer.
   * @returns {Promise<any[]>}
   */
  public async getTierDetails(
    corePrograms: any[],
    products: any[],
    includeDetails?: boolean,
    compliances?: any[],
    isManufacturerAuthorized?: boolean,
    storeId?: number,
    manufacturerId?: number,
    aggregationsMap?: Map<number, any>,
    isManufacturerUser?: boolean
  ) {
    const tierDetails = corePrograms
      .filter((pr) => pr.tier)
      .map(
        async (pr) =>
          await this.generateProgramDetail(
            pr,
            products,
            includeDetails,
            !!compliances?.find(
              (com) =>
                com.programdetailid == pr.program_detail_id && com.isqualified
            ),
            isManufacturerAuthorized,
            storeId,
            manufacturerId,
            aggregationsMap,
            compliances,
            isManufacturerUser
          )
      );

    return Promise.all(tierDetails);
  }

  /**
   * Retrieves detailed information for non-tier programs.
   *
   * This function generates detailed information for each non-tier program
   * by mapping through the provided programs and invoking the `generateProgramDetail`
   * method. The detailed information includes various attributes based on the
   * program and its compliance status.
   *
   * @param {any[]} allNonTierPrograms - The list of non-tier programs.
   * @param {any[]} products - The list of products associated with the programs.
   * @param {boolean} [includeDetails] - Whether to include additional details.
   * @param {any[]} [compliances] - The list of compliances to consider for qualification.
   * @param {boolean} [isManufacturerAuthorized] - Whether the manufacturer is authorized.
   * @param {number} [storeId] - The store ID related to the programs.
   * @param {number} [manufacturerId] - The manufacturer ID related to the programs.
   * @returns {Promise<any[]>} An array of detailed program information.
   */
  public getBaseProgramDetails(
    allNonTierPrograms: any[],
    products: any[],
    includeDetails?: boolean,
    compliances?: any[],
    isManufacturerAuthorized?: boolean,
    storeId?: number,
    manufacturerId?: number,
    aggregationsMap?: Map<number, any>,
    isManufacturerUser?: boolean
  ) {
    // Map through each non-tier program to generate its details
    return allNonTierPrograms.map(
      async (pr) =>
        // For each program, generate detailed information using generateProgramDetail
        await this.generateProgramDetail(
          pr,
          products,
          includeDetails,
          !!compliances?.find(
            (com) =>
              com.programdetailid == pr.program_detail_id && com.isqualified
          ),
          isManufacturerAuthorized,
          storeId,
          manufacturerId,
          aggregationsMap,
          compliances,
          isManufacturerUser
        )
    );
  }

  /**
   * Generates detailed information for a program.
   *
   * This function generates a `ManufacturerTierDetail` object that contains
   * the title, overview, and additional details about a program. The additional
   * details may include the number of core SKUs purchased, the rebate calculation
   * and amount, and a graph and progress text about the program's progress.
   *
   * @param {any} pr - The program object.
   * @param {number} [corePurchasedCount] - The number of core SKUs purchased.
   * @param {boolean} [includeDetails] - Whether to include additional details.
   * @param {LineItem[]} [transactions] - The list of transactions to consider.
   * @param {LineItem[]} [salesTransactions] - The list of sales transactions to consider.
   * @returns {ManufacturerTierDetail} - The program detail.
   */
  private async generateProgramDetail(
    pr: any,
    products: any[],
    includeDetails?: boolean,
    isComplianceQualified: boolean = false,
    isManufacturerAuthorized?: boolean,
    storeId?: number,
    manufacturerId?: number,
    aggregationsMap?: Map<number, any>,
    compliances?: any[],
    isManufacturerUser?: boolean
  ): Promise<ManufacturerTierDetail> {
    // Get distributorId for grey-out logic and UPC filtering
    const distributorId = storeId
      ? await StoreRepository.getDistributorId(storeId)
      : undefined;

    // Check if distributor is enabled for UPC filtering
    // For PurchaseQuantity: requires per_category_item rebate_type
    const isNCDPurchaseQuantityCase =
      distributorId !== undefined &&
      PURCHASE_QUANTITY_WITH_PER_CATEGORY_ITEM_TRACKER_DISTRIBUTOR_IDS.includes(
        distributorId
      ) &&
      pr.rebate_type === "per_category_item" &&
      pr.criteria === ProgramsDetailCriteria.PurchaseQuantity;

    // Fetch transaction line items for program date range if store and manufacturer IDs provided
    const transactionLineItems =
      storeId && manufacturerId
        ? await StoreRepository.getTransactionsByManufacturerId(
            [storeId],
            [manufacturerId],
            ENTITY_TYPE.STORE,
            false,
            undefined,
            undefined,
            undefined,
            undefined,
            { startDate: pr.start_date, endDate: pr.end_date },
            true,
            isNCDPurchaseQuantityCase // includeUpcType: true for NCD special case
          )
        : [];

    // Fetch sales transaction line items for program date range if needed for POD calculations
    const salesTransactionLineItems =
      storeId && manufacturerId
        ? await StoreRepository.getTransactionsByManufacturerId(
            [storeId],
            [manufacturerId],
            ENTITY_TYPE.DISTRIBUTOR,
            true,
            undefined,
            undefined,
            true,
            undefined,
            { startDate: pr.start_date, endDate: pr.end_date }
          )
        : [];

    const productCategoryTags =
      await StoreRepository.getCategoryTagsReference();

    // Filter line items by UPC type for NCD special case BEFORE aggregation
    let filteredTransactionLineItems = transactionLineItems;
    if (
      isNCDPurchaseQuantityCase &&
      transactionLineItems &&
      transactionLineItems.length > 0
    ) {
      const QtyType = pr.quantity_type?.toLowerCase();
      let upcTypeFilter: string[] = [];

      if (QtyType === "case") {
        upcTypeFilter = ["Case", "Case UPC", "New Case UPC"];
      } else if (QtyType === "box") {
        upcTypeFilter = [
          "Box",
          "Box UPC",
          "New Box UPC",
          "Case",
          "Case UPC",
          "New Case UPC"
        ];
      }

      if (upcTypeFilter.length > 0) {
        filteredTransactionLineItems = transactionLineItems.filter(
          (item: any) => {
            const itemUpcType =
              item.upc_type || item.upcType || item.get?.("upc_type");
            // Only include items with valid upc_type that matches filter
            // Exclude null, undefined, or empty string values
            return (
              itemUpcType !== undefined &&
              itemUpcType !== null &&
              itemUpcType !== "" &&
              upcTypeFilter.includes(itemUpcType)
            );
          }
        );
      }
    }

    // Aggregate line items by product_id to calculate net prices and quantities
    // This handles returns and multiple purchases of the same SKU correctly
    // Business Rule: Count products where net price > 0 (regardless of quantity)
    // Reason: Store might buy boxes but return units, resulting in negative net quantity
    // but positive net spend, which should still count for compliance (Product 23211 case)
    const productAggregateMap = new Map<
      number,
      {
        totalPrice: number;
        totalQuantity: number;
        internalCode?: string;
      }
    >();

    filteredTransactionLineItems?.forEach((item: any) => {
      const productId = item.product_id;
      const totalPrice = parseFloat(item?.total_price || "0");
      const quantity = parseFloat(item?.quantity || "0");

      if (productId) {
        const current = productAggregateMap.get(productId) || {
          totalPrice: 0,
          totalQuantity: 0,
          internalCode: item.internal_code
        };
        productAggregateMap.set(productId, {
          totalPrice: current.totalPrice + totalPrice,
          totalQuantity: current.totalQuantity + quantity,
          // Preserve internal_code from first item (or existing value)
          internalCode: current.internalCode || item.internal_code
        });
      }
    });

    // Create aggregated line items (one per SKU) with net positive price
    // Filter by ONLY positive net price (NOT quantity)
    // This matches the SQL logic: HAVING SUM(li.total_price) > 0
    const aggregatedLineItems = Array.from(productAggregateMap.entries())
      .filter(([, agg]) => agg.totalPrice > 0)
      .map(([productId, agg]) => ({
        product_id: productId,
        total_price: agg.totalPrice.toString(),
        quantity: agg.totalQuantity.toString(),
        internal_code: agg.internalCode || "NA"
      }));

    // Extract purchased product IDs for backward compatibility
    // Normalize to numbers to ensure consistent comparison
    const purchasedProductIds = aggregatedLineItems
      .map((item) => Number(item.product_id))
      .filter((id) => id > 0);

    // Count the number of unique core primary products (not variants)
    const uniqueCorePrimaryProductIds = new Set<number>();
    products.forEach((pr) => {
      if (pr?.category_flags?.["Core_Product"]) {
        const productSKUIds = [pr.unit_skus_id, pr.case_skus_id, pr.box_skus_id]
          .filter(Boolean)
          .map((id) => Number(id));

        // Check if any SKU of this product was purchased
        const hasPurchasedSKU = productSKUIds.some((skuId) =>
          purchasedProductIds.includes(skuId)
        );

        if (hasPurchasedSKU) {
          // Map to primary product for counting
          const primaryProduct = this.mapVariantToPrimaryProduct(pr, products);
          if (primaryProduct) {
            uniqueCorePrimaryProductIds.add(primaryProduct.id);
          }
        }
      }
    });

    const corePurchasedCount = uniqueCorePrimaryProductIds.size;

    // Initialize program detail object with basic info
    const detail: ManufacturerTierDetail = {
      title: pr.tier
        ? `${pr.program_header} - Tier ${pr.tier}`
        : pr.program_header,
      overview: pr.overview,
      tier: pr.tier
    };

    // Add SKU progress if required core SKUs are defined
    if (
      pr.required_core_skus !== undefined &&
      corePurchasedCount !== undefined
    ) {
      detail.SKU = {
        completed: Math.min(corePurchasedCount, pr.required_core_skus),
        total: pr.required_core_skus
      };
    }

    // Include rebate calculation details if requested
    if (includeDetails) {
      detail.rebate_calculation = pr.rebate_calculation;
      detail.rebate_percentage = pr.rebate_percentage;
      detail.rebate_amount = pr.rebate_amount;
      detail.rebate_type = pr.rebate_type;
      detail.fixed_rebate_amount = pr.fixed_rebate_amount;
    }

    // Generate progress graph and text based on program criteria
    // Pass aggregated line items (one per SKU with net positive price) for accurate counting
    const { graph, progressText } = this.generateGraphAndProgressText(
      pr,
      products,
      productCategoryTags,
      aggregatedLineItems as any, // Type cast needed as aggregatedLineItems is simplified structure
      salesTransactionLineItems,
      purchasedProductIds,
      distributorId, // Pass distributorId for NCD special case handling
      pr.rebate_type // Pass rebate_type for NCD special case handling
    );
    detail.graph = graph;
    detail.progressAchieved = progressText;

    // Add compliance and rebate calculation information
    detail.isProgramComplianceQualified = isComplianceQualified;
    detail.isRebateBasedOnListPrice = isListPriceApplicable(
      pr?.rebate_calculation_type ?? ""
    );
    detail.programId = pr.program_id;

    // Remove SKU details if program is not created
    if (!pr.create) detail.SKU = undefined;

    // Process product tags for categorization
    const productTagsArray = pr?.products_tags
      ?.split(",")
      ?.map((tag: string) => tag.trim());

    const diffCatQty: string[] =
      pr.products_tags_qty?.split(",")?.map((qty: string) => qty.trim()) ?? [];

    // Generate categorized products list
    // Pass aggregated line items for consistency with graph/progress calculations
    detail.categorizedProducts = await this.getCategorizedProducts(
      productTagsArray,
      products,
      purchasedProductIds,
      diffCatQty,
      isManufacturerAuthorized,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      aggregatedLineItems as any,
      distributorId,
      isManufacturerUser
    );
    detail.programDetailId = pr.program_detail_id;

    // Extract rebate_opportunity from compliances if available
    if (compliances && pr.program_detail_id) {
      const matchingCompliance = compliances.find(
        (com) => com.programdetailid == pr.program_detail_id
      );

      if (
        matchingCompliance?.earning_opportunity !== undefined &&
        matchingCompliance?.earning_opportunity !== null &&
        matchingCompliance?.earning_opportunity !== ""
      ) {
        // Convert string to number if it's a valid numeric string, otherwise keep as string
        const earningOpportunity = matchingCompliance.earning_opportunity;
        if (typeof earningOpportunity === "string") {
          const parsed = parseFloat(earningOpportunity);
          detail.rebate_opportunity = isNaN(parsed)
            ? earningOpportunity
            : parsed;
        } else {
          detail.rebate_opportunity = earningOpportunity;
        }
      }
    }

    // Add aggregated purchase volume and earnings for distributor programs
    if (aggregationsMap && pr.program_detail_id) {
      const aggregation = aggregationsMap.get(pr.program_detail_id);
      if (aggregation) {
        detail.purchaseVolume = aggregation.purchaseVolume || 0;
        detail.estimatedEarnings = aggregation.estimatedEarnings || 0;
      }
    }

    return detail;
  }

  /**
   * Maps and filters products based on provided conditions.
   * This helper function is used to process products for both purchased and required categories.
   *
   * @param {any[]} products - Array of products to process
   * @param {Function} filterCondition - Function that determines if a product should be included
   * @param {number} size - Maximum number of products to return
   * @param {Set<number>} [uniquePurchasedProductIds] - Set to track unique purchased product IDs
   * @param {boolean} [includeCaseSKUsId] - Flag to include case SKU IDs in the output
   * @returns {Array} Processed array of products with specified fields
   */
  private mapProducts = (
    products: any[],
    filterCondition: (pro: ManufacturerProduct) => boolean,
    size: number,
    uniquePurchasedProductIds?: Set<number>,
    includeCaseSKUsId?: boolean,
    distributorId?: number,
    isManufacturerUser?: boolean
  ) => {
    const filteredProducts = products?.filter(filterCondition) ?? [];
    const limitedProducts = filteredProducts.slice(0, size);

    if (uniquePurchasedProductIds) {
      limitedProducts.forEach((pro) => {
        uniquePurchasedProductIds.add(pro.id ?? 0);
      });
    }

    return limitedProducts.map((pro) => {
      const lastTransactionDate = getLastTransactionDate(pro);
      const originalCode = getInternalCode(pro);
      const internalCode = getActiveInternalCode(
        originalCode,
        lastTransactionDate,
        distributorId
      );
      // oldInternalCode should always contain the original code for reference/troubleshooting
      // It should be NULL only if there was no original code in the database
      const oldInternalCode = originalCode;

      // Resolve product name based on user role and warehouse-specific data
      const { name, is_warehouse_specific_product } = resolveProductName(
        pro,
        isManufacturerUser || false
      );

      return {
        id: pro.id,
        name: name,
        is_warehouse_specific_product: is_warehouse_specific_product,
        size: pro.size,
        caseSkusId: includeCaseSKUsId
          ? pro?.case_skus_id != null
            ? String(pro.case_skus_id)
            : null
          : undefined,
        unitSkusId: pro?.unit_skus_id,
        boxSkusId: pro?.box_skus_id,
        wishlist: pro?.wishlist || false,
        internalCode: internalCode,
        oldInternalCode: oldInternalCode,
        lastTransactionDate: lastTransactionDate
      };
    });
  };

  /**
   * Categorizes products based on their tags and purchase status.
   * This function processes products and organizes them into purchased and required categories
   * based on the provided tags and quantities.
   *
   * @param {string[]} productTagsArray - Array of product tags to categorize by (e.g., ["Core_Product", "Flex"])
   * @param {any[]} products - Array of all available products with their details
   * @param {number[]} purchasedProductIds - Array of product IDs that have been purchased
   * @param {string[]} productTagsCountArray - Array of required quantities for each tag category
   * @param {boolean} [isManufacturerAuthorized] - Flag indicating if manufacturer is authorized
   * @param {boolean} [includeCaseSKUsId] - Flag to include case SKU IDs in the output
   * @param {boolean} [displayAllInRequired] - Flag to show all products in required category
   * @returns {CategorizedProducts | undefined} Object containing categorized products or undefined if no tags provided
   *
   * Example output structure:
   * {
   *   "Core_Product": {
   *     purchasedProducts: [...],
   *     requiredProducts: [...],
   *     note: "Carry 2 products" // Only for Flex products when not authorized
   *   },
   *   "Flex": {
   *     purchasedProducts: [...],
   *     requiredProducts: [...],
   *     note: "Carry any products"
   *   }
   * }
   */
  public async getCategorizedProducts(
    productTagsArray: string[],
    products: any[],
    purchasedProductIds: number[],
    productTagsCountArray: string[],
    isManufacturerAuthorized?: boolean,
    includeCaseSKUsId?: boolean,
    displayAllInRequired: boolean = false,
    isDistributorProductsListing: boolean = false,
    filterRequiredByTagQuantity?: boolean,
    returnListIfPurchasedRequired?: boolean,
    transactionLineItems?: LineItem[],
    distributorId?: number,
    isManufacturerUser?: boolean
  ): Promise<CategorizedProducts | undefined> {
    // Return undefined if no tags provided to categorize by
    if (!productTagsArray?.length) return undefined;

    // Initialize the result object and tracking set
    let storeProductsDetails: CategorizedProducts = {};
    // Track unique primary product IDs (not variant IDs) to avoid duplicate counting
    const uniquePurchasedPrimaryProductIds = new Set<number>();

    // Build a set of primary product IDs that correspond to purchased SKU IDs
    // Used later to keep requiredProducts from including purchased items
    const purchasedProductIdsSet = new Set<number>();

    products.forEach((pro) => {
      const productSKUIds = [
        pro.case_skus_id,
        pro.unit_skus_id,
        pro.box_skus_id
      ].filter(Boolean);

      // Use string comparison to avoid precision loss
      const productSKUIdsAsStrings = productSKUIds.map((id) => String(id));
      const purchasedProductIdsAsStrings = purchasedProductIds.map((id) =>
        String(id)
      );

      if (
        productSKUIdsAsStrings.some((skuId) =>
          purchasedProductIdsAsStrings.includes(skuId)
        )
      ) {
        // Map to primary product ID for tracking
        const primaryProduct = this.mapVariantToPrimaryProduct(pro, products);
        if (primaryProduct) {
          purchasedProductIdsSet.add(primaryProduct.id);
        } else {
          purchasedProductIdsSet.add(pro.id);
        }
      }
    });

    const productCategoryTags =
      await StoreRepository.getCategoryTagsReference();

    const diffCat = mapTagsToCategoryObjects(
      productTagsArray?.join(","),
      productCategoryTags
    );

    const sortedTags = [
      ...diffCat.filter((cat) => cat.tagKey?.trim()?.toLowerCase() !== "flex"),
      ...diffCat.filter((cat) => cat.tagKey?.trim()?.toLowerCase() === "flex")
    ];

    // Pre-calculation pass: Track SKUs and primary product IDs claimed by non-Flex categories
    // This ensures Flex category excludes products already claimed by Core Retail, etc.
    const skusUsedForOverallGraph = new Set<string>();
    const primaryProductIdsUsedForOverallGraph = new Set<number>(); // Track unique primary products for exclusion
    sortedTags.forEach((cat: any) => {
      const index = diffCat.findIndex((ct: any) => ct.tagKey == cat.tagKey);
      const normalizedTag = cat.tagKey?.trim()?.toLowerCase();
      const isFlex = normalizedTag === "flex";

      if (!isFlex && transactionLineItems) {
        const totalRequired =
          productTagsCountArray?.length > index
            ? parseInt(productTagsCountArray[index])
            : PROGRAM_TIER_MODAL.MAX_PRODUCTS;
        const columnName = cat.tagKey;

        // Get SKUs claimed by this non-Flex category
        const claimedSKUs =
          this.getDistinctSKUProducts(
            products,
            columnName,
            transactionLineItems,
            skusUsedForOverallGraph, // Exclude SKUs already claimed by prior categories
            totalRequired
          ) ?? [];

        // Add to master set for exclusion from Flex category
        claimedSKUs.forEach((sku) => skusUsedForOverallGraph.add(sku));

        // Track primary product IDs for this non-Flex category
        claimedSKUs.forEach((skuId) => {
          const skuIdNum = Number(skuId);
          const product = products.find(
            (p) =>
              Number(p.unit_skus_id) === skuIdNum ||
              Number(p.box_skus_id) === skuIdNum ||
              Number(p.case_skus_id) === skuIdNum
          );
          if (product) {
            const primaryProduct = this.mapVariantToPrimaryProduct(
              product,
              products
            );
            if (primaryProduct) {
              primaryProductIdsUsedForOverallGraph.add(primaryProduct.id);
            }
          }
        });
      }
    });

    // Process each tag to categorize products
    sortedTags.map((cat: any) => {
      const index = diffCat.findIndex((ct: any) => ct.tagKey == cat.tagKey);

      // Get required quantity for this tag category, default to MAX_PRODUCTS if not specified
      const requiredQty =
        productTagsCountArray?.length > index
          ? parseInt(productTagsCountArray[index])
          : PROGRAM_TIER_MODAL.MAX_PRODUCTS;
      // Normalize tag and determine if it's a flex tag
      const normalizedTag = cat.tagKey?.trim()?.toLowerCase();
      const isFlex = normalizedTag === "flex";
      const tagValue = cat.tagName;
      const key = cat.tagKey;

      // Filter products based on tag and manufacturer authorization
      // For flex products, only show if manufacturer is authorized
      const filteredProducts = products.filter((product) => {
        // Check if product has the required flag in category_flags
        const hasFlag = product.category_flags?.[key] === true;
        // For flex products, filter by Flex tagging/flags
        return isFlex ? this.isFlexProduct(product) : hasFlag;
      });

      const productWithInternalCode = transactionLineItems
        ? products?.map((pro) => {
            const productIds = [
              pro.case_skus_id,
              pro.unit_skus_id,
              pro.box_skus_id
            ];

            const purchasedProduct: any = transactionLineItems?.find(
              (item: any) => productIds.includes(item.product_id)
            );

            return {
              ...pro,
              internal_code: purchasedProduct
                ? purchasedProduct.internal_code
                : pro.internal_code
            };
          })
        : products;

      // Process purchased products
      // - Check if product is purchased (in purchasedProductIds)
      // - Map variant products to primary products for counting
      // - Track unique primary product IDs to avoid duplicates
      // - Determine which product to display (primary vs variant) based on SKU types purchased
      // - Check appropriate flag based on tag type

      // Track unique primary product IDs for this category
      const uniquePrimaryProductIdsForCategory = new Set<number>();
      const purchasedProductsList: any[] = [];

      // Normalize purchasedProductIds to numbers (handle both string and number types)
      const purchasedProductIdsNormalized = purchasedProductIds
        .map((id) => Number(id))
        .filter((id) => id > 0);

      // For Flex category, use filterFlexProducts to get eligible SKUs (excludes SKUs and primary products claimed by non-Flex categories)
      // This matches the logic used in generateGraphAndProgressText for consistency
      let eligibleFlexSKUs: Set<string> = new Set();
      const eligibleFlexPrimaryProductIds: Set<number> = new Set();
      if (isFlex && transactionLineItems) {
        // Create a copy of primaryProductIdsUsedForOverallGraph to pass to filterFlexProducts
        // This ensures we exclude primary products already counted in non-Flex categories
        const excludedPrimaryProductIds = new Set(
          primaryProductIdsUsedForOverallGraph
        );

        const eligibleFlexSKUsArray = this.filterFlexProducts(
          products,
          purchasedProductIdsNormalized,
          diffCat?.map((cat) => cat.tagKey),
          requiredQty,
          Array.from(skusUsedForOverallGraph), // Exclude SKUs claimed by non-Flex categories
          excludedPrimaryProductIds // Exclude primary products already counted in non-Flex categories
        );
        eligibleFlexSKUs = new Set(eligibleFlexSKUsArray);

        // Map eligible SKUs to primary product IDs to track which products should be shown
        eligibleFlexSKUs.forEach((skuIdStr) => {
          const skuIdNum = Number(skuIdStr);
          const product = products.find(
            (p) =>
              Number(p.unit_skus_id) === skuIdNum ||
              Number(p.box_skus_id) === skuIdNum ||
              Number(p.case_skus_id) === skuIdNum
          );
          if (product) {
            const primaryProduct = this.mapVariantToPrimaryProduct(
              product,
              products
            );
            if (primaryProduct) {
              eligibleFlexPrimaryProductIds.add(primaryProduct.id);
            }
          }
        });
      }

      // For Flex categories, build the purchased products list directly from eligible SKUs
      // This matches exactly how the progress tracker counts them (unique primary products)
      if (isFlex && eligibleFlexSKUs.size > 0) {
        // Build list directly from eligible SKUs, mapping to unique primary products
        // This ensures the count matches exactly what the progress tracker shows
        const processedPrimaryProductIds = new Set<number>();

        eligibleFlexSKUs.forEach((skuIdStr) => {
          const skuIdNum = Number(skuIdStr);

          // Find the product that has this SKU (same logic as progress tracker)
          const productWithSKU = products.find(
            (p) =>
              Number(p.unit_skus_id) === skuIdNum ||
              Number(p.box_skus_id) === skuIdNum ||
              Number(p.case_skus_id) === skuIdNum
          );

          if (!productWithSKU) return;

          // Map to primary product (same logic as progress tracker)
          const primaryProduct = this.mapVariantToPrimaryProduct(
            productWithSKU,
            products
          );
          if (!primaryProduct) return;

          // Skip if we've already processed this primary product (count unique primary products only)
          if (processedPrimaryProductIds.has(primaryProduct.id)) return;

          // Mark this primary product as processed
          processedPrimaryProductIds.add(primaryProduct.id);
          uniquePrimaryProductIdsForCategory.add(primaryProduct.id);

          // Check which SKU types were purchased to determine which product variant to display
          const hasPrimaryUnitSKUPurchased =
            primaryProduct.unit_skus_id &&
            skuIdNum === Number(primaryProduct.unit_skus_id);

          // Find variants that might have been purchased
          const variants = products.filter(
            (p) =>
              p.primary_variant_id === primaryProduct.id ||
              (p.id === primaryProduct.id && p.primary_variant)
          );
          if (!primaryProduct) return;

          let variantWithBoxOrCasePurchased: any = null;
          for (const variant of variants) {
            const hasVariantBoxSKUPurchased =
              variant.box_skus_id &&
              variant.box_skus_id !== primaryProduct.box_skus_id &&
              skuIdNum === Number(variant.box_skus_id);
            const hasVariantCaseSKUPurchased =
              variant.case_skus_id &&
              variant.case_skus_id !== primaryProduct.case_skus_id &&
              skuIdNum === Number(variant.case_skus_id);

            if (hasVariantBoxSKUPurchased || hasVariantCaseSKUPurchased) {
              variantWithBoxOrCasePurchased = variant;
              break;
            }
          }

          // Determine which product to display based on business rules
          const finalProductToAdd = hasPrimaryUnitSKUPurchased
            ? primaryProduct
            : variantWithBoxOrCasePurchased || primaryProduct;

          // Add to purchased products list
          const lastTransactionDate = getLastTransactionDate(finalProductToAdd);
          const originalCode = getInternalCode(finalProductToAdd);
          const internalCode = getActiveInternalCode(
            originalCode,
            lastTransactionDate,
            distributorId
          );
          const oldInternalCode = originalCode; // Always keep original code

          // Resolve product name based on user role and warehouse-specific data
          const { name, is_warehouse_specific_product } = resolveProductName(
            finalProductToAdd,
            isManufacturerUser || false
          );

          purchasedProductsList.push({
            id: finalProductToAdd.id,
            name: name,
            size: finalProductToAdd.size,
            unitSkusId: finalProductToAdd.unit_skus_id,
            boxSkusId: finalProductToAdd.box_skus_id,
            caseSkusId: includeCaseSKUsId
              ? finalProductToAdd.case_skus_id != null
                ? String(finalProductToAdd.case_skus_id)
                : null
              : undefined,
            wishlist: finalProductToAdd.wishlist || false,
            internalCode: internalCode,
            oldInternalCode: oldInternalCode,
            lastTransactionDate: lastTransactionDate,
            is_warehouse_specific_product: is_warehouse_specific_product
          });
        });
      } else {
        // For non-Flex categories, use the original logic
        productWithInternalCode.forEach((pro: any) => {
          // Early return: Check category flag first
          const hasFlag = this.checkCategoryFlag(pro, key, isFlex);
          if (!hasFlag) return;

          // Early return: Check if any SKU was purchased
          const productSKUIds = [
            pro.case_skus_id,
            pro.unit_skus_id,
            pro.box_skus_id
          ].filter(Boolean);
          const productSKUIdsNormalized = productSKUIds.map((id) => Number(id));
          const hasPurchasedSKU = productSKUIdsNormalized.some((skuId) =>
            purchasedProductIdsNormalized.includes(skuId)
          );
          if (!hasPurchasedSKU) return;

          // Early return: Map to primary product and validate
          const primaryProduct = this.mapVariantToPrimaryProduct(pro, products);
          if (!primaryProduct) return;

          // Early return: Check if already counted
          if (uniquePrimaryProductIdsForCategory.has(primaryProduct.id)) return;

          // Determine which product variant to display
          const finalProductToAdd = this.determineProductToDisplay(
            pro,
            primaryProduct,
            purchasedProductIdsNormalized
          );

          // Mark as counted and add to list
          uniquePrimaryProductIdsForCategory.add(primaryProduct.id);
          const lastTransactionDate = getLastTransactionDate(finalProductToAdd);
          const originalCode = getInternalCode(finalProductToAdd);
          const internalCode = getActiveInternalCode(
            originalCode,
            lastTransactionDate,
            distributorId
          );
          const oldInternalCode = originalCode; // Always keep original code

          // Resolve product name based on user role and warehouse-specific data
          const { name, is_warehouse_specific_product } = resolveProductName(
            finalProductToAdd,
            isManufacturerUser || false
          );

          purchasedProductsList.push({
            id: finalProductToAdd.id,
            name: name,
            is_warehouse_specific_product: is_warehouse_specific_product,
            size: finalProductToAdd.size,
            unitSkusId: finalProductToAdd.unit_skus_id,
            boxSkusId: finalProductToAdd.box_skus_id,
            caseSkusId: includeCaseSKUsId
              ? finalProductToAdd.case_skus_id != null
                ? String(finalProductToAdd.case_skus_id)
                : null
              : undefined,
            wishlist: finalProductToAdd.wishlist || false,
            internalCode: internalCode,
            oldInternalCode: oldInternalCode,
            lastTransactionDate: lastTransactionDate
          });
        });
      }

      // Limit to required quantity
      // For Flex categories, the list is already built from eligible SKUs mapped to unique primary products,
      // so it should match the progress tracker count exactly. This slice is just a safeguard.
      const purchasedProducts = purchasedProductsList.slice(0, requiredQty);

      // For Flex category, update skusUsedForOverallGraph with eligible SKUs
      // This ensures subsequent Flex categories (if any) exclude these SKUs
      if (isFlex && eligibleFlexSKUs.size > 0) {
        eligibleFlexSKUs.forEach((sku) => skusUsedForOverallGraph.add(sku));
      }

      // Update the global tracking set with primary product IDs from this category
      purchasedProducts.forEach((prod) => {
        const prodInList = products.find((p) => p.id === prod.id);
        if (prodInList) {
          const primaryProduct = this.mapVariantToPrimaryProduct(
            prodInList,
            products
          );
          if (primaryProduct) {
            uniquePurchasedPrimaryProductIds.add(primaryProduct.id);
          }
        }
      });

      // Process required products
      // - For flex products, use filtered products list
      // - For other tags, use all products
      // - Check if product is already purchased
      // - Check appropriate flag based on tag type
      // - Deduplicate products with same SKU ID, prioritizing primary variant
      const productsForRequired = isFlex ? filteredProducts : products;
      // Sort products to prioritize primary variants (primary_variant=true first)
      // This ensures when we deduplicate by SKU ID, we keep the primary variant
      const sortedProductsForRequired = [...productsForRequired].sort(
        (a, b) => {
          // Primary variants first (true comes before false)
          if (a.primary_variant !== b.primary_variant) {
            return a.primary_variant ? -1 : 1;
          }
          return 0;
        }
      );

      // For required products, only show products with primary_variant = true
      // This ensures we don't show duplicate products (non-primary variants)
      const requiredProducts =
        this.mapProducts(
          sortedProductsForRequired,
          (pro: any) => {
            const hasFlag = pro.category_flags?.[key] === true;

            // Only include products with primary_variant = true for required products
            // This prevents showing duplicate products (non-primary variants)
            if (!pro.primary_variant) {
              return false;
            }

            // Base filter conditions
            // Check against primary product IDs, not variant IDs
            const primaryProduct = this.mapVariantToPrimaryProduct(
              pro,
              products
            );
            const primaryProductId = primaryProduct
              ? primaryProduct.id
              : pro.id;

            const baseFilter = displayAllInRequired
              ? isFlex
                ? this.isFlexProduct(pro)
                : hasFlag
              : !uniquePurchasedPrimaryProductIds.has(primaryProductId) &&
                !purchasedProductIdsSet.has(primaryProductId) &&
                (isFlex ? this.isFlexProduct(pro) : hasFlag);

            return baseFilter;
          },
          (filterRequiredByTagQuantity
            ? requiredQty
            : PROGRAM_TIER_MODAL.MAX_PRODUCTS) - purchasedProducts?.length,
          undefined,
          includeCaseSKUsId,
          distributorId,
          isManufacturerUser
        ) ?? [];

      // Add category to result object with:
      // - Note for flex products when not authorized
      // - List of purchased products
      // - List of required products
      storeProductsDetails = {
        ...storeProductsDetails,
        [tagValue]: {
          sortOrder: index,
          purchasedProducts: purchasedProducts,
          requiredProducts:
            returnListIfPurchasedRequired &&
            purchasedProducts?.length >= requiredQty
              ? []
              : requiredProducts
        }
      };
    });

    return storeProductsDetails;
  }

  /**
   * Generates a graph and progress text for a program.
   *
   * This function generates a graph and progress text for a program, given the
   * program object and optional LineItems and sales LineItems. The graph
   * and progress text are based on the program criteria and the transactions.
   *
   * @param {any} pr - The program object.
   * @param {LineItem[]} [transactions] - The list of LineItems to consider.
   * @param {LineItem[]} [salesTransactions] - The list of sales LineItems to consider.
   * @returns {{graph: { [label: string]: { completed: number; total: number } } | undefined, progressText: string[]}} - The graph and progress text.
   */
  public generateGraphAndProgressText(
    pr: any,
    products: any[],
    productCategoryTags: ProductCategoryTag[],
    transactionLineItems?: LineItem[],
    salesTransactionLineItems?: LineItem[],
    purchasedProductIds: number[] = [],
    distributorId?: number,
    rebateType?: string
  ): {
    graph:
      | { [label: string]: { completed: number; total: number } }
      | undefined;
    progressText: string[];
  } {
    const QtyType: string = pr.quantity_type ?? pr.quantityType ?? "id";
    const diffCatQty: string[] =
      (pr.products_tags_qty ?? pr.productsTagsQty)?.split(",") ?? [];

    const diffCat = mapTagsToCategoryObjects(
      pr.products_tags ?? pr.productsTags ?? "",
      productCategoryTags
    );

    const qty = diffCatQty.reduce((acc, val) => acc + parseInt(val), 0);

    let progress: string[] = [];
    let graphData:
      | { [label: string]: { completed: number; total: number } }
      | undefined = {};

    switch (pr.criteria) {
      case ProgramsDetailCriteria.PurchaseValue:
        graphData = {
          ["Spend"]: {
            completed:
              // Sum the total_price of all lineItems for the current transaction
              transactionLineItems?.reduce((lineAcc, lineItem: any) => {
                const total_price =
                  typeof lineItem?.get === "function"
                    ? lineItem.get("total_price")
                    : lineItem?.total_price;
                return lineAcc + parseFloat((total_price as string) ?? "0");
              }, 0) ?? 0,
            total: parseFloat(pr.min_spend)
          }
        };
        break;
      case ProgramsDetailCriteria.PurchaseQuantity:
        {
          const skuField = skuFieldMapping[QtyType];
          // Map camelCase SKU field names to snake_case for product lookup
          const skuFieldMap: { [key: string]: string } = {
            caseSkusId: "case_skus_id",
            unitSkusId: "unit_skus_id",
            boxSkusId: "box_skus_id"
          };

          // Get program's category tags to filter products
          const programTags = (pr.products_tags ?? pr.productsTags ?? "")
            .split(",")
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0);

          const totalQuantity =
            transactionLineItems?.reduce((itemAcc: any, item: any) => {
              // For PurchaseQuantity criteria, we need to match item.product_id against the specific SKU type
              // item.product_id is a SKU ID (case/unit/box), so we need to check if this SKU ID
              // matches the program's quantity_type (case/unit/box) for any product

              const itemProductIdStr =
                item.product_id != null ? String(item.product_id) : null;

              if (!itemProductIdStr || !products?.length) {
                return itemAcc;
              }

              // Check if distributor is enabled for UPC filtering: per_category_item
              const isNCDSpecialCase =
                distributorId !== undefined &&
                PURCHASE_QUANTITY_WITH_PER_CATEGORY_ITEM_TRACKER_DISTRIBUTOR_IDS.includes(
                  distributorId
                ) &&
                rebateType === "per_category_item";

              // Find product where the SKU field for this quantity_type matches item.product_id
              // This ensures we only count line items that match the program's quantity_type
              // For quantity_type=case, only count items where product_id matches a product's case_skus_id
              // For NCD special case, match ALL SKU types (case/box/unit)
              const matchingProduct = products.find((p: any) => {
                if (isNCDSpecialCase) {
                  // Match ALL SKU types for NCD
                  const caseSkuId = p.case_skus_id ?? p.caseSkusId;
                  const boxSkuId = p.box_skus_id ?? p.boxSkusId;
                  const unitSkuId = p.unit_skus_id ?? p.unitSkusId;
                  return (
                    (caseSkuId != null &&
                      String(caseSkuId) === itemProductIdStr) ||
                    (boxSkuId != null &&
                      String(boxSkuId) === itemProductIdStr) ||
                    (unitSkuId != null &&
                      String(unitSkuId) === itemProductIdStr)
                  );
                } else {
                  // Regular logic: match only specific SKU type
                  const skuId = p[skuField] ?? p[skuFieldMap[skuField]];
                  // Match against item.product_id (which is a SKU ID)
                  // Use strict string comparison to handle type mismatches
                  if (skuId == null) return false;
                  return String(skuId) === itemProductIdStr;
                }
              });

              // Skip if no matching product found (this SKU doesn't match the quantity_type)
              if (!matchingProduct) {
                return itemAcc;
              }

              // Filter by program's category tags if specified
              // Only count products that have at least one of the program's category tags
              if (programTags.length > 0 && matchingProduct) {
                // Use category_flags if available (computed from category_tags_json)
                // category_flags is an object with tagKey as keys and boolean values
                // Also check category_tags_json as fallback for different data formats
                const categoryFlags = matchingProduct.category_flags || {};
                const productTags =
                  matchingProduct.category_tags_json ||
                  matchingProduct.categoryTagsJson ||
                  matchingProduct.CategoryTagsJson ||
                  matchingProduct.categoryTags ||
                  [];

                // Handle different data formats: array, string, or object
                let productTagsArray: string[] = [];
                if (Array.isArray(productTags)) {
                  productTagsArray = productTags;
                } else if (typeof productTags === "string") {
                  try {
                    const parsed = JSON.parse(productTags);
                    productTagsArray = Array.isArray(parsed) ? parsed : [];
                  } catch (e) {
                    // If parsing fails, treat as empty array
                    productTagsArray = [];
                  }
                } else if (productTags && typeof productTags === "object") {
                  // If it's an object, extract keys where value is true (for boolean flag objects)
                  productTagsArray = Object.keys(productTags).filter(
                    (key) => productTags[key] === true
                  );
                }

                // Add tag keys from category_flags where value is true
                // category_flags keys are in tagKey format (with underscores)
                const categoryFlagTags = Object.keys(categoryFlags).filter(
                  (key) => categoryFlags[key] === true
                );
                productTagsArray = [
                  ...new Set([...productTagsArray, ...categoryFlagTags])
                ];

                // Normalize tag names (handle underscores vs spaces)
                // Convert underscores to spaces for comparison, as tags in DB use underscores
                // but program tags might use spaces
                const normalizedProductTags = productTagsArray.map((tag: any) =>
                  String(tag).trim().replace(/_/g, " ")
                );
                const normalizedProgramTags = programTags.map((tag: string) =>
                  String(tag).trim().replace(/_/g, " ")
                );

                const hasMatchingTag = normalizedProgramTags.some(
                  (programTag: string) =>
                    normalizedProductTags.includes(programTag)
                );

                if (!hasMatchingTag) {
                  return itemAcc;
                }
              }

              // Get quantity and calculate accumulated total
              const quantity =
                typeof item?.get === "function"
                  ? item.get("quantity")
                  : item?.quantity;

              // Use parseFloat to handle decimal quantities correctly
              return itemAcc + parseFloat(quantity?.toString() || "0");
            }, 0) ?? 0;

          // For compliance display: show progress towards min_qty
          // If purchased >= min_qty, show compliance achieved (min_qty/min_qty, e.g., "1/1")
          // If purchased < min_qty, show progress towards min_qty (e.g., "0/1")
          const minQty = parseFloat(pr.min_qty) || 0;
          const maxQty = pr.max_qty ? parseFloat(pr.max_qty) : null;

          // Cap completed at minQty when compliance is achieved to show "1/1" instead of "25/1"
          const isCompliant = Number(totalQuantity) >= minQty;
          const completedDisplay = isCompliant ? minQty : totalQuantity;

          graphData = {
            ["Quantity"]: {
              completed: completedDisplay,
              total: minQty // Always show min_qty as total for compliance display
            }
          };
        }
        break;
      case ProgramsDetailCriteria.CategorySKUs:
        {
          const skusUsedForOverallGraph = new Set<string>();
          const primaryProductIdsUsedForOverallGraph = new Set<number>(); // Track unique primary products for counting
          const nonFlexCategoryClaims = new Map<string, string[]>(); // Stores SKUs claimed by each non-Flex category

          // Pre-calculation pass for Non-Flex Categories to establish their claims first.
          diffCat.forEach((category, index) => {
            const isFlex = category?.tagKey?.toLowerCase() === "flex";

            if (!isFlex) {
              const totalRequired = parseInt(diffCatQty[index] || "0");
              const columnName = category?.tagKey;
              const claimedForThisNonFlexCat = this.getDistinctSKUProducts(
                products,
                columnName,
                transactionLineItems,
                skusUsedForOverallGraph, // Exclude SKUs already claimed by prior non-Flex cats
                totalRequired
              );
              nonFlexCategoryClaims.set(columnName, claimedForThisNonFlexCat);
              claimedForThisNonFlexCat.forEach((sku) =>
                skusUsedForOverallGraph.add(sku)
              ); // Add to master set for exclusion

              // Track unique primary products for this category
              claimedForThisNonFlexCat.forEach((skuId) => {
                const skuIdNum = Number(skuId);
                // Find which primary product this SKU belongs to
                const product = products.find(
                  (p) =>
                    Number(p.unit_skus_id) === skuIdNum ||
                    Number(p.box_skus_id) === skuIdNum ||
                    Number(p.case_skus_id) === skuIdNum
                );
                if (product) {
                  const primaryProduct = this.mapVariantToPrimaryProduct(
                    product,
                    products
                  );
                  if (primaryProduct) {
                    primaryProductIdsUsedForOverallGraph.add(primaryProduct.id);
                  }
                }
              });
            }
          });

          // Main pass to generate progress strings, respecting original order and prior claims.
          progress = diffCat.map((category, index) => {
            const totalRequired = parseInt(diffCatQty[index] || "0");
            const isFlex = category?.tagKey?.toLowerCase() === "flex";
            let skusClaimedCountForThisString = 0;

            if (!isFlex) {
              const claimedSKUs =
                nonFlexCategoryClaims.get(category?.tagKey) || [];
              // Count unique primary products, not SKU IDs
              const uniquePrimaryProductsForCategory = new Set<number>();
              claimedSKUs.forEach((skuId) => {
                const skuIdNum = Number(skuId);
                const product = products.find(
                  (p) =>
                    Number(p.unit_skus_id) === skuIdNum ||
                    Number(p.box_skus_id) === skuIdNum ||
                    Number(p.case_skus_id) === skuIdNum
                );
                if (product) {
                  const primaryProduct = this.mapVariantToPrimaryProduct(
                    product,
                    products
                  );
                  if (primaryProduct) {
                    uniquePrimaryProductsForCategory.add(primaryProduct.id);
                  }
                }
              });
              skusClaimedCountForThisString =
                uniquePrimaryProductsForCategory.size;
            } else {
              // Is a Flex category
              // Create a copy of primaryProductIdsUsedForOverallGraph to pass to filterFlexProducts
              // This ensures we exclude primary products already counted in non-Flex categories
              const excludedPrimaryProductIds = new Set(
                primaryProductIdsUsedForOverallGraph
              );

              const flexProductsEligible = this.filterFlexProducts(
                products, // All products from manufacturer (for properties)
                purchasedProductIds, // All SKUs ever purchased by the store from this manuf
                diffCat?.map((cat) => cat.tagKey), // All categories in program (for context in filterFlexProducts)
                totalRequired, // Max count for this Flex category
                Array.from(skusUsedForOverallGraph), // Exclude SKUs claimed by non-Flex (and prior Flex)
                excludedPrimaryProductIds // Exclude primary products already counted in non-Flex categories
              );
              // SKUs returned by filterFlexProducts are newly claimed for *this* Flex category.
              // Add them to the master set so subsequent Flex categories (if any) respect this claim.
              flexProductsEligible.forEach((sku) =>
                skusUsedForOverallGraph.add(sku)
              );
              // Count unique primary products for flex category
              const uniquePrimaryProductsForFlex = new Set<number>();
              flexProductsEligible.forEach((skuId) => {
                const skuIdNum = Number(skuId);
                const product = products.find(
                  (p) =>
                    Number(p.unit_skus_id) === skuIdNum ||
                    Number(p.box_skus_id) === skuIdNum ||
                    Number(p.case_skus_id) === skuIdNum
                );
                if (product) {
                  const primaryProduct = this.mapVariantToPrimaryProduct(
                    product,
                    products
                  );
                  if (primaryProduct) {
                    uniquePrimaryProductsForFlex.add(primaryProduct.id);
                    primaryProductIdsUsedForOverallGraph.add(primaryProduct.id);
                  }
                }
              });
              skusClaimedCountForThisString = uniquePrimaryProductsForFlex.size;
            }

            return `${skusClaimedCountForThisString}/${totalRequired} ${category?.tagName}`;
          });

          // Calculate graph completed as the sum of all completed counts from progress strings
          // This ensures the graph matches the sum of progressAchieved counts exactly
          const totalCompleted = progress.reduce((sum, progressString) => {
            // Extract the completed count from strings like "11/22 Core Retail" or "12/18 Flex"
            const match = progressString.match(/^(\d+)\//);
            if (match) {
              return sum + parseInt(match[1], 10);
            }
            return sum;
          }, 0);

          graphData = {
            ["SKUs"]: {
              completed: totalCompleted,
              total: qty
            }
          };
        }
        break;
      case ProgramsDetailCriteria.POD:
        {
          const storePODs = this.calculateUniquePODs(
            diffCat.map((cat) => cat.tagKey),
            products,
            diffCatQty,
            salesTransactionLineItems
          );

          const completedPODCount = Object.values(storePODs).reduce(
            (sum, count) => sum + count,
            0
          );
          graphData = {
            ["POD"]: { completed: completedPODCount, total: qty }
          };
        }
        break;
      case ProgramsDetailCriteria.PerItem:
        {
          // // Convert comma-separated strings to arrays with proper null checks
          const productTagsQtyMax = parseNumberArray(pr.products_tags_qty_max);
          const pointsPerSkuArr = parseNumberArray(pr.points_per_sku);
          const maxPointsArr = parseNumberArray(pr.max_points);

          const purchasedSKUs = new Set<string>();
          let points = 0;
          let totalPoints = 0;

          progress = diffCat.map((category, index) => {
            const qtyMin = parseInt(diffCatQty[index]) || null;
            const qtyMax = productTagsQtyMax[index] ?? null;
            const pointsPerSku = pointsPerSkuArr[index] ?? 0;
            const maxPoints = maxPointsArr[index] ?? null;

            const total = parseInt(diffCatQty[index]) || 0;
            const completed =
              this.getDistinctSKUProducts(
                products,
                category.tagKey,
                transactionLineItems,
                purchasedSKUs
              ) ?? [];

            let compltedCount = completed.length;
            totalPoints += maxPoints ?? 0;

            // Check if minimum products bought
            if (qtyMin !== null && compltedCount < qtyMin) {
              return `${completed.length}/${total} ${category?.tagName} SKUs`;
            }

            // Check if maximum products bought and cap if needed
            if (qtyMax !== null && compltedCount >= qtyMax) {
              compltedCount = qtyMax;
            }

            // Calculate points earned (ensure integer value)
            let pointsEarned = Math.floor((pointsPerSku || 0) * compltedCount);

            // Check if maximum points acquired and cap if needed
            if (maxPoints !== null && pointsEarned > maxPoints) {
              pointsEarned = maxPoints;
            }

            // Calculate rebate percentage if points were earned
            if (pointsEarned > 0) points += pointsEarned;

            return `${completed.length}/${total} ${category?.tagName} SKUs`;
            // return `${completed.length}/${total} ${category?.tagName} SKUs`;
          });

          graphData = {
            ["Points"]: {
              completed: points,
              total: totalPoints
            }
          };
        }
        break;
      case ProgramsDetailCriteria.Growth:
        {
          progress = ["In Progress"];
          graphData = undefined;
        }
        break;
      default:
        progress = ["NA"];
        graphData = undefined;
    }

    return { graph: graphData, progressText: progress };
  }

  private filterFlexProducts = (
    products: any[],
    purchasedProductIds: number[],
    categories: string[],
    requiredCount: number,
    excludedSKUs: string[] = [],
    excludedPrimaryProductIds: Set<number> = new Set()
  ) => {
    // Track unique primary product IDs to avoid counting variants multiple times
    const uniquePrimaryProductIds = new Set<number>();
    const result = products.reduce(
      (result, product) => {
        // Stop processing if we already have enough `allFalse` items
        if (result.allFalse.size >= requiredCount) return result;

        // Find the matched SKU ID
        const matchedSKU = purchasedProductIds.find(
          (sku) =>
            (sku == product.unit_skus_id && product.primary_variant) ||
            sku == product.case_skus_id ||
            sku == product.box_skus_id
        );

        // Skip if this SKU should be excluded
        if (excludedSKUs.includes(String(matchedSKU))) return result;

        // Check if product is a flex product (direct property, flag, or tag)
        const hasFlexFlag = product.category_flags?.["Flex"] === true;
        const hasFlexDirect = product?.is_flex === true;
        const hasFlexTag =
          Array.isArray(product.category_tags_json) &&
          product.category_tags_json.includes("Flex");

        const isFlex = hasFlexFlag || hasFlexDirect || hasFlexTag;

        if (!matchedSKU || !isFlex) return result;

        // Map to primary product for tracking unique counts
        const primaryProduct = this.mapVariantToPrimaryProduct(
          product,
          products
        );

        // Skip if this primary product was already counted in another category or this Flex category
        if (
          primaryProduct &&
          (excludedPrimaryProductIds.has(primaryProduct.id) ||
            uniquePrimaryProductIds.has(primaryProduct.id))
        ) {
          return result;
        }

        // Extract only relevant category values and check for each category
        const selectedTags = categories
          .filter((cat) => cat?.toLowerCase() != "flex")
          .map((cat) => product.category_flags?.[cat.trim()] === true);

        const allSelectedFalse = selectedTags.every((value) => !value);
        const anySelectedTrue = selectedTags.some((value) => value);

        // Track this primary product to avoid duplicate counting
        if (primaryProduct) {
          uniquePrimaryProductIds.add(primaryProduct.id);
        }

        // Categorize SKU based on whether it has any selected category flags
        // Convert to string to match Set<string> type and avoid precision loss for large integers
        if (allSelectedFalse) {
          result.allFalse.add(String(matchedSKU));
        } else if (anySelectedTrue) {
          result.anyTrue.add(String(matchedSKU));
        }

        return result;
      },
      { allFalse: new Set<string>(), anyTrue: new Set<string>() } as {
        allFalse: Set<string>;
        anyTrue: Set<string>;
      }
    );

    // Ensure exactly `requiredCount` products are returned
    const allFalseArray: string[] = Array.from(result.allFalse);
    const anyTrueArray: string[] = Array.from(result.anyTrue);

    // Ensure exactly `requiredCount` products are returned
    const selectedProducts = [
      ...allFalseArray.slice(0, requiredCount),
      ...anyTrueArray.slice(
        0,
        Math.max(0, requiredCount - allFalseArray.length)
      )
    ];

    return selectedProducts;
  };

  /**
   * This function takes a list of categories, their corresponding counts, and an
   * array of LineItems as input. It returns an object where the keys are a
   * combination of the buyer ID and category, and the values represent the number
   * of unique products in that category purchased by the buyer. A unique product
   * is one that has not been purchased by the buyer in the same category before.
   * @param {string[]} categories - list of categories
   * @param {string[]} categoriesCount - list of counts corresponding to the categories
   * @param {LineItem[]} [transactions] - array of LineItems
   * @returns {Object.<string, number>} - object with unique products count per buyer-category pair
   */
  private calculateUniquePODs = (
    categories: string[],
    products: any[],
    categoriesCount: string[],
    salesTransactionLineItems?: LineItem[]
  ) => {
    const storePODs: { [store: string]: number } = {};
    // Track unique primary product IDs instead of variant IDs
    const uniquePrimaryProductIds = new Set<number>();

    // Simplified approach
    const hasCategories = categories.length > 0;
    const maxCount = hasCategories ? parseInt(categoriesCount[0] || "1") : 1;

    salesTransactionLineItems?.forEach((lineItem: any) => {
      let selectedCatIndex = null;
      let selectedCat = "";

      const product: Product | any | undefined = products?.find((pro) => {
        const product_id =
          typeof lineItem?.get === "function"
            ? lineItem.get("product_id")
            : lineItem?.product_id;

        // Product matching logic
        const productMatches =
          pro.case_skus_id == product_id ||
          (pro.unit_skus_id == product_id && pro.primary_variant) ||
          pro.box_skus_id == product_id;

        if (!productMatches) return false;

        // Category logic - simplified
        if (!hasCategories) {
          selectedCat = "All";
          selectedCatIndex = 0;
          return true; // Accept all products
        }

        // Rest of category validation logic
        return categories.find((cat, index) => {
          const key = cat.trim();
          selectedCat = cat;
          selectedCatIndex = index;
          return pro?.category_flags?.[key] == true;
        });
      });

      const isValidCategoryIndex =
        !hasCategories ||
        (selectedCatIndex != null &&
          selectedCatIndex >= 0 &&
          categoriesCount?.length > selectedCatIndex);
      const hasValidSKU = product?.skusId || product?.skus_id;

      if (product && isValidCategoryIndex && hasValidSKU) {
        const currentMaxCount =
          hasCategories && selectedCatIndex !== null
            ? parseInt(categoriesCount[selectedCatIndex])
            : maxCount;

        if (
          hasCategories &&
          storePODs[`${lineItem.buyer_id}-${selectedCat}`] &&
          storePODs[`${lineItem.buyer_id}-${selectedCat}`] >= currentMaxCount
        )
          return;

        // Map to primary product for tracking unique counts
        const primaryProduct = this.mapVariantToPrimaryProduct(
          product,
          products
        );
        const primaryProductId = primaryProduct
          ? primaryProduct.id
          : product.id;

        if (!uniquePrimaryProductIds.has(primaryProductId)) {
          uniquePrimaryProductIds.add(primaryProductId);
          const categoryKey = hasCategories ? selectedCat : "All";
          const podKey = `${lineItem.buyer_id}-${categoryKey}`;
          storePODs[podKey] = (storePODs[podKey] || 0) + 1;
        }
      }
    });

    return storePODs;
  };

  /**
   * Calculates the total quantity of distinct SKUs of a specified product type from a list of LineItems.
   *
   * This method iterates through the provided LineItems and their line items to identify distinct SKUs
   * for products matching the specified type. A SKU is considered distinct if it is not already counted
   * in the same LineItem. The function sums up the quantities of these distinct SKUs.
   *
   * @param {string} productType - The type of product to filter SKUs by (e.g., "core_product").
   * @param {LineItem[]} [transactionLineItems] - Optional array of LineItem to process for SKU counts.
   * @returns {number} - The total quantity of distinct SKUs for the specified product type.
   */
  private getDistinctSKUProducts = (
    productsAll: any[],
    productType: string,
    transactionLineItems?: LineItem[],
    // SKUs already claimed by other categories in the *same* program detail's progressAchieved calculation.
    // This function should NOT count these SKUs.
    skusAlreadyClaimedOverall?: ReadonlySet<string>,
    maxCount?: number
  ) => {
    // Tracks primary product IDs claimed specifically within this call, for this productType, to ensure distinctness.
    // We track primary product IDs to avoid counting variants of the same primary product multiple times.
    const primaryProductIdsClaimedLocallyInThisCall = new Set<number>();
    const productsClaimedForThisType: string[] = [];

    transactionLineItems?.forEach((item: any) => {
      if (
        maxCount !== undefined &&
        productsClaimedForThisType.length >= maxCount
      ) {
        return; // Reached max count for this category
      }

      const product_id_from_item =
        typeof item?.get === "function"
          ? item.get("product_id")
          : item?.product_id;

      const skuid = String(product_id_from_item);

      // Skip if already claimed by another category in the broader context
      if (skusAlreadyClaimedOverall?.has(skuid)) {
        return;
      }

      const product_detail: any = productsAll?.find(
        (pro) =>
          (pro.unit_skus_id == product_id_from_item && pro.primary_variant) ||
          pro.case_skus_id == product_id_from_item ||
          pro.box_skus_id == product_id_from_item
      );

      if (!product_detail) {
        return;
      }

      // Map to primary product for tracking unique counts
      const primaryProduct = this.mapVariantToPrimaryProduct(
        product_detail,
        productsAll
      );

      if (!primaryProduct) {
        return;
      }

      // Skip if already claimed for THIS category within THIS call (by primary product ID)
      // This ensures we only count each primary product once, even if multiple variants/SKUs were purchased
      if (primaryProductIdsClaimedLocallyInThisCall.has(primaryProduct.id)) {
        return;
      }

      const hasCategoryFlag =
        product_detail?.category_flags?.[productType] === true;

      // Note: Quantity check removed because we now receive aggregated line items
      // that are already filtered by net positive price (totalPrice > 0)
      // This matches the SQL logic: HAVING SUM(li.total_price) > 0
      // Products with negative net quantity but positive net price should count
      // (e.g., bought box SKU, returned unit SKU = negative net qty but positive net spend)

      if (skuid && product_detail && hasCategoryFlag) {
        // Mark this primary product as claimed
        primaryProductIdsClaimedLocallyInThisCall.add(primaryProduct.id);
        // Add only one SKU ID per primary product (use the first one we encounter)
        productsClaimedForThisType.push(skuid);
        // DO NOT add to skusAlreadyClaimedOverall here. The caller will do that.
      }
    });

    return productsClaimedForThisType;
  };

  /**
   * Retrieves a list of sales representatives associated with a distributor.
   *
   * @param {number} distributorId The ID of the distributor to retrieve the sales representatives.
   * @returns {Promise<{ salesReps: { id: number; name: string }[] }>} A promise that resolves to
   *     an object containing the list of sales representatives.
   */
  public async getDistributorSalesRepsByDistributorId(distributorId: number) {
    const salesReps: { id: number; name: string; associatedUserId: number }[] =
      await StoreRepository.getSalesReps(distributorId);

    return {
      salesReps: salesReps
    };
  }

  public async getDistributorSalesRepsByGeneralManager(
    generalManagerUserId: number
  ) {
    const salesReps =
      await StoreRepository.getSalesRepsByGeneralManager(generalManagerUserId);

    return {
      salesReps: salesReps.map((rep) => ({
        id: rep.id,
        name: rep.sales_rep_name,
        associatedUserId: rep.associated_user_id
      }))
    };
  }

  /**
   * Retrieves a list of sales representatives for a specific distributor.
   *
   * This method acts as a wrapper for `getDistributorSalesRepsByDistributorId`
   * and simply forwards the provided distributor ID to it.
   *
   * @param {number} distributorId - The ID of the distributor for which to retrieve the sales representatives.
   * @returns {Promise<{ salesReps: { id: number; name: string }[] }>} A promise that resolves to
   *     an object containing the list of sales representatives.
   */
  public async getDistributorSalesReps(distributorId: number) {
    return this.getDistributorSalesRepsByDistributorId(distributorId);
  }

  /**
   * Retrieves a list of sales representatives associated to a sales rep manager for a specific distributor.
   *
   * @param {number} distributorId - The ID of the distributor for which to retrieve the sales representatives.
   * @param {number} salesRepManagerId - The ID of the sales rep manager for which to retrieve the associated sales reps.
   * @returns {Promise<{ salesReps: { id: number; name: string }[] }>} A promise that resolves to
   *     an object containing the list of sales representatives associated to the manager.
   */
  public async getSalesRepsForManager(
    distributorId: number,
    salesRepManagerId: number
  ) {
    const salesReps: { id: number; name: string; associatedUserId: number }[] =
      await StoreRepository.getSalesRepsForManager(
        distributorId,
        salesRepManagerId
      );

    return {
      salesReps: salesReps
    };
  }

  /**
   * Retrieves a list of program details for a specific store and manufacturer.
   *
   * The method is a wrapper for `getStoreProgramsDetailsByManufacturerId` and simply forwards the
   * provided store ID, manufacturer ID, and enrolled programs indicator to it.
   *
   * @param {number} storeId - The ID of the store for which to retrieve the program details.
   * @param {number} manufacturerId - The ID of the manufacturer for which to retrieve the program details.
   * @param {boolean} isEnrolledPrograms - Whether to filter the result by the store's enrolled programs. Default is false.
   * @returns {Promise<ProgramDetails[]>} A promise that resolves to an array of ProgramDetails objects.
   */
  // TODO: USE DESTRUCTURED OBJECT INSTEAD OF SEPARATE PARAMETERS
  // public async getStoreManufactureProgramsDetails({
  //   storeId,
  //   manufacturerId,
  //   isEnrolledPrograms,
  //   programDetailId,
  //   includeProgramDetailInTier,
  //   isManufacturerUser,
  //   programTimeline,
  //   selectedWarehouseId,
  //   isInternalInitiative
  // }: {
  //   storeId: number;
  //   manufacturerId: number;
  //   isEnrolledPrograms: boolean | null;
  //   programDetailId?: number;
  //   includeProgramDetailInTier?: boolean;
  //   isManufacturerUser?: boolean;
  //   programTimeline?: string;
  //   selectedWarehouseId?: number;
  //   isInternalInitiative?: boolean;
  // }) {
  public async getStoreManufactureProgramsDetails(
    storeId: number,
    manufacturerId: number,
    isEnrolledPrograms: boolean | null,
    programDetailId?: number,
    includeProgramDetailInTier?: boolean,
    isManufacturerUser?: boolean,
    programTimeline?: string,
    isInternalInitiative?: boolean,
    isChainPrograms?: boolean,
    agreementId?: number | number[]
  ) {
    return this.getStoreProgramsDetailsByManufacturerId({
      storeId,
      manufacturerId,
      isEnrolledPrograms,
      programDetailId,
      includeProgramDetailInTier,
      isManufacturerUser,
      programTimeline,
      isInternalInitiative,
      isChainPrograms,
      agreementId
    });
  }

  /**
   * Retrieves a list of store chains associated with the provided associated user ID and role.
   *
   * Depending on the role, the method fetches the store IDs associated with the
   * distributor or sales representative using the provided associated user ID.
   * The store IDs are then used to fetch the store chains using the `getStoreChains` method.
   *
   * @param {number} associatedUserId - The ID of the associated user.
   * @param {string} role - The role of the associated user, either distributor admin or distributor sales representative.
   * @returns {Promise<{name: string, id: number}[]>} A promise that resolves to an array of objects containing the
   *     store chain name and ID.
   */
  public async getStoreChains(
    associatedUserId: number,
    role: string,
    distributorID?: any
  ) {
    let storeIds: number[] = [];
    switch (role) {
      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE: {
        const distributorStores =
          await StoreRepository.getStoreIdsByDistributorId(associatedUserId);
        storeIds = distributorStores.map((s: UserRole) => s.associatedUserId);
        break;
      }
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP: {
        const salesRepStores =
          await StoreRepository.getStoreIdsBySalesRepId(associatedUserId);
        storeIds = salesRepStores.map((s: StoreSalesRep) => s.storeId);
        break;
      }
      case ENTITY_TYPE.MANUFACTURER: {
        if (distributorID && distributorID !== "") {
          const distributorIDs = distributorID
            .split(",")
            .map((id: string) => parseInt(id.trim()));
          // If distributorID is provided, fetch store IDs by distributor IDs
          const manufacturerStores =
            await StoreRepository.getStoreIdsByDistributorIds(distributorIDs);
          storeIds = manufacturerStores.map(
            (s: UserRole) => s.associatedUserId
          );
        }
        break;
      }
    }

    const storeChains = await StoreRepository.getStoreChains(storeIds);
    const storeChainsList = storeChains.map((sc: any) => {
      return {
        name: sc["Chain.name"],
        id: sc["Chain.id"]
      };
    });
    return storeChainsList;
  }

  public async getStoresByChainId(chainId: number) {
    const stores = await StoreRepository.getStoresByChainId(chainId);
    return stores;
  }

  public async getStoresByDistributorId({
    distributorId,
    fetchAllStores = false
  }: {
    distributorId: number;
    fetchAllStores?: boolean;
  }) {
    if (fetchAllStores) {
      const stores =
        await StoreRepository.getAllStoresByDistributorId(distributorId);
      return stores;
    } else {
      const stores =
        await StoreRepository.getStoresByDistributorId(distributorId);
      return stores;
    }
  }

  public async getStoresByCriteria(
    manufacturerId: number,
    distributorIds: number[],
    minProductsPurchased: number = 1,
    criteria: any = "is_core_retail",
    salesRepIds: number[] = []
  ) {
    // Convert string criteria to complex criteria object format
    let complexCriteria: any;

    if (typeof criteria === "string") {
      // Convert string criteria to the complex criteria object format
      const criteriaCategory = criteria.startsWith("is_")
        ? criteria
        : `is_${criteria}`;

      complexCriteria = {
        rules: [
          {
            category: criteriaCategory,
            operator: ">=",
            value: minProductsPurchased
          }
        ]
      };
    } else {
      // Use criteria as-is if already in the correct format
      complexCriteria = criteria;
    }

    // Call repository method with complex criteria format
    const storeData =
      await StoreRepository.getStoresByComplexCriteriaOrAllStores(
        manufacturerId,
        distributorIds,
        complexCriteria,
        salesRepIds
      );

    return storeData;
  }

  /**
   * Processes the products result and purchased product IDs to separate
   * products into two categories: recommended products and purchased products.
   * This is an alias for the processProducts method to maintain backward compatibility.
   *
   * @param {any[]} productsResult The list of products result from the database.
   * @param {number[]} purchasedProductIds The list of purchased product IDs.
   * @returns {{recommendedProducts: ManufacturerProduct[], purchasedProducts: ManufacturerProduct[]}}
   * An object containing two properties: recommendedProducts and purchasedProducts.
   */
  public getRecommendedAndPurchasedProducts(
    productsResult: any[],
    purchasedProductIds: number[],
    includeCaseSKUsId?: boolean,
    distributorId?: number,
    isManufacturerUser?: boolean
  ): {
    recommendedProducts: ManufacturerProduct[];
    purchasedProducts: ManufacturerProduct[];
  } {
    return this.processProducts(
      productsResult,
      purchasedProductIds,
      includeCaseSKUsId,
      distributorId,
      isManufacturerUser
    );
  }

  /**
   * Calculates the compliance percentage for a program with CategorySKUs criteria
   *
   * @param {any} pr - The program detail object containing tags and quantities
   * @param {any[]} products - Array of products to check against
   * @param {LineItem[]} transactionLineItems - Line items representing purchases
   * @param {number[]} purchasedProductIds - Array of already purchased product IDs
   * @returns {number} - Compliance percentage from 0-100
   */
  public calculateCompliancePercentage(
    pr: any,
    products: any[],
    transactionLineItems?: LineItem[],
    purchasedProductIds: number[] = [],
    productCategoryTags?: ProductCategoryTag[]
  ): number {
    // Return 0 if no criteria or transactions
    if (
      pr.criteria !== ProgramsDetailCriteria.CategorySKUs ||
      !transactionLineItems?.length
    ) {
      return 0;
    }

    const diffCatQty: string[] = pr.products_tags_qty?.split(",") ?? [];

    const diffCat = mapTagsToCategoryObjects(
      pr.products_tags,
      productCategoryTags ?? []
    );

    // If no categories defined, return 0
    if (!diffCat.length || !diffCatQty.length) {
      return 0;
    }

    // Calculate total required products across all categories
    const totalRequired = diffCatQty.reduce(
      (sum, qty) => sum + parseInt(qty || "0"),
      0
    );

    // If nothing required, we can't calculate percentage
    if (totalRequired === 0) {
      return 0;
    }

    const purchasedSKUs = new Set<string>();
    let totalPurchased = 0;

    // Calculate how many products have been purchased in each category
    diffCat.forEach((category, index) => {
      const requiredCount = parseInt(diffCatQty[index] || "0");
      const isFlex = category?.tagKey?.toLowerCase() === "flex";
      const columnName = category.tagKey;

      // Track purchases in this category
      const categoryPurchasedSKUs = new Set<string>();

      // Use appropriate method based on product type
      const purchased = isFlex
        ? this.filterFlexProducts(
            products,
            purchasedProductIds.filter(
              (skuId: any) => !purchasedSKUs.has(skuId)
            ),
            diffCat?.map((cat) => cat.tagKey),
            requiredCount,
            Array.from(purchasedSKUs),
            new Set<number>() // No excluded primary product IDs in this context
          )
        : (this.getDistinctSKUProducts(
            products,
            columnName,
            transactionLineItems,
            categoryPurchasedSKUs,
            requiredCount
          ) ?? []);

      // Add to total purchased count (capped at required count per category)
      totalPurchased += Math.min(purchased.length, requiredCount);

      // Track all purchased SKUs
      purchased.forEach((sku) => purchasedSKUs.add(sku));
    });

    // Calculate percentage (0-100)
    return Math.round((totalPurchased / totalRequired) * 100);
  }
}

export default new StoreService();
