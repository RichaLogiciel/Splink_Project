import { col, fn, literal, QueryTypes, Sequelize } from "sequelize";
import sequelize from "../db";

import newrelic from "newrelic";
import { Op } from "sequelize";
import { Col, Fn } from "sequelize/types/utils";
import {
  CACHE_TTL_TIME,
  DEFAULT_PAGE_SIZE,
  ENTITY_TYPE,
  EntityType,
  PROGRAM_APPROVAL_STATUS,
  PROGRAM_TIMELINE,
  SORT_KEYS,
  useApiCaching
} from "../config/appConstants";
import { USER_ROLES } from "../config/roles";
import { ApiError } from "../lib/errors/APIError";
import Chain from "../models/Chain";
import ChainStore from "../models/ChainStore";
import Distributor from "../models/Distributor";
import LineItem from "../models/LineItem";
import LineItemsProductsJoinedMaterializedView from "../models/LineItemsProductsJoinedMaterializedView";
import ManagerSalesRepMapping from "../models/ManagerSalesRepMapping";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import ProductCategory from "../models/ProductCategory";
import ProductCategoryTag from "../models/ProductCategoryTags";
import ProductCodeMapping from "../models/ProductCodeMapping";
import Program from "../models/Program";
import ProgramApproval from "../models/ProgramApproval";
import ProgramCompliance from "../models/ProgramCompliance";
import ProgramDetail from "../models/ProgramDetail";
import ProgramParticipant from "../models/ProgramParticipant";
import ProgramStoreIneligibility from "../models/ProgramStoreIneligibility";
import ProgramVisibility from "../models/ProgramVisibility";
import SalesRepSpiffEarningSummary from "../models/SalesRepSpiffEarningSummaryMaterializedView";
import Store from "../models/Store";
import StoreSalesRep from "../models/StoreSalesRep";
import User from "../models/User";
import UserRole from "../models/UserRole";
import Wishlist from "../models/Wishlists";
import { ProgramCompliance as ProgramComplianceType } from "../types/ProgramCompliance";
import { createCacheKey } from "../utils/cacheUtils";
import {
  chunkArray,
  getProductCodeMappingInclude,
  buildProgramTimelineSqlCondition
} from "../utils/helpers";
import { getCacheKey, redisClient, addUserCacheKey } from "../utils/redis";
import { getCurrentUser } from "../utils/requestContext";
import {
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "../utils/roles";
import { GetManufacturerProductsParams } from "./../types/StoreTypes";
import ProgramRepository from "./ProgramRepository";

class StoreRepository {
  /**
   * Retrieves sales representatives along with their associated stores and total amount.
   *
   * This method executes a query to fetch data about sales representatives, their associated
   * stores, and the total sales amount. It joins multiple tables including user roles, transactions,
   * stores, and program participants to gather detailed information. The results include the store name,
   * store location, total amount of sales, sales representative's name, role, and enrolled program IDs.
   *
   * The query can be filtered by a specific store ID if provided.
   *
   * @param {number[]} distributorIds - The IDs of the distributors to filter the sales representatives.
   * @param {number | null} storeId - Optional ID of the store to filter the results.
   * @param {string | null} searchQuery - Optional search query to filter the store results.
   * @param {number | null} selectedSalesRepId - Optional ID of the selected sales representative to filter stores.
   * @param {number} page - The page number for pagination.
   * @param {string} sort - The order in which the results should be sorted, either DESC or ASC.
   * @param {number | null} chainId The ID of the selected chain to filter the result.
   * @returns {Promise<any[]>} - A promise that resolves to an array of objects containing sales rep
   *                             and store information.
   */
  public async getSalesRepWithStoresAndTotalAmount(
    distributorIds: number[],
    storeId: number | null = null,
    searchQuery: string | null = null,
    selectedSalesRepId: number | null = null,
    page: number = 1, // Page number, default is 1
    sort: string = "ASC",
    chainId: number | null = null,
    pageSize: number = DEFAULT_PAGE_SIZE, // Number of records per page, default is 10
    productIds: number[] = [],
    enrolled: boolean | null = null,
    programIds?: number[],
    excludedStoreWithNoTransaction: boolean = false,
    sortKey: string = "sort",
    manufacturerId?: number,
    authorizedDistManufacturerIds?: number[],
    warehouseIds?: number[],
    programs?: any[],
    returnSpiffEarning?: boolean,
    returnEnrolledProgramsEarning: boolean = false,
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    isInternalInitiative?: boolean,
    excludeChainStores?: boolean,
    storeIdsToExclude?: number[],
    returnSkuIds: boolean = false // Flag to control whether to fetch and return SKU IDs
  ) {
    return newrelic.startSegment(
      "StoreRepository.getSalesRepWithStoresAndTotalAmount",
      true,
      async () => {
        const user = getCurrentUser();
        const userId = user?.id?.toString() || "null";
        const hashedKey = createCacheKey(
          "getSalesRepWithStoresAndTotalAmount",
          {
            getSalesRepWithStoresAndTotalAmount: [
              userId,
              distributorIds?.toString() || "all",
              user?.role || "null",
              storeId ?? "null",
              searchQuery || "null",
              selectedSalesRepId ?? "null",
              page,
              sort,
              chainId ?? "null",
              pageSize,
              productIds.length > 0 ? productIds.sort().toString() : "none",
              enrolled ?? "null",
              programIds ? programIds.sort().toString() : "none",
              excludedStoreWithNoTransaction ? "true" : "false",
              sortKey,
              manufacturerId ?? "null",
              authorizedDistManufacturerIds &&
              authorizedDistManufacturerIds?.length > 0
                ? authorizedDistManufacturerIds.sort().toString()
                : "none",
              warehouseIds && warehouseIds?.length > 0
                ? warehouseIds.sort().toString()
                : "none",
              returnSpiffEarning ? returnSpiffEarning?.toString() : "false",
              returnEnrolledProgramsEarning
                ? returnEnrolledProgramsEarning?.toString()
                : "false",
              programTerms ? JSON.stringify(programTerms) : "null",
              isInternalInitiative ? "true" : "false",
              excludeChainStores ? "true" : "false",
              storeIdsToExclude ? storeIdsToExclude.sort().toString() : "none"
            ]
          }
        );
        // Prepend userId to make cache keys queryable by user
        const cacheKey = `getSalesRepWithStoresAndTotalAmount_${userId}_${hashedKey.replace("getSalesRepWithStoresAndTotalAmount_", "")}`;

        // Cache check with monitoring
        if (useApiCaching) {
          const cachedResult = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.cache_check",
            true,
            async () => {
              try {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                  newrelic.addCustomAttributes({
                    cache_hit: true,
                    cache_key_length: cacheKey.length
                  });
                  return JSON.parse(cached);
                }
                newrelic.addCustomAttributes({
                  cache_hit: false,
                  cache_key_length: cacheKey.length
                });
                return null; // Explicitly return null for cache miss
              } catch (error) {
                console.error(
                  "[ERROR] getSalesRepWithStoresAndTotalAmount - Cache error:",
                  error
                );
                newrelic.addCustomAttributes({
                  cache_error: true,
                  cache_error_message:
                    error instanceof Error ? error.message : String(error)
                });
                return null; // Explicitly return null on cache error
              }
            }
          );

          // If cache hit, return the cached data immediately
          if (cachedResult) {
            return cachedResult;
          }
        }

        const isSalesRepManager = isDistributorSalesRepManager(user?.role);
        const isGeneralManager = isDistributorGeneralManager(user?.role);

        // Optimize search query: trim and validate search term
        // Only search if query has at least 2 characters to avoid performance issues
        const trimmedSearchQuery = searchQuery
          ? decodeURIComponent(searchQuery).trim()
          : null;
        const isValidSearchQuery =
          trimmedSearchQuery && trimmedSearchQuery.length >= 2;

        // Build store filter with optimized search
        const storeFilter = {
          ...(storeId ? { id: storeId } : {}),
          ...(isValidSearchQuery
            ? {
                [Op.or]: [
                  {
                    name: {
                      [Op.iLike]: `%${trimmedSearchQuery}%`
                    }
                  }, // Use iLike for case-insensitive search with trigram index support
                  {
                    external_store_id: {
                      [Op.iLike]: `%${trimmedSearchQuery}%`
                    }
                  }
                ]
              }
            : {}),
          ...(storeIdsToExclude?.length
            ? {
                id: {
                  [Op.notIn]: storeIdsToExclude
                }
              }
            : {})
        };

        const chainFilter = {
          ...(chainId ? { id: chainId } : {})
        };

        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;

        // Construct the filter for salesReps if provided
        const salesRepUserFilter = {
          ...(selectedSalesRepId ? { id: selectedSalesRepId } : {})
        };

        let productSKUsIds: string[] = [];

        if (productIds.length) {
          productSKUsIds = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.product_skus_lookup",
            true,
            async () => {
              newrelic.addCustomAttributes({
                product_ids_count: productIds.length
              });
              return await this.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
                productIds
              );
            }
          );
          newrelic.addCustomAttributes({
            product_skus_count: productSKUsIds.length
          });
        }

        let lineItemsWhere: any =
          productSKUsIds.length > 0
            ? { product_id: { [Op.in]: productSKUsIds } }
            : {};

        if (warehouseIds) {
          lineItemsWhere = {
            ...lineItemsWhere,
            warehouse_id: {
              [Op.in]: warehouseIds
            }
          };
        }

        let enrolledWhere = {};
        let programIdsWhere = {};
        if (enrolled !== null) {
          programIdsWhere = programIds
            ? { program_id: { [Op.in]: programIds } }
            : {};
          if (enrolled === false) {
            enrolledWhere = {
              "$StoreUserRole.ProgramParticipants.id$": { [Op.is]: null }
            };
          }
        }

        const userRoleWhere =
          !distributorIds?.length && !!chainId
            ? {}
            : {
                parent_entity_id: {
                  [Op.in]: distributorIds
                }
              };

        let storeIds = await newrelic.startSegment(
          "StoreRepository.getSalesRepWithStoresAndTotalAmount.store_ids_lookup",
          true,
          async () => {
            newrelic.addCustomAttributes({
              is_sales_rep_manager: isSalesRepManager,
              user_role: user?.role || "unknown"
            });

            if (isSalesRepManager) {
              const stores = await this.getStoresBySalesRepManagerId({
                salesRepManagerId: user?.associatedUserId
              });
              const storeIds = stores.map((s: any) => s.storeId);
              newrelic.addCustomAttributes({
                store_ids_count: storeIds.length,
                lookup_method: "sales_rep_manager"
              });
              return storeIds;
            } else if (isGeneralManager) {
              const stores = await this.getStoreIdsByGeneralManager({
                generalManagerUserId: user?.associatedUserId as number
              });
              newrelic.addCustomAttributes({
                store_ids_count: stores.length,
                lookup_method: "general_manager"
              });
              return stores;
            } else {
              const storeIds = await this.getStoreIds(userRoleWhere);
              newrelic.addCustomAttributes({
                store_ids_count: storeIds.length,
                lookup_method: "distributor"
              });
              return storeIds;
            }
          }
        );

        // Apply warehouse filtering to storeIds if warehouseIds is provided
        if (warehouseIds && warehouseIds.length > 0 && !isGeneralManager) {
          const warehouseStoreIds = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.warehouse_filtering",
            true,
            async () => {
              newrelic.addCustomAttributes({
                warehouse_ids_count: warehouseIds.length,
                store_ids_before_filtering: storeIds.length
              });
              return await this.getStoreIdsByWarehouseIds(warehouseIds);
            }
          );
          storeIds = storeIds.filter((storeId: number) =>
            warehouseStoreIds.includes(storeId)
          );
        }

        let lineItems: any[] = [];
        let lineItemStoreIds: number[] = [];

        // Use single JOIN query approach when both line items and program participation filtering are needed
        if (excludedStoreWithNoTransaction && enrolled === true) {
          // Use the single JOIN query that matches the correct SQL query
          const storesWithLineItemsAndPrograms = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.stores_with_line_items_and_programs",
            true,
            async () => {
              newrelic.addCustomAttributes({
                query_type: "single_join",
                distributor_ids_count: distributorIds.length,
                manufacturer_id: manufacturerId || 0,
                program_ids_count: programIds?.length || 0
              });
              return await this.getStoresWithLineItemsAndProgramParticipation(
                distributorIds,
                manufacturerId || 0,
                programIds,
                programTerms
              );
            }
          );
          storeIds = storesWithLineItemsAndPrograms;
          lineItemStoreIds = storesWithLineItemsAndPrograms;

          // Only fetch line items for SKU IDs if explicitly requested
          if (returnSkuIds) {
            lineItems = await newrelic.startSegment(
              "StoreRepository.getSalesRepWithStoresAndTotalAmount.line_items_lookup_optimized",
              true,
              async () => {
                newrelic.addCustomAttributes({
                  query_type: "line_items_after_optimized_query",
                  store_ids_count: storeIds.length,
                  excluded_store_with_no_transaction:
                    excludedStoreWithNoTransaction
                });
                return await this.getLineItems(
                  storeIds,
                  lineItemsWhere,
                  sort,
                  manufacturerId,
                  programTerms
                );
              }
            );
            newrelic.addCustomAttributes({
              line_items_count: lineItems.length
            });
          } else {
            // Set lineItems to empty array when SKU IDs are not needed
            lineItems = [];
          }
        } else {
          // Use the original separate queries approach for other cases
          if (excludedStoreWithNoTransaction || warehouseIds) {
            lineItems = await newrelic.startSegment(
              "StoreRepository.getSalesRepWithStoresAndTotalAmount.line_items_lookup",
              true,
              async () => {
                newrelic.addCustomAttributes({
                  query_type: "separate_queries",
                  store_ids_count: storeIds.length,
                  excluded_store_with_no_transaction:
                    excludedStoreWithNoTransaction,
                  warehouse_ids_present: !!warehouseIds
                });
                return await this.getLineItems(
                  storeIds,
                  lineItemsWhere,
                  sort,
                  manufacturerId,
                  programTerms
                );
              }
            );
            newrelic.addCustomAttributes({
              line_items_count: lineItems.length
            });
          } else {
            lineItems = [];
          }

          lineItemStoreIds = lineItems?.map((li: any) => li.store_id) || [];

          // Filter storeIds to only include stores with line items when excludedStoreWithNoTransaction is true
          if (excludedStoreWithNoTransaction && lineItemStoreIds.length > 0) {
            storeIds = storeIds.filter((storeId) =>
              lineItemStoreIds.includes(storeId)
            );
          }
        }

        let storesPurchaseVolume: any[] = [];
        let storesEstimatedSavings: any[] = [];
        let storesSavingsOpp: any[] = [];
        let storesCompletedProgramsCount: any[] = [];
        let storesSpiffContribution: any[] = [];
        let storeProgramCounts: any[] = [];
        let storesHighestComplianceByManufacturer: any[] = [];

        // Store original sorted data for reordering - use a unique key to avoid conflicts between enrolled/not enrolled calls
        const sortedDataKey = `${sortKey}_${enrolled ? "enrolled" : "notEnrolled"}_${manufacturerId || "all"}`;
        let originalSortedData: any[] = [];

        if (sortKey === SORT_KEYS.ESTIMATED_SAVINGS && returnSpiffEarning) {
          storesSpiffContribution = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.spiff_earning_lookup",
            true,
            async () => {
              newrelic.addCustomAttributes({
                operation: "spiff_earning_lookup",
                distributor_ids_count: distributorIds?.length || 0,
                store_ids_count: storeIds.length,
                manufacturer_id: manufacturerId || "none",
                program_ids_count: programIds?.length || 0
              });
              return await this.getSpiffEaringingWithStoreId({
                distributorIds:
                  distributorIds?.length && !chainId ? distributorIds : [],
                storeIds,
                sort,
                manufacturerId: manufacturerId,
                authorizedDistManufacturerIds: authorizedDistManufacturerIds,
                programIds: programIds
              });
            }
          );

          if (storesSpiffContribution?.length) {
            storeIds = storesSpiffContribution.map((st: any) => st.store_id);
            newrelic.addCustomAttributes({
              spiff_contribution_count: storesSpiffContribution.length
            });
          }
        }

        if (sortKey === SORT_KEYS.PURCHASE_VOLUME_SORT && !returnSpiffEarning) {
          storesPurchaseVolume = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.purchase_volume_lookup",
            true,
            async () => {
              newrelic.addCustomAttributes({
                operation: "purchase_volume_lookup",
                distributor_ids_count: distributorIds?.length || 0,
                store_ids_count: storeIds.length,
                manufacturer_id: manufacturerId || "none",
                warehouse_ids_count: warehouseIds?.length || 0,
                program_ids_count: programIds?.length || 0
              });
              return await this.getPurchaseVolumeWithStoreId(
                distributorIds?.length && !chainId ? distributorIds : [],
                storeIds,
                sort,
                manufacturerId,
                authorizedDistManufacturerIds,
                warehouseIds,
                programTerms,
                programIds
              );
            }
          );

          if (storesPurchaseVolume?.length) {
            storeIds = storesPurchaseVolume.map((st: any) => st.store_id);
            // Store original sorted data for reordering
            originalSortedData = storesPurchaseVolume;
            newrelic.addCustomAttributes({
              purchase_volume_count: storesPurchaseVolume.length
            });
          }
        }

        if (
          sortKey === SORT_KEYS.NEAR_COMPLIANCE_PERCENTAGE &&
          !returnSpiffEarning
        ) {
          storesHighestComplianceByManufacturer =
            await this.getStoresHighestComplianceByManufacturer({
              storeIds: storeIds,
              manufacturerIds: [manufacturerId ?? 0],
              distributorIds: distributorIds,
              sort: sort,
              enrolled: enrolled ?? false,
              programIds: enrolled ? programIds : []
            });

          if (storesHighestComplianceByManufacturer?.length) {
            storeIds = storesHighestComplianceByManufacturer.map(
              (st: any) => st.store_id
            );
            // Store original sorted data for reordering
            originalSortedData = storesHighestComplianceByManufacturer;
          }
        }

        // Ineligible store's programs earning and savings opportunity should not be counted towards eligible stores programs.
        // Get ineligible store ID's by program IDs (same logic as getEstimatedSavingsWithStoreId)
        //place this functionon top of getEstimatedSavingsWithStoreId and getSavingsOppWithStoreId methods to prevent duplicate db queries.
        const ineligibleStoreIdsByProgramIds: any[] = programIds
          ? await newrelic.startSegment(
              "StoreRepository.getSalesRepWithStoresAndTotalAmount.ineligible_store_ids_lookup",
              true,
              async () => {
                newrelic.addCustomAttributes({
                  program_ids_count: programIds.length,
                  store_ids_count: storeIds.length
                });
                return await ProgramRepository.getIneligibleStoreIdsGroupByProgramId(
                  programIds,
                  storeIds
                );
              }
            )
          : [];

        if (programIds) {
          newrelic.addCustomAttributes({
            ineligible_store_ids_count: ineligibleStoreIdsByProgramIds.length
          });
        }

        if (
          [SORT_KEYS.ESTIMATED_SAVINGS, SORT_KEYS.POTENTIAL_SAVINGS].includes(
            sortKey
          ) &&
          !returnSpiffEarning
        ) {
          storesEstimatedSavings = await this.getEstimatedSavingsWithStoreId(
            distributorIds?.length && !chainId ? distributorIds : [],
            storeIds,
            sort,
            manufacturerId,
            authorizedDistManufacturerIds,
            returnEnrolledProgramsEarning,
            programIds,
            ineligibleStoreIdsByProgramIds
          );

          if (storesEstimatedSavings?.length) {
            storeIds = storesEstimatedSavings.map((st: any) => st.store_id);
            // Store original sorted data for reordering
            originalSortedData = storesEstimatedSavings;
          }
        }

        if ([SORT_KEYS.SAVINGS_Opp].includes(sortKey) && manufacturerId) {
          storesSavingsOpp = await this.getSavingsOppWithStoreId(
            distributorIds?.length && !chainId ? distributorIds : [],
            storeIds,
            sort,
            manufacturerId,
            authorizedDistManufacturerIds,
            programIds,
            ineligibleStoreIdsByProgramIds
          );

          if (storesSavingsOpp?.length) {
            storeIds = storesSavingsOpp.map((st: any) => st.store_id);
            // Store original sorted data for reordering - this should be used by BOTH enrolled and not enrolled calls
            originalSortedData = [...storesSavingsOpp]; // Create a copy to avoid reference issues
          }
        }

        if (sortKey === SORT_KEYS.PROGRAM_COMPLIANCE) {
          storesCompletedProgramsCount =
            await this.getCompletedProgramsCountWithStoreId(
              storeIds,
              programIds,
              sort,
              programs,
              enrolled || false
            );

          if (storesCompletedProgramsCount?.length) {
            storeIds = storesCompletedProgramsCount.map(
              (st: any) => st.store_id
            );
          }
        }

        if (sortKey === SORT_KEYS.PR_AVAILABLE && returnSpiffEarning) {
          // Get ALL store IDs first for proper sorting across all pages
          const allStoreIds = isSalesRepManager
            ? (
                await this.getStoresBySalesRepManagerId({
                  salesRepManagerId: user?.associatedUserId
                })
              ).map((s: any) => s.storeId)
            : await this.getStoreIds(userRoleWhere);

          // Get per-store program counts using spiff_program_eligible_store table
          storeProgramCounts = await this.getProgramCountWithStoreId(
            allStoreIds,
            sort,
            authorizedDistManufacturerIds,
            isInternalInitiative
          );
        }

        if (sortKey === SORT_KEYS.NEAR_COMPLIANCE_PERCENTAGE) {
          // Get ALL store IDs first for proper sorting across all pages
          const allStoreIds = isSalesRepManager
            ? (
                await this.getStoresBySalesRepManagerId({
                  salesRepManagerId: user?.associatedUserId
                })
              ).map((s: any) => s.storeId)
            : await this.getStoreIds(userRoleWhere);

          // Get near compliance data for all stores
          storeIds = await this.getSortedStoreIdsByNearCompliance(
            allStoreIds,
            sort,
            programIds,
            manufacturerId
          );
        }

        const order = this.buildSorting(
          sortKey,
          sort,
          lineItemStoreIds.length > 0 ? lineItemStoreIds : storeIds,
          storeProgramCounts
        );

        // Fetch data using Sequelize model queries
        const results = await newrelic.startSegment(
          "StoreRepository.getSalesRepWithStoresAndTotalAmount.main_sequelize_query",
          true,
          async () => {
            newrelic.addCustomAttributes({
              query_type: "UserRole.findAndCountAll",
              store_ids_count: storeIds.length,
              page_size: pageSize,
              offset: offset,
              sort_key: sortKey,
              sort: sort,
              enrolled: enrolled ?? "null",
              exclude_chain_stores: excludeChainStores || false,
              line_items_present: lineItems?.length > 0,
              warehouse_ids_present: !!warehouseIds,
              return_spiff_earning: returnSpiffEarning || false
            });

            return await UserRole.findAndCountAll({
              where: {
                ...userRoleWhere,
                ...(lineItems?.length || warehouseIds || returnSpiffEarning
                  ? {
                      associated_user_id: {
                        [Op.in]: storeIds
                      }
                    }
                  : {}),
                parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
                associated_entity_type: ENTITY_TYPE.STORE,
                role: ENTITY_TYPE.STORE,
                ...enrolledWhere,
                ...(excludeChainStores
                  ? { "$StoreUserRole.ChainsForStore.id$": { [Op.is]: null } }
                  : {})
              },
              include: [
                {
                  model: Distributor,
                  as: "distributor",
                  attributes: ["organization_name", "name"],
                  required: false,
                  on: {
                    id: { [Op.eq]: sequelize.col("UserRole.parent_entity_id") }
                  }
                },
                {
                  model: User,
                  as: "user",
                  attributes: []
                },
                {
                  model: Store,
                  as: "StoreUserRole",
                  attributes: [],
                  required: true,
                  where: {
                    ...storeFilter
                  },
                  include: [
                    {
                      model: ProgramParticipant,
                      as: "ProgramParticipants",
                      required: enrolled === true ? true : false,
                      attributes: [],
                      where: {
                        entity_type: "STORE",
                        deleted_at: null,
                        ...programIdsWhere
                      }
                    },
                    {
                      model: StoreSalesRep, // Assuming you have this model set up
                      as: "storeSalesReps",
                      attributes: [],
                      required: true,
                      where: isSalesRepManager
                        ? {
                            sales_rep_id: {
                              [Op.in]: sequelize.literal(`(
                        SELECT sales_rep_id
                        FROM manager_sales_rep_mapping
                        WHERE sales_manager_id = ${user?.associatedUserId}
                        AND deleted_at IS NULL
                      )`)
                            }
                          }
                        : {},
                      include: [
                        {
                          model: UserRole,
                          as: "store_sales_reps",
                          where: {
                            associated_entity_type: ENTITY_TYPE.DISTRIBUTOR,
                            ...userRoleWhere
                          },
                          required: true,
                          attributes: [],
                          include: [
                            {
                              model: User,
                              as: "user",
                              attributes: [],
                              required: true,
                              where: {
                                ...salesRepUserFilter
                              }
                            }
                          ]
                        }
                      ]
                    },
                    {
                      model: Chain,
                      as: "ChainsForStore",
                      attributes: [],
                      through: { attributes: [] },
                      where: chainFilter,
                      required: false // Always LEFT JOIN to avoid filtering issues
                    }
                  ]
                }
              ],
              attributes: [
                [
                  sequelize.fn(
                    "COALESCE",
                    sequelize.col("distributor.organization_name"),
                    sequelize.col("distributor.name")
                  ),
                  "distributor_name"
                ],
                [
                  sequelize.fn(
                    "CONCAT",
                    sequelize.col(
                      "StoreUserRole.storeSalesReps.store_sales_reps.user.first_name"
                    ),
                    " ",
                    sequelize.col(
                      "StoreUserRole.storeSalesReps.store_sales_reps.user.last_name"
                    )
                  ),
                  "name"
                ],
                [
                  sequelize.col("StoreUserRole.storeSalesReps.sales_rep_id"),
                  "sales_rep_associated_user_id"
                ],
                "role",
                ["parent_entity_id", "distributorid"],
                [sequelize.col("user.id"), "store_user_id"],
                [sequelize.col("user.city"), "store_city"],
                [sequelize.col("user.state"), "store_state"],
                [sequelize.col("user.status"), "store_user_status"],
                [sequelize.col("StoreUserRole.id"), "storeid"],
                [
                  sequelize.col("StoreUserRole.external_store_id"),
                  "externalStoreId"
                ],
                [sequelize.col("StoreUserRole.name"), "storename"],
                [
                  sequelize.fn(
                    "ARRAY_AGG",
                    sequelize.fn(
                      "DISTINCT",
                      sequelize.col(
                        "StoreUserRole.ProgramParticipants.program_id"
                      )
                    )
                  ),
                  "enrolled_programs_ids"
                ],
                [sequelize.col("StoreUserRole.ChainsForStore.id"), "chain_id"],
                [
                  sequelize.fn(
                    "STRING_AGG",
                    sequelize.fn(
                      "DISTINCT",
                      sequelize.col("StoreUserRole.ChainsForStore.name")
                    ),
                    ", "
                  ),
                  "chain_names"
                ]
              ],
              group: [
                "StoreUserRole.name",
                "user.id",
                "user.city",
                "user.state",
                "UserRole.parent_entity_id",
                "UserRole.role",
                "StoreUserRole.id",
                "StoreUserRole.storeSalesReps.store_sales_reps.user.id",
                "StoreUserRole.storeSalesReps.sales_rep_id",
                "distributor.organization_name",
                "distributor.name",
                "StoreUserRole.ChainsForStore.id"
              ],
              order,
              limit: pageSize, // Number of records per page - REMOVED to get all results
              offset: offset, // Starting point for records - REMOVED to get all results
              subQuery: false,
              raw: true
            });
          }
        );

        let rows = results.rows;
        newrelic.addCustomAttributes({
          query_results_count: rows.length,
          total_count: results.count?.length ?? 0
        });

        if (
          sortKey !== SORT_KEYS.PURCHASE_VOLUME_SORT &&
          !returnSpiffEarning &&
          !storesPurchaseVolume?.length
        ) {
          const ids = rows.map((row: any) => row.storeid);

          storesPurchaseVolume = await this.getPurchaseVolumeWithStoreId(
            distributorIds?.length && !chainId ? distributorIds : [],
            ids,
            undefined,
            manufacturerId,
            authorizedDistManufacturerIds,
            warehouseIds,
            programTerms,
            programIds
          );
        }

        if (
          ![SORT_KEYS.ESTIMATED_SAVINGS, SORT_KEYS.POTENTIAL_SAVINGS].includes(
            sortKey
          ) &&
          !returnSpiffEarning &&
          !storesEstimatedSavings?.length
        ) {
          const ids = rows.map((row: any) => row.storeid);

          storesEstimatedSavings = await this.getEstimatedSavingsWithStoreId(
            distributorIds?.length && !chainId ? distributorIds : [],
            ids,
            undefined,
            manufacturerId,
            authorizedDistManufacturerIds,
            returnEnrolledProgramsEarning,
            programIds,
            ineligibleStoreIdsByProgramIds
          );
        }

        if (sortKey !== SORT_KEYS.ESTIMATED_SAVINGS && returnSpiffEarning) {
          const ids = rows.map((row: any) => row.storeid);

          storesSpiffContribution = await this.getSpiffEaringingWithStoreId({
            distributorIds:
              distributorIds?.length && !chainId ? distributorIds : [],
            storeIds: ids,
            sort: undefined,
            manufacturerId: manufacturerId,
            authorizedDistManufacturerIds: authorizedDistManufacturerIds,
            programIds: programIds
          });
        }

        if (
          ![SORT_KEYS.SAVINGS_Opp].includes(sortKey) &&
          manufacturerId &&
          !storesSavingsOpp?.length
        ) {
          const ids = rows.map((row: any) => row.storeid);
          storesSavingsOpp = await this.getSavingsOppWithStoreId(
            distributorIds,
            ids,
            sort,
            manufacturerId,
            authorizedDistManufacturerIds,
            programIds,
            ineligibleStoreIdsByProgramIds
          );
        }

        if (
          sortKey !== SORT_KEYS.NEAR_COMPLIANCE_PERCENTAGE &&
          !returnSpiffEarning &&
          !storesHighestComplianceByManufacturer?.length
        ) {
          const storeIds = rows.map((row: any) => row.storeid);

          storesHighestComplianceByManufacturer =
            await this.getStoresHighestComplianceByManufacturer({
              storeIds: storeIds,
              manufacturerIds: [manufacturerId ?? 0],
              distributorIds: distributorIds,
              sort: sort,
              enrolled: enrolled ?? false,
              programIds: enrolled ? programIds : []
            });
        }

        if (sortKey !== SORT_KEYS.PROGRAM_COMPLIANCE) {
          const ids = rows.map((row: any) => row.storeid);

          storesCompletedProgramsCount =
            await this.getCompletedProgramsCountWithStoreId(
              ids,
              programIds,
              undefined,
              programs,
              enrolled || false
            );
        }

        if (sortKey !== SORT_KEYS.PR_AVAILABLE && returnSpiffEarning) {
          const ids = rows.map((row: any) => row.storeid);

          storeProgramCounts = await this.getProgramCountWithStoreId(
            ids,
            undefined,
            authorizedDistManufacturerIds,
            isInternalInitiative
          );
        }

        // Data attachment with monitoring
        if (lineItems.length) {
          rows = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.attach_skus",
            true,
            async () => {
              newrelic.addCustomAttributes({
                line_items_count: lineItems.length,
                rows_count: rows.length
              });
              return this.attachSkusToResults(rows, lineItems);
            }
          );
        }

        if (storesPurchaseVolume?.length) {
          rows = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.attach_purchase_volume",
            true,
            async () => {
              newrelic.addCustomAttributes({
                stores_purchase_volume_count: storesPurchaseVolume.length,
                rows_count: rows.length
              });
              return this.attachPurchaseVolumeToResults(
                rows,
                storesPurchaseVolume
              );
            }
          );
        }

        if (storesEstimatedSavings?.length) {
          rows = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.attach_earned_rebate",
            true,
            async () => {
              newrelic.addCustomAttributes({
                stores_estimated_savings_count: storesEstimatedSavings.length,
                rows_count: rows.length
              });
              return this.attachEarnedRebateToResults(
                rows,
                storesEstimatedSavings
              );
            }
          );
        }

        if (storesSavingsOpp?.length) {
          rows = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.attach_earning_opp",
            true,
            async () => {
              newrelic.addCustomAttributes({
                stores_savings_opp_count: storesSavingsOpp.length,
                rows_count: rows.length
              });
              return this.attachEarningOppToResults(rows, storesSavingsOpp);
            }
          );
        }

        if (storesCompletedProgramsCount?.length) {
          rows = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.attach_completed_programs",
            true,
            async () => {
              newrelic.addCustomAttributes({
                stores_completed_programs_count:
                  storesCompletedProgramsCount.length,
                rows_count: rows.length
              });
              return this.attachCompletedProgramsCountToResults(
                rows,
                storesCompletedProgramsCount
              );
            }
          );
        }

        if (storesHighestComplianceByManufacturer?.length) {
          rows = this.attachHighestComplianceByManufacturerToResults(
            rows,
            storesHighestComplianceByManufacturer
          );
        }

        if (storesSpiffContribution?.length) {
          rows = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.attach_spiff_contribution",
            true,
            async () => {
              newrelic.addCustomAttributes({
                stores_spiff_contribution_count: storesSpiffContribution.length,
                rows_count: rows.length
              });
              return this.attachStoresSpiffContributionToResults(
                rows,
                storesSpiffContribution
              );
            }
          );
        }

        if (storesHighestComplianceByManufacturer?.length) {
          rows = this.attachHighestComplianceByManufacturerToResults(
            rows,
            storesHighestComplianceByManufacturer
          );
        }

        if (storeProgramCounts?.length) {
          rows = await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.attach_program_count",
            true,
            async () => {
              newrelic.addCustomAttributes({
                store_program_counts_count: storeProgramCounts.length,
                rows_count: rows.length
              });
              return this.attachProgramCountToResults(rows, storeProgramCounts);
            }
          );
        }

        // For specific sort keys, maintain the sorted order AFTER all data has been attached.
        if (
          [
            SORT_KEYS.ESTIMATED_SAVINGS,
            SORT_KEYS.POTENTIAL_SAVINGS,
            SORT_KEYS.SAVINGS_Opp,
            SORT_KEYS.PURCHASE_VOLUME_SORT,
            SORT_KEYS.NEAR_COMPLIANCE_PERCENTAGE
          ].includes(sortKey)
        ) {
          // Get the sorted store IDs from the appropriate sorted data
          let sortedStoreIds: number[] = [];

          if (originalSortedData?.length) {
            sortedStoreIds = originalSortedData.map((st: any) => st.store_id);
          } else if (storesEstimatedSavings?.length) {
            sortedStoreIds = storesEstimatedSavings.map(
              (st: any) => st.store_id
            );
          } else if (storesSavingsOpp?.length) {
            sortedStoreIds = storesSavingsOpp.map((st: any) => st.store_id);
          } else if (storesPurchaseVolume?.length) {
            sortedStoreIds = storesPurchaseVolume.map((st: any) => st.store_id);
          } else if (storesHighestComplianceByManufacturer?.length) {
            sortedStoreIds = storesHighestComplianceByManufacturer.map(
              (st: any) => st.store_id
            );
          }

          if (sortedStoreIds.length > 0) {
            // Reorder rows based on the sorted store IDs
            const rowsMap = new Map();
            rows.forEach((row: any) => {
              rowsMap.set(row.storeid, row);
            });

            // Filter sortedStoreIds to only include stores that are actually in the rows array
            const availableStoreIds = Array.from(rowsMap.keys());
            const filteredSortedStoreIds = sortedStoreIds.filter((storeId) =>
              availableStoreIds.includes(storeId)
            );

            const reorderedRows: any[] = [];

            filteredSortedStoreIds.forEach((storeId, index) => {
              const row = rowsMap.get(storeId);
              if (row) {
                reorderedRows.push(row);
              }
            });

            // Add any remaining rows that weren't in the sorted list
            const sortedStoreIdSet = new Set(filteredSortedStoreIds);
            rows.forEach((row: any) => {
              if (!sortedStoreIdSet.has(row.storeid)) {
                reorderedRows.push(row);
              }
            });

            rows = reorderedRows;
          }
        }

        // Final cache operation with monitoring
        if (useApiCaching && rows.length > 0) {
          await newrelic.startSegment(
            "StoreRepository.getSalesRepWithStoresAndTotalAmount.cache_set",
            true,
            async () => {
              newrelic.addCustomAttributes({
                cache_set_rows_count: rows.length,
                cache_set_total_count: results.count?.length ?? 0,
                cache_key_length: cacheKey.length
              });
              await redisClient.setEx(
                cacheKey,
                CACHE_TTL_TIME,
                JSON.stringify({
                  rows: rows,
                  count: results.count?.length ?? 0
                })
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
          );
        }

        // Final result with monitoring
        newrelic.addCustomAttributes({
          final_rows_count: rows.length,
          final_total_count: results.count?.length ?? 0,
          method_completed: true
        });

        const finalResult = { rows: rows, count: results.count?.length ?? 0 };

        return finalResult;
      }
    );
  }

  // Fetch store IDs based on UserRole
  private async getStoreIds(userRoleWhere: any) {
    const storeIdsResult: any[] = await UserRole.findAll({
      where: {
        ...userRoleWhere,
        parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        associated_entity_type: ENTITY_TYPE.STORE,
        role: ENTITY_TYPE.STORE
        // ...enrolledWhere
      },
      attributes: ["associated_user_id"],
      raw: true
    });

    return storeIdsResult?.map((st: any) => st.associated_user_id);
  }

  private async getContributingStoreIdsForSalesRepEarnings(
    distributorIds: number[]
  ) {
    const storeIdsResult: any[] = await SalesRepSpiffEarningSummary.findAll({
      where: {
        distributor_id: { [Op.in]: distributorIds }
      },
      attributes: ["store_id"],
      raw: true
    });

    return storeIdsResult?.map((st: any) => st.store_id);
  }

  private buildQuery(
    distributorIds: number[],
    storeIds: number[],
    manufacturerId?: number,
    replaceSelectQuery?: string,
    authorizedDistManufacturerIds?: number[],
    includeCurrentYearData: boolean = true,
    returnEnrolledProgramsEarning: boolean = false
  ): { query: string; replacements: any } {
    let query = returnEnrolledProgramsEarning
      ? `SELECT * FROM combined_store_enrolled_summary WHERE 1 = 1`
      : `SELECT * FROM combined_store_summary WHERE 1 = 1`;

    const transactionYear = includeCurrentYearData
      ? new Date().getFullYear().toString()
      : "";

    const replacements: any = {
      distributorIds: distributorIds,
      storeIds: storeIds,
      manufacturerId: manufacturerId,
      authorizedDistManufacturerIds: authorizedDistManufacturerIds,
      transactionYear: transactionYear
    };

    if (distributorIds.length > 0 && distributorIds.length < 100) {
      query += ` AND distributor_id IN (:distributorIds)`;
    }

    if (storeIds.length > 0 && storeIds.length < 100) {
      query += ` AND store_id IN (:storeIds)`;
    }

    if (manufacturerId) {
      query += ` AND manufacturer_id = :manufacturerId`;
    }

    if (
      Array.isArray(authorizedDistManufacturerIds) &&
      authorizedDistManufacturerIds.length > 0
    ) {
      query += ` AND manufacturer_id IN (:authorizedDistManufacturerIds)`;
    }

    if (includeCurrentYearData && transactionYear) {
      query += " And transaction_year = :transactionYear";
    }

    if (replaceSelectQuery) {
      query = query?.replace("*", replaceSelectQuery) + ` group by store_id`;
    }

    return { query, replacements };
  }

  private async getPurchaseVolumeWithStoreId(
    distributorIds: number[],
    storeIds: number[],
    sort?: string,
    manufacturerId?: number,
    authorizedDistManufacturerIds?: number[],
    warehouseIds?: number[],
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    programIds?: number[]
  ) {
    let storeRebateMap: Record<number, number> = {};

    if (programTerms) {
      // Use optimized method for materialized view
      const results =
        await this.getTransactionsByManufacturerIdAndProgramTermsOptimized(
          storeIds,
          authorizedDistManufacturerIds ??
            (manufacturerId ? [manufacturerId] : []),
          ENTITY_TYPE.STORE,
          false,
          undefined,
          undefined,
          warehouseIds,
          programTerms,
          true,
          true
        );

      let manufacturerIdsByStoreId: Record<number, number[]> = {};
      if (authorizedDistManufacturerIds && results?.length && programIds) {
        const startTime = performance.now();
        manufacturerIdsByStoreId =
          await ProgramRepository.findManufacturersWithAllProgramsIneligibleByStore(
            authorizedDistManufacturerIds ??
              (manufacturerId ? [manufacturerId] : []),
            programIds,
            storeIds
          );
      }

      storeRebateMap = results.reduce(
        (acc: any, item: any) => {
          const storeId = item.buyer_id;
          const storeIneligibledManufacturers =
            manufacturerIdsByStoreId[storeId];

          const manufacturerId =
            item.manufacturer_id ?? item?.product?.manufacturer_id;
          const includePurchase =
            !storeIneligibledManufacturers?.includes(manufacturerId);

          const purchaseVal = includePurchase
            ? parseFloat(item.total_price?.toString() || "0")
            : 0;

          acc[storeId] = (acc[storeId] || 0) + purchaseVal;
          return acc;
        },
        {} as Record<number, number>
      );
    } else {
      const { query, replacements } = this.buildQuery(
        distributorIds,
        storeIds,
        manufacturerId,
        "store_id, sum(total_purchase) as total_purchase ",
        authorizedDistManufacturerIds
      );

      const results: any[] = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: replacements
      });

      storeRebateMap = results.reduce(
        (acc, item) => {
          const storeId = item.store_id;
          const rebate = parseFloat(item.total_purchase ?? "0");
          acc[storeId] = rebate;
          return acc;
        },
        {} as Record<number, number>
      );
    }

    const data = storeIds.map((id) => ({
      store_id: id,
      totalamount: storeRebateMap[id] ?? 0
    }));

    return !sort
      ? data
      : data.sort((a, b) =>
          sort == "ASC"
            ? a.totalamount - b.totalamount
            : b.totalamount - a.totalamount
        );
  }

  private async getSpiffEaringingWithStoreId({
    distributorIds,
    storeIds,
    sort,
    manufacturerId,
    authorizedDistManufacturerIds,
    programIds
  }: {
    distributorIds: number[];
    storeIds: number[];
    sort?: string;
    manufacturerId?: number;
    authorizedDistManufacturerIds?: number[];
    programIds?: number[];
  }) {
    const results: any[] = await SalesRepSpiffEarningSummary.findAll({
      attributes: ["store_id", [fn("SUM", col("earning")), "total_earning"]],
      where: {
        distributor_id: { [Op.in]: distributorIds },
        ...(manufacturerId ? { manufacturer_id: manufacturerId } : {}),
        ...(authorizedDistManufacturerIds?.length
          ? { manufacturer_id: { [Op.in]: authorizedDistManufacturerIds } }
          : {}),
        ...(programIds?.length ? { program_id: { [Op.in]: programIds } } : {})
      },
      group: ["store_id"],
      raw: true
    });

    const data = storeIds.map((id) => ({
      store_id: id,
      totalSpiffEarning: parseFloat(
        results?.find((pt: any) => pt.store_id == id)?.total_earning ?? "0"
      )
    }));

    return !sort
      ? data
      : data.sort((a, b) =>
          sort == "ASC"
            ? a.totalSpiffEarning - b.totalSpiffEarning
            : b.totalSpiffEarning - a.totalSpiffEarning
        );
  }

  private async getProgramCountWithStoreId(
    storeIds: number[],
    sort?: string,
    authorizedDistManufacturerIds?: number[],
    isInternalInitiative?: boolean
  ) {
    return newrelic.startSegment(
      "StoreRepository.getProgramCountWithStoreId",
      true,
      async () => {
        try {
          if (!storeIds.length) {
            return [];
          }

          const storeProgramCounts =
            await ProgramRepository.getSpiffProgramCountByStoreIds({
              storeIds,
              authorizedManufacturerIds: authorizedDistManufacturerIds,
              isInternalInitiative
            });

          // Create a map for quick lookup
          const storeProgramCountMap = new Map(
            storeProgramCounts.map((item) => [item.storeId, item.programCount])
          );

          // Ensure ALL stores are included, even those with 0 program counts
          const data = storeIds.map((storeId) => ({
            storeId: storeId,
            programCount: storeProgramCountMap.get(storeId) || 0
          }));

          // Sort the results if sort parameter is provided
          if (sort) {
            data.sort((a, b) => {
              if (sort === "ASC") {
                return a.programCount - b.programCount;
              } else {
                return b.programCount - a.programCount;
              }
            });
          }

          return data;
        } catch (error) {
          newrelic.noticeError(error as Error);
          console.error("Error in getProgramCountWithStoreId:", error);
          return [];
        }
      }
    );
  }

  private async getEstimatedSavingsWithStoreId(
    distributorIds: number[],
    storeIds: number[],
    sort?: string,
    manufacturerId?: number,
    authorizedDistManufacturerIds?: number[],
    returnEnrolledProgramsEarning: boolean = false,
    programIds?: number[],
    ineligibleStoreIdsByProgramIds?: any[]
  ) {
    return newrelic.startSegment(
      "StoreRepository.getEstimatedSavingsWithStoreId",
      true,
      async () => {
        // let storeRebateMap: Record<number, number> = {};

        if (programIds) {
          // Build ineligible store conditions for SQL
          const ineligibleConditions: string[] = [];
          const ineligibleReplacements: any = {};

          if (ineligibleStoreIdsByProgramIds?.length) {
            ineligibleStoreIdsByProgramIds.forEach(
              (item: any, index: number) => {
                if (item.store_ids?.length) {
                  ineligibleConditions.push(
                    `(program_id = :programId${index} AND entity_id = ANY(ARRAY[:storeIds${index}]))`
                  );
                  ineligibleReplacements[`programId${index}`] = item.program_id;
                  ineligibleReplacements[`storeIds${index}`] = item.store_ids;
                }
              }
            );
          }

          const conditions = ["pc.entity_type = 'STORE'"];

          if (storeIds.length > 0) {
            conditions.push("pc.entity_id = ANY(ARRAY[:storeIds])");
          }

          if (programIds.length > 0) {
            conditions.push("pc.program_id = ANY(ARRAY[:programIds])");
          }

          // Build CTEs for better query planning and index usage
          const ctes: string[] = [];
          let ineligibleJoin = "";

          // Build ineligible CTE for better index usage
          if (ineligibleConditions.length > 0) {
            ctes.push(`
            ineligible_stores AS (
              SELECT DISTINCT entity_id, program_id
              FROM program_compliances
              WHERE entity_type = 'STORE'
              AND (${ineligibleConditions.join(" OR ")})
            )`);
            ineligibleJoin = `
            LEFT JOIN ineligible_stores ie ON pc.entity_id = ie.entity_id AND pc.program_id = ie.program_id`;
          }

          // Build enrolled stores CTE for better query planning
          let enrolledJoin = "";
          if (returnEnrolledProgramsEarning) {
            ctes.push(`
            enrolled_stores AS (
              SELECT DISTINCT entity_id, program_id 
              FROM program_participants 
              WHERE entity_type = 'STORE' 
              AND deleted_at IS NULL
            )`);
            enrolledJoin = `
            JOIN enrolled_stores pp ON pc.entity_id = pp.entity_id AND pc.program_id = pp.program_id`;
          }

          // Build the optimized SQL query using LEFT JOIN instead of UNION ALL
          // This executes only one query instead of two and allows better index usage
          // Add compliance_data to CTEs
          ctes.push(`
          compliance_data AS (
            SELECT 
              pc.entity_id as store_id,
              SUM(
                CASE 
                  WHEN pc.status = 'active' THEN COALESCE(pc.earned_rebate, 0)
                  ELSE 0
                END
              ) as earned_rebate
            FROM program_compliances pc${enrolledJoin}${ineligibleJoin}
            WHERE ${conditions.join(" AND ")}
            ${ineligibleConditions.length > 0 ? "AND ie.entity_id IS NULL" : ""}
            GROUP BY pc.entity_id
          )`);

          let sqlQuery = `WITH${ctes.join(",")}`;

          // Only include store list join if storeIds is not empty
          // This prevents PostgreSQL error "cannot determine type of empty array"
          if (storeIds.length > 0) {
            sqlQuery += `
          SELECT 
            COALESCE(cd.store_id, s.store_id) as store_id,
            COALESCE(cd.earned_rebate, 0) as earned_rebate
          FROM UNNEST(ARRAY[:storeIds]) AS s(store_id)
          LEFT JOIN compliance_data cd ON s.store_id = cd.store_id`;
          } else {
            sqlQuery += `
          SELECT 
            store_id,
            earned_rebate
          FROM compliance_data`;
          }

          // Add sorting at database level
          const sortOrder = sort === "ASC" ? "ASC" : "DESC";
          sqlQuery += ` ORDER BY earned_rebate ${sortOrder}`;

          const results: any[] = await sequelize.query(sqlQuery, {
            type: QueryTypes.SELECT,
            replacements: {
              storeIds: storeIds,
              programIds: programIds,
              ...ineligibleReplacements
            }
          });
          // Convert results to the expected format
          const data = results.map((item) => ({
            store_id: item.store_id,
            earned_rebate: parseFloat(item.earned_rebate || "0")
          }));

          newrelic.addCustomAttribute(
            "getEstimatedSavingsWithStoreId.store_count",
            storeIds.length
          );

          return data;
        } else {
          const { query, replacements } = this.buildQuery(
            distributorIds,
            storeIds,
            manufacturerId,
            "store_id, sum(earned_rebate) as earned_rebate ",
            authorizedDistManufacturerIds,
            undefined,
            returnEnrolledProgramsEarning
          );

          // Add sorting to the query
          // buildQuery already includes GROUP BY store_id, so we only need to add ORDER BY
          const sortDirection = sort === "ASC" ? "ASC" : "DESC";
          const sortedQuery = `${query} ORDER BY earned_rebate ${sortDirection}`;

          const results: any[] = await sequelize.query(sortedQuery, {
            type: QueryTypes.SELECT,
            replacements: replacements
          });

          // Convert results to the expected format
          const data = results.map((item) => ({
            store_id: item.store_id,
            earned_rebate: parseFloat(item.earned_rebate || "0")
          }));

          newrelic.addCustomAttribute(
            "getEstimatedSavingsWithStoreId.store_count",
            storeIds.length
          );

          return data;
        }
      }
    );
  }

  private async getSavingsOppWithStoreId(
    distributorIds: number[],
    storeIds: number[],
    sort?: string,
    manufacturerId?: number,
    authorizedDistManufacturerIds?: number[],
    programIds?: number[],
    ineligibleStoreIdsByProgramIds?: any[]
  ) {
    if (programIds) {
      // Build ineligible store conditions for SQL
      const ineligibleConditions: string[] = [];
      const ineligibleReplacements: any = {};

      if (ineligibleStoreIdsByProgramIds?.length) {
        ineligibleStoreIdsByProgramIds.forEach((item: any, index: number) => {
          if (item.store_ids?.length) {
            ineligibleConditions.push(
              `(seo.program_id = :programId${index} AND seo.store_id = ANY(ARRAY[:storeIds${index}]))`
            );
            ineligibleReplacements[`programId${index}`] = item.program_id;
            ineligibleReplacements[`storeIds${index}`] = item.store_ids;
          }
        });
      }

      // Build WHERE conditions
      const whereConditions: string[] = [];
      const replacements: any = {};

      // Always filter by storeIds
      if (storeIds.length > 0) {
        whereConditions.push(`seo.store_id = ANY(ARRAY[:storeIds])`);
        replacements.storeIds = storeIds;
      }

      // Filter by programIds
      if (programIds.length > 0) {
        whereConditions.push(`seo.program_id = ANY(ARRAY[:programIds])`);
        replacements.programIds = programIds;
      }

      // Filter by manufacturer if provided
      if (manufacturerId) {
        whereConditions.push(`seo.manufacturer_id = :manufacturerId`);
        replacements.manufacturerId = manufacturerId;
      }

      // Filter by distributor if provided
      if (distributorIds?.length == 1) {
        whereConditions.push(`seo.distributor_id = :distributorId`);
        replacements.distributorId = distributorIds[0];
      } else if (distributorIds?.length > 1) {
        whereConditions.push(
          `seo.distributor_id = ANY(ARRAY[:distributorIds])`
        );
        replacements.distributorIds = distributorIds;
      }

      // Filter by authorized manufacturer IDs if provided
      if (authorizedDistManufacturerIds?.length) {
        whereConditions.push(
          `seo.manufacturer_id = ANY(ARRAY[:authorizedDistManufacturerIds])`
        );
        replacements.authorizedDistManufacturerIds =
          authorizedDistManufacturerIds;
      }

      // Filter by current year
      const transactionYear = new Date().getFullYear().toString();
      whereConditions.push(`seo.transaction_year = :transactionYear`);
      replacements.transactionYear = transactionYear;

      // Filter by highest_tier
      whereConditions.push(`seo.highest_tier = true`);

      // Build the SQL query with database-level aggregation and sorting
      // Ensure all stores are included, even those with 0 values, by using UNION
      let ineligibleWhereClause = "";
      if (ineligibleConditions.length > 0) {
        ineligibleWhereClause = ` AND NOT (${ineligibleConditions.join(" OR ")})`;
      }

      let sqlQuery = `
        SELECT 
          store_id,
          earning_opportunity
        FROM (
          SELECT 
            seo.store_id,
            SUM(
              CASE 
                WHEN seo.rebate_opportunity IS NOT NULL THEN COALESCE(seo.rebate_opportunity, 0)
                ELSE 0
              END
            ) as earning_opportunity
          FROM store_earning_opportunity_summary seo
          INNER JOIN program_compliances pc 
          ON seo.program_id = pc.program_id 
          AND seo.store_id = pc.entity_id
          AND seo.program_detail_id = pc.program_detail_id
          AND pc.is_qualified = false
          AND pc.entity_type = '${ENTITY_TYPE.STORE}'
          WHERE ${whereConditions.join(" AND ")}${ineligibleWhereClause}
          GROUP BY seo.store_id`;

      // Only include UNION ALL part if storeIds is not empty
      // This prevents PostgreSQL error "cannot determine type of empty array"
      if (storeIds.length > 0) {
        sqlQuery += `
          
          UNION ALL
          
          SELECT 
            store_id,
            0 as earning_opportunity
          FROM UNNEST(ARRAY[:storeIds]) as store_id
          WHERE store_id NOT IN (
            SELECT DISTINCT seo.store_id
            FROM store_earning_opportunity_summary seo
            INNER JOIN program_compliances pc 
            ON seo.program_id = pc.program_id 
            AND seo.store_id = pc.entity_id
            AND seo.program_detail_id = pc.program_detail_id
            AND pc.is_qualified = false
            AND pc.entity_type = '${ENTITY_TYPE.STORE}'
            WHERE ${whereConditions.join(" AND ")}${ineligibleWhereClause}
          )`;
      }

      sqlQuery += `
        ) combined_results
      `;

      // Add sorting at database level
      const sortOrder = sort === "ASC" ? "ASC" : "DESC";
      sqlQuery += ` ORDER BY earning_opportunity ${sortOrder}`;

      const results: any[] = await sequelize.query(sqlQuery, {
        type: QueryTypes.SELECT,
        replacements: {
          ...replacements,
          ...ineligibleReplacements
        }
      });
      // Convert results to the expected format
      const data = results.map((item) => ({
        store_id: item.store_id,
        earning_opportunity: parseFloat(item.earning_opportunity || "0")
      }));

      newrelic.addCustomAttribute(
        "getSavingsOppWithStoreId.store_count",
        storeIds.length
      );

      return data;
    } else {
      // Fallback to original logic for non-programIds case
      // Use SQL-based sorting for consistency with programIds path
      const whereConditions: string[] = [];
      const replacements: any = {};

      // Always filter by storeIds
      if (storeIds.length > 0) {
        whereConditions.push(`seo.store_id = ANY(ARRAY[:storeIds])`);
        replacements.storeIds = storeIds;
      }

      // Filter by manufacturer if provided
      if (manufacturerId) {
        whereConditions.push(`seo.manufacturer_id = :manufacturerId`);
        replacements.manufacturerId = manufacturerId;
      }

      // Filter by distributor if provided
      if (distributorIds?.length == 1) {
        whereConditions.push(`seo.distributor_id = :distributorId`);
        replacements.distributorId = distributorIds[0];
      } else if (distributorIds?.length > 1) {
        whereConditions.push(
          `seo.distributor_id = ANY(ARRAY[:distributorIds])`
        );
        replacements.distributorIds = distributorIds;
      }

      // Filter by authorized manufacturer IDs if provided
      if (authorizedDistManufacturerIds?.length) {
        whereConditions.push(
          `seo.manufacturer_id = ANY(ARRAY[:authorizedDistManufacturerIds])`
        );
        replacements.authorizedDistManufacturerIds =
          authorizedDistManufacturerIds;
      }

      // Filter by current year
      const transactionYear = new Date().getFullYear().toString();
      whereConditions.push(`seo.transaction_year = :transactionYear`);
      replacements.transactionYear = transactionYear;

      // Filter by highest_tier
      whereConditions.push(`seo.highest_tier = true`);

      // Build the SQL query with database-level aggregation and sorting
      // Ensure all stores are included, even those with 0 values, by using UNION
      let sqlQuery = `
        SELECT 
          store_id,
          earning_opportunity
        FROM (
          SELECT 
            seo.store_id,
            SUM(
              CASE 
                WHEN seo.rebate_opportunity IS NOT NULL THEN COALESCE(seo.rebate_opportunity, 0)
                ELSE 0
              END
            ) as earning_opportunity
          FROM store_earning_opportunity_summary seo
          WHERE ${whereConditions.join(" AND ")}
          GROUP BY seo.store_id`;

      // Only include UNION ALL part if storeIds is not empty
      // This prevents PostgreSQL error "cannot determine type of empty array"
      if (storeIds.length > 0) {
        sqlQuery += `
          
          UNION ALL
          
          SELECT 
            store_id,
            0 as earning_opportunity
          FROM UNNEST(ARRAY[:storeIds]) as store_id
          WHERE store_id NOT IN (
            SELECT DISTINCT seo.store_id
            FROM store_earning_opportunity_summary seo
            WHERE ${whereConditions.join(" AND ")}
          )`;
      }

      sqlQuery += `
        ) combined_results
      `;

      // Add sorting at database level for consistency
      const sortOrder = sort === "ASC" ? "ASC" : "DESC";
      sqlQuery += ` ORDER BY earning_opportunity ${sortOrder}`;

      const results: any[] = await sequelize.query(sqlQuery, {
        type: QueryTypes.SELECT,
        replacements: replacements
      });

      // Convert results to the expected format
      const data = results.map((item) => ({
        store_id: item.store_id,
        earning_opportunity: parseFloat(item.earning_opportunity || "0")
      }));

      // If no results from SQL, fallback to original JavaScript logic for backward compatibility
      if (data.length === 0 && storeIds.length > 0) {
        const storesSavingsOpp = await this.getStoresEarningOpportunity(
          storeIds,
          distributorIds?.length == 1 ? distributorIds[0] : undefined,
          manufacturerId,
          distributorIds,
          authorizedDistManufacturerIds
        );

        const fallbackData = storeIds.map((id) => {
          return {
            store_id: id,
            earning_opportunity:
              storesSavingsOpp
                ?.filter((st: any) => st.store_id == id && st.highest_tier)
                ?.reduce((acc: number, st: any) => {
                  // Check if this store is ineligible for this program
                  const isIneligiblePrograms = ineligibleStoreIdsByProgramIds
                    ?.find((it: any) => it.program_id == st.program_id)
                    ?.store_ids?.includes(id);

                  // If ineligible, don't add to the sum (return 0), otherwise add the rebate opportunity
                  const rebateOpportunity = isIneligiblePrograms
                    ? 0
                    : parseFloat(st.rebate_opportunity ?? "0");

                  return acc + rebateOpportunity;
                }, 0) ?? 0
          };
        });

        // Apply sorting to fallback data
        return sort && sort.toUpperCase() === "ASC"
          ? fallbackData.sort(
              (a, b) => a.earning_opportunity - b.earning_opportunity
            )
          : fallbackData.sort(
              (a, b) => b.earning_opportunity - a.earning_opportunity
            );
      }

      newrelic.addCustomAttribute(
        "getSavingsOppWithStoreId.store_count",
        storeIds.length
      );

      return data;
    }
  }

  public async getStoresHighestComplianceByManufacturer({
    storeIds,
    manufacturerIds,
    distributorIds,
    sort,
    enrolled,
    programIds,
    programTimeline
  }: {
    storeIds: number[];
    manufacturerIds: number[];
    distributorIds: number[];
    sort?: string;
    enrolled?: boolean;
    programIds?: number[];
    programTimeline?: string;
  }): Promise<any[]> {
    if (storeIds.length == 0) return [];

    // Handle empty programIds
    const hasProgramIds = programIds && programIds.length > 0;
    const programIdsArray = hasProgramIds ? programIds : [0]; // Use [0] as placeholder when empty

    // Build date filter condition based on programTimeline
    // "Current": programs that are currently active (started and not ended)
    // "Historical": programs that have ended
    // Default (null/undefined): "Current" behavior
    const dateFilterCondition = buildProgramTimelineSqlCondition(
      programTimeline,
      "p"
    );

    const query = `
      WITH all_combinations AS (
          SELECT 
              m.manufacturer_id,
              b.buyer_id
          FROM unnest(ARRAY[:manufacturerIds]) AS m(manufacturer_id)
          CROSS JOIN unnest(ARRAY[:storeIds]) AS b(buyer_id)
      ),
      -- Get enrolled programs for each store ONLY when enrolled=true
      store_enrolled_programs AS (
          SELECT 
              ac.buyer_id,
              ac.manufacturer_id,
              p.id as program_id
          FROM all_combinations ac
          INNER JOIN programs p ON p.manufacturer_id = ac.manufacturer_id
          INNER JOIN program_participants pp ON (
              pp.program_id = p.id 
              AND pp.entity_id = ac.buyer_id 
              AND pp.entity_type = 'STORE' 
              AND pp.deleted_at IS NULL
          )
          WHERE p.deleted_at IS NULL
              AND :enrolled = true
              -- If hasProgramIds is true, filter by those IDs; otherwise include all
              AND (:hasProgramIds = false OR p.id = ANY(ARRAY[:programIds]))
      ),
      ranked_compliance AS (
          SELECT 
              ssc.buyer_id,
              ssc.manufacturer_id,
              ssc.program_id,
              ssc.total_product_tags,
              ssc.total_purchased_distinct_product_ids,
              ssc.compliance_percentage,
              ROW_NUMBER() OVER (PARTITION BY ssc.buyer_id, ssc.manufacturer_id ORDER BY ssc.compliance_percentage DESC) as rn
          FROM spiff_store_program_compliance ssc
          JOIN programs p ON p.id = ssc.program_id
          WHERE ssc.manufacturer_id = ANY(ARRAY[:manufacturerIds])
              AND ssc.seller_id = ANY(ARRAY[:distributorIds])
              AND ssc.buyer_id = ANY(ARRAY[:storeIds])
              AND p.deleted_at IS NULL${dateFilterCondition}
              AND (
                  -- If enrolled is false/null, include all programs
                  :enrolled IS NOT true
                  -- If enrolled is true, only include enrolled programs
                  OR EXISTS (
                      SELECT 1 FROM store_enrolled_programs sep
                      WHERE sep.buyer_id = ssc.buyer_id 
                          AND sep.manufacturer_id = ssc.manufacturer_id
                          AND sep.program_id = ssc.program_id
                  )
              )
      ),
      highest_compliance AS (
          SELECT 
              buyer_id,
              manufacturer_id,
              program_id,
              total_product_tags,
              total_purchased_distinct_product_ids,
              compliance_percentage
          FROM ranked_compliance
          WHERE rn = 1
      )
      SELECT 
          ac.buyer_id AS "storeId",
          ac.manufacturer_id AS "manufacturerId",
          COALESCE(hc.program_id, 0) AS "programId",
          COALESCE(hc.total_product_tags, 0) AS "requiredCount",
          COALESCE(hc.total_purchased_distinct_product_ids, 0) AS "purchasedCount",
          ROUND(COALESCE(hc.compliance_percentage, 0))::INTEGER AS "highestCompliancePercentage"
      FROM all_combinations ac
      LEFT JOIN highest_compliance hc 
          ON ac.buyer_id = hc.buyer_id 
          AND ac.manufacturer_id = hc.manufacturer_id
      ORDER BY "highestCompliancePercentage" ${sort && sort !== "sort" ? sort : "ASC"};
    `;

    const results = await sequelize.query(query, {
      replacements: {
        storeIds,
        manufacturerIds,
        distributorIds,
        enrolled: enrolled === true,
        programIds: programIdsArray,
        hasProgramIds: hasProgramIds
      },
      type: QueryTypes.SELECT
    });

    return results;
  }

  private async getCompletedProgramsCountWithStoreId(
    storeIds: number[],
    programIds?: number[],
    sort?: string,
    programs?: any[],
    includeEnrolledPrograms?: boolean
  ) {
    const storesCompletedProgramCount: any[] = await ProgramCompliance.findAll({
      where: {
        is_qualified: true,
        entity_type: ENTITY_TYPE.STORE,
        entity_id: { [Op.in]: storeIds },
        ...(programIds
          ? {
              program_id: {
                [Op.in]: programIds
              }
            }
          : {}),
        "$ProgramComplianceStoreIneligibilities.id$": {
          [Op.is]: null
        }
      },
      include: includeEnrolledPrograms
        ? [
            {
              model: ProgramParticipant,
              as: "ProgramComplianceParticipant",
              attributes: [],
              required: true, // Ensures only matching rows are included
              where: {
                entity_id: { [Op.col]: "ProgramCompliance.entity_id" },
                program_id: { [Op.col]: "ProgramCompliance.program_id" }
              }
            },
            {
              model: ProgramStoreIneligibility,
              as: "ProgramComplianceStoreIneligibilities",
              attributes: [],
              required: false,
              where: {
                store_id: { [Op.col]: "ProgramCompliance.entity_id" },
                program_id: { [Op.col]: "ProgramCompliance.program_id" }
              }
            }
          ]
        : [
            {
              model: ProgramStoreIneligibility,
              as: "ProgramComplianceStoreIneligibilities",
              attributes: [],
              required: false,
              where: {
                store_id: { [Op.col]: "ProgramCompliance.entity_id" },
                program_id: { [Op.col]: "ProgramCompliance.program_id" }
              }
            }
          ],
      attributes: [
        ["entity_id", "store_id"],
        [
          sequelize.fn(
            "COALESCE",
            sequelize.fn("Count", sequelize.col("ProgramCompliance.id")),
            0
          ),
          "completed_programs"
        ],
        [
          sequelize.fn("ARRAY_AGG", sequelize.col("program_detail_id")),
          "program_detail_ids"
        ]
      ],
      group: ["ProgramCompliance.entity_id"], // Group by Store ID
      raw: true
    });

    const visibilityEnabledProgram = programs?.filter(
      (pr: any) => pr.visibility_entity_type === ENTITY_TYPE.STORE
    );

    const allowedAllVisibilityProgram = programs?.filter(
      (pr: any) => !pr.visibility_entity_type
    );

    const data = storeIds.map((id) => {
      let completed = 0;
      const complianceProgramDetailIds =
        storesCompletedProgramCount?.find((pt: any) => pt.store_id == id)
          ?.program_detail_ids ?? [];
      const storeVisibilityEnabledProgram = visibilityEnabledProgram?.filter(
        (pr: any) => pr.visible_entity_ids?.includes(id)
      );

      const allowedProgramIds = [
        ...(allowedAllVisibilityProgram?.map(
          (pr: any) => pr?.program_detail_id
        ) ?? []),
        ...(storeVisibilityEnabledProgram?.map(
          (pr: any) => pr?.program_detail_id
        ) ?? [])
      ];

      if (programs && allowedProgramIds) {
        completed = allowedProgramIds?.filter((id: any) =>
          complianceProgramDetailIds?.includes(id)
        ).length;
      } else {
        completed =
          storesCompletedProgramCount?.find((pt: any) => pt.store_id == id)
            ?.completed_programs ?? 0;
      }

      return {
        store_id: id,
        completed_programs: completed
      };
    });

    return !sort
      ? data
      : data.sort((a, b) =>
          sort == "ASC"
            ? a.completed_programs - b.completed_programs
            : b.completed_programs - a.completed_programs
        );
  }

  // Get stores with both line items and program participation (optimized version)
  public async getStoresWithLineItemsAndProgramParticipation(
    distributorIds: number[],
    manufacturerId: number,
    programIds?: number[],
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    programTimeline?: string
  ): Promise<number[]> {
    const conditions: string[] = [];
    const replacements: Record<string, any> = {};

    // Add manufacturer filters
    if (manufacturerId) {
      conditions.push("li.manufacturer_id = :manufacturerId");
      replacements.manufacturerId = manufacturerId;
    }

    // Add distributor filter
    if (distributorIds.length > 0) {
      conditions.push("li.seller_id IN (:distributorIds)");
      replacements.distributorIds = distributorIds;
    }

    // Build additional filters
    const additionalFilters = [
      this.buildProgramTimelineFilter(programTimeline),
      this.buildProgramTermsFilter(programTerms),
      this.buildProgramIdsFilter(programIds)
    ].filter(Boolean);

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Optimized query using EXISTS instead of JOINs for better performance
    // This leverages the existing indexes more effectively
    const query = `
    SELECT DISTINCT li.buyer_id as store_id
    FROM line_items_products_joined_materialized_view li
    ${whereClause}
    AND EXISTS (
      SELECT 1 
      FROM program_participants pp
      JOIN programs p ON pp.program_id = p.id
      WHERE pp.entity_id = li.buyer_id
        AND pp.entity_type = 'STORE'
        AND p.manufacturer_id = :manufacturerId
        ${programIds && programIds.length > 0 ? `AND p.id IN (${programIds.join(",")})` : ""}
        ${this.buildProgramTimelineFilter(programTimeline)}
        ${this.buildProgramTermsFilter(programTerms)}
    )
  `;

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements,
      raw: true
    });

    return results.map((row: any) => row.store_id);
  }

  private buildProgramTimelineFilter(programTimeline?: string): string {
    return buildProgramTimelineSqlCondition(programTimeline, "p");
  }

  private buildProgramTermsFilter(
    programTerms?: Record<number, { startDate: string; endDate: string }>
  ): string {
    if (!programTerms || Object.keys(programTerms).length === 0) {
      return "";
    }

    const termConditions = Object.entries(programTerms)
      .map(
        ([manufacturerId, term]) =>
          `(p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${term.startDate}' AND '${term.endDate}')`
      )
      .join(" OR ");

    return `AND (${termConditions})`;
  }

  private buildProgramIdsFilter(programIds?: number[]): string {
    if (!programIds || programIds.length === 0) {
      return "";
    }

    return `AND p.id IN (${programIds.join(",")})`;
  }

  // Fetch line items with transactions
  private async getLineItems(
    storeIds: number[],
    lineItemsWhere: any,
    sort: string,
    manufacturerId?: number,
    programTerms?: Record<number, { startDate: string; endDate: string }>
  ) {
    const productsWhere = manufacturerId
      ? { manufacturer_id: manufacturerId }
      : {};

    const transactionFilter: any = {};
    // Add per-manufacturer programTerm logic
    if (programTerms && Object.keys(programTerms).length > 0) {
      transactionFilter[Op.and] = [
        literal(`
          EXISTS (
            SELECT 1 FROM products AS p
            WHERE p.id = "LineItem".splink_product_id
            AND p.manufacturer_id IS NOT NULL
            AND (
              ${Object.entries(programTerms)
                .map(
                  ([mid, term]) =>
                    `(p.manufacturer_id = ${mid} AND "LineItem"."transaction_date" BETWEEN '${term.startDate}' AND '${term.endDate}')`
                )
                .join(" OR ")}
            )
          )
        `)
      ];
    }

    const finalWhere = {
      ...lineItemsWhere,
      buyer_type: ENTITY_TYPE.STORE,
      buyer_id: { [Op.in]: storeIds },
      splink_product_id: { [Op.ne]: null },
      ...transactionFilter
    };

    return await LineItem.findAll({
      where: finalWhere,
      attributes: [
        [sequelize.col("LineItem.buyer_id"), "store_id"],
        [
          sequelize.literal(`
            ARRAY_AGG(DISTINCT
              CASE
                WHEN "LineItem"."total_price" > 0
                THEN "LineItem"."skus_id"
              END
            )
          `),
          "skus_ids"
        ]
      ],
      include: [
        {
          model: Product,
          as: "product",
          attributes: [],
          required: true,
          on: sequelize.literal(
            `"product"."id" = "LineItem"."splink_product_id"`
          ),
          where: {
            ...productsWhere
          }
        }
      ],
      group: ["LineItem.buyer_id"], // Group by store ID
      order: [
        [
          sequelize.literal(
            `COALESCE( array_length( ARRAY_AGG(DISTINCT "LineItem"."skus_id"), 1 ), 0 )`
          ),
          sort
        ]
      ],
      raw: true
    });
  }

  // add SKU IDs in result
  private attachSkusToResults(rows: any[], lineItems: any[]) {
    return rows.map((row: any) => ({
      ...row,
      skus_ids:
        lineItems.find((li: any) => li.store_id === row.storeid)?.skus_ids || []
    }));
  }

  private attachPurchaseVolumeToResults(
    rows: any[],
    storesWithTotalPurchase: any[]
  ) {
    return rows.map((row: any) => ({
      ...row,
      totalamount:
        storesWithTotalPurchase.find((st: any) => st.store_id === row.storeid)
          ?.totalamount || 0
    }));
  }

  private attachEarningOppToResults(rows: any[], storesWithEarningOpp: any[]) {
    return rows.map((row: any) => ({
      ...row,
      earning_opportunity:
        storesWithEarningOpp.find((st: any) => st.store_id === row.storeid)
          ?.earning_opportunity || 0
    }));
  }

  private attachEarnedRebateToResults(
    rows: any[],
    storesWithEarnedRebate: any[]
  ) {
    return rows.map((row: any) => ({
      ...row,
      earned_rebate:
        storesWithEarnedRebate.find((st: any) => st.store_id === row.storeid)
          ?.earned_rebate || 0
    }));
  }

  private attachCompletedProgramsCountToResults(
    rows: any[],
    storesCompletedProgramsCount: any[]
  ) {
    return rows.map((row: any) => ({
      ...row,
      completed_programs:
        storesCompletedProgramsCount.find(
          (st: any) => st.store_id === row.storeid
        )?.completed_programs || 0
    }));
  }

  private attachStoresSpiffContributionToResults(
    rows: any[],
    storesSpiffContribution: any[]
  ) {
    return rows.map((row: any) => ({
      ...row,
      totalSpiffEarning:
        storesSpiffContribution.find((st: any) => st.store_id === row.storeid)
          ?.totalSpiffEarning || 0
    }));
  }

  private attachProgramCountToResults(rows: any[], storeProgramCounts: any[]) {
    const storeProgramCountMap = new Map(
      storeProgramCounts.map((item) => [item.storeId, item.programCount])
    );

    return rows.map((row) => ({
      ...row,
      program_count: storeProgramCountMap.get(row.storeid) || 0
    }));
  }

  /**
   * Builds sorting logic.
   */
  private buildSorting(
    sortKey: string,
    sort: string,
    storeIds?: number[],
    storeProgramCounts?: any[]
  ) {
    // Modify the order clause to handle chain name sorting
    const order: any[] = [];
    switch (sortKey) {
      case SORT_KEYS.CHAIN:
        order.push([sequelize.literal(`chain_names ${sort} NULLS LAST`)]);
        break;

      case SORT_KEYS.SALES_REP:
        order.push([
          sequelize.literal(`
              CONCAT(
                "StoreUserRole->storeSalesReps->store_sales_reps->user"."first_name",
                ' ',
                "StoreUserRole->storeSalesReps->store_sales_reps->user"."last_name"
              ) ${sort} NULLS LAST
            `)
        ]);
        break;

      case SORT_KEYS.DISTRIBUTOR:
        order.push([
          sequelize.literal(
            `COALESCE(distributor.organization_name, distributor.name)`
          ),
          sort
        ]);

        break;

      case SORT_KEYS.PROGRAM_COMPLIANCE:
      case SORT_KEYS.ESTIMATED_SAVINGS:
      case SORT_KEYS.SAVINGS_Opp:
      case SORT_KEYS.POTENTIAL_SAVINGS:
      case SORT_KEYS.PURCHASE_VOLUME_SORT:
      case SORT_KEYS.SKUS:
      case SORT_KEYS.NEAR_COMPLIANCE_PERCENTAGE:
        order.push([
          sequelize.literal(
            `ARRAY_POSITION(ARRAY[${storeIds?.join(",")}]::int[], "StoreUserRole"."id")`
          ),
          "ASC"
        ]);
        break;

      case SORT_KEYS.PR_AVAILABLE:
        if (storeProgramCounts?.length) {
          // Use the sorted program counts to create the order
          const sortedStoreIds = storeProgramCounts.map(
            (st: any) => st.storeId
          );
          order.push([
            sequelize.literal(
              `ARRAY_POSITION(ARRAY[${sortedStoreIds?.join(",")}]::int[], "StoreUserRole"."id")`
            ),
            "ASC"
          ]);
        } else {
          // Fallback to default sorting
          order.push([sequelize.col("StoreUserRole.name"), sort]);
        }
        break;

      default:
        order.push([sequelize.col("StoreUserRole.name"), sort]);
        break;
    }
    return order;
  }

  /**
   * Gets store IDs sorted by their highest near compliance percentage
   * @param storeIds - Array of store IDs to sort
   * @param sort - Sort direction ("ASC" or "DESC")
   * @param programIds - Optional program IDs to filter by
   * @param manufacturerId - Optional manufacturer ID to filter by
   * @returns Promise<number[]> - Array of store IDs sorted by near compliance percentage
   */
  private async getSortedStoreIdsByNearCompliance(
    storeIds: number[],
    sort: string,
    programIds?: number[],
    manufacturerId?: number
  ): Promise<number[]> {
    if (!storeIds.length) return [];

    // Use the materialized view instead of raw tables for better performance
    const query = `
      SELECT
        buyer_id as store_id,
        MAX(compliance_percentage) as highest_compliance_percentage
      FROM spiff_store_program_compliance
      WHERE buyer_id = ANY($1)
        ${programIds?.length ? "AND program_id = ANY($2)" : ""}
        ${manufacturerId ? `AND manufacturer_id = $${programIds?.length ? 3 : 2}` : ""}
      GROUP BY buyer_id
      ORDER BY highest_compliance_percentage ${sort === "ASC" ? "ASC NULLS LAST" : "DESC NULLS LAST"}
    `;

    const params: any[] = [storeIds];
    if (programIds?.length) params.push(programIds);
    if (manufacturerId) params.push(manufacturerId);

    const results = await sequelize.query(query, {
      bind: params,
      type: QueryTypes.SELECT
    });

    // Extract store IDs in sorted order
    const sortedStoreIds = results.map((row: any) => row.store_id);

    // Include stores that don't have compliance data
    const storesWithCompliance = new Set(sortedStoreIds);
    const storesWithoutCompliance = storeIds.filter(
      (id) => !storesWithCompliance.has(id)
    );

    // For ASC: N/A first, then ascending compliance (0% → 100%)
    // For DESC: Descending compliance (100% → 0%), then N/A last
    if (sort === "ASC") {
      return [...storesWithoutCompliance, ...sortedStoreIds];
    } else {
      return [...sortedStoreIds, ...storesWithoutCompliance];
    }
  }

  /**
   * Retrieves the program compliance data for a list of store IDs.
   *
   * @param {number[]} storeIds The list of store IDs to retrieve compliance data for.
   * @param {number[]} programIds Optional parameter. The list of program Ids to retrieve compliance data for.
   * @param {number} manufacturerId Optional parameter. The manufacturer Id to retrieve compliance data for.
   * @returns {Promise<ProgramCompliance[]>} A promise that resolves to an array of ProgramCompliance objects.
   */
  public async getProgramCompliances(
    storeIds: number[],
    programIds?: number[],
    manufacturerId?: number,
    isChainPrograms?: boolean
  ): Promise<ProgramComplianceType[]> {
    return newrelic.startSegment(
      "StoreRepository.getProgramCompliances",
      true,
      async () => {
        const cacheKey = getCacheKey(
          "SR",
          "getProgramCompliances",
          [
            storeIds.length > 0 ? storeIds.sort().toString() : "none",
            programIds && programIds.length > 0
              ? programIds.sort().toString()
              : "none",
            manufacturerId ?? "null"
          ].join("_")
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

        const programsFilter = {
          ...(programIds && programIds.length > 0
            ? {
                id: {
                  [Op.in]: programIds
                }
              }
            : {}),
          ...(manufacturerId
            ? {
                manufacturer_id: manufacturerId
              }
            : {})
        };

        const result = await ProgramCompliance.findAll({
          attributes: [
            [Sequelize.col("Program.id"), "programid"],
            ["entity_id", "storeid"],
            ["program_detail_id", "programdetailid"],
            ["is_qualified", "isqualified"],
            ["earned_rebate", "earnedrebate"],
            ["status", "status"],
            ["program_detail_id", "currenttierid"],
            ["total_purchase_volume", "purchasevolume"],
            ["rebate_opportunity", "earning_opportunity"]
          ],
          include: [
            {
              model: Program,
              attributes: [],
              where: {
                ...programsFilter,
                participant_type: isChainPrograms
                  ? ENTITY_TYPE.CHAIN
                  : ENTITY_TYPE.STORE
              },
              required: true // Ensures INNER JOIN behavior
            }
          ],
          where: {
            entity_id: {
              [Op.in]: storeIds
            },
            entity_type: ENTITY_TYPE.STORE
          },
          raw: true
        });

        if (useApiCaching && result.length > 0) {
          await redisClient.setEx(
            cacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(result)
          );
        }

        newrelic.addCustomAttribute(
          "getProgramCompliances.store_count",
          storeIds.length
        );
        newrelic.addCustomAttribute(
          "getProgramCompliances.result_count",
          result.length
        );

        return result as any;
      }
    );
  }

  /**
   * Retrieves a list of programs for a given manufacturer and store.
   *
   * The result includes the program ID, name, program type, tier, program detail ID, and required core SKUs.
   * The result is filtered by the provided manufacturer ID and store ID.
   * If isEnrolledPrograms is true, the result is further filtered by the store's enrolled programs.
   * If isEnrolledPrograms is false or undefined, the result includes all programs for the manufacturer and store.
   *
   * @param {number} manufacturerId The ID of the manufacturer.
   * @param {EntityType} entityType The type of the entity (e.g. ENTITY_TYPE.STORE).
   * @param {number} storeId The ID of the store.
   * @param {boolean} [isEnrolledPrograms] Whether to filter the result by the store's enrolled programs. Default is false.
   * @returns {Promise<any[]>} A promise that resolves to an array of objects with the program details.
   */
  public async getStoreManufacturerPrograms(
    manufacturerId: number,
    entityType: EntityType,
    storeId: number,
    isEnrolledPrograms: boolean | null,
    excludedProgramDetailIds?: number[],
    programIds?: number[],
    programTimeline?: string
  ): Promise<any[]> {
    return newrelic.startSegment(
      "StoreRepository.getStoreManufacturerPrograms",
      true,
      async () => {
        const programDetailWhere =
          excludedProgramDetailIds && excludedProgramDetailIds?.length > 0
            ? {
                id: {
                  [Op.notIn]: excludedProgramDetailIds
                }
              }
            : {};

        const programWhere: any = {
          ...(programIds
            ? { id: { [Op.in]: programIds } }
            : { manufacturer_id: manufacturerId })
        };

        const query = {
          attributes: [
            [
              Sequelize.fn("DISTINCT", Sequelize.col("Program.id")),
              "program_id"
            ],
            "name",
            "start_date",
            "end_date",
            "program_type",
            "program_header",
            [Sequelize.col("ProgramDetails.tier"), "tier"],
            [Sequelize.col("ProgramDetails.quantity_type"), "quantity_type"],
            [Sequelize.col("ProgramDetails.id"), "program_detail_id"],
            [Sequelize.col("ProgramDetails.overview"), "overview"],
            [Sequelize.col("ProgramDetails.criteria"), "criteria"],
            [Sequelize.col("ProgramDetails.min_spend"), "min_spend"],
            [Sequelize.col("ProgramDetails.min_qty"), "min_qty"],
            [Sequelize.col("ProgramDetails.max_qty"), "max_qty"],
            [Sequelize.col("ProgramDetails.products_tags"), "products_tags"],
            [
              Sequelize.col("ProgramDetails.products_tags_qty_max"),
              "products_tags_qty_max"
            ],
            [Sequelize.col("ProgramDetails.points_per_sku"), "points_per_sku"],
            [Sequelize.col("ProgramDetails.max_points"), "max_points"],
            [
              Sequelize.col("ProgramDetails.rebate_calculation_type"),
              "rebate_calculation_type"
            ],
            [
              Sequelize.col("ProgramDetails.products_tags_qty"),
              "products_tags_qty"
            ],
            [
              Sequelize.col("ProgramDetails.required_core_skus"),
              "required_core_skus"
            ],
            [Sequelize.col("ProgramDetails.points"), "points"],
            [Sequelize.col("ProgramDetails.rebate_amount"), "rebate_amount"],
            [
              Sequelize.col("ProgramDetails.rebate_percentage"),
              "rebate_percentage"
            ],
            [Sequelize.col("ProgramDetails.rebate_type"), "rebate_type"],
            [
              Sequelize.col("ProgramDetails.fixed_rebate_amount"),
              "fixed_rebate_amount"
            ],
            [
              Sequelize.col("ProgramDetails.fixed_rebate_category"),
              "fixed_rebate_category"
            ]
          ] as (string | [string | Col | Fn, string])[],
          include: [
            {
              model: ProgramDetail,
              as: "ProgramDetails",
              attributes: [],
              required: true,
              where: programDetailWhere
            },
            {
              model: ProgramParticipant,
              as: "ProgramParticipants",
              required: false,
              where: {
                entity_id: storeId,
                entity_type: ENTITY_TYPE.STORE,
                deleted_at: null
              },
              attributes: []
            }
          ],
          where: {
            // participant_type: entityType, // removing as this gets rid of programs for chain_partipants
            deleted_at: null,
            ...(isEnrolledPrograms
              ? {
                  "$ProgramParticipants.id$": {
                    [Op.not]: null
                  }
                }
              : {
                  "$ProgramParticipants.id$": {
                    [Op.is]: null
                  }
                }),
            ...programWhere,
            ...Program.getProgramTimelineFilter(programTimeline)
          },
          order: [literal('"Program"."id" ASC, "ProgramDetails"."tier" ASC')],
          raw: true
        } as any;

        const result = await Program.findAll(query);

        newrelic.addCustomAttribute(
          "getStoreManufacturerPrograms.manufacturer_id",
          manufacturerId
        );
        newrelic.addCustomAttribute(
          "getStoreManufacturerPrograms.store_id",
          storeId
        );
        newrelic.addCustomAttribute(
          "getStoreManufacturerPrograms.result_count",
          result.length
        );

        return result as any;
      }
    );
  }

  /**
   * Retrieves manufacturer products with their category flags and details.
   * This function constructs a complex SQL query that:
   * 1. Fetches product details from multiple tables
   * 2. Calculates category flags based on product tags
   * 3. Handles manufacturer authorization status
   * 4. Processes product variants and SKUs
   *
   * @param {string} manufacturerId - The ID of the manufacturer to fetch products for
   * @param {string} [storeId] - Optional store ID to filter products
   * @param {string} [search] - Optional search term to filter products
   * @param {string} [sortBy] - Optional field to sort products by
   * @param {string} [sortOrder] - Optional sort order (asc/desc)
   * @param {number} [limit] - Optional limit for number of products to return
   * @param {number} [offset] - Optional offset for pagination.
   * @returns {Promise<any[]>} Array of products with their details and category flags
   *
   * The returned products include:
   * - Basic product information (id, name, description, etc.)
   * - Category flags (core_product, essential, etc.)
   * - SKU information (unit, case, box)
   * - Manufacturer authorization status
   * - Product variants and their details
   *
   * Example category flags structure:
   * {
   *   core_product: boolean,
   *   essential: boolean,
   *   flex: boolean,
   *   innovation: boolean,
   *   core_retail: boolean,
   *   // ... other category flags
   * }
   */
  public async getManufacturerProducts({
    manufacturerId,
    distributorId,
    categoriesId,
    storeId = 0, // default ,
    selectedWarehouseId,
    categoryTagsJSON,
    excludeCategoryFlags
  }: GetManufacturerProductsParams & {
    categoryTagsJSON?: string[];
  }): Promise<any[]> {
    let tagArray: string[] | undefined = undefined;
    if (Array.isArray(categoryTagsJSON)) {
      tagArray = categoryTagsJSON;
    }

    const categoriesFilter: any = {
      ...(categoriesId ? { category_id: categoriesId } : {}),
      ...(tagArray && tagArray.length > 0
        ? {
            [Op.or]: tagArray.map((tag) => ({
              category_tags_json: {
                [Op.contains]: [tag]
              }
            }))
          }
        : {})
    };

    // Get category tags reference
    const categoryTags = excludeCategoryFlags
      ? []
      : await this.getCategoryTagsReference(tagArray);
    // Build dynamic category flags object
    const categoryFlagsObject = categoryTags.reduce((acc: any, tag: any) => {
      const tagKey = tag.tagKey?.trim();
      acc[tagKey] = Sequelize.literal(
        `COALESCE("Product"."category_tags_json" @> '["${tagKey}"]'::jsonb, false)`
      );
      return acc;
    }, {});

    // Split categoryFlagsObject into chunks of 50 key-value pairs (100 args)
    const flagEntries = Object.entries(categoryFlagsObject);
    const flagChunks = chunkArray(flagEntries, 50);
    // Build SQL for each chunk and join with ||
    const chunkSQLs = flagChunks.map((chunk) => {
      const args = chunk
        .flat()
        .map((val) => (typeof val === "string" ? `'${val}'` : val.val))
        .join(", ");
      return `jsonb_build_object(${args})`;
    });
    const categoryFlagsExpr: any = categoryTags?.length
      ? Sequelize.literal(chunkSQLs.join(" || "))
      : Sequelize.literal(`'{}'::jsonb`); // empty jsonb;

    // Base attributes to select
    const attributes: (string | [any, string])[] = [
      "id",
      "name",
      "size",
      "skus_id",
      "case_skus_id",
      "unit_skus_id",
      "box_skus_id",
      "primary_variant",
      [categoryFlagsExpr, "category_flags"]
    ];

    if (distributorId) {
      const internalCodeCase: [any, string] = [
        Sequelize.fn("MIN", Sequelize.col("ProductCodeMapping.code")),
        "internal_code"
      ];
      attributes.push(internalCodeCase);

      const lastTransactionDateCase: [any, string] = [
        Sequelize.fn(
          "MIN",
          Sequelize.col("ProductCodeMapping.last_transaction_date")
        ),
        "last_transaction_date"
      ];
      attributes.push(lastTransactionDateCase);

      // Fetch warehouse-specific product name when warehouse_id is provided
      if (selectedWarehouseId) {
        const productNameCase: [any, string] = [
          Sequelize.fn("MIN", Sequelize.col("ProductCodeMapping.product_name")),
          "product_name"
        ];
        attributes.push(productNameCase);
      }
    }

    const products = await Product.findAll({
      attributes,
      where: {
        manufacturer_id: manufacturerId,
        ...categoriesFilter
      },
      include: getProductCodeMappingInclude(distributorId, selectedWarehouseId),
      // limit: 20,
      group: ["Product.id"],
      raw: true
    });

    // Step 3: If storeId is provided, fetch and attach wishlist information
    if (storeId !== 0) {
      // Extract product IDs from the query results for wishlist lookup
      const productIds = products.map((product) => product.id);

      // Fetch wishlist entries for the store and products
      // This query gets only the necessary fields (productId and id) for efficiency
      const wishlists = await Wishlist.findAll({
        attributes: ["productId", "id"],
        where: {
          storeId,
          productId: productIds
        },
        raw: true,
        nest: true
      });

      // Create a map of product IDs to wishlist IDs for O(1) lookup
      // This improves performance when checking if a product is in the wishlist
      const wishlistMap = new Map(
        wishlists.map((wishlist) => [wishlist.productId, wishlist.id])
      );

      // Attach wishlist information to each product
      // - wishlist: boolean indicating if the product is in the wishlist
      // - wishlistID: the ID of the wishlist entry (0 if not in wishlist)
      const res = products.map((product) => {
        const productId = wishlistMap.get(product.id);
        return {
          ...product,
          wishlist: Boolean(productId),
          wishlistID: productId || 0
        };
      });

      return res;
    }
    return products;
  }

  public async getCategoryTagsReference(tagKeys?: string[]) {
    const tags = await ProductCategoryTag.findAll({
      where: {
        is_active: true,
        ...(tagKeys ? { tag_key: { [Op.in]: tagKeys } } : {})
      },
      attributes: [
        ["tag_key", "tagKey"],
        ["tag_name", "tagName"]
      ],
      order: [["tag_name", "ASC"]],
      raw: true
    });

    return tags;
  }

  /**
   * Retrieves a list of products for a given productIds.
   *
   * This method fetches all products associated with the provided productIds.
   * The result includes the array of strings of "case_skus_id", "unit_skus_id", "box_skus_id".
   *
   * @param {number[]} productIds The IDs of the products are to be fetched.
   * @param {number[]} manufacturerIds Optional The IDs of the manufacturers whose products are to be fetched.
   * @param {number} categoryId Optional The ID of the categoryId whose products are to be fetched.
   * @returns {Promise<string[]>} A promise that resolves to an array of objects containing product details.
   */
  public async getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
    productIds: number[],
    manufacturerIds?: number[],
    categoryId?: number
  ): Promise<string[]> {
    return newrelic.startSegment(
      "StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId",
      true,
      async () => {
        const cacheKey = getCacheKey(
          "gp",
          "product_skus",
          `${productIds.sort().join(",")}`,
          `${manufacturerIds?.sort()?.join(",")}`,
          `${categoryId}`
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

        let productsFilter = {};
        let productsCatFilter = {};

        if (manufacturerIds?.length) {
          productsFilter = {
            manufacturer_id: { [Op.in]: manufacturerIds }
          };
        } else if (productIds?.length) {
          productsFilter = {
            id: {
              [Op.in]: productIds
            }
          };
        }
        if (categoryId) {
          productsCatFilter = {
            ...productsCatFilter,
            id: categoryId
          };
        }

        const products: any[] = await Product.findAll({
          attributes: ["case_skus_id", "unit_skus_id", "box_skus_id"],
          where: productsFilter,
          include: [
            {
              model: ProductCategory,
              as: "category",
              attributes: [],
              where: productsCatFilter,
              required: categoryId ? true : false
            }
          ],
          raw: true
        });

        // Flatten the SKUs into a single array
        const skus = products
          .flatMap((product) => [
            product.case_skus_id,
            product.unit_skus_id,
            product.box_skus_id
          ])
          .filter((sku) => sku && !isNaN(sku)); // Remove null or undefined values

        if (useApiCaching) {
          try {
            await redisClient.setEx(
              cacheKey,
              CACHE_TTL_TIME,
              JSON.stringify(skus)
            );
          } catch (error) {
            console.error("Cache error:", error);
          }
        }

        newrelic.addCustomAttribute(
          "getProductSKUsByProductIds.product_count",
          productIds.length
        );
        newrelic.addCustomAttribute(
          "getProductSKUsByProductIds.manufacturer_count",
          manufacturerIds?.length || 0
        );
        newrelic.addCustomAttribute(
          "getProductSKUsByProductIds.result_count",
          skus.length
        );

        return skus;
      }
    );
  }

  /**
   * Retrieves an array of product IDs associated with the given manufacturer IDs and category ID.
   *
   * This method queries the Product model to fetch all product IDs associated with the provided
   * manufacturer IDs and category ID. The results are cached for a short period of time to
   * improve performance.
   *
   * @param {number[]} manufacturerIds The IDs of the manufacturers to filter the results.
   * @param {number} categoryId The ID of the category to filter the results.
   * @returns {Promise<number[]>} A promise that resolves to an array of product IDs.
   */
  public async getProductIdsByManufacturerIdAndCategoryId(
    manufacturerIds: number[],
    categoryId: number
  ): Promise<number[]> {
    const cacheKey = getCacheKey(
      "gp",
      "product_skus",
      `${manufacturerIds?.sort()?.join(",")}`,
      `${categoryId}`
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

    const productsFilter = {
      manufacturer_id: { [Op.in]: manufacturerIds }
    };

    const productsCatFilter = {
      id: categoryId
    };

    const products: any[] = await Product.findAll({
      attributes: ["id"],
      where: productsFilter,
      include: [
        {
          model: ProductCategory,
          as: "category",
          attributes: [],
          where: productsCatFilter,
          required: true
        }
      ],
      raw: true
    });

    const productsIds = products.map((product) => product.id);

    if (useApiCaching) {
      try {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(productsIds)
        );
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    return productsIds;
  }

  /**
   * Retrieves a list of sales representatives associated with a distributor.
   *
   * This method fetches all sales representatives that are associated with the provided distributor ID
   * and have at least one store assigned to them.
   * The result includes the sales representative's ID and name.
   *
   * @param {number} distributorId The ID of the distributor whose sales representatives are to be fetched.
   * @returns {Promise<any[]>} A promise that resolves to an array of objects containing sales representative details.
   */
  public async getSalesReps(distributorId: number): Promise<any[]> {
    const result = await UserRole.findAll({
      where: {
        parent_entity_id: distributorId,
        parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        associated_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      },
      include: [
        {
          model: User,
          required: true,
          as: "user",
          attributes: []
        },
        {
          model: Distributor,
          required: true,
          as: "distributor",
          attributes: []
        },
        {
          model: StoreSalesRep,
          required: true,
          as: "store_sales_reps",
          attributes: []
        }
      ],
      attributes: [
        "user.id",
        [
          sequelize.fn(
            "CONCAT",
            sequelize.col("user.first_name"),
            " ",
            sequelize.col("user.last_name")
          ),
          "name"
        ],
        ["associated_user_id", "associatedUserId"]
      ],
      group: ["UserRole.id", "user.id", "associated_user_id"],
      raw: true
    });

    return result;
  }

  /**
   * Retrieves a list of sales representatives associated with a sales rep manager for a specific distributor.
   *
   * This method fetches all sales representatives that are associated with the provided sales rep manager ID
   * for the given distributor. The result includes the sales representative's ID and name.
   *
   * @param {number} distributorId The ID of the distributor.
   * @param {number} salesRepManagerId The ID of the sales rep manager whose sales reps are to be fetched.
   * @returns {Promise<any[]>} A promise that resolves to an array of objects containing sales representative details.
   */
  public async getSalesRepsForManager(
    distributorId: number,
    salesRepManagerId: number
  ): Promise<any[]> {
    const result = await UserRole.findAll({
      where: {
        parent_entity_id: distributorId,
        parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        associated_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        associated_user_id: {
          [Op.in]: sequelize.literal(`(
            SELECT sales_rep_id
            FROM manager_sales_rep_mapping
            WHERE sales_manager_id = ${salesRepManagerId}
            AND deleted_at IS NULL
          )`)
        }
      },
      include: [
        {
          model: User,
          required: true,
          as: "user",
          attributes: []
        },
        {
          model: Distributor,
          required: true,
          as: "distributor",
          attributes: []
        }
      ],
      attributes: [
        "user.id",
        [
          sequelize.fn(
            "CONCAT",
            sequelize.col("user.first_name"),
            " ",
            sequelize.col("user.last_name")
          ),
          "name"
        ],
        ["associated_user_id", "associatedUserId"]
      ],
      raw: true
    });

    return result;
  }

  /**
   * Retrieves sales reps for a distributor general manager based on their assigned warehouses.
   *
   * Uses the manager's user id (stored as distributor_id in distributor_manager_warehouses)
   * to find distributors whose primary warehouse matches the GM's assignment.
   */
  public async getSalesRepsByGeneralManager(
    generalManagerUserId: number
  ): Promise<
    Array<{ associated_user_id: number; sales_rep_name: string; id: string }>
  > {
    const results = (await sequelize.query(
      `
            SELECT 
          distinct(d.id) as associated_user_id, 
          d.name as sales_rep_name, 
          ur.user_id as id
      FROM distributors d
      INNER JOIN distributor_manager_warehouses dmw 
          ON dmw.warehouse_id = d.primary_warehouse_id
      INNER JOIN store_sales_reps ssr 
          ON ssr.sales_rep_id = d.id
      INNER JOIN user_roles ur 
          ON ur.associated_user_id = d.id
        and ur.role = 'DISTRIBUTOR_SALES_REP'
      WHERE dmw.distributor_id = :gmUserId
    `,
      {
        replacements: { gmUserId: generalManagerUserId },
        type: QueryTypes.SELECT
      }
    )) as Array<{
      associated_user_id: number;
      sales_rep_name: string;
      id: string;
    }>;

    return results;
  }

  /**
   * Retrieves an array of purchased product IDs for a given entity ID and program IDs.
   *
   * This method queries the transactionLineItems model to fetch all purchased product IDs
   * associated with the provided entity ID and program IDs. The results include
   * only the product IDs.
   *
   * The query can be filtered by a specific product ID if provided.
   * @param {number[]} programIds The IDs of the programs to filter the results.
   * @param {number} entityId The ID of the entity (store, distributor, or manufacturer) whose purchased products are to be fetched.
   * @param {number[]} productIds Optional The IDs of the products to filter the results.
   * @param {number[]} programDetailIds Optional The IDs of the program details to filter the results.
   * @param {string} entityType The type of the entity (store, distributor, or manufacturer). Defaults to STORE.
   * @returns {Promise<number[]>} A promise that resolves to an array of purchased product IDs.
   */
  public async getPurchasedProductIdsByProgramIds(
    entityId: number,
    entityType: string = ENTITY_TYPE.STORE,
    productIds: number[] = [],
    warehouseIds?: number[],
    returnLineItems?: boolean,
    programsTerm?: { startDate: string; endDate: string }
  ): Promise<number[] | LineItem[]> {
    return newrelic.startSegment(
      "StoreRepository.getPurchasedProductIdsByProgramIds",
      true,
      async () => {
        const lineItemsWhere: { [key: string]: any } = {};
        const lineItemsProductWhere: { [key: string]: any } = {};
        if (productIds.length > 0) {
          lineItemsProductWhere["id"] = { [Op.in]: productIds };
        }

        if (warehouseIds) {
          lineItemsWhere["warehouse_id"] = { [Op.in]: warehouseIds };
        }

        const result = await LineItem.findAll({
          attributes: [
            [
              Sequelize.fn("MIN", Sequelize.col("LineItem.product_id")),
              "productId"
            ],
            [
              Sequelize.fn(
                "MIN",
                Sequelize.col("product->ProductCodeMapping.code")
              ),
              "internal_code"
            ]
          ],
          include: [
            {
              model: Product,
              as: "product",
              attributes: [],
              required: true,
              on: literal(
                `(("LineItem"."product_id" = "product"."unit_skus_id" AND "product"."primary_variant" = true)
                    OR "LineItem"."product_id" IN ("product"."case_skus_id", "product"."box_skus_id"))`
              ),
              where: {
                ...lineItemsProductWhere
              },
              include: [
                {
                  model: ProductCodeMapping,
                  as: "ProductCodeMapping",
                  required: false,
                  attributes: [],
                  where: {
                    [Op.and]: Sequelize.where(
                      Sequelize.col("product->ProductCodeMapping.warehouse_id"),
                      "=",
                      Sequelize.col("LineItem.warehouse_id")
                    )
                  }
                }
              ]
            }
          ],
          where: {
            buyer_id: entityId,
            buyer_type: entityType,
            ...lineItemsWhere,
            ...LineItem.getDateRangeFilter(programsTerm)
          },
          raw: true,
          group: ["product.id"],
          having: literal('SUM("total_price") > 0')
        });

        newrelic.addCustomAttribute(
          "getPurchasedProductIdsByProgramIds.entity_id",
          entityId
        );
        newrelic.addCustomAttribute(
          "getPurchasedProductIdsByProgramIds.result_count",
          result.length
        );

        if (returnLineItems) return result;

        // Extract and return only the product_id values
        return result.map((item) => item.productId ?? 0);
      }
    );
  }

  /**
   * Retrieves all programs available for given entity type.
   *
   * The result includes the program ID, manufacturer name, manufacturer logo, manufacturer ID, and an array of distinct program detail IDs.
   *
   * @param {number} [manufacturerId] Optional ID of the manufacturer to filter the programs.
   * @returns {Promise<any[]>} - A promise that resolves to an array of objects containing the program details.
   */
  public async getManufacturerProgramsById(
    manufacturerIds: number | number[] = [],
    participant_type: string = ENTITY_TYPE.STORE,
    programIds?: number[],
    excludedProgramDetailIds?: number[],
    creatorIds?: number[],
    creatorType?: string,
    secondaryCreatorIds?: number[],
    secondaryCreatorType?: string,
    programTimeline?: string,
    isInternalInitiative?: boolean,
    distributorId?: number
  ): Promise<any[]> {
    return newrelic.startSegment(
      "StoreRepository.getManufacturerProgramsById",
      true,
      async () => {
        const programDetailWhere =
          excludedProgramDetailIds && excludedProgramDetailIds?.length > 0
            ? {
                id: {
                  [Op.notIn]: excludedProgramDetailIds
                }
              }
            : {};

        let programWhere: any = {
          ...(creatorIds ? { creator_id: { [Op.in]: creatorIds } } : {}),
          ...(creatorType ? { creator_type: creatorType } : {})
        };

        if (secondaryCreatorIds && secondaryCreatorType) {
          programWhere = {
            [Op.or]: [
              {
                creator_id: { [Op.in]: creatorIds },
                ...(creatorType ? { creator_type: creatorType } : {})
              },
              {
                creator_id: { [Op.in]: secondaryCreatorIds },
                creator_type: secondaryCreatorType
              }
            ]
          };
        }

        const attributes: (string | [string | Col | Fn, string])[] = [];
        if (!Array.isArray(manufacturerIds)) {
          manufacturerIds = [manufacturerIds];
        }
        // Conditionally add attributes based on whether manufacturerId is provided
        if (manufacturerIds.length > 0) {
          attributes.push(
            "start_date",
            "end_date",
            "program_type",
            "manufacturer_id",
            "payment_term",
            [Sequelize.col("ProgramDetails.tier"), "tier"],
            [Sequelize.col("ProgramDetails.quantity_type"), "quantity_type"],
            [Sequelize.col("ProgramDetails.id"), "program_detail_id"],
            [Sequelize.col("ProgramDetails.overview"), "overview"],
            [Sequelize.col("ProgramDetails.criteria"), "criteria"],
            [Sequelize.col("ProgramDetails.min_spend"), "min_spend"],
            [Sequelize.col("ProgramDetails.min_qty"), "min_qty"],
            [Sequelize.col("ProgramDetails.max_qty"), "max_qty"],
            [Sequelize.col("ProgramDetails.products_tags"), "products_tags"],
            [
              Sequelize.col("ProgramDetails.products_tags_qty"),
              "products_tags_qty"
            ],
            [Sequelize.col("ProgramDetails.rebate_amount"), "rebate_amount"],
            [
              Sequelize.col("ProgramDetails.rebate_percentage"),
              "rebate_percentage"
            ],
            [Sequelize.col("ProgramDetails.rebate_type"), "rebate_type"],
            [
              Sequelize.col("ProgramDetails.fixed_rebate_amount"),
              "fixed_rebate_amount"
            ],
            [
              Sequelize.col("ProgramDetails.fixed_rebate_category"),
              "fixed_rebate_category"
            ],
            [
              Sequelize.col("ProgramDetails.rebate_calculation"),
              "rebate_calculation"
            ],
            [
              Sequelize.col("ProgramDetails.rebate_calculation_type"),
              "rebate_calculation_type"
            ],
            [
              Sequelize.col("ProgramDetails.required_core_skus"),
              "required_core_skus"
            ],
            [
              Sequelize.col("ProgramDetails.products_tags_qty_max"),
              "products_tags_qty_max"
            ],
            [Sequelize.col("ProgramDetails.points_per_sku"), "points_per_sku"],
            [Sequelize.col("ProgramDetails.max_points"), "max_points"],
            [Sequelize.col("ProgramDetails.points"), "points"],
            [
              sequelize.fn(
                "ARRAY_AGG",
                Sequelize.col("ProgramVisibility.entity_id")
              ),
              "visible_entity_ids" // This will return the array of entity_ids
            ],
            [
              sequelize.fn(
                "ARRAY_AGG",
                Sequelize.col("ProgramStoreIneligibilities.store_id")
              ),
              "ineligible_store_ids" // This will return the array of entity_ids
            ],
            // Add the first entity_type (or any entity_type since it's same across all ProgramVisibility)
            [
              sequelize.fn(
                "MAX",
                Sequelize.col("ProgramVisibility.entity_type")
              ),
              "visibility_entity_type"
            ],
            "program_header"
          );
        } else {
          attributes.push([
            sequelize.fn(
              "ARRAY_AGG",
              sequelize.fn("DISTINCT", sequelize.col("ProgramDetails.id"))
            ),
            "program_details_ids"
          ]);
        }
        attributes.push("name");

        const result = await Program.findAll({
          attributes: [
            ["id", "program_id"],
            [Sequelize.col("Manufacturer.name"), "manufacturer_name"],
            [Sequelize.col("Manufacturer.logo"), "manufacturer_logo"],
            [Sequelize.col("Manufacturer.id"), "manufacturer_id"],
            [
              Sequelize.col("Manufacturer.authorized"),
              "manufacturer_authorized"
            ],
            ...attributes
          ],
          include: [
            ...(distributorId
              ? [
                  {
                    model: ProgramApproval,
                    as: "ProgramApproval",
                    required: true,
                    attributes: [],
                    where: {
                      approver_id: distributorId,
                      approver_type: ENTITY_TYPE.DISTRIBUTOR,
                      status: PROGRAM_APPROVAL_STATUS.APPROVED,
                      deleted_at: null
                    }
                  }
                ]
              : []),
            {
              model: Manufacturer,
              as: "Manufacturer",
              attributes: []
            },
            {
              model: ProgramDetail,
              as: "ProgramDetails",
              attributes: [],
              required: true,
              where: {
                ...programDetailWhere
              }
            },
            {
              model: ProgramVisibility,
              attributes: [],
              as: "ProgramVisibility",
              required: false,
              where: {
                deleted_at: null
              }
            },
            {
              model: ProgramStoreIneligibility,
              as: "ProgramStoreIneligibilities",
              attributes: [],
              required: false
            }
          ],
          where: {
            participant_type: participant_type,
            ...(manufacturerIds.length > 0
              ? { manufacturer_id: { [Op.in]: manufacturerIds } }
              : {}),
            ...(programIds ? { id: { [Op.in]: programIds } } : {}),
            ...programWhere,
            ...Program.getProgramTimelineFilter(programTimeline),
            // Handle internal initiative filtering - include null/undefined for non-internal
            ...(isInternalInitiative === false
              ? {
                  [Op.or]: [
                    { internal_initiative: false },
                    { internal_initiative: { [Op.is]: null } }
                  ]
                }
              : isInternalInitiative === true
                ? {
                    internal_initiative: true
                  }
                : {})
          },
          group: !manufacturerIds.length
            ? ["Program.id", "Manufacturer.id"]
            : ["Program.id", "ProgramDetails.id", "Manufacturer.id"],
          order: !manufacturerIds.length
            ? [["Program.id", "ASC"]]
            : [
                [literal('"Program"."id"'), "ASC"],
                [literal('"ProgramDetails"."tier"'), "ASC"]
              ],
          raw: true // Ensures the result is returned as a plain object instead of an instance
        });

        newrelic.addCustomAttribute(
          "getManufacturerProgramsById.manufacturer_count",
          Array.isArray(manufacturerIds) ? manufacturerIds.length : 1
        );
        newrelic.addCustomAttribute(
          "getManufacturerProgramsById.result_count",
          result.length
        );

        return result;
      }
    );
  }

  /**
   * Retrieves a list of programs for a given manufacturer ID and entity type.
   *
   * The result includes the program ID, name, program type, tier, program detail ID, and required core SKUs.
   * The result is filtered by the provided manufacturer ID, entity type, and program detail ID (if provided).
   * The result is ordered by the program ID in ascending order.
   *
   * @param {string} entityType The type of the entity (e.g. ENTITY_TYPE.STORE).
   * @param {number} manufacturerId The ID of the manufacturer.
   * @param {number} [programDetailId] The ID of the program detail to filter by. If not provided, the result includes all programs with the specified manufacturer ID and entity type.
   * @returns {Promise<any[]>} A promise that resolves to an array of objects with the program details.
   */
  public async getProgramsBymanufacturerIdAndEntityType(
    entityType: string,
    manufacturerId: number,
    programDetailId?: number,
    programTimeline?: string
  ): Promise<any[]> {
    const attributes: (string | [string | Col | Fn, string])[] = [];

    const programFilter = {
      ...(programDetailId ? { id: programDetailId } : {})
    };

    attributes.push(
      "program_type",
      [Sequelize.col("ProgramDetails.tier"), "tier"],
      [Sequelize.col("ProgramDetails.id"), "program_detail_id"],
      [Sequelize.col("ProgramDetails.overview"), "overview"],
      [Sequelize.col("ProgramDetails.criteria"), "criteria"],
      [Sequelize.col("ProgramDetails.min_spend"), "min_spend"],
      [Sequelize.col("ProgramDetails.min_qty"), "min_qty"],
      [Sequelize.col("ProgramDetails.products_tags"), "products_tags"],
      [Sequelize.col("ProgramDetails.products_tags_qty"), "products_tags_qty"],
      [Sequelize.col("ProgramDetails.rebate_amount"), "rebate_amount"],
      [Sequelize.col("ProgramDetails.rebate_percentage"), "rebate_percentage"],
      [Sequelize.col("ProgramDetails.rebate_type"), "rebate_type"],
      [
        Sequelize.col("ProgramDetails.fixed_rebate_amount"),
        "fixed_rebate_amount"
      ],
      [
        Sequelize.col("ProgramDetails.fixed_rebate_category"),
        "fixed_rebate_category"
      ],
      [
        Sequelize.col("ProgramDetails.rebate_calculation"),
        "rebate_calculation"
      ],
      [
        Sequelize.col("ProgramDetails.required_core_skus"),
        "required_core_skus"
      ],
      "program_header",
      "start_date",
      "end_date"
    );

    attributes.push("name");

    const result = await Program.findAll({
      attributes: [
        ["id", "program_id"],
        [Sequelize.col("Manufacturer.name"), "manufacturer_name"],
        [Sequelize.col("Manufacturer.logo"), "manufacturer_logo"],
        [Sequelize.col("Manufacturer.id"), "manufacturer_id"],
        ...attributes
      ],
      include: [
        {
          model: Manufacturer,
          as: "Manufacturer",
          attributes: []
        },
        {
          model: ProgramDetail,
          as: "ProgramDetails",
          required: true,
          where: {
            ...programFilter
          },
          attributes: []
        }
      ],
      where: {
        participant_type: entityType,
        manufacturer_id: manufacturerId,
        ...Program.getProgramTimelineFilter(programTimeline)
      },
      raw: true // Ensures the result is returned as a plain object instead of an instance
    });

    return result;
  }

  /**
   * Retrieves a list of store chains based on provided store IDs.
   *
   * This method queries the Chain model to fetch chains that have stores
   * matching the given list of store IDs. If no store IDs are provided,
   * it retrieves all chains. The result includes the chain name and ID.
   *
   * @param {number[]} [storeIds=[]] - An optional array of store IDs to filter the chains.
   * @returns {Promise<any[]>} - A promise that resolves to an array of objects containing the chain name and ID.
   */
  public async getStoreChains(storeIds: number[] = []) {
    return newrelic.startSegment(
      "StoreRepository.getStoreChains",
      true,
      async () => {
        try {
          // Add caching for performance
          if (useApiCaching && storeIds.length > 0) {
            const cacheKey = getCacheKey(
              "chains",
              "stores",
              `${storeIds.sort().join(",")}`
            );

            try {
              const cached = await redisClient.get(cacheKey);
              if (cached) {
                console.info("[DEBUG] Returning cached store chains");
                return JSON.parse(cached);
              }
            } catch (error) {
              console.error("Cache error:", error);
            }
          }

          const where = { store_id: { [Op.in]: storeIds } };
          const chains = await ChainStore.findAll({
            attributes: [],
            include: [
              {
                model: Chain,
                attributes: ["name", "id"]
              }
            ],
            where: where,
            group: ["Chain.name", "Chain.id"],
            order: [[sequelize.col("Chain.name"), "ASC"]],
            raw: true
          });

          // Cache the result for 5 minutes
          if (useApiCaching && storeIds.length > 0) {
            try {
              const cacheKey = getCacheKey(
                "chains",
                "stores",
                `${storeIds.sort().join(",")}`
              );
              await redisClient.setEx(cacheKey, 300, JSON.stringify(chains));
            } catch (error) {
              console.error("Cache error:", error);
            }
          }

          return chains;
        } catch (error) {
          console.error(`[ERROR] StoreRepository.getStoreChains:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Retrieves a list of store IDs associated with a specific distributor ID.
   *
   * This method queries the UserRole model to fetch store IDs associated with a
   * distributor ID. The result includes the associated user ID, which is the store ID.
   *
   * @param {number} distributorId The ID of the distributor for whom to retrieve store IDs.
   * @returns {Promise<any[]>} - A promise that resolves to an array of objects containing the associated user ID.
   */
  public async getStoreIdsByDistributorId(
    distributorId: number,
    excludeChainStores?: boolean,
    selectedWarehouseIds?: number[]
  ) {
    return newrelic.startSegment(
      "StoreRepository.getStoreIdsByDistributorId",
      true,
      async () => {
        try {
          // Add caching for performance
          if (useApiCaching) {
            const cacheKey = getCacheKey(
              "store",
              "dist",
              `${distributorId}-${excludeChainStores ? "true" : "false"}`
            );

            try {
              const cached = await redisClient.get(cacheKey);
              if (cached) {
                return JSON.parse(cached);
              }
            } catch (error) {
              console.error("Cache error:", error);
            }
          }

          let warehouseStoreIds: any = null;
          if (selectedWarehouseIds) {
            warehouseStoreIds =
              await this.getStoreIdsByWarehouseIds(selectedWarehouseIds);
          }

          const result = await UserRole.findAll({
            attributes: [["associated_user_id", "associatedUserId"]],
            include: excludeChainStores
              ? [
                  {
                    model: ChainStore,
                    as: "UserRoleChainStoreStoreId",
                    attributes: [],
                    required: false
                  }
                ]
              : [],
            where: {
              parent_entity_id: distributorId,
              parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
              role: ENTITY_TYPE.STORE,
              associated_entity_type: ENTITY_TYPE.STORE,
              ...(excludeChainStores
                ? {
                    "$UserRoleChainStoreStoreId.id$": {
                      [Op.is]: null
                    }
                  }
                : {}),
              ...(warehouseStoreIds
                ? {
                    associated_user_id: { [Op.in]: warehouseStoreIds }
                  }
                : {})
            },
            raw: true
          });

          // Cache the result for 5 minutes
          if (useApiCaching) {
            try {
              const cacheKey = getCacheKey(
                "store",
                "dist",
                `${distributorId}-${excludeChainStores ? "true" : "false"}`
              );
              await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
            } catch (error) {
              console.error("Cache error:", error);
            }
          }

          return result;
        } catch (error) {
          console.error(
            `[ERROR] StoreRepository.getStoreIdsByDistributorId:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Retrieves a list of store IDs associated with a specific distributor IDs.
   *
   * This method queries the UserRole model to fetch store IDs associated with a
   * distributor IDs. The result includes the associated user ID, which is the store ID.
   *
   * @param {number} distributorIds The ID of the distributor for whom to retrieve store IDs.
   * @returns {Promise<any[]>} - A promise that resolves to an array of objects containing the associated user ID.
   */
  public async getStoreIdsByDistributorIds(distributorIds: number[]) {
    return await UserRole.findAll({
      attributes: [["associated_user_id", "associatedUserId"]],
      where: {
        parent_entity_id: {
          [Op.in]: distributorIds
        },
        parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        role: ENTITY_TYPE.STORE,
        associated_entity_type: ENTITY_TYPE.STORE
      },
      raw: true
    });
  }

  /**
   * Retrieves a list of store IDs associated with a specific sales representative ID.
   *
   * This method queries the StoreSalesRep model to fetch store IDs associated with a
   * sales representative ID.
   *
   * @param {number} salesRepId The ID of the sales representative for whom to retrieve store IDs.
   * @returns {Promise<any[]>} - A promise that resolves to an array of objects containing the store ID.
   */
  public async getStoreIdsBySalesRepId(
    salesRepId?: number,
    excludeChainStores?: boolean,
    selectedWarehouseIds?: number[],
    salesRepIds?: number[]
  ) {
    let warehouseStoreIds: any = null;
    if (selectedWarehouseIds) {
      warehouseStoreIds =
        await this.getStoreIdsByWarehouseIds(selectedWarehouseIds);
    }
    return await StoreSalesRep.findAll({
      attributes: [["store_id", "storeId"]],
      include: excludeChainStores
        ? [
            {
              model: ChainStore,
              as: "SalesRepChainStore",
              attributes: [],
              required: false
            }
          ]
        : [],
      where: {
        ...(salesRepIds
          ? { sales_rep_id: { [Op.in]: salesRepIds } }
          : { sales_rep_id: salesRepId }),
        ...(excludeChainStores
          ? {
              "$SalesRepChainStore.id$": {
                [Op.is]: null
              }
            }
          : {}),
        ...(warehouseStoreIds
          ? { store_id: { [Op.in]: warehouseStoreIds } }
          : {})
      },
      raw: true
    });
  }

  /**
   * Retrieves a list of stores associated with a specific sales representative manager ID.
   *
   * This method queries the Store model to fetch stores associated with a
   * sales representative manager ID. The result includes the store ID, name,
   * and other details.
   *
   * @param {number} salesRepManagerId The ID of the sales representative manager for whom to retrieve stores.
   * @returns {Promise<any[]>} - A promise that resolves to an array of objects containing the store ID, name, and other details.
   */
  /**
   * OPTIMIZED: Get store IDs for sales rep manager with warehouse and chain filtering in a single query
   * This replaces the need for 3 separate queries (getStoresBySalesRepManagerId, getStoreIdsByWarehouseIds, chain exclusion)
   *
   * @param salesRepManagerId - Sales rep manager ID
   * @param warehouseIds - Optional array of warehouse IDs to filter by
   * @param excludeChainStores - Whether to exclude chain stores
   * @returns Promise<number[]> Array of store IDs
   */
  public async getStoreIdsBySalesRepManagerIdOptimized({
    salesRepManagerId,
    warehouseIds,
    excludeChainStores
  }: {
    salesRepManagerId: number;
    warehouseIds?: number[];
    excludeChainStores?: boolean;
  }): Promise<number[]> {
    if (!salesRepManagerId || !Number(salesRepManagerId)) {
      return [];
    }

    return newrelic.startSegment(
      "StoreRepository.getStoreIdsBySalesRepManagerIdOptimized",
      true,
      async () => {
        // Build warehouse condition with parameterized query to prevent SQL injection
        const warehousePlaceholders =
          warehouseIds && warehouseIds.length > 0
            ? warehouseIds.map((_, index) => `:warehouseId${index}`).join(", ")
            : null;

        const warehouseCondition = warehousePlaceholders
          ? `AND s.warehouse_id IN (${warehousePlaceholders})`
          : "";

        const chainExclusionCondition = excludeChainStores
          ? `AND cs.store_id IS NULL`
          : "";

        const query = `
          SELECT DISTINCT s.id AS store_id
          FROM stores s
          INNER JOIN store_sales_reps ssr
            ON s.id = ssr.store_id
            AND ssr.deleted_at IS NULL
          INNER JOIN distributors d
            ON ssr.sales_rep_id = d.id
          INNER JOIN manager_sales_rep_mapping msrm
            ON d.id = msrm.sales_rep_id
            AND msrm.sales_manager_id = :salesRepManagerId
            AND msrm.deleted_at IS NULL
          LEFT JOIN chain_stores cs
            ON s.id = cs.store_id
          WHERE s.deleted_at IS NULL
            ${warehouseCondition}
            ${chainExclusionCondition}
          ORDER BY s.id ASC
        `;

        // Build replacements object with warehouse IDs
        const replacements: any = { salesRepManagerId };
        if (warehouseIds && warehouseIds.length > 0) {
          warehouseIds.forEach((id, index) => {
            replacements[`warehouseId${index}`] = id;
          });
        }

        const results = await sequelize.query(query, {
          replacements,
          type: QueryTypes.SELECT
        });

        return results.map((row: any) => row.store_id);
      }
    );
  }

  public async getStoresBySalesRepManagerId({
    salesRepManagerId,
    getCountOnly = false,
    salesRepIds,
    warehouseId
  }: {
    salesRepManagerId: number | string | undefined;
    getCountOnly?: boolean;
    salesRepIds?: number[];
    warehouseId?: number;
  }) {
    if (!salesRepManagerId || !Number(salesRepManagerId)) {
      return [];
    }

    const result = await Store.findAll({
      attributes: [
        "id",
        "store_name",
        "name",
        "external_store_id",
        "created_at",
        "updated_at"
      ],
      include: [
        {
          model: StoreSalesRep,
          as: "storeSalesReps",
          required: true,
          attributes: [],
          include: [
            {
              model: Distributor,
              as: "salesRep",
              required: true,
              attributes: ["id", "name"],
              include: [
                {
                  model: ManagerSalesRepMapping,
                  as: "managerSalesRepMappings",
                  required: true,
                  attributes: [],
                  where: {
                    sales_manager_id: salesRepManagerId,
                    //need to check if salesRepIds is not null and has length
                    ...(salesRepIds && salesRepIds.length > 0
                      ? {
                          sales_rep_id: { [Op.in]: salesRepIds }
                        }
                      : {})
                  }
                }
              ]
            }
          ]
        }
      ],
      where: {
        //need to check if warehouseId is not null
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
        deleted_at: null
      },
      order: [["name", "ASC"]],
      raw: false
    });

    if (getCountOnly) {
      return result.length as unknown as any[];
    }

    return result;
  }

  /**
   * Retrieves transactions filtered by manufacturer ID and other criteria.
   *
   * @param {number} buyerId - The ID of the buyer (store/distributor)
   * @param {number[]} manufacturerIds - Array of manufacturer IDs to filter transactions
   * @param {string} [buyerType] - Type of buyer (defaults to 'STORE')
   * @param {boolean} [returnSaleTransactions=false] - If true, returns sales transactions instead of purchases
   * @param {number[]} [sellerIds] - Optional array of seller IDs to filter transactions
   * @param {string} [sellerType] - Type of seller (e.g., 'DISTRIBUTOR')
   * @param {boolean} [includeProducts] - Whether to include product details in results
   * @param {number[]} [warehouseIds] - Optional array of warehouse IDs to filter transactions
   * @param {Object} [programTerm] - Date range for filtering transactions
   * @param {string} programTerm.startDate - Start date for transaction filter (YYYY-MM-DD)
   * @param {string} programTerm.endDate - End date for transaction filter (YYYY-MM-DD)
   *
   * @returns {Promise<LineItem[]>} Array of line items with transaction details
   *
   */
  public async getTransactionsByManufacturerId(
    buyerIds: number[],
    manufacturerIds: number[],
    buyerType?: string,
    returnSaleTransactions: boolean = false,
    sellerIds?: number[],
    sellerType?: string,
    includeProducts?: boolean,
    warehouseIds?: number[],
    programTerm?: { startDate: string; endDate: string },
    includeInternalCode: boolean = false
  ) {
    return newrelic.startSegment(
      "StoreRepository.getTransactionsByManufacturerId",
      true,
      async () => {
        try {
          // Cache check segment
          let cacheKey = "";
          if (useApiCaching) {
            await newrelic.startSegment(
              "StoreRepository.getTransactionsByManufacturerId.cache_check",
              true,
              async () => {
                cacheKey = getCacheKey(
                  "txn",
                  "mfr",
                  `${buyerIds.sort().join(",")}`,
                  `${manufacturerIds.sort().join(",")}`,
                  `${buyerType || ""}`,
                  `${returnSaleTransactions ? "1" : "0"}`,
                  `${sellerIds?.sort().join(",") || "all"}`,
                  `${sellerType || ""}`,
                  `${includeProducts ? "1" : "0"}`,
                  `${warehouseIds?.join(",")}`,
                  `${programTerm ? programTerm.startDate?.toString() : ""}`,
                  `${programTerm ? programTerm.endDate?.toString() : ""}`
                );

                try {
                  const cached = await redisClient.get(cacheKey);
                  if (cached) {
                    return JSON.parse(cached);
                  }
                } catch (error) {
                  console.error("Cache error:", error);
                }
              }
            );
          }

          const entityType = buyerType ? buyerType : ENTITY_TYPE.STORE;
          const sellerEntityType = sellerType
            ? sellerType
            : ENTITY_TYPE.DISTRIBUTOR;

          // Product SKUs retrieval segment
          const productSKUsIds = await newrelic.startSegment(
            "StoreRepository.getTransactionsByManufacturerId.getProductSKUs",
            true,
            async () => {
              return await this.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
                [],
                manufacturerIds
              );
            }
          );

          // Main database query segment
          const results = await newrelic.startSegment(
            "StoreRepository.getTransactionsByManufacturerId.databaseQuery",
            true,
            async () => {
              // Build optimized filters with better indexing support
              // Order filters by selectivity (most selective first for better query plan)
              const baseFilter = {
                // 1. Date range first (most selective, uses index efficiently)
                ...LineItem.getDateRangeFilter(programTerm),
                // 2. Total price filter (eliminates zero/negative transactions early)
                // total_price: { [Op.gt]: 0 },
                // 3. Product ID filter last (potentially large IN clause)
                product_id: {
                  [Op.in]: productSKUsIds
                }
              };

              // Optimize transaction filter building for better index usage
              // Order by index column order for composite index efficiency
              let transactionFilter = {};

              if (returnSaleTransactions) {
                // Order: type -> id (matches our composite indexes)
                transactionFilter = {
                  seller_type: entityType,
                  seller_id: { [Op.in]: buyerIds }
                };

                if (sellerIds?.length) {
                  transactionFilter = {
                    ...transactionFilter,
                    buyer_type: sellerEntityType,
                    buyer_id: { [Op.in]: sellerIds }
                  };
                }
              } else {
                // Order: type -> id (matches our composite indexes)
                transactionFilter = {
                  buyer_type: entityType,
                  buyer_id: { [Op.in]: buyerIds }
                };

                if (sellerIds?.length) {
                  transactionFilter = {
                    ...transactionFilter,
                    seller_type: sellerEntityType
                  };
                }
              }

              // Add warehouse filter if specified (matches warehouse index)
              if (warehouseIds?.length) {
                transactionFilter = {
                  ...transactionFilter,
                  warehouse_id: { [Op.in]: warehouseIds }
                };
              }

              const attributes: (string | [any, string])[] = [
                [fn("MIN", col("LineItem.product_id")), "product_id"],
                "seller_id",
                "buyer_id",
                [fn("SUM", col("LineItem.quantity")), "quantity"],
                [fn("SUM", col("LineItem.total_price")), "total_price"]
              ];

              if (includeInternalCode) {
                const internalCodeAttribute: [any, string] = [
                  Sequelize.literal(`(
                    SELECT MIN(pcm.code)
                    FROM product_code_mappings pcm
                    WHERE pcm.product_id = "product"."id"
                      AND pcm.deleted_at IS NULL
                      AND (
                        pcm.warehouse_id IS NULL
                        OR EXISTS (
                          SELECT 1
                          FROM line_items li
                          WHERE li.warehouse_id = pcm.warehouse_id
                            AND li.deleted_at IS NULL
                            AND li.buyer_id = "LineItem"."buyer_id"
                            AND li.seller_id = "LineItem"."seller_id"
                            AND li.product_id = ANY (
                              ARRAY_REMOVE(
                                ARRAY[
                                  "product"."case_skus_id",
                                  "product"."box_skus_id",
                                  "product"."unit_skus_id"
                                ],
                                NULL
                              )
                            )
                        )
                      )
                  )`),
                  "internal_code"
                ];
                attributes.push(internalCodeAttribute);
              }

              return await LineItem.findAll({
                attributes,
                where: {
                  // Optimize WHERE clause order for index usage
                  // Put most selective filters first to minimize scan
                  ...transactionFilter, // type + id filters (highly selective)
                  ...baseFilter // date, price, product_id filters
                },
                include: [
                  includeProducts
                    ? {
                        model: Product,
                        as: "product",
                        attributes: ["manufacturer_id"],
                        required: !!manufacturerIds.length,
                        on: {
                          [Op.or]: [
                            Sequelize.where(
                              Sequelize.col("product_id"),
                              Sequelize.col("product.case_skus_id")
                            ),
                            Sequelize.where(
                              Sequelize.col("product_id"),
                              Sequelize.col("product.box_skus_id")
                            ),
                            {
                              [Op.and]: [
                                Sequelize.where(
                                  Sequelize.col("LineItem.product_id"),
                                  Sequelize.col("product.unit_skus_id")
                                ),
                                Sequelize.where(
                                  Sequelize.col("product.primary_variant"),
                                  true
                                )
                              ]
                            }
                          ]
                        },
                        where: {
                          manufacturer_id: { [Op.in]: manufacturerIds }
                        },
                        include: []
                      }
                    : {
                        model: Product,
                        as: "product",
                        required: true,
                        on: {
                          [Op.or]: [
                            Sequelize.where(
                              Sequelize.col("LineItem.product_id"),
                              Sequelize.col("case_skus_id")
                            ),
                            Sequelize.where(
                              Sequelize.col("LineItem.product_id"),
                              Sequelize.col("box_skus_id")
                            ),
                            {
                              [Op.and]: [
                                Sequelize.where(
                                  Sequelize.col("LineItem.product_id"),
                                  Sequelize.col("product.unit_skus_id")
                                ),
                                Sequelize.where(
                                  Sequelize.col("primary_variant"),
                                  true
                                )
                              ]
                            }
                          ]
                        },
                        where: {
                          ...(manufacturerIds?.length
                            ? {
                                manufacturer_id: {
                                  [Op.in]: manufacturerIds
                                }
                              }
                            : {})
                        },
                        include: []
                      }
                ],
                // Optimize GROUP BY order to match covering index
                group: ["seller_id", "buyer_id", "product.id"],
                // Use raw query when possible for better performance
                raw: includeInternalCode,
                nest: includeInternalCode,
                having: literal('SUM("total_price") > 0'),
                // Add subQuery: false to prevent unnecessary subqueries
                subQuery: false
              });
            }
          );
          // Cache set segment
          if (useApiCaching && results.length > 0) {
            await newrelic.startSegment(
              "StoreRepository.getTransactionsByManufacturerId.cache_set",
              true,
              async () => {
                await redisClient.setEx(
                  cacheKey,
                  CACHE_TTL_TIME,
                  JSON.stringify(results)
                );
              }
            );
          }

          newrelic.addCustomAttribute(
            "getTransactionsByManufacturerId.result_count",
            results.length
          );

          return results;
        } catch (error) {
          console.error(
            "StoreRepository.getTransactionsByManufacturerId failed:",
            error
          );
          return [] as LineItem[];
        }
      }
    );
  }

  public async getTransactionsByManufacturerIdFromMatView(
    buyerIds: number[],
    manufacturerIds: number[],
    buyerType?: string,
    returnSaleTransactions: boolean = false,
    sellerIds?: number[],
    sellerType?: string,
    includeProducts?: boolean,
    warehouseIds?: number[],
    programTerm?: { startDate: string; endDate: string },
    includeInternalCode: boolean = false,
    includeSKUsCodes: boolean = false
  ) {
    return newrelic.startSegment(
      "StoreRepository.getTransactionsByManufacturerIdFromMatView",
      true,
      async () => {
        try {
          // Cache check segment
          let cacheKey = "";
          if (useApiCaching) {
            await newrelic.startSegment(
              "StoreRepository.getTransactionsByManufacturerIdFromMatView.cache_check",
              true,
              async () => {
                cacheKey = getCacheKey(
                  "txn",
                  "mfrmv",
                  `${buyerIds.sort().join(",")}`,
                  `${manufacturerIds.sort().join(",")}`,
                  `${buyerType || ""}`,
                  `${returnSaleTransactions ? "1" : "0"}`,
                  `${sellerIds?.sort().join(",") || "all"}`,
                  `${sellerType || ""}`,
                  `${includeProducts ? "1" : "0"}`,
                  `${warehouseIds?.join(",")}`,
                  `${programTerm ? programTerm.startDate?.toString() : ""}`,
                  `${programTerm ? programTerm.endDate?.toString() : ""}`
                );

                try {
                  const cached = await redisClient.get(cacheKey);
                  if (cached) {
                    return JSON.parse(cached);
                  }
                } catch (error) {
                  console.error("Cache error:", error);
                }
              }
            );
          }

          const entityType = buyerType ? buyerType : ENTITY_TYPE.STORE;
          const sellerEntityType = sellerType
            ? sellerType
            : ENTITY_TYPE.DISTRIBUTOR;

          // Product SKUs retrieval segment
          const productSKUsIds = await newrelic.startSegment(
            "StoreRepository.getTransactionsByManufacturerIdFromMatView.getProductSKUs",
            true,
            async () => {
              return await this.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
                [],
                manufacturerIds
              );
            }
          );

          // Main database query segment
          const results = await newrelic.startSegment(
            "StoreRepository.getTransactionsByManufacturerIdFromMatView.databaseQuery",
            true,
            async () => {
              // Build optimized filters with better indexing support
              // Order filters by selectivity (most selective first for better query plan)
              const baseFilter = {
                // 1. Date range first (most selective, uses index efficiently)
                ...LineItem.getDateRangeFilter(programTerm),
                product_id: {
                  [Op.in]: productSKUsIds
                }
              };

              // Optimize transaction filter building for better index usage
              // Order by index column order for composite index efficiency
              let transactionFilter = {};

              if (returnSaleTransactions) {
                // Order: type -> id (matches our composite indexes)
                transactionFilter = {
                  seller_type: entityType,
                  seller_id: { [Op.in]: buyerIds }
                };

                if (sellerIds?.length) {
                  transactionFilter = {
                    ...transactionFilter,
                    buyer_type: sellerEntityType,
                    buyer_id: { [Op.in]: sellerIds }
                  };
                }
              } else {
                // Order: type -> id (matches our composite indexes)
                transactionFilter = {
                  buyer_type: entityType,
                  buyer_id: { [Op.in]: buyerIds }
                };

                if (sellerIds?.length) {
                  transactionFilter = {
                    ...transactionFilter,
                    seller_type: sellerEntityType
                  };
                }
              }

              // Add warehouse filter if specified (matches warehouse index)
              if (warehouseIds?.length) {
                transactionFilter = {
                  ...transactionFilter,
                  warehouse_id: { [Op.in]: warehouseIds }
                };
              }

              const attributes: (string | [any, string])[] = [
                [fn("MIN", col("internal_product_id")), "product_id"],
                [fn("MIN", col("manufacturer_id")), "manufacturer_id"],
                "buyer_id",
                [fn("SUM", col("quantity")), "quantity"],
                [fn("SUM", col("total_price")), "total_price"]
              ];

              if (includeSKUsCodes) {
                [
                  { col: "unit_skus_id", alias: "unitSkusId" },
                  { col: "case_skus_id", alias: "caseSkusId" },
                  { col: "box_skus_id", alias: "boxSkusId" }
                ].forEach((it) => {
                  attributes.push([fn("MIN", col(it.col)), it.alias]);
                });
              }

              if (includeInternalCode) {
                const internalCodeCase: [any, string] = [
                  fn("MIN", col("internal_code")),
                  "internal_code"
                ];
                attributes.push(internalCodeCase);
              }

              return await LineItemsProductsJoinedMaterializedView.findAll({
                attributes,
                where: {
                  // Optimize WHERE clause order for index usage
                  // Put most selective filters first to minimize scan
                  ...transactionFilter, // type + id filters (highly selective)
                  ...baseFilter // date, price, product_id filters
                },
                // Optimize GROUP BY order to match covering index
                group: ["seller_id", "buyer_id", "internal_product_id"],
                // Use raw query when possible for better performance
                raw: true,
                having: literal('SUM("total_price") > 0')
              });
            }
          );

          // Cache set segment
          if (useApiCaching && results.length > 0) {
            await newrelic.startSegment(
              "StoreRepository.getTransactionsByManufacturerIdFromMatView.cache_set",
              true,
              async () => {
                await redisClient.setEx(
                  cacheKey,
                  CACHE_TTL_TIME,
                  JSON.stringify(results)
                );
              }
            );
          }

          newrelic.addCustomAttribute(
            "getTransactionsByManufacturerIdFromMatView.result_count",
            results.length
          );

          return results;
        } catch (error) {
          console.error(
            "StoreRepository.getTransactionsByManufacturerIdFromMatView failed:",
            error
          );
          return [] as LineItem[];
        }
      }
    );
  }

  /**
   * Get transactions for multiple manufacturers in a single database query for better performance.
   * This is an optimized version of getTransactionsByManufacturerId for batch processing.
   */
  public async getTransactionsByMultipleManufacturerIds(
    buyerIds: number[],
    manufacturerIds: number[],
    buyerType?: string,
    returnSaleTransactions: boolean = false,
    sellerIds?: number[],
    sellerType?: string,
    includeProducts?: boolean,
    warehouseIds?: number[],
    programTerm?: { startDate: string; endDate: string },
    includeInternalCode: boolean = false
  ): Promise<Map<number, LineItem[]>> {
    return newrelic.startSegment(
      "StoreRepository.getTransactionsByMultipleManufacturerIds",
      true,
      async () => {
        try {
          // Cache check segment
          let cacheKey = "";
          if (useApiCaching) {
            await newrelic.startSegment(
              "StoreRepository.getTransactionsByMultipleManufacturerIds.cache_check",
              true,
              async () => {
                cacheKey = getCacheKey(
                  "txn",
                  "mfr_batch",
                  `${buyerIds.sort().join(",")}`,
                  `${manufacturerIds.sort().join(",")}`,
                  `${buyerType || ""}`,
                  `${returnSaleTransactions ? "1" : "0"}`,
                  `${sellerIds?.sort().join(",") || "all"}`,
                  `${sellerType || ""}`,
                  `${includeProducts ? "1" : "0"}`,
                  `${warehouseIds?.join(",")}`,
                  `${programTerm ? programTerm.startDate?.toString() : ""}`,
                  `${programTerm ? programTerm.endDate?.toString() : ""}`
                );

                try {
                  const cached = await redisClient.get(cacheKey);
                  if (cached) {
                    return new Map(JSON.parse(cached));
                  }
                } catch (error) {
                  console.error("Cache error:", error);
                }
              }
            );
          }

          const entityType = buyerType ? buyerType : ENTITY_TYPE.STORE;
          const sellerEntityType = sellerType
            ? sellerType
            : ENTITY_TYPE.DISTRIBUTOR;

          // Product SKUs retrieval segment
          const productSKUsIds = await newrelic.startSegment(
            "StoreRepository.getTransactionsByMultipleManufacturerIds.getProductSKUs",
            true,
            async () => {
              return await this.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
                [],
                manufacturerIds
              );
            }
          );

          // Main database query segment
          const results = await newrelic.startSegment(
            "StoreRepository.getTransactionsByMultipleManufacturerIds.databaseQuery",
            true,
            async () => {
              // Build filters inline to avoid duplication
              let transactionFilter = {};

              if (sellerIds?.length) {
                transactionFilter = {
                  ...(returnSaleTransactions
                    ? {
                        seller_id: {
                          [Op.in]: buyerIds
                        },
                        seller_type: entityType,
                        buyer_id: {
                          [Op.in]: sellerIds
                        },
                        buyer_type: sellerEntityType
                      }
                    : {
                        buyer_id: {
                          [Op.in]: buyerIds
                        },
                        buyer_type: entityType,
                        seller_id: {
                          [Op.in]: sellerIds
                        },
                        seller_type: sellerEntityType
                      })
                };
              } else {
                transactionFilter = {
                  ...(returnSaleTransactions
                    ? {
                        seller_id: {
                          [Op.in]: buyerIds
                        },
                        seller_type: entityType
                      }
                    : {
                        buyer_id: {
                          [Op.in]: buyerIds
                        },
                        buyer_type: entityType
                      })
                };
              }

              if (warehouseIds?.length) {
                transactionFilter = {
                  ...transactionFilter,
                  warehouse_id: {
                    [Op.in]: warehouseIds
                  }
                };
              }

              const attributes: (string | [any, string])[] = [
                [fn("SUM", col("total_price")), "total_purchase_volume"],
                [col("product.manufacturer_id"), "manufacturer_id"]
              ];

              const queryResult = await LineItem.findAll({
                attributes,
                where: {
                  ...transactionFilter,
                  product_id: {
                    [Op.in]: productSKUsIds
                  },
                  ...LineItem.getDateRangeFilter(programTerm)
                },
                include: [
                  includeProducts
                    ? {
                        model: Product,
                        as: "product",
                        attributes: ["manufacturer_id"],
                        required: !!manufacturerIds.length,
                        on: {
                          [Op.or]: [
                            Sequelize.where(
                              Sequelize.col("product_id"),
                              Sequelize.col("product.case_skus_id")
                            ),
                            Sequelize.where(
                              Sequelize.col("product_id"),
                              Sequelize.col("product.box_skus_id")
                            ),
                            {
                              [Op.and]: [
                                Sequelize.where(
                                  Sequelize.col("LineItem.product_id"),
                                  Sequelize.col("product.unit_skus_id")
                                ),
                                Sequelize.where(
                                  Sequelize.col("product.primary_variant"),
                                  true
                                )
                              ]
                            }
                          ]
                        },
                        where: {
                          manufacturer_id: { [Op.in]: manufacturerIds }
                        },
                        include: []
                      }
                    : {
                        model: Product,
                        as: "product",
                        required: true,
                        on: {
                          [Op.or]: [
                            Sequelize.where(
                              Sequelize.col("LineItem.product_id"),
                              Sequelize.col("case_skus_id")
                            ),
                            Sequelize.where(
                              Sequelize.col("LineItem.product_id"),
                              Sequelize.col("box_skus_id")
                            ),
                            {
                              [Op.and]: [
                                Sequelize.where(
                                  Sequelize.col("LineItem.product_id"),
                                  Sequelize.col("product.unit_skus_id")
                                ),
                                Sequelize.where(
                                  Sequelize.col("primary_variant"),
                                  true
                                )
                              ]
                            }
                          ]
                        },
                        where: {
                          ...(manufacturerIds?.length
                            ? { manufacturer_id: { [Op.in]: manufacturerIds } }
                            : {})
                        },
                        include: []
                      }
                ],
                group: ["seller_id", "buyer_id", "product.id"],
                raw: true,
                nest: false,
                having: literal('SUM("total_price") > 0')
              });
              return queryResult;
            }
          );

          // Group results by manufacturer_id
          const resultsByManufacturer = new Map<number, LineItem[]>();

          results.forEach((result: any) => {
            const manufacturerId = result.manufacturer_id;
            if (manufacturerId) {
              if (!resultsByManufacturer.has(manufacturerId)) {
                resultsByManufacturer.set(manufacturerId, []);
              }
              resultsByManufacturer.get(manufacturerId)!.push(result);
            }
          });

          // Cache the results
          if (useApiCaching && resultsByManufacturer.size > 0) {
            const cacheKey = getCacheKey(
              "txn",
              "mfr_batch",
              `${buyerIds.sort().join(",")}`,
              `${manufacturerIds.sort().join(",")}`,
              `${buyerType || ""}`,
              `${returnSaleTransactions ? "1" : "0"}`,
              `${sellerIds?.sort().join(",") || "all"}`,
              `${sellerType || ""}`,
              `${includeProducts ? "1" : "0"}`,
              `${warehouseIds?.join(",")}`,
              `${programTerm ? programTerm.startDate?.toString() : ""}`,
              `${programTerm ? programTerm.endDate?.toString() : ""}`
            );

            await redisClient.setEx(
              cacheKey,
              CACHE_TTL_TIME,
              JSON.stringify(Array.from(resultsByManufacturer.entries()))
            );
          }

          newrelic.addCustomAttribute(
            "getTransactionsByMultipleManufacturerIds.buyer_count",
            buyerIds.length
          );
          newrelic.addCustomAttribute(
            "getTransactionsByMultipleManufacturerIds.manufacturer_count",
            manufacturerIds.length
          );
          newrelic.addCustomAttribute(
            "getTransactionsByMultipleManufacturerIds.result_count",
            results.length
          );
          newrelic.addCustomAttribute(
            "getTransactionsByMultipleManufacturerIds.grouped_count",
            resultsByManufacturer.size
          );

          return resultsByManufacturer;
        } catch (error) {
          console.error(
            "StoreRepository.getTransactionsByMultipleManufacturerIds failed:",
            error
          );
          return new Map<number, LineItem[]>();
        }
      }
    );
  }
  public async getTransactionsByManufacturerIdAndProgramTerms(
    buyerIds: number[],
    manufacturerIds: number[],
    buyerType?: string,
    returnSaleTransactions: boolean = false,
    sellerIds?: number[],
    sellerType?: string,
    includeProducts?: boolean,
    warehouseIds?: number[],
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    includeInternalCode: boolean = false,
    useMatView?: boolean
  ) {
    try {
      let cacheKey = "";
      if (useApiCaching) {
        cacheKey = getCacheKey(
          "getTransactions",
          "mfr",
          `${buyerIds.sort().join(",")}`,
          `${manufacturerIds.sort().join(",")}`,
          `${buyerType || ""}`,
          `${returnSaleTransactions ? "1" : "0"}`,
          `${sellerIds?.sort().join(",") || "all"}`,
          `${sellerType || ""}`,
          `${includeProducts ? "1" : "0"}`,
          `${warehouseIds?.join(",")}`,
          `${programTerms ? JSON.stringify(programTerms) : ""}`,
          `${useMatView ? useMatView?.toString() : ""}`
        );

        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (error) {
          console.error("Cache error:", error);
        }
      }

      const entityType = buyerType ? buyerType : ENTITY_TYPE.STORE;
      const sellerEntityType = sellerType
        ? sellerType
        : ENTITY_TYPE.DISTRIBUTOR;

      const productSKUsIds =
        await this.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
          [],
          manufacturerIds
        );

      let transactionFilter: any = {};

      if (sellerIds?.length) {
        transactionFilter = {
          ...(returnSaleTransactions
            ? {
                seller_id: {
                  [Op.in]: buyerIds
                },
                seller_type: entityType,
                buyer_id: {
                  [Op.in]: sellerIds
                },
                buyer_type: sellerEntityType
              }
            : {
                buyer_id: {
                  [Op.in]: buyerIds
                },
                buyer_type: entityType,
                // seller_id: { [Op.in]: sellerIds },
                seller_type: sellerEntityType
              })
        };
      } else {
        transactionFilter = {
          ...(returnSaleTransactions
            ? { seller_id: { [Op.in]: buyerIds }, seller_type: entityType }
            : { buyer_id: { [Op.in]: buyerIds }, buyer_type: entityType })
        };
      }

      if (warehouseIds) {
        transactionFilter = {
          ...transactionFilter,
          warehouse_id: {
            [Op.in]: warehouseIds
          }
        };
      }

      const keyName = useMatView
        ? "LineItemsProductsJoinedMaterializedView"
        : "LineItem";

      // Add per-manufacturer programTerm logic
      if (programTerms && Object.keys(programTerms).length > 0) {
        transactionFilter[Op.and] = [
          literal(`
          EXISTS (
            SELECT 1 FROM products AS p
            WHERE (
              p.case_skus_id = "${keyName}".product_id OR
              p.box_skus_id = "${keyName}".product_id OR
              (p.unit_skus_id = "${keyName}".product_id AND p.primary_variant = true)
            )
            AND p.manufacturer_id IS NOT NULL
            AND (
              ${Object.entries(programTerms)
                .map(
                  ([mid, term]) =>
                    `(p.manufacturer_id = ${mid} AND "${keyName}"."transaction_date" BETWEEN '${term.startDate}' AND '${term.endDate}')`
                )
                .join(" OR ")}
            )
          )
        `)
        ];
      }

      let results: any[] = [];

      if (useMatView) {
        const attributes: (string | [any, string])[] = [
          [fn("MIN", col("internal_product_id")), "product_id"],
          [fn("MIN", col("manufacturer_id")), "manufacturer_id"],
          "buyer_id",
          [fn("SUM", col("quantity")), "quantity"],
          [fn("SUM", col("total_price")), "total_price"]
        ];

        if (includeInternalCode) {
          const internalCodeCase: [any, string] = [
            fn("MIN", col("internal_code")),
            "internal_code"
          ];
          attributes.push(internalCodeCase);
        }

        results = await LineItemsProductsJoinedMaterializedView.findAll({
          attributes,
          where: {
            ...transactionFilter
          },
          // Optimize GROUP BY order to match covering index
          group: ["seller_id", "buyer_id", "internal_product_id"],
          // Use raw query when possible for better performance
          raw: true,
          having: literal('SUM("total_price") > 0')
        });
      } else {
        const attributes: (string | [any, string])[] = [
          [fn("MIN", col("LineItem.product_id")), "product_id"],
          "seller_id",
          "buyer_id",
          [fn("SUM", col("LineItem.quantity")), "quantity"],
          [fn("SUM", col("LineItem.total_price")), "total_price"]
        ];

        if (includeInternalCode) {
          const internalCodeAttribute: [any, string] = [
            Sequelize.literal(`(
              SELECT MIN(pcm.code)
              FROM product_code_mappings pcm
              WHERE pcm.product_id = "product"."id"
                AND pcm.deleted_at IS NULL
                AND (
                  pcm.warehouse_id IS NULL
                  OR EXISTS (
                    SELECT 1
                    FROM line_items li
                    WHERE li.warehouse_id = pcm.warehouse_id
                      AND li.deleted_at IS NULL
                      AND li.buyer_id = "LineItem"."buyer_id"
                      AND li.seller_id = "LineItem"."seller_id"
                      AND li.product_id = ANY (
                        ARRAY_REMOVE(
                          ARRAY[
                            "product"."case_skus_id",
                            "product"."box_skus_id",
                            "product"."unit_skus_id"
                          ],
                          NULL
                        )
                      )
                  )
                )
            )`),
            "internal_code"
          ];
          attributes.push(internalCodeAttribute);
        }
        // Fetch data using Sequelize model queries
        results = await LineItem.findAll({
          attributes,
          where: {
            ...transactionFilter,
            product_id: {
              [Op.in]: productSKUsIds
            }
          },
          include: [
            includeProducts
              ? {
                  model: Product,
                  as: "product",
                  attributes: ["manufacturer_id"],
                  required: !!manufacturerIds.length,
                  on: {
                    [Op.or]: [
                      Sequelize.where(
                        Sequelize.col("product_id"),
                        Sequelize.col("product.case_skus_id")
                      ),
                      Sequelize.where(
                        Sequelize.col("product_id"),
                        Sequelize.col("product.box_skus_id")
                      ),
                      {
                        [Op.and]: [
                          Sequelize.where(
                            Sequelize.col("LineItem.product_id"),
                            Sequelize.col("product.unit_skus_id")
                          ),
                          Sequelize.where(
                            Sequelize.col("product.primary_variant"),
                            true
                          )
                        ]
                      }
                    ]
                  },
                  where: {
                    manufacturer_id: { [Op.in]: manufacturerIds }
                  },
                  include: []
                }
              : {
                  model: Product,
                  as: "product",
                  required: true,
                  on: {
                    [Op.or]: [
                      Sequelize.where(
                        Sequelize.col("LineItem.product_id"),
                        Sequelize.col("case_skus_id")
                      ),
                      Sequelize.where(
                        Sequelize.col("LineItem.product_id"),
                        Sequelize.col("box_skus_id")
                      ),
                      {
                        [Op.and]: [
                          Sequelize.where(
                            Sequelize.col("LineItem.product_id"),
                            Sequelize.col("product.unit_skus_id")
                          ),
                          Sequelize.where(
                            Sequelize.col("primary_variant"),
                            true
                          )
                        ]
                      }
                    ]
                  },
                  where: {
                    ...(manufacturerIds?.length
                      ? { manufacturer_id: { [Op.in]: manufacturerIds } }
                      : {})
                  },
                  include: []
                }
          ],
          group: ["seller_id", "buyer_id", "product.id"],
          raw: includeInternalCode,
          nest: includeInternalCode,
          having: literal('SUM("total_price") > 0')
        });
      }

      if (useApiCaching && results.length > 0) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(results)
        );
      }

      return results;
    } catch {
      return [] as LineItem[];
    }
  }

  /**
   * Retrieves distinct store IDs for a distributor general manager using their user id.
   * Joins through sales reps -> distributors (primary warehouse) -> manager warehouse assignments.
   */
  public async getStoreIdsByGeneralManager({
    generalManagerUserId,
    excludeChainStores = false
  }: {
    generalManagerUserId: number;
    excludeChainStores?: boolean;
  }): Promise<number[]> {
    const chainJoin = excludeChainStores
      ? "LEFT JOIN chain_stores cs ON cs.store_id = s.id"
      : "";
    const chainWhere = excludeChainStores ? "AND cs.store_id IS NULL" : "";

    const results = await sequelize.query(
      `
      SELECT DISTINCT s.id AS store_id
      FROM stores s
      INNER JOIN store_sales_reps ssr ON ssr.store_id = s.id
      INNER JOIN user_roles ur
        ON ur.associated_user_id = ssr.sales_rep_id
       AND ur.role = :salesRepRole
      INNER JOIN distributors d
        ON d.id = ur.associated_user_id
      INNER JOIN distributor_manager_warehouses dmw
        ON dmw.warehouse_id = d.primary_warehouse_id
       AND dmw.distributor_id = :gmUserId
      ${chainJoin}
      WHERE 1=1
      ${chainWhere}
      ORDER BY s.id
      `,
      {
        replacements: {
          gmUserId: generalManagerUserId,
          salesRepRole: ENTITY_TYPE.DISTRIBUTOR_SALES_REP
        },
        type: QueryTypes.SELECT
      }
    );

    return [
      ...new Set(
        (results as Array<{ store_id: number }>).map((row) =>
          Number(row.store_id)
        )
      )
    ];
  }

  /**
   * OPTIMIZED VERSION: Get aggregated transaction data by manufacturer ID and program terms
   *
   * This function performs database-level aggregation using the materialized view to significantly
   * improve performance compared to the original method that fetches individual line items.
   *
   * KEY DIFFERENCES FROM ORIGINAL:
   * - Uses materialized view (line_items_products_joined_materialized_view) instead of direct table joins
   * - Performs SUM, COUNT, GROUP BY operations at database level
   * - Returns pre-aggregated results instead of individual line items
   * - Reduces data transfer from ~200K+ records to ~10-20 aggregated records
   *
   * FILTERING LOGIC:
   * 1. Manufacturer Filter: Only include transactions for specified manufacturers
   * 2. Entity Filter: Based on transaction direction (sales vs purchases)
   * 3. Warehouse Filter: Filter by specific warehouse IDs if provided
   * 4. Date Filter: Apply program-specific date ranges for each manufacturer
   *
   * AGGREGATION:
   * - Groups by manufacturer_id
   * - Sums total_price as total_volume
   * - Counts records as transaction_count
   * - Sums quantity as total_quantity
   * - Filters out records with zero total_price
   *
   * @param buyerIds - Array of buyer entity IDs (stores/distributors)
   * @param manufacturerIds - Array of manufacturer IDs to filter by
   * @param buyerType - Type of buyer entity (STORE, DISTRIBUTOR, etc.)
   * @param returnSaleTransactions - If true, get sales transactions; if false, get purchase transactions
   * @param sellerIds - Array of seller entity IDs (optional)
   * @param sellerType - Type of seller entity (optional)
   * @param warehouseIds - Array of warehouse IDs to filter by (optional)
   * @param programTerms - Object mapping manufacturer IDs to date ranges (optional)
   * @param useMatView - Whether to use materialized view (default: true)
   * @returns Array of aggregated transaction data per manufacturer
   */

  public async getTransactionsByManufacturerIdAndProgramTermsOptimized(
    buyerIds: number[],
    manufacturerIds: number[],
    buyerType?: string,
    returnSaleTransactions: boolean = false,
    sellerIds?: number[],
    sellerType?: string,
    warehouseIds?: number[],
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    includeInternalCode: boolean = false,
    includeProducts?: boolean,
    dateOnlyComparison?: boolean
  ): Promise<any[]> {
    const dateOnlyComparisonFlag = dateOnlyComparison || false;
    try {
      let cacheKey = "";
      if (useApiCaching) {
        cacheKey = getCacheKey(
          "getTransactionsOptimized",
          "mfr",
          `${buyerIds.sort().join(",")}`,
          `${manufacturerIds.sort().join(",")}`,
          `${buyerType || ""}`,
          `${returnSaleTransactions ? "1" : "0"}`,
          `${sellerIds?.sort().join(",") || "all"}`,
          `${sellerType || ""}`,
          `${warehouseIds?.join(",") || "all"}`,
          `${programTerms ? JSON.stringify(programTerms) : "all"}`,
          `${includeInternalCode ? "1" : "0"}`,
          `${includeProducts ? "1" : "0"}`
        );

        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (error) {
          console.error("Cache error:", error);
        }
      }

      const entityType = buyerType ? buyerType : ENTITY_TYPE.STORE;
      const sellerEntityType = sellerType
        ? sellerType
        : ENTITY_TYPE.DISTRIBUTOR;

      // THRESHOLD: Use CTE when sellerIds exceeds this count
      const SELLER_ID_CTE_THRESHOLD = 100;
      const useCTEForSellerIds =
        sellerIds && sellerIds.length > SELLER_ID_CTE_THRESHOLD;
      // STEP 1: Initialize WHERE conditions array for building the optimized query
      const whereConditions: any[] = [];

      // STEP 2: Apply manufacturer filtering
      // Only include transactions for the specified manufacturers
      whereConditions.push({
        manufacturer_id: {
          [Op.in]: manufacturerIds
        }
      });

      // STEP 3: Apply entity filtering based on transaction direction
      // This determines whether we're looking at sales or purchase transactions
      if (sellerIds?.length) {
        if (useCTEForSellerIds) {
          // Use CTE approach for large sellerIds lists
          if (returnSaleTransactions) {
            // CASE: Distributor sales to stores (distributor is seller, store is buyer)
            whereConditions.push({
              seller_id: { [Op.in]: buyerIds }, // Distributor IDs
              seller_type: entityType, // DISTRIBUTOR
              buyer_id: literal(`IN (SELECT seller_id FROM seller_list)`), // Use CTE reference
              buyer_type: sellerEntityType // STORE
            });
          } else {
            // CASE: Distributor purchases from stores (store is seller, distributor is buyer)
            whereConditions.push({
              buyer_id: { [Op.in]: buyerIds }, // Distributor IDs
              buyer_type: entityType, // DISTRIBUTOR
              seller_id: literal(`IN (SELECT seller_id FROM seller_list)`), // Use CTE reference
              seller_type: sellerEntityType // STORE
            });
          }
        } else {
          // Use standard approach for small sellerIds lists
          if (returnSaleTransactions) {
            // CASE: Distributor sales to stores (distributor is seller, store is buyer)
            whereConditions.push({
              seller_id: { [Op.in]: buyerIds }, // Distributor IDs
              seller_type: entityType, // DISTRIBUTOR
              buyer_id: { [Op.in]: sellerIds }, // Store IDs
              buyer_type: sellerEntityType // STORE
            });
          } else {
            // CASE: Distributor purchases from stores (store is seller, distributor is buyer)
            whereConditions.push({
              buyer_id: { [Op.in]: buyerIds }, // Distributor IDs
              buyer_type: entityType, // DISTRIBUTOR
              seller_id: { [Op.in]: sellerIds }, // Store IDs
              seller_type: sellerEntityType // STORE
            });
          }
        }
      } else {
        // CASE: No specific seller filtering, just filter by buyer/seller type
        if (returnSaleTransactions) {
          whereConditions.push({
            seller_id: { [Op.in]: buyerIds }, // Distributor IDs
            seller_type: entityType // DISTRIBUTOR
          });
        } else {
          whereConditions.push({
            buyer_id: { [Op.in]: buyerIds }, // Distributor IDs
            buyer_type: entityType // DISTRIBUTOR
          });
        }
      }

      // STEP 4: Apply warehouse filtering (optional)
      // Filter transactions by specific warehouse IDs if provided
      if (warehouseIds && warehouseIds.length > 0) {
        whereConditions.push({
          warehouse_id: {
            [Op.in]: warehouseIds
          }
        });
      }

      // STEP 5: Apply program-specific date filtering (optional)
      // Each manufacturer can have different program date ranges
      // Note: When using raw SQL (executeQueryWithCTE), date filtering is handled there
      // Only add to whereConditions for Sequelize queries (when not using CTE)
      if (
        programTerms &&
        Object.keys(programTerms).length > 0 &&
        !useCTEForSellerIds
      ) {
        // Create date range conditions for each manufacturer
        const dateConditions = Object.entries(programTerms).map(
          ([manufacturerId, term]) => {
            if (dateOnlyComparisonFlag) {
              // Extract date portion (YYYY-MM-DD) from ISO strings for date-only comparison
              const startDateOnly = term.startDate.split("T")[0];
              const endDateOnly = term.endDate.split("T")[0];
              return {
                [Op.and]: [
                  { manufacturer_id: parseInt(manufacturerId) },
                  literal(
                    `transaction_date::date BETWEEN '${startDateOnly}' AND '${endDateOnly}'`
                  )
                ]
              };
            } else {
              return {
                [Op.and]: [
                  { manufacturer_id: parseInt(manufacturerId) },
                  {
                    transaction_date: {
                      [Op.between]: [term.startDate, term.endDate]
                    }
                  }
                ]
              };
            }
          }
        );

        // Combine all date conditions with OR (any manufacturer can match its date range)
        whereConditions.push({
          [Op.or]: dateConditions
        });
      }

      // STEP 6: Execute optimized query with database-level aggregation
      let results: any[] = [];

      if (useCTEForSellerIds) {
        // Use raw query with CTE for large sellerIds
        results = await this.executeQueryWithCTE(
          sellerIds!,
          whereConditions,
          manufacturerIds,
          buyerIds,
          entityType,
          sellerEntityType,
          returnSaleTransactions,
          warehouseIds,
          programTerms,
          includeProducts,
          includeInternalCode,
          dateOnlyComparison
        );
      } else {
        // Use standard Sequelize query for small lists
        if (includeProducts) {
          // Return individual transaction records when includeProducts is true
          const attributes: (string | [any, string])[] = [
            [fn("MIN", col("internal_product_id")), "product_id"],
            [fn("MIN", col("manufacturer_id")), "manufacturer_id"],
            "buyer_id",
            [fn("SUM", col("quantity")), "quantity"],
            [fn("SUM", col("total_price")), "total_price"]
          ];

          if (includeInternalCode) {
            const internalCodeCase: [any, string] = [
              fn("MIN", col("internal_code")),
              "internal_code"
            ];
            attributes.push(internalCodeCase);
          }

          results = await LineItemsProductsJoinedMaterializedView.findAll({
            attributes,
            where: {
              [Op.and]: whereConditions
            },
            group: ["seller_id", "buyer_id", "internal_product_id"],
            raw: true,
            having: literal('SUM("total_price") > 0')
          });
        } else {
          // Return aggregated data when includeProducts is false
          results = await LineItemsProductsJoinedMaterializedView.findAll({
            attributes: [
              "manufacturer_id",
              [fn("SUM", col("total_price")), "total_volume"],
              [fn("COUNT", col("*")), "transaction_count"],
              [fn("SUM", col("quantity")), "total_quantity"]
            ],
            where: {
              [Op.and]: whereConditions
            },
            group: ["manufacturer_id"],
            raw: true,
            having: literal('SUM("total_price") > 0')
          });
        }
      }

      // Transform results to match expected format
      let transformedResults: any[];

      if (includeProducts) {
        // Return raw results for individual transactions
        transformedResults = results;
      } else {
        // Transform aggregated results
        transformedResults = results.map((result: any) => ({
          manufacturer_id: result.manufacturer_id,
          total_volume: parseFloat(result.total_volume || "0"),
          transaction_count: parseInt(result.transaction_count || "0"),
          total_quantity: parseInt(result.total_quantity || "0")
        }));
      }

      // Cache the results if caching is enabled
      if (useApiCaching && transformedResults.length > 0) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(transformedResults)
        );
      }
      return transformedResults;
    } catch (error) {
      console.error(
        "Error in getTransactionsByManufacturerIdAndProgramTermsOptimized:",
        error
      );
      return [];
    }
  }

  /**
   * OPTIMIZED VERSION WITH INELIGIBILITY: Get aggregated transaction data by manufacturer ID and program terms
   * with manufacturer-specific store ineligibility filtering
   *
   * This method extends getTransactionsByManufacturerIdAndProgramTermsOptimized to exclude stores
   * that have ALL programs ineligible per manufacturer. The ineligibility check is done at the
   * database level, grouped by manufacturer_id, ensuring correct purchase volumes per manufacturer.
   *
   * @param buyerIds - Array of buyer entity IDs (distributors)
   * @param manufacturerIds - Array of manufacturer IDs to filter by
   * @param buyerType - Type of buyer entity (DISTRIBUTOR)
   * @param returnSaleTransactions - If true, get sales transactions; if false, get purchase transactions
   * @param sellerIds - Array of seller entity IDs (stores) - ALL stores, no pre-filtering
   * @param sellerType - Type of seller entity (STORE)
   * @param warehouseIds - Array of warehouse IDs to filter by (optional)
   * @param programTerms - Object mapping manufacturer IDs to date ranges (optional)
   * @param programIds - Array of program IDs for ineligibility check (required)
   * @param distributorId - Distributor ID for ineligibility filtering (required)
   * @param includeInternalCode - Whether to include internal code (default: false)
   * @param includeProducts - Whether to include product details (default: false)
   * @returns Array of aggregated transaction data per manufacturer
   */
  public async getTransactionsByManufacturerIdAndProgramTermsOptimizedWithIneligibility(
    buyerIds: number[],
    manufacturerIds: number[],
    programIds: number[],
    distributorId: number,
    buyerType?: string,
    returnSaleTransactions: boolean = false,
    sellerIds?: number[],
    sellerType?: string,
    warehouseIds?: number[],
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    includeInternalCode: boolean = false,
    includeProducts?: boolean
  ): Promise<any[]> {
    try {
      // Validate required parameters
      if (!programIds || programIds.length === 0) {
        throw new Error("programIds is required for ineligibility filtering");
      }
      if (!distributorId) {
        throw new Error(
          "distributorId is required for ineligibility filtering"
        );
      }

      let cacheKey = "";
      if (useApiCaching) {
        cacheKey = getCacheKey(
          "getTransactionsOptimizedWithIneligibility",
          "mfr",
          `${buyerIds.sort().join(",")}`,
          `${manufacturerIds.sort().join(",")}`,
          `${buyerType || ""}`,
          `${returnSaleTransactions ? "1" : "0"}`,
          `${sellerIds?.sort().join(",") || "all"}`,
          `${sellerType || ""}`,
          `${warehouseIds?.join(",") || "all"}`,
          `${programTerms ? JSON.stringify(programTerms) : "all"}`,
          `${programIds.sort().join(",")}`,
          `${distributorId}`,
          `${includeInternalCode ? "1" : "0"}`,
          `${includeProducts ? "1" : "0"}`
        );

        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (error) {
          console.error("Cache error:", error);
        }
      }

      const entityType = buyerType ? buyerType : ENTITY_TYPE.STORE;
      const sellerEntityType = sellerType
        ? sellerType
        : ENTITY_TYPE.DISTRIBUTOR;

      // THRESHOLD: Use CTE when sellerIds exceeds this count
      const SELLER_ID_CTE_THRESHOLD = 100;
      const useCTEForSellerIds =
        sellerIds && sellerIds.length > SELLER_ID_CTE_THRESHOLD;

      // Build ineligibility CTE
      const ineligibilityCTE = `
        ineligible_stores_by_manufacturer AS (
          SELECT 
            p.manufacturer_id,
            psi.store_id
          FROM program_store_ineligibility psi
          JOIN programs p ON p.id = psi.program_id
          WHERE psi.distributor_id = ${distributorId}
            AND psi.deleted_at IS NULL
            AND p.manufacturer_id IN (${manufacturerIds.join(", ")})
            AND p.participant_type = 'STORE'
            AND p.deleted_at IS NULL
            AND p.id IN (${programIds.join(", ")})
          GROUP BY p.manufacturer_id, psi.store_id
          HAVING COUNT(DISTINCT psi.program_id) = (
            SELECT COUNT(*)
            FROM programs p2
            WHERE p2.manufacturer_id = p.manufacturer_id
              AND p2.participant_type = 'STORE'
              AND p2.id IN (${programIds.join(", ")})
              AND p2.deleted_at IS NULL
          )
        )
      `;

      // STEP 1: Initialize WHERE conditions array
      const whereConditions: any[] = [];

      // STEP 2: Apply manufacturer filtering
      whereConditions.push({
        manufacturer_id: {
          [Op.in]: manufacturerIds
        }
      });

      // STEP 3: Apply entity filtering based on transaction direction
      if (sellerIds?.length) {
        if (useCTEForSellerIds) {
          if (returnSaleTransactions) {
            whereConditions.push({
              seller_id: { [Op.in]: buyerIds },
              seller_type: entityType,
              buyer_id: literal(`IN (SELECT seller_id FROM seller_list)`),
              buyer_type: sellerEntityType
            });
          } else {
            whereConditions.push({
              buyer_id: { [Op.in]: buyerIds },
              buyer_type: entityType,
              seller_id: literal(`IN (SELECT seller_id FROM seller_list)`),
              seller_type: sellerEntityType
            });
          }
        } else {
          if (returnSaleTransactions) {
            whereConditions.push({
              seller_id: { [Op.in]: buyerIds },
              seller_type: entityType,
              buyer_id: { [Op.in]: sellerIds },
              buyer_type: sellerEntityType
            });
          } else {
            whereConditions.push({
              buyer_id: { [Op.in]: buyerIds },
              buyer_type: entityType,
              seller_id: { [Op.in]: sellerIds },
              seller_type: sellerEntityType
            });
          }
        }
      } else {
        if (returnSaleTransactions) {
          whereConditions.push({
            seller_id: { [Op.in]: buyerIds },
            seller_type: entityType
          });
        } else {
          whereConditions.push({
            buyer_id: { [Op.in]: buyerIds },
            buyer_type: entityType
          });
        }
      }

      // STEP 4: Apply warehouse filtering
      if (warehouseIds && warehouseIds.length > 0) {
        whereConditions.push({
          warehouse_id: {
            [Op.in]: warehouseIds
          }
        });
      }

      // STEP 5: Apply program-specific date filtering
      if (programTerms && Object.keys(programTerms).length > 0) {
        const dateConditions = Object.entries(programTerms).map(
          ([manufacturerId, term]) => ({
            [Op.and]: [
              { manufacturer_id: parseInt(manufacturerId) },
              {
                transaction_date: {
                  [Op.between]: [term.startDate, term.endDate]
                }
              }
            ]
          })
        );
        whereConditions.push({
          [Op.or]: dateConditions
        });
      }

      // STEP 6: Add ineligibility exclusion condition
      // For purchase transactions: store is seller (seller_id)
      // For sale transactions: store is buyer (buyer_id)
      const storeIdColumn = returnSaleTransactions ? "buyer_id" : "seller_id";
      const ineligibilityExclusion = `NOT EXISTS (
          SELECT 1 
          FROM ineligible_stores_by_manufacturer ism
          WHERE ism.manufacturer_id = line_items_products_joined_materialized_view.manufacturer_id
            AND ism.store_id = line_items_products_joined_materialized_view.${storeIdColumn}
        )`;

      // STEP 7: Execute optimized query with ineligibility filtering
      let results: any[] = [];

      if (useCTEForSellerIds) {
        // Use raw query with CTE for large sellerIds
        results = await this.executeQueryWithCTEAndIneligibility(
          sellerIds!,
          whereConditions,
          manufacturerIds,
          buyerIds,
          entityType,
          sellerEntityType,
          returnSaleTransactions,
          ineligibilityCTE,
          ineligibilityExclusion,
          warehouseIds,
          programTerms,
          includeProducts,
          includeInternalCode
        );
      } else {
        // Use standard Sequelize query with ineligibility subquery
        if (includeProducts) {
          const attributes: (string | [any, string])[] = [
            [fn("MIN", col("internal_product_id")), "product_id"],
            [fn("MIN", col("manufacturer_id")), "manufacturer_id"],
            "buyer_id",
            [fn("SUM", col("quantity")), "quantity"],
            [fn("SUM", col("total_price")), "total_price"]
          ];

          if (includeInternalCode) {
            attributes.push([fn("MIN", col("internal_code")), "internal_code"]);
          }

          // Use raw query to include ineligibility CTE
          const query = `
            WITH ${ineligibilityCTE}
            SELECT 
              MIN(internal_product_id) AS product_id,
              MIN(manufacturer_id) AS manufacturer_id,
              buyer_id,
              SUM(quantity) AS quantity,
              SUM(total_price) AS total_price
              ${includeInternalCode ? ", MIN(internal_code) AS internal_code" : ""}
            FROM line_items_products_joined_materialized_view
            WHERE manufacturer_id IN (${manufacturerIds.join(", ")})
              ${returnSaleTransactions ? `AND seller_id IN (${buyerIds.join(", ")}) AND seller_type = '${entityType}' AND buyer_id IN (${sellerIds!.join(", ")}) AND buyer_type = '${sellerEntityType}'` : `AND buyer_id IN (${buyerIds.join(", ")}) AND buyer_type = '${entityType}' AND seller_id IN (${sellerIds!.join(", ")}) AND seller_type = '${sellerEntityType}'`}
              ${warehouseIds && warehouseIds.length > 0 ? `AND warehouse_id IN (${warehouseIds.join(", ")})` : ""}
              ${
                programTerms && Object.keys(programTerms).length > 0
                  ? `AND (${Object.entries(programTerms)
                      .map(
                        ([mfrId, term]) =>
                          `(manufacturer_id = ${mfrId} AND transaction_date::date BETWEEN '${term.startDate}' AND '${term.endDate}')`
                      )
                      .join(" OR ")})`
                  : ""
              }
              AND ${ineligibilityExclusion}
            GROUP BY seller_id, buyer_id, internal_product_id
            HAVING SUM(total_price) > 0
          `;

          results = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            raw: true
          });
        } else {
          // Return aggregated data
          const query = `
            WITH ${ineligibilityCTE}
            SELECT 
              manufacturer_id,
              SUM(total_price) AS total_volume,
              COUNT(*) AS transaction_count,
              SUM(quantity) AS total_quantity
            FROM line_items_products_joined_materialized_view
            WHERE manufacturer_id IN (${manufacturerIds.join(", ")})
              ${returnSaleTransactions ? `AND seller_id IN (${buyerIds.join(", ")}) AND seller_type = '${entityType}' AND buyer_id IN (${sellerIds!.join(", ")}) AND buyer_type = '${sellerEntityType}'` : `AND buyer_id IN (${buyerIds.join(", ")}) AND buyer_type = '${entityType}' AND seller_id IN (${sellerIds!.join(", ")}) AND seller_type = '${sellerEntityType}'`}
              ${warehouseIds && warehouseIds.length > 0 ? `AND warehouse_id IN (${warehouseIds.join(", ")})` : ""}
              ${
                programTerms && Object.keys(programTerms).length > 0
                  ? `AND (${Object.entries(programTerms)
                      .map(
                        ([mfrId, term]) =>
                          `(manufacturer_id = ${mfrId} AND transaction_date::date BETWEEN '${term.startDate}' AND '${term.endDate}')`
                      )
                      .join(" OR ")})`
                  : ""
              }
              AND ${ineligibilityExclusion}
            GROUP BY manufacturer_id
            HAVING SUM(total_price) > 0
          `;

          results = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            raw: true
          });
        }
      }

      // Transform results to match expected format
      let transformedResults: any[];

      if (includeProducts) {
        transformedResults = results;
      } else {
        transformedResults = results.map((result: any) => ({
          manufacturer_id: result.manufacturer_id,
          total_volume: parseFloat(result.total_volume || "0"),
          transaction_count: parseInt(result.transaction_count || "0"),
          total_quantity: parseInt(result.total_quantity || "0")
        }));
      }

      // Cache the results if caching is enabled
      if (useApiCaching && transformedResults.length > 0) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(transformedResults)
        );
      }
      return transformedResults;
    } catch (error) {
      console.error(
        "Error in getTransactionsByManufacturerIdAndProgramTermsOptimizedWithIneligibility:",
        error
      );
      return [];
    }
  }

  // Helper method to execute query with CTE and ineligibility
  private async executeQueryWithCTEAndIneligibility(
    sellerIds: number[],
    whereConditions: any[],
    manufacturerIds: number[],
    buyerIds: number[],
    entityType: string,
    sellerEntityType: string,
    returnSaleTransactions: boolean,
    ineligibilityCTE: string,
    ineligibilityExclusion: string,
    warehouseIds?: number[],
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    includeProducts?: boolean,
    includeInternalCode?: boolean
  ): Promise<any[]> {
    // Build CTE for seller IDs
    const sellerIdsCTE = `
      WITH seller_list AS (
        SELECT unnest(ARRAY[${sellerIds.join(", ")}]) AS seller_id
      ),
      ${ineligibilityCTE}
    `;

    // Build WHERE clause components
    const whereClauses: string[] = [];

    // Manufacturer filter
    whereClauses.push(`manufacturer_id IN (${manufacturerIds.join(", ")})`);

    // Entity filtering based on transaction direction
    if (returnSaleTransactions) {
      whereClauses.push(`seller_id IN (${buyerIds.join(", ")})`);
      whereClauses.push(`seller_type = '${entityType}'`);
      whereClauses.push(`buyer_id IN (SELECT seller_id FROM seller_list)`);
      whereClauses.push(`buyer_type = '${sellerEntityType}'`);
    } else {
      whereClauses.push(`buyer_id IN (${buyerIds.join(", ")})`);
      whereClauses.push(`buyer_type = '${entityType}'`);
      whereClauses.push(`seller_id IN (SELECT seller_id FROM seller_list)`);
      whereClauses.push(`seller_type = '${sellerEntityType}'`);
    }

    // Warehouse filter
    if (warehouseIds && warehouseIds.length > 0) {
      whereClauses.push(`warehouse_id IN (${warehouseIds.join(", ")})`);
    }

    // Program terms date filter
    if (programTerms && Object.keys(programTerms).length > 0) {
      const dateConditions = Object.entries(programTerms)
        .map(([manufacturerId, term]) => {
          return `(manufacturer_id = ${manufacturerId} AND transaction_date::date BETWEEN '${term.startDate}' AND '${term.endDate}')`;
        })
        .join(" OR ");
      whereClauses.push(`(${dateConditions})`);
    }

    // Add ineligibility exclusion (already formatted as condition, no leading AND needed)
    whereClauses.push(ineligibilityExclusion.trim());

    const whereClause = whereClauses.join(" AND ");

    let query: string;

    if (includeProducts) {
      query = `
        ${sellerIdsCTE}
        SELECT 
          MIN(internal_product_id) AS product_id,
          MIN(manufacturer_id) AS manufacturer_id,
          buyer_id,
          SUM(quantity) AS quantity,
          SUM(total_price) AS total_price
          ${includeInternalCode ? ", MIN(internal_code) AS internal_code" : ""}
        FROM line_items_products_joined_materialized_view
        WHERE ${whereClause}
        GROUP BY seller_id, buyer_id, internal_product_id
        HAVING SUM(total_price) > 0
      `;
    } else {
      query = `
        ${sellerIdsCTE}
        SELECT 
          manufacturer_id,
          SUM(total_price) AS total_volume,
          COUNT(*) AS transaction_count,
          SUM(quantity) AS total_quantity
        FROM line_items_products_joined_materialized_view
        WHERE ${whereClause}
        GROUP BY manufacturer_id
        HAVING SUM(total_price) > 0
      `;
    }

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      raw: true
    });

    return results;
  }

  // Helper method to execute query with CTE
  private async executeQueryWithCTE(
    sellerIds: number[],
    whereConditions: any[],
    manufacturerIds: number[],
    buyerIds: number[],
    entityType: string,
    sellerEntityType: string,
    returnSaleTransactions: boolean,
    warehouseIds?: number[],
    programTerms?: Record<number, { startDate: string; endDate: string }>,
    includeProducts?: boolean,
    includeInternalCode?: boolean,
    dateOnlyComparison?: boolean
  ): Promise<any[]> {
    const dateOnlyComparisonFlag = dateOnlyComparison || false;
    // Build CTE for seller IDs
    const sellerIdsCTE = `
      WITH seller_list AS (
        SELECT unnest(ARRAY[${sellerIds.join(", ")}]) AS seller_id
      )
    `;

    // Build WHERE clause components
    const whereClauses: string[] = [];

    // Manufacturer filter
    whereClauses.push(`manufacturer_id IN (${manufacturerIds.join(", ")})`);

    // Entity filtering based on transaction direction
    if (returnSaleTransactions) {
      whereClauses.push(`seller_id IN (${buyerIds.join(", ")})`);
      whereClauses.push(`seller_type = '${entityType}'`);
      whereClauses.push(`buyer_id IN (SELECT seller_id FROM seller_list)`);
      whereClauses.push(`buyer_type = '${sellerEntityType}'`);
    } else {
      whereClauses.push(`buyer_id IN (${buyerIds.join(", ")})`);
      whereClauses.push(`buyer_type = '${entityType}'`);
      whereClauses.push(`seller_id IN (SELECT seller_id FROM seller_list)`);
      whereClauses.push(`seller_type = '${sellerEntityType}'`);
    }

    // Warehouse filter
    if (warehouseIds && warehouseIds.length > 0) {
      whereClauses.push(`warehouse_id IN (${warehouseIds.join(", ")})`);
    }

    // Program terms date filter
    if (programTerms && Object.keys(programTerms).length > 0) {
      const dateConditions = Object.entries(programTerms).map(
        ([manufacturerId, term]) => {
          if (dateOnlyComparisonFlag) {
            // Extract date portion (YYYY-MM-DD) from ISO strings for date-only comparison
            const startDateOnly = term.startDate.split("T")[0];
            const endDateOnly = term.endDate.split("T")[0];
            return `(manufacturer_id = ${manufacturerId} AND transaction_date::date BETWEEN '${startDateOnly}' AND '${endDateOnly}')`;
          } else {
            return `(manufacturer_id = ${manufacturerId} AND transaction_date BETWEEN '${term.startDate}' AND '${term.endDate}')`;
          }
        }
      );
      whereClauses.push(`(${dateConditions.join(" OR ")})`);
    }
    const whereClause = whereClauses.join(" AND ");

    let query: string;

    if (includeProducts) {
      query = `
        ${sellerIdsCTE}
        SELECT 
          MIN(internal_product_id) AS product_id,
          MIN(manufacturer_id) AS manufacturer_id,
          buyer_id,
          SUM(quantity) AS quantity,
          SUM(total_price) AS total_price
          ${includeInternalCode ? ", MIN(internal_code) AS internal_code" : ""}
        FROM line_items_products_joined_materialized_view
        WHERE ${whereClause}
        GROUP BY seller_id, buyer_id, internal_product_id
        HAVING SUM(total_price) > 0
      `;
    } else {
      query = `
        ${sellerIdsCTE}
        SELECT 
          manufacturer_id,
          SUM(total_price) AS total_volume,
          COUNT(*) AS transaction_count,
          SUM(quantity) AS total_quantity
        FROM line_items_products_joined_materialized_view
        WHERE ${whereClause}
        GROUP BY manufacturer_id
        HAVING SUM(total_price) > 0
      `;
    }

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      raw: true
    });

    return results;
  }

  public async getTotalSalesAndStoreRebateByDistributorId(
    distributorId: number,
    includeCurrentYearData?: boolean,
    warehouseIds?: number[]
  ) {
    try {
      let query = `SELECT distributor_id, manufacturer_id,
        SUM(total_purchase) AS total_price_sum, SUM(earned_rebate) AS total_rebate_sum
        ${warehouseIds ? ", warehouse_id" : ""}
        FROM public.combined_store_enrolled_summary
        WHERE distributor_id = :distributorId`;

      const transactionYear = includeCurrentYearData
        ? new Date().getFullYear().toString()
        : "";

      if (includeCurrentYearData && transactionYear) {
        query += " And transaction_year = :transactionYear";
      }

      query += " GROUP BY distributor_id, manufacturer_id";

      if (warehouseIds) {
        query += ", warehouse_id";
      }

      const replacements = {
        distributorId: distributorId,
        transactionYear: transactionYear
      };

      const results: any[] = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: replacements
      });

      if (warehouseIds) {
        const res = results.filter((result) =>
          warehouseIds.includes(result.warehouse_id ?? "")
        );

        return Object.values(
          res.reduce((acc, item) => {
            const key = `${item.distributor_id}_${item.manufacturer_id}`;
            if (!acc[key]) {
              acc[key] = {
                distributor_id: item.distributor_id,
                manufacturer_id: item.manufacturer_id,
                total_price_sum: 0,
                total_rebate_sum: 0
              };
            }

            acc[key].total_price_sum += parseFloat(item.total_price_sum);
            acc[key].total_rebate_sum += parseFloat(item.total_rebate_sum);

            return acc;
          }, {})
        );
      }

      return results;
    } catch {
      return [];
    }
  }

  public async getTotalSalesAndStoreRebateBySalesRepId(
    salesRepId: number,
    includeCurrentYearData?: boolean
  ) {
    try {
      let query = `SELECT distributor_id, manufacturer_id,
        SUM(total_purchase) AS total_price_sum, SUM(earned_rebate) AS total_rebate_sum
        FROM store_sales_reps AS ssr
        JOIN combined_store_enrolled_summary AS css ON css.store_id = ssr.store_id
        WHERE ssr.sales_rep_id = :salesRepId`;

      const transactionYear = includeCurrentYearData
        ? new Date().getFullYear().toString()
        : "";

      if (includeCurrentYearData && transactionYear) {
        query += " And transaction_year = :transactionYear";
      }

      query += " GROUP BY distributor_id, manufacturer_id";

      const replacements = {
        salesRepId: salesRepId,
        transactionYear: transactionYear
      };

      const results: any[] = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: replacements
      });
      return results;
    } catch {
      return [];
    }
  }

  /*
   * Get qualified compliances count by distributor id
   * @param distributorId - The distributor id
   * @param manufacturerId - The manufacturer id
   * @param includeCurrentYearData - Whether to include current year data
   * @param excludeChainStores - Whether to exclude chain stores
   * @param excludeUnenrolledStores - Whether to exclude unenrolled stores
   * @param storeIds - The store ids
   * @param isSalesRepManagerId - The sales rep manager id
   * @returns The qualified compliances count
   */
  public async getQualifiedCompliancesCountByDistributorId({
    distributorId,
    manufacturerId,
    includeCurrentYearData,
    excludeChainStores,
    excludeUnenrolledStores,
    storeIds,
    isSalesRepManagerId
  }: {
    distributorId: number;
    manufacturerId: number;
    includeCurrentYearData?: boolean;
    excludeChainStores?: boolean;
    excludeUnenrolledStores?: boolean;
    storeIds?: number[];
    isSalesRepManagerId?: number;
  }) {
    try {
      // Pre-fetch program_detail_id to program_id mapping to avoid subquery
      const programDetailMapping = await sequelize.query(
        `
        SELECT id, program_id
        FROM program_details
        WHERE id IN (
          SELECT DISTINCT program_detail_id
          FROM qualified_compliance_summary
          WHERE distributor_id = :distributorId AND manufacturer_id = :manufacturerId
        )
      `,
        {
          type: QueryTypes.SELECT,
          replacements: { distributorId, manufacturerId }
        }
      );

      const programDetailToProgramId = new Map(
        programDetailMapping.map((row: any) => [row.id, row.program_id])
      );

      let joinClause = "";
      let exclusionCondition = "";
      let salesRepManagerCondition = "";

      if (excludeChainStores) {
        joinClause += `
          LEFT JOIN chain_stores AS cs ON cs.store_id = qcs.store_id
        `;
        exclusionCondition += `
          AND cs.id IS NULL
        `;
      }

      if (excludeUnenrolledStores && programDetailToProgramId.size > 0) {
        // Use the pre-fetched mapping instead of subquery
        joinClause += `
          JOIN program_participants AS pp
            ON pp.entity_type = 'STORE'
            AND pp.entity_id = qcs.store_id
            AND pp.program_id IN (:programIds)
            AND pp.deleted_at IS NULL
        `;
      }

      if (isSalesRepManagerId) {
        joinClause += `
          JOIN store_sales_reps AS ssr ON qcs.store_id = ssr.store_id
          JOIN manager_sales_rep_mapping AS msrm ON ssr.sales_rep_id = msrm.sales_rep_id
        `;
        salesRepManagerCondition = `
          AND msrm.sales_manager_id = :salesManagerId
          AND msrm.deleted_at IS NULL
          AND ssr.deleted_at IS NULL
        `;
      }

      const complianceYear = includeCurrentYearData
        ? new Date().getFullYear().toString()
        : "";

      const query = `
        SELECT
          qcs.distributor_id,
          qcs.manufacturer_id,
          qcs.program_detail_id,
          COUNT(DISTINCT CASE WHEN qcs.qualified_compliance_count > 0 THEN qcs.store_id END) AS qualified_compliance_count
        FROM qualified_compliance_summary AS qcs
        JOIN program_details AS prg_d ON prg_d.id = qcs.program_detail_id
      ${joinClause}
        Left Join program_store_ineligibility AS psi ON psi.store_id = qcs.store_id AND prg_d.program_id = psi.program_id AND psi.deleted_at IS NULL
        WHERE qcs.distributor_id = :distributorId
          AND qcs.manufacturer_id = :manufacturerId
          AND psi.id is null
          ${exclusionCondition}
          ${salesRepManagerCondition}
          ${storeIds && storeIds.length > 0 ? " AND qcs.store_id IN (:storeIds)" : ""}
          ${includeCurrentYearData && complianceYear ? " AND qcs.compliance_year = :complianceYear" : ""}
        GROUP BY qcs.distributor_id, qcs.manufacturer_id, qcs.program_detail_id
        ORDER BY qcs.program_detail_id
      `;

      const replacements: any = {
        distributorId,
        manufacturerId,
        complianceYear,
        storeIds: storeIds,
        ...(isSalesRepManagerId ? { salesManagerId: isSalesRepManagerId } : {})
      };

      if (excludeUnenrolledStores && programDetailToProgramId.size > 0) {
        replacements.programIds = Array.from(programDetailToProgramId.values());
      }

      const results: any[] = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements
      });

      return results;
    } catch (error) {
      console.error(
        `[ERROR] StoreRepository.getQualifiedCompliancesCountByDistributorId:`,
        error
      );
      return [];
    }
  }

  public async getQualifiedCompliancesCountBySalesRepId({
    salesRepId,
    manufacturerId,
    includeCurrentYearData,
    excludeChainStores,
    excludeUnenrolledStores,
    storeIds,
    distributorId
  }: {
    salesRepId: number;
    manufacturerId: number;
    includeCurrentYearData?: boolean;
    excludeChainStores?: boolean;
    excludeUnenrolledStores?: boolean;
    storeIds?: number[];
    distributorId?: number;
  }) {
    try {
      // Pre-fetch program_detail_id to program_id mapping to avoid subquery
      // Optimized: Filter by both distributor_id and manufacturer_id to reduce scan
      const programDetailMapping = await sequelize.query(
        `
        SELECT id, program_id
        FROM program_details
        WHERE id IN (
          SELECT DISTINCT program_detail_id
          FROM qualified_compliance_summary
          WHERE distributor_id = :distributorId AND manufacturer_id = :manufacturerId
        )
      `,
        {
          type: QueryTypes.SELECT,
          replacements: { distributorId, manufacturerId }
        }
      );

      const programDetailToProgramId = new Map(
        programDetailMapping.map((row: any) => [row.id, row.program_id])
      );

      let joinClause = "";
      let exclusionCondition = "";

      // Join to store_sales_reps to filter by sales_rep_id
      joinClause += `
        JOIN store_sales_reps AS ssr ON qcs.store_id = ssr.store_id
      `;

      if (excludeChainStores) {
        joinClause += `
          LEFT JOIN chain_stores AS cs ON cs.store_id = qcs.store_id
        `;
        exclusionCondition += `
          AND cs.id IS NULL
        `;
      }

      if (excludeUnenrolledStores && programDetailToProgramId.size > 0) {
        // Use the pre-fetched mapping instead of subquery
        joinClause += `
          JOIN program_participants AS pp
            ON pp.entity_type = 'STORE'
            AND pp.entity_id = qcs.store_id
            AND pp.program_id IN (:programIds)
            AND pp.deleted_at IS NULL
        `;
      }

      const complianceYear = includeCurrentYearData
        ? new Date().getFullYear().toString()
        : "";

      // Restructured query: Start FROM qualified_compliance_summary and filter first
      // This allows the query planner to use indexes on qualified_compliance_summary effectively
      const query = `
        SELECT
          qcs.distributor_id,
          qcs.manufacturer_id,
          qcs.program_detail_id,
          COUNT(DISTINCT CASE WHEN qcs.qualified_compliance_count > 0 THEN qcs.store_id END) AS qualified_compliance_count
        FROM qualified_compliance_summary AS qcs
        JOIN program_details AS prg_d ON prg_d.id = qcs.program_detail_id
      ${joinClause}
        Left Join program_store_ineligibility AS psi ON psi.store_id = qcs.store_id AND prg_d.program_id = psi.program_id AND psi.deleted_at IS NULL
        WHERE qcs.distributor_id = :distributorId
          AND qcs.manufacturer_id = :manufacturerId
          AND ssr.sales_rep_id = :salesRepId
          AND ssr.deleted_at IS NULL
          AND psi.id is null
          ${exclusionCondition}
          ${storeIds && storeIds.length > 0 ? " AND qcs.store_id IN (:storeIds)" : ""}
          ${includeCurrentYearData && complianceYear ? " AND qcs.compliance_year = :complianceYear" : ""}
        GROUP BY qcs.distributor_id, qcs.manufacturer_id, qcs.program_detail_id
        ORDER BY qcs.program_detail_id
      `;

      const replacements: any = {
        salesRepId,
        manufacturerId,
        distributorId,
        complianceYear,
        storeIds: storeIds
      };

      if (excludeUnenrolledStores && programDetailToProgramId.size > 0) {
        replacements.programIds = Array.from(programDetailToProgramId.values());
      }

      const results: any[] = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements
      });

      return results;
    } catch (error) {
      console.error(
        `[ERROR] StoreRepository.getQualifiedCompliancesCountBySalesRepId:`,
        error
      );
      return [];
    }
  }

  public async isParticipatedInManufacturerProgram(
    storeId: number,
    manufacturerId: number
  ): Promise<boolean> {
    try {
      const record = await ProgramParticipant.findOne({
        attributes: ["id"],
        where: {
          entity_type: ENTITY_TYPE.STORE,
          entity_id: storeId
        },
        include: [
          {
            model: Program,
            attributes: [],
            where: {
              manufacturer_id: manufacturerId
            }
          }
        ]
      });

      // Return true if a record is found, otherwise false
      return !!record;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  /**
   * Retrieves the distributor ID associated with a given store ID.
   *
   * This method queries the UserRole model to fetch the parent entity ID,
   * which represents the distributor ID associated with the provided store ID.
   * If no record is found, it returns 0.
   *
   * @param {number} storeId The ID of the store for which to retrieve the distributor ID.
   * @returns {Promise<number>} A promise that resolves to the distributor ID.
   * @throws {ApiError} Throws an internal server error if an unknown error occurs.
   */
  public async getDistributorId(storeId: number): Promise<number> {
    try {
      const record: any = await UserRole.findOne({
        attributes: ["parent_entity_id"],
        where: {
          role: ENTITY_TYPE.STORE,
          associated_user_id: storeId
        },
        raw: true
      });

      return record?.parent_entity_id ?? 0;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  /**
   * Retrieves the warehouse ID for a specific store.
   *
   * @param {number} storeId - The ID of the store.
   * @returns {Promise<number | null>} - The warehouse ID or null if not found.
   * @throws {ApiError} Throws an internal server error if an unknown error occurs.
   */
  public async getWarehouseId(storeId: number): Promise<number | null> {
    try {
      const store = await Store.findOne({
        attributes: ["warehouseId"],
        where: {
          id: storeId
        },
        raw: true
      });

      return store?.warehouseId ?? null;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async getStoresByChainId(chainId: number, storeIds?: number[]) {
    try {
      const chainStoreFilter = storeIds?.length
        ? {
            store_id: { [Op.in]: storeIds }
          }
        : {};

      return await ChainStore.findAll({
        attributes: [
          ["store_id", "id"],
          [sequelize.col("StoreUserRole.name"), "name"],
          [sequelize.col("ChainStoreChainIdUserRole->user.address"), "address"],
          [sequelize.col("ChainStoreChainIdUserRole->user.city"), "city"],
          [sequelize.col("ChainStoreChainIdUserRole->user.state"), "state"],
          [sequelize.col("ChainStoreChainIdUserRole->user.zip"), "zip"],
          [
            sequelize.col("ChainStoreChainIdUserRole.parent_entity_id"),
            "parentEntityId"
          ]
        ],
        include: [
          {
            model: UserRole,
            as: "ChainStoreChainIdUserRole",
            required: true,
            attributes: [],
            on: {
              associated_user_id: { [Op.col]: "ChainStore.store_id" },
              associated_entity_type: ENTITY_TYPE.STORE,
              role: USER_ROLES.STORE
            },
            include: [
              {
                model: User,
                required: true,
                as: "user",
                attributes: []
              }
            ]
          },
          {
            model: Store,
            as: "StoreUserRole",
            attributes: []
          }
        ],
        where: {
          chain_id: chainId,
          ...chainStoreFilter
        },
        raw: true
      });
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async getStoresByDistributorId(distributorId: number) {
    try {
      return await UserRole.findAll({
        attributes: [
          ["associated_user_id", "id"],
          [sequelize.col("StoreUserRole.name"), "name"],
          [sequelize.col("user.address"), "address"],
          [sequelize.col("user.city"), "city"],
          [sequelize.col("user.state"), "state"],
          [sequelize.col("user.zip"), "zip"],
          [sequelize.col("parent_entity_id"), "parentEntityId"]
        ],
        include: [
          {
            model: User,
            as: "user",
            attributes: [],
            required: true
          },
          {
            model: Store,
            as: "StoreUserRole",
            attributes: [],
            required: true,
            include: [
              {
                model: Chain,
                as: "ChainsForStore",
                attributes: [],
                through: { attributes: [] },
                required: false // We are using a left join
              }
            ]
          }
        ],
        where: {
          parent_entity_id: distributorId,
          parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
          associated_entity_type: ENTITY_TYPE.STORE
        },
        having: sequelize.literal(
          '"StoreUserRole->ChainsForStore"."id" IS NULL'
        ), // Ensure no associated chains
        group: [
          "UserRole.associated_user_id",
          "StoreUserRole.name",
          "user.address",
          "user.city",
          "user.state",
          "user.zip",
          "UserRole.parent_entity_id",
          "StoreUserRole->ChainsForStore.id"
        ],
        raw: true
      });
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async getAllStoresByDistributorId(distributorId: number) {
    try {
      return await UserRole.findAll({
        attributes: [
          ["associated_user_id", "id"],
          [sequelize.col("StoreUserRole.name"), "name"],
          [sequelize.col("user.address"), "address"],
          [sequelize.col("user.city"), "city"],
          [sequelize.col("user.state"), "state"],
          [sequelize.col("user.zip"), "zip"],
          [sequelize.col("parent_entity_id"), "parentEntityId"]
        ],
        include: [
          {
            model: User,
            as: "user",
            attributes: [],
            required: true
          },
          {
            model: Store,
            as: "StoreUserRole",
            attributes: [],
            required: true
          }
        ],
        where: {
          parent_entity_id: distributorId,
          parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
          associated_entity_type: ENTITY_TYPE.STORE
        },
        group: [
          "UserRole.associated_user_id",
          "StoreUserRole.name",
          "user.address",
          "user.city",
          "user.state",
          "user.zip",
          "UserRole.parent_entity_id"
        ],
        raw: true
      });
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async getStoresEarningOpportunity(
    storeIds: number[],
    distributorId?: number,
    manufacturerId?: number,
    distributorIds?: number[],
    authorizedDistManufacturerIds?: number[],
    includeCurrentYearData: boolean = true
  ) {
    return newrelic.startSegment(
      "StoreRepository.getStoresEarningOpportunity",
      true,
      async () => {
        try {
          // Build WHERE clause with proper database filtering for optimal performance
          const whereConditions: string[] = [];
          const replacements: any = {};

          // Always filter by storeIds if provided - this is the primary filter
          if (storeIds?.length) {
            whereConditions.push(`store_id in (:storeIds)`);
            replacements.storeIds = storeIds;
          }

          // Filter by manufacturer if provided
          if (manufacturerId) {
            whereConditions.push(`manufacturer_id = :manufacturerId`);
            replacements.manufacturerId = manufacturerId;
          }

          // Filter by single distributor if provided
          if (distributorId) {
            whereConditions.push(`distributor_id = :distributorId`);
            replacements.distributorId = distributorId;
          }

          // Filter by multiple distributors if provided (and single distributor is not set)
          if (distributorIds?.length && !distributorId) {
            whereConditions.push(`distributor_id in (:distributorIds)`);
            replacements.distributorIds = distributorIds;
          }

          // Filter by authorized manufacturer IDs if provided
          if (authorizedDistManufacturerIds?.length) {
            whereConditions.push(
              `manufacturer_id in (:authorizedDistManufacturerIds)`
            );
            replacements.authorizedDistManufacturerIds =
              authorizedDistManufacturerIds;
          }

          // Filter by current year if requested
          if (includeCurrentYearData) {
            const transactionYear = new Date().getFullYear().toString();
            whereConditions.push(`transaction_year = :transactionYear`);
            replacements.transactionYear = transactionYear;
          }

          // Build the final query with WHERE clause
          const whereClause =
            whereConditions.length > 0
              ? `WHERE ${whereConditions.join(" AND ")}`
              : "";

          const query = `
            SELECT * FROM store_earning_opportunity_summary
            ${whereClause}
            ORDER BY store_id, distributor_id, manufacturer_id
          `;

          const results: any[] = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: replacements
          });

          return results;
        } catch (error) {
          console.error(
            "StoreRepository.getStoresEarningOpportunity failed:",
            error
          );
          return [];
        }
      }
    );
  }

  /**
   * Retrieves stores based on complex filtering criteria or returns all stores for given distributors
   * @param manufacturerId - ID of the manufacturer to filter by
   * @param distributorIds - Array of distributor IDs to filter stores by
   * @param criteria - Object containing filtering rules for chains, products, and categories
   * @returns Promise resolving to array of store objects with their details and metrics
   *
   * The function supports filtering by:
   * - Customer chains
   * - Specific products with purchase thresholds
   * - Product categories with purchase thresholds
   *
   * If no rules are provided, returns all stores for the given distributors
   */
  public async getStoresByComplexCriteriaOrAllStores(
    manufacturerId: number,
    distributorIds: number[],
    criteria: any,
    salesRepIds?: number[]
  ): Promise<any[]> {
    // Handle empty or undefined criteria - treat as "all stores"
    const rules = criteria?.rules || [];
    const chainRule = rules.find((r: any) => r.type === "customer_chain");
    const productRule = rules.find((r: any) => r.type === "specific_product");
    const categoryRule = rules.find((r: any) => r.type === "category");

    // Parse chain IDs from comma-separated string (if present)
    const chainIds =
      chainRule?.chains
        ?.split(",")
        .map((id: string) => parseInt(id.trim()))
        .filter(Boolean) || [];

    // Parse product IDs from comma-separated string (if present)
    const productIds =
      productRule?.products
        ?.split(",")
        .map((id: string) => parseInt(id.trim()))
        .filter(Boolean) || [];
    const productOperator = productRule?.operator || "<=";
    const productValue1 = productRule?.value1 ?? 0;
    const productStartDate =
      productRule?.startDate || `${new Date().getFullYear()}-01-01`;
    const productEndDate =
      productRule?.endDate || `${new Date().getFullYear() + 1}-01-01`;

    // Parse category rule (if present)
    const categoryTag = categoryRule?.category || null;
    const categoryOperator = categoryRule?.operator || ">=";
    const categoryValue = categoryRule?.value ?? 0;
    const categoryValue2 = categoryRule?.value2 ?? 0;
    const categoryStartDate =
      categoryRule?.startDate || `${new Date().getFullYear()}-01-01`;
    const categoryEndDate =
      categoryRule?.endDate || `${new Date().getFullYear() + 1}-01-01`;

    // Always filter by distributorIds
    const query = `
      WITH distributor_stores AS (
        SELECT ur.associated_user_id AS store_id, ur.parent_entity_id AS distributor_id
        FROM user_roles ur
        WHERE ur.role = 'STORE'
          AND ur.parent_entity_id IN (${distributorIds.join(",")})
      ),

      ${
        salesRepIds?.length
          ? `
      sales_rep_stores AS (
        SELECT DISTINCT store_id
        FROM store_sales_reps
        WHERE sales_rep_id IN (${salesRepIds.join(",")})
      ),
      `
          : ""
      }

      chain_filtered_stores AS (
        ${
          chainIds.length > 0
            ? `
        SELECT DISTINCT cs.store_id
        FROM chain_stores cs
        WHERE cs.chain_id IN (${chainIds.join(",")})
        `
            : `SELECT 0 AS store_id WHERE false`
        }
      ),

      product_filtered_stores AS (
        ${
          productIds.length > 0
            ? `
        SELECT s.id AS store_id
        FROM stores s
        JOIN distributor_stores ds ON s.id = ds.store_id
        `
            : `SELECT 0 AS store_id WHERE false`
        }
      ),

      category_filtered_products AS (
        ${
          categoryTag
            ? `
        SELECT id
        FROM products
        WHERE (category_tags_json @> '"${categoryTag}"') and manufacturer_id = ${manufacturerId}
        `
            : `SELECT 0 AS id WHERE false`
        }
      ),

      purchased_filtered_line_items AS (
        ${
          productIds.length > 0 || categoryTag
            ? `
        SELECT li.splink_product_id, li.buyer_id, MIN(li.transaction_date) as transaction_date, SUM(li.total_price) as total_price
        FROM line_items li
        JOIN products p ON li.splink_product_id = p.id
        WHERE ${
          productIds.length > 0
            ? `li.splink_product_id IN (${productIds.join(",")}) AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}'`
            : `p.id IN (SELECT id FROM category_filtered_products) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}'`
        }
        AND li.buyer_type = 'STORE'
        AND p.manufacturer_id = ${manufacturerId}
        GROUP BY li.splink_product_id, li.buyer_id
        HAVING SUM(li.total_price) > 0
        `
            : `SELECT NULL::bigint as splink_product_id, NULL::integer as buyer_id, NULL::date as transaction_date, NULL::numeric as total_price WHERE false`
        }
      ),

      category_filtered_stores AS (
        ${
          categoryTag
            ? `
        SELECT li.buyer_id AS store_id, COUNT(DISTINCT p.id) as cat_count
        FROM line_items li
        JOIN products p ON li.splink_product_id = p.id
        WHERE p.id IN (SELECT id FROM category_filtered_products)
          AND li.buyer_type = 'STORE'
          AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}'
        GROUP BY li.buyer_id
        HAVING COUNT(DISTINCT p.id) ${categoryOperator === "between" ? `>= ${categoryValue} AND COUNT(DISTINCT p.id) <= ${categoryValue2}` : `${categoryOperator} ${categoryValue}`}
        UNION
        SELECT s.id AS store_id, 0 as cat_count
        FROM stores s
        JOIN distributor_stores ds ON s.id = ds.store_id
        WHERE NOT EXISTS (
          SELECT 1 FROM line_items li
          JOIN products p ON li.splink_product_id = p.id
          WHERE p.id IN (SELECT id FROM category_filtered_products)
            AND li.buyer_id = s.id
            AND li.buyer_type = 'STORE'
            AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}'
        )
        AND ${categoryOperator === "<=" || (categoryOperator === "between" && categoryValue === 0) ? "TRUE" : "FALSE"}
        AND EXISTS (
          SELECT 1 FROM line_items li2
          WHERE li2.buyer_id = s.id
            AND li2.buyer_type = 'STORE'
            AND li2.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}'
        )
        `
            : `SELECT 0 AS store_id, 0 as cat_count WHERE false`
        }
      )

      SELECT
        s.id AS id,
        s.name AS name,
        ch.name AS chain,
        ${
          productIds.length > 0
            ? `COALESCE(SUM(CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN li.total_price ELSE 0 END), 0) AS volume,`
            : categoryTag
              ? `COALESCE(SUM(CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN li.total_price ELSE 0 END), 0) AS volume,`
              : `COALESCE(SUM(CASE WHEN p.manufacturer_id = ${manufacturerId} THEN li.total_price ELSE 0 END), 0) AS volume,`
        }
        ${
          productIds.length > 0
            ? `COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) AS skus,`
            : categoryTag
              ? `COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) AS skus,`
              : `COUNT(DISTINCT CASE WHEN p.manufacturer_id = ${manufacturerId} THEN p.id END) AS skus,`
        }
        d.organization_name AS distributor,
        STRING_AGG(DISTINCT sales_rep_distributor.name, ', ') AS sales_rep,
        STRING_AGG(DISTINCT CAST(sales_rep_distributor.id AS TEXT), ', ') AS sales_rep_id
      FROM stores s
      JOIN user_roles ur ON ur.associated_user_id = s.id AND ur.role = 'STORE'
      JOIN distributor_stores ds ON s.id = ds.store_id
      ${salesRepIds?.length ? `AND s.id IN (SELECT store_id FROM store_sales_reps WHERE sales_rep_id IN (${salesRepIds.join(",")}))` : ""}
      ${chainRule ? `AND s.id IN (SELECT store_id FROM chain_stores WHERE chain_id IN (${chainIds.join(",")}))` : ""}
      LEFT JOIN distributors d ON d.id = ur.parent_entity_id
      LEFT JOIN store_sales_reps ssr ON ssr.store_id = s.id
      LEFT JOIN distributors sales_rep_distributor ON sales_rep_distributor.id = ssr.sales_rep_id
      LEFT JOIN chain_stores cs ON cs.store_id = s.id
      LEFT JOIN chains ch ON ch.id = cs.chain_id
      LEFT JOIN purchased_filtered_line_items li ON li.buyer_id = s.id
      LEFT JOIN products p ON li.splink_product_id = p.id AND p.manufacturer_id = ${manufacturerId}
      GROUP BY s.id, s.name, ch.name, d.organization_name
      ${
        categoryRule || productRule
          ? `HAVING ${
              categoryRule
                ? categoryOperator === "<="
                  ? `COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) <= ${categoryValue}`
                  : categoryOperator === "between" && categoryValue === 0
                    ? `COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) >= 0 AND COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) <= ${categoryValue2}`
                    : categoryOperator === "between"
                      ? `COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) >= ${categoryValue} AND COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) <= ${categoryValue2}`
                      : categoryOperator === ">"
                        ? `COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) > ${categoryValue}`
                        : categoryOperator === ">="
                          ? `COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) >= ${categoryValue}`
                          : categoryOperator === "<"
                            ? `COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) < ${categoryValue}`
                            : categoryOperator === "="
                              ? `COUNT(DISTINCT CASE WHEN p.id IN (SELECT id FROM products WHERE (category_tags_json @> '"${categoryTag}"') AND manufacturer_id = ${manufacturerId}) AND li.transaction_date BETWEEN '${categoryStartDate}' AND '${categoryEndDate}' THEN p.id END) = ${categoryValue}`
                              : "1=1"
                : ""
            }${categoryRule && productRule ? ` AND ` : ""}${
              productRule
                ? productOperator === "<="
                  ? `COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) <= ${productValue1}`
                  : productOperator === "between" && productRule.value1 === 0
                    ? `COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) >= 0 AND COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) <= ${productRule.value2}`
                    : productOperator === "between"
                      ? `COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) >= ${productRule.value1} AND COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) <= ${productRule.value2}`
                      : productOperator === ">"
                        ? `COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) > ${productValue1}`
                        : productOperator === ">="
                          ? `COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) >= ${productValue1}`
                          : productOperator === "<"
                            ? `COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) < ${productValue1}`
                            : productOperator === "="
                              ? `COUNT(DISTINCT CASE WHEN p.id IN (${productIds.join(",")}) AND p.manufacturer_id = ${manufacturerId} AND li.transaction_date BETWEEN '${productStartDate}' AND '${productEndDate}' THEN p.id END) = ${productValue1}`
                              : "1=1"
                : ""
            }`
          : ""
      }
      ORDER BY skus DESC, volume DESC
    `;

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      raw: true
    });
    return results;
  }

  /**
   * Retrieves an array of store IDs associated with the given warehouse IDs.
   *
   * The method queries the LineItem model to fetch all store IDs associated
   * with the provided warehouse IDs. The results include only the store IDs.
   *
   * @param {number[]} warehouseIds The IDs of the warehouses to filter the results.
   * @returns {Promise<number[]>} A promise that resolves to an array of store IDs.
   */
  public async getStoreIdsByWarehouseIds(
    warehouseIds: number[]
  ): Promise<number[]> {
    if (!warehouseIds?.length) {
      return [];
    }

    const stores = await Store.findAll({
      attributes: [["id", "store_id"]],
      where: {
        warehouse_id: {
          [Op.in]: warehouseIds
        }
      },
      raw: true
    });

    return stores?.map((store: any) => store.store_id) ?? [];
  }

  /**
   * Retrieves an array of store IDs associated with the given warehouse IDs and manufacturer IDs.
   *
   * The method queries the LineItem model to fetch all store IDs associated
   * with the provided warehouse IDs and manufacturer IDs. The results include
   * only the manufacturer IDs with their associated store IDs.
   *
   * @param {number[]} warehouseIds The IDs of the warehouses to filter the results.
   * @param {number[]} manufacturerIds The IDs of the manufacturers to filter the results.
   * @returns {Promise<{ manufacturer_id: number; store_ids: number[] }[]>} A promise that resolves to an array of objects containing the manufacturer ID and associated store IDs.
   */
  public async getStoreIdsWithMaufacturerIdByWarehouseIds(
    warehouseIds: number[],
    manufacturerIds: number[],
    storeIdsToExclude?: number[]
  ): Promise<{ manufacturer_id: number; store_ids: number[] }[]> {
    const manufacturerFilter =
      manufacturerIds.length > 0
        ? { manufacturer_id: { [Op.in]: manufacturerIds } }
        : undefined;

    const results: any[] = await LineItem.findAll({
      attributes: [
        [col("product.manufacturer_id"), "manufacturer_id"],
        [
          fn("ARRAY_AGG", fn("DISTINCT", sequelize.col("buyer_id"))),
          "store_ids"
        ]
      ],
      // [fn("DISTINCT", col("buyer_id")), "store_id"]],
      where: {
        warehouse_id: { [Op.in]: warehouseIds },
        buyer_type: ENTITY_TYPE.STORE,
        splink_product_id: { [Op.ne]: null },
        ...(storeIdsToExclude
          ? { buyer_id: { [Op.in]: storeIdsToExclude } }
          : {})
      },
      include: [
        {
          model: Product,
          as: "product",
          attributes: [],
          required: true,
          ...(manufacturerFilter ? { where: manufacturerFilter } : {}),
          on: {
            [Op.and]: [
              Sequelize.where(
                Sequelize.col("LineItem.splink_product_id"),
                Sequelize.col("product.id")
              )
            ]
          }
        }
      ],
      group: ["product.manufacturer_id"],
      raw: true
    });

    return results as { manufacturer_id: number; store_ids: number[] }[];
  }

  /**
   * Retrieves stores near compliance data from the spiff_store_program_compliance table
   *
   * This method provides high-performance access to pre-calculated compliance data by querying
   * the spiff_store_program_compliance table, which contains pre-aggregated compliance
   * metrics for all store-program combinations.
   *
   * Table Structure:
   * - spiff_store_program_compliance: Pre-calculated compliance data with aggregated metrics
   * - Contains compliance percentages, purchased products, required counts, and other metrics
   * - Updated periodically to maintain data freshness while providing fast query performance
   *
   * Key Features:
   * - Supports multiple filtering options (store, manufacturer, distributor, percentage range)
   * - Handles excluded programs for distributor-specific access control
   * - Returns comprehensive program and compliance information in a single query
   * - Optimized for sales rep compliance dashboard use cases
   *
   * @param storeIds - Array of store IDs to filter results
   * @param manufacturerId - Optional manufacturer ID filter
   * @param searchQuery - Optional search term for store name filtering
   * @param distributorId - Optional distributor ID for seller filtering
   * @param excludedProgramIds - Array of program detail IDs to exclude from results
   * @param minPercentage - Minimum compliance percentage threshold (e.g., 70 for 70%)
   * @param maxPercentage - Maximum compliance percentage threshold (e.g., 100 for 100%)
   * @returns Promise<any[]> - Array of compliance data objects with store, manufacturer, and program details
   *
   * @example
   * const complianceData = await getStoresNearComplianceFromMV(
   *   [26823, 26824],  // storeIds
   *   46,              // manufacturerId (optional)
   *   [123, 456],      // excludedProgramIds (optional)
   *   70,              // minPercentage (optional)
   *   100              // maxPercentage (optional)
   * );
   */
  public async getStoresNearComplianceFromMV(
    storeIds: number[],
    manufacturerId?: number,
    searchQuery?: string,
    distributorId?: number,
    excludedProgramIds?: number[],
    minPercentage?: number,
    maxPercentage?: number,
    programTimeline: string = "Current"
  ): Promise<any[]> {
    if (!storeIds || storeIds.length === 0) {
      return [];
    }

    const whereConditions: string[] = [];
    const replacements: Record<string, any> = { storeIds };

    // Base condition
    whereConditions.push(`spc.buyer_id IN (:storeIds)`);

    if (manufacturerId) {
      whereConditions.push(`spc.manufacturer_id = :manufacturerId`);
      replacements.manufacturerId = manufacturerId;
    }

    if (searchQuery) {
      whereConditions.push(`s.name ILIKE :searchQuery`);
      replacements.searchQuery = `%${searchQuery}%`;
    }

    if (distributorId) {
      whereConditions.push(`spc.seller_id = :distributorId`);
      replacements.distributorId = distributorId;
    }

    if (excludedProgramIds && excludedProgramIds.length > 0) {
      whereConditions.push(
        `spc.program_detail_id NOT IN (:excludedProgramIds)`
      );
      replacements.excludedProgramIds = excludedProgramIds;
    }

    if (minPercentage !== undefined) {
      whereConditions.push(`spc.compliance_percentage >= :minPercentage`);
      replacements.minPercentage = minPercentage;
    }

    if (maxPercentage !== undefined) {
      whereConditions.push(`spc.compliance_percentage < :maxPercentage`);
      replacements.maxPercentage = maxPercentage;
    }

    const query = `
      SELECT DISTINCT
        spc.buyer_id AS store_id,
        s.name AS store_name,
        spc.manufacturer_id,
        m.name AS manufacturer_name,
        m.logo AS manufacturer_logo,
        m.authorized AS manufacturer_authorized,
        spc.program_id,
        spc.program_detail_id,
        p.name AS program_name,
        p.program_header,
        p.program_type,
        pd.tier,
        spc.earning_opportunity,
        pd.products_tags,
        pd.products_tags_qty,
        pd.rebate_amount,
        pd.rebate_percentage,
        pd.rebate_type,
        pd.rebate_calculation,
        pd.required_core_skus,
        pd.points,
        spc.purchased_distinct_product_ids,
        spc.required_count_by_tag,
        spc.total_product_tags,
        spc.total_purchased_distinct_product_ids,
        spc.compliance_percentage,
        spc.products_tags,
        spc.latest_transaction_date,
        spc.last_refreshed_at
      FROM spiff_store_program_compliance spc
      JOIN stores s ON s.id = spc.buyer_id
      JOIN manufacturers m ON m.id = spc.manufacturer_id
      JOIN programs p ON p.id = spc.program_id
      JOIN program_details pd ON pd.id = spc.program_detail_id
      JOIN program_approvals pa ON pa.program_id = spc.program_id 
        AND pa.approver_id = spc.seller_id 
        AND pa.status = 'APPROVED' 
        AND pa.deleted_at IS NULL
      WHERE ${whereConditions.join(" AND ")}
        AND s.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND pd.deleted_at IS NULL
        ${buildProgramTimelineSqlCondition(programTimeline, "p")}
      ORDER BY spc.buyer_id, spc.manufacturer_id, spc.program_detail_id
    `;

    try {
      const results = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      console.error("Error in getStoresNearComplianceFromMV:", error);
      throw new Error(
        `Failed to fetch stores near compliance data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get products by IDs for hydration in MV path
   */
  public async getProductsByIds(productIds: number[]): Promise<any[]> {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    const query = `
      SELECT
        id,
        name,
        size,
        case_skus_id,
        unit_skus_id,
        box_skus_id,
        primary_variant,
        category_flags,
        category_tags_json
      FROM products
      WHERE id = ANY($1::int[])
      AND deleted_at IS NULL
    `;

    try {
      const results = await sequelize.query(query, {
        replacements: [productIds],
        type: QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      console.error("Error in getProductsByIds:", error);
      throw new Error(
        `Failed to fetch products by IDs: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private attachHighestComplianceByManufacturerToResults(
    rows: any[],
    storesHighestComplianceByManufacturer: any[]
  ) {
    return rows.map((row: any) => {
      const complianceData = storesHighestComplianceByManufacturer.find(
        (st: any) => st.storeId === row.storeid
      );
      const { storeId, ...nearComplianceData } = complianceData || {};

      return {
        ...row,
        nearComplianceData: nearComplianceData || {
          manufacturerId: 0,
          programId: 0,
          requiredCount: 0,
          purchasedCount: 0,
          highestCompliancePercentage: 0
        }
      };
    });
  }

  // /**
  //  * Retrieves store details from store_listing_aggregates table for v2 API
  //  * @param storeId - The store ID
  //  * @param manufacturerIds - Array of manufacturer IDs
  //  * @param distributorId - The distributor ID
  //  * @param programTimeline - Program timeline filter (Current or Historical)
  //  * @returns Promise with aggregated store details data
  //  */
  // public async getStoreDetailsFromAggregates(
  //   storeId: number,
  //   manufacturerIds: number[],
  //   distributorId: number,
  //   programTimeline?: string
  // ): Promise<any> {
  //   return newrelic.startSegment(
  //     "StoreRepository.getStoreDetailsFromAggregates",
  //     true,
  //     async () => {
  //       try {
  //         // Map programTimeline to program_type filter
  //         const programTypeFilter =
  //           programTimeline?.toUpperCase() === "HISTORICAL"
  //             ? "HISTORICAL"
  //             : programTimeline?.toUpperCase() === "CURRENT"
  //               ? "CURRENT"
  //               : null;

  //         const programTypeCondition = programTypeFilter
  //           ? `AND sla.program_type = :programType`
  //           : "";
  //         const programTypeConditionNoAlias = programTypeFilter
  //           ? `AND program_type = :programType`
  //           : "";

  //         // Simplified query starting from store_listing_aggregates with direct JOINs
  //         const query = `
  //           WITH manufacturer_max_purchase_volume AS (
  //             -- Get max purchase volume per manufacturer-store combination
  //             SELECT
  //               store_id,
  //               manufacturer_id,
  //               MAX(purchase_volume) as max_purchase_volume
  //             FROM store_listing_aggregates
  //             WHERE store_id = :storeId
  //               AND manufacturer_id = ANY(ARRAY[:manufacturerIds])
  //               ${programTypeConditionNoAlias}
  //             GROUP BY store_id, manufacturer_id
  //           ),
  //           store_totals AS (
  //             -- Calculate store-level totals: sum of max purchase volumes per manufacturer, total savings, total opp savings
  //             SELECT
  //               sla.store_id,
  //               (SELECT SUM(max_purchase_volume)
  //                FROM manufacturer_max_purchase_volume mmpv
  //                WHERE mmpv.store_id = sla.store_id) as total_purchase_volume,
  //               SUM(CASE WHEN sla.program_enrolled = true THEN sla.earnings ELSE 0 END) as total_savings,
  //               SUM(CASE WHEN sla.program_enrolled = true THEN sla.earning_opp ELSE 0 END) as total_opp_savings
  //             FROM store_listing_aggregates sla
  //             WHERE sla.store_id = :storeId
  //               AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
  //               ${programTypeCondition}
  //             GROUP BY sla.store_id
  //           ),
  //           enrolled_program_ids_array AS (
  //             -- Get array of enrolled program IDs
  //             SELECT
  //               COALESCE(ARRAY_AGG(DISTINCT program_id ORDER BY program_id), ARRAY[]::INTEGER[]) as program_ids
  //             FROM store_listing_aggregates
  //             WHERE store_id = :storeId
  //               AND manufacturer_id = ANY(ARRAY[:manufacturerIds])
  //               AND program_enrolled = true
  //               AND program_id IS NOT NULL
  //               ${programTypeConditionNoAlias}
  //           ),
  //           manufacturer_max_compliance_raw AS (
  //             -- First get the max compliance percentage per manufacturer
  //             SELECT
  //               store_id,
  //               manufacturer_id,
  //               MAX(compliance_percentage) as max_compliance_percentage
  //             FROM store_listing_aggregates
  //             WHERE store_id = :storeId
  //               AND manufacturer_id = ANY(ARRAY[:manufacturerIds])
  //               ${programTypeConditionNoAlias}
  //             GROUP BY store_id, manufacturer_id
  //           ),
  //           manufacturer_max_compliance AS (
  //             -- Then get the program_id for the row with max compliance percentage
  //             SELECT DISTINCT ON (sla.store_id, sla.manufacturer_id)
  //               sla.store_id,
  //               sla.manufacturer_id,
  //               ROUND(COALESCE(mcr.max_compliance_percentage, 0))::INTEGER as max_compliance_percentage,
  //               sla.program_id
  //             FROM store_listing_aggregates sla
  //             INNER JOIN manufacturer_max_compliance_raw mcr
  //               ON sla.store_id = mcr.store_id
  //               AND sla.manufacturer_id = mcr.manufacturer_id
  //               AND (sla.compliance_percentage = mcr.max_compliance_percentage
  //                    OR (sla.compliance_percentage IS NULL AND mcr.max_compliance_percentage IS NULL))
  //             WHERE sla.store_id = :storeId
  //               AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
  //               ${programTypeConditionNoAlias}
  //             ORDER BY sla.store_id, sla.manufacturer_id, sla.compliance_percentage DESC NULLS LAST
  //           ),
  //           manufacturer_data AS (
  //             -- Main query: manufacturer-level aggregations with direct JOINs
  //             SELECT
  //               sla.manufacturer_id,
  //               -- Store basic info (same for all rows, so we can pick any)
  //               s.id as store_id,
  //               s.name as store_name,
  //               s.external_store_id,
  //               u.address as store_location,
  //               ur.id as user_id,
  //               u.status as user_status,
  //               d.name as sales_rep_name,
  //               ur_sales_rep.associated_user_id as sales_rep_associated_user_id,
  //               -- Manufacturer info
  //               m.name as manufacturer_name,
  //               m.logo as manufacturer_logo,
  //               true as authorized,
  //               -- Manufacturer aggregations
  //               BOOL_OR(sla.program_enrolled) as program_enrolled,
  //               MAX(sla.purchase_volume) as manufacturer_purchase_volume,
  //               SUM(sla.earnings) as manufacturer_total_earnings,
  //               SUM(sla.earning_opp) as manufacturer_total_earnings_opp,
  //               -- Compliance parsing and aggregation (rounded to integers)
  //               SUM(
  //                 CASE
  //                   WHEN sla.program_compliance_achieved ~ '^[0-9]+/[0-9]+$'
  //                   THEN CAST(SPLIT_PART(sla.program_compliance_achieved, '/', 1) AS INTEGER)
  //                   ELSE 0
  //                 END
  //               )::INTEGER as purchased_count,
  //               SUM(
  //                 CASE
  //                   WHEN sla.program_compliance_achieved ~ '^[0-9]+/[0-9]+$'
  //                   THEN CAST(SPLIT_PART(sla.program_compliance_achieved, '/', 2) AS INTEGER)
  //                   ELSE 0
  //                 END
  //               )::INTEGER as required_count,
  //               -- Max compliance percentage and corresponding program_id from CTE
  //               mmc.max_compliance_percentage,
  //               mmc.program_id
  //             FROM store_listing_aggregates sla
  //             -- Join to stores table
  //             INNER JOIN stores s ON sla.store_id = s.id
  //             -- Join to user_roles and users for store user info
  //             LEFT JOIN user_roles ur ON s.id = ur.associated_user_id
  //               AND ur.associated_entity_type = 'STORE'
  //             LEFT JOIN users u ON ur.user_id = u.id
  //             -- Join to store_sales_reps, distributors, and user_roles for sales rep info
  //             LEFT JOIN store_sales_reps ssr ON s.id = ssr.store_id
  //               AND ssr.deleted_at IS NULL
  //             LEFT JOIN distributors d ON ssr.sales_rep_id = d.id
  //             LEFT JOIN user_roles ur_sales_rep ON d.id = ur_sales_rep.associated_user_id
  //               AND ur_sales_rep.role = 'DISTRIBUTOR_SALES_REP'
  //             -- Join to authorized_distributor_manufacturers and manufacturers for manufacturer info
  //             INNER JOIN authorized_distributor_manufacturers adm
  //               ON sla.manufacturer_id = adm.manufacturer_id
  //               AND adm.distributor_id = :distributorId
  //               AND adm.deleted_at IS NULL
  //             INNER JOIN manufacturers m ON m.id = adm.manufacturer_id
  //             -- Join to max compliance CTE
  //             LEFT JOIN manufacturer_max_compliance mmc
  //               ON sla.store_id = mmc.store_id
  //               AND sla.manufacturer_id = mmc.manufacturer_id
  //             WHERE sla.store_id = :storeId
  //               AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
  //               ${programTypeCondition}
  //             GROUP BY
  //               s.id,
  //               sla.manufacturer_id,
  //               s.name,
  //               s.external_store_id,
  //               u.address,
  //               ur.id,
  //               u.status,
  //               d.name,
  //               ur_sales_rep.associated_user_id,
  //               m.name,
  //               m.logo,
  //               mmc.max_compliance_percentage,
  //               mmc.program_id
  //           )
  //           SELECT
  //             md.store_id,
  //             md.store_name,
  //             md.external_store_id,
  //             md.store_location,
  //             md.user_id,
  //             md.user_status,
  //             md.sales_rep_name,
  //             md.sales_rep_associated_user_id,
  //             st.total_purchase_volume,
  //             st.total_savings,
  //             st.total_opp_savings,
  //             md.manufacturer_id,
  //             md.manufacturer_name,
  //             md.manufacturer_logo,
  //             md.authorized,
  //             md.program_enrolled,
  //             (md.purchased_count::TEXT || '/' || md.required_count::TEXT) as program_compliance_achieved,
  //             md.manufacturer_purchase_volume,
  //             md.manufacturer_total_earnings,
  //             md.manufacturer_total_earnings_opp,
  //             md.max_compliance_percentage,
  //             md.program_id,
  //             md.required_count,
  //             md.purchased_count,
  //             epia.program_ids as enrolled_program_ids
  //           FROM manufacturer_data md
  //           INNER JOIN store_totals st ON md.store_id = st.store_id
  //           CROSS JOIN enrolled_program_ids_array epia
  //           ORDER BY md.manufacturer_name
  //         `;

  //         const replacements: any = {
  //           storeId,
  //           manufacturerIds,
  //           distributorId
  //         };

  //         if (programTypeFilter) {
  //           replacements.programType = programTypeFilter;
  //         }

  //         const results: any[] = await sequelize.query(query, {
  //           type: QueryTypes.SELECT,
  //           replacements
  //         });

  //         return results;
  //       } catch (error) {
  //         console.error(
  //           "Error in getStoreDetailsFromAggregates:",
  //           error
  //         );
  //         throw error;
  //       }
  //     }
  //   );
  // }

  /**
   * Retrieves store details from store_listing_aggregates table for v2 API
   * OPTIMIZED VERSION: Reduced from 5 CTEs to 3 CTEs, from 5 table scans to 2
   * @param storeId - The store ID
   * @param manufacturerIds - Array of manufacturer IDs
   * @param distributorId - The distributor ID
   * @param programTimeline - Program timeline filter (Current or Historical)
   * @returns Promise with aggregated store details data
   */
  public async getStoreDetailsFromAggregates(
    storeId: number,
    manufacturerIds: number[],
    distributorId: number,
    programTimeline?: string
  ): Promise<any> {
    return newrelic.startSegment(
      "StoreRepository.getStoreDetailsFromAggregates",
      true,
      async () => {
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
            ? `AND program_type = :programType`
            : "";

          // Optimized query: Reduced CTEs and table scans
          const query = `
          WITH store_annual_volume AS (
            -- Aggregate annual purchase volume when program_id = -1
            SELECT 
              sla.store_id,
              SUM(sla.annual_purchase_volume) as total_annual_purchase_volume
            FROM store_listing_aggregates sla
            WHERE sla.store_id = :storeId
              AND sla.program_id = -1
              AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
              ${programTypeCondition}
            GROUP BY sla.store_id
          ),
          manufacturer_aggregations AS (
            -- Single pass: All manufacturer-level aggregations (exclude program_id = -1)
            SELECT
              sla.store_id,
              sla.manufacturer_id,
              MAX(sla.purchase_volume) as manufacturer_purchase_volume,
              SUM(sla.earnings) as manufacturer_total_earnings,
              SUM(sla.earning_opp) as manufacturer_total_earnings_opp,
              BOOL_OR(sla.program_enrolled) as program_enrolled,
              MAX(sla.compliance_percentage) as max_compliance_percentage,
              -- Compliance parsing and aggregation
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
              )::INTEGER as required_count
            FROM store_listing_aggregates sla
            WHERE sla.store_id = :storeId
              AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
              AND sla.program_id != -1
              ${programTypeCondition}
            GROUP BY sla.store_id, sla.manufacturer_id
          ),
          manufacturer_compliance_program AS (
            -- Get program_id for max compliance per manufacturer (exclude program_id = -1)
            SELECT DISTINCT ON (sla.store_id, sla.manufacturer_id)
              sla.store_id,
              sla.manufacturer_id,
              sla.program_id
            FROM store_listing_aggregates sla
            INNER JOIN manufacturer_aggregations ma
              ON sla.store_id = ma.store_id
              AND sla.manufacturer_id = ma.manufacturer_id
              AND sla.compliance_percentage = ma.max_compliance_percentage
            WHERE sla.store_id = :storeId
              AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
              AND sla.program_id != -1
              ${programTypeCondition}
            ORDER BY sla.store_id, sla.manufacturer_id, sla.program_id
          ),
          base_aggregations AS (
            -- Combine with store-level totals using window functions
            SELECT
              ma.*,
              mcp.program_id as program_id_for_max_compliance,
              -- Store-level totals computed via window functions (no additional scan)
              SUM(ma.manufacturer_purchase_volume) OVER (PARTITION BY ma.store_id) as total_purchase_volume,
              SUM(CASE WHEN ma.program_enrolled = true THEN ma.manufacturer_total_earnings ELSE 0 END) 
                OVER (PARTITION BY ma.store_id) as total_savings,
              SUM(CASE WHEN ma.program_enrolled = true THEN ma.manufacturer_total_earnings_opp ELSE 0 END) 
                OVER (PARTITION BY ma.store_id) as total_opp_savings
            FROM manufacturer_aggregations ma
            LEFT JOIN manufacturer_compliance_program mcp
              ON ma.store_id = mcp.store_id
              AND ma.manufacturer_id = mcp.manufacturer_id
          ),
          enrolled_programs AS (
            -- Get enrolled program IDs (exclude program_id = -1)
            SELECT
              store_id,
              COALESCE(ARRAY_AGG(DISTINCT program_id ORDER BY program_id) FILTER (WHERE program_id IS NOT NULL AND program_id != -1), ARRAY[]::INTEGER[]) as program_ids
            FROM store_listing_aggregates
            WHERE store_id = :storeId
              AND manufacturer_id = ANY(ARRAY[:manufacturerIds])
              AND program_enrolled = true
              AND program_id != -1
              ${programTypeCondition}
            GROUP BY store_id
          )
          SELECT
            -- Store basic info
            s.id as store_id,
            s.name as store_name,
            s.external_store_id,
            u.address as store_location,
            ur.id as user_id,
            u.status as user_status,
            d.name as sales_rep_name,
            ur_sales_rep.associated_user_id as sales_rep_associated_user_id,
            -- Store-level totals
            COALESCE(ba.total_purchase_volume, 0) as total_purchase_volume,
            COALESCE(ba.total_savings, 0) as total_savings,
            COALESCE(ba.total_opp_savings, 0) as total_opp_savings,
            -- Manufacturer info
            COALESCE(ba.manufacturer_id, 0) as manufacturer_id,
            COALESCE(m.name, '') as manufacturer_name,
            COALESCE(m.logo, '') as manufacturer_logo,
            true as authorized,
            COALESCE(ba.program_enrolled, false) as program_enrolled,
            COALESCE((ba.purchased_count::TEXT || '/' || ba.required_count::TEXT), '0/0') as program_compliance_achieved,
            COALESCE(ba.manufacturer_purchase_volume, 0) as manufacturer_purchase_volume,
            COALESCE(ba.manufacturer_total_earnings, 0) as manufacturer_total_earnings,
            COALESCE(ba.manufacturer_total_earnings_opp, 0) as manufacturer_total_earnings_opp,
            ROUND(COALESCE(ba.max_compliance_percentage, 0))::INTEGER as max_compliance_percentage,
            COALESCE(ba.program_id_for_max_compliance, 0) as program_id,
            COALESCE(ba.required_count, 0) as required_count,
            COALESCE(ba.purchased_count, 0) as purchased_count,
            COALESCE(ep.program_ids, ARRAY[]::INTEGER[]) as enrolled_program_ids,
            -- Annual purchase volume data
            COALESCE(sav.total_annual_purchase_volume, 0) as total_annual_purchase_volume,
            -- has_annual_volume_only should be true only if annual volume exists AND no regular programs exist
            CASE 
              WHEN sav.store_id IS NOT NULL AND ba.store_id IS NULL THEN true 
              ELSE false 
            END as has_annual_volume_only
          FROM stores s
          -- Join store and user data
          LEFT JOIN user_roles ur ON s.id = ur.associated_user_id 
            AND ur.associated_entity_type = 'STORE'
          LEFT JOIN users u ON ur.user_id = u.id
          -- Join sales rep data
          LEFT JOIN store_sales_reps ssr ON s.id = ssr.store_id 
            AND ssr.deleted_at IS NULL
          LEFT JOIN distributors d ON ssr.sales_rep_id = d.id
          LEFT JOIN user_roles ur_sales_rep ON d.id = ur_sales_rep.associated_user_id
            AND ur_sales_rep.role = 'DISTRIBUTOR_SALES_REP'
          -- Join annual volume data
          LEFT JOIN store_annual_volume sav ON s.id = sav.store_id
          -- Join manufacturer aggregations
          LEFT JOIN base_aggregations ba ON s.id = ba.store_id
          -- Join manufacturer data (only if we have manufacturer aggregations)
          LEFT JOIN authorized_distributor_manufacturers adm 
            ON ba.manufacturer_id = adm.manufacturer_id 
            AND adm.distributor_id = :distributorId
            AND adm.deleted_at IS NULL
          LEFT JOIN manufacturers m ON m.id = adm.manufacturer_id
          -- Join enrolled programs
          LEFT JOIN enrolled_programs ep ON s.id = ep.store_id
          WHERE s.id = :storeId
            AND (
              -- Return rows if we have manufacturer aggregations
              ba.store_id IS NOT NULL
              -- OR if we have annual volume (return at least one row with store info)
              OR sav.store_id IS NOT NULL
            )
          ORDER BY COALESCE(m.name, ''), COALESCE(ba.manufacturer_id, 0)
        `;

          const replacements: any = {
            storeId,
            manufacturerIds,
            distributorId
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
          console.error("Error in getStoreDetailsFromAggregates:", error);
          throw error;
        }
      }
    );
  }

  /**
   * Retrieves filtered store listings from store_listing_aggregates with optimized query
   * Returns stores with all necessary data including metrics, sorted and paginated
   *
   * @param distributorId - The distributor ID
   * @param manufacturerIds - Array of authorized manufacturer IDs
   * @param page - Page number (1-based)
   * @param limit - Page size
   * @param sortKey - Sort key (purchaseSort, sort, chain, estimatedSavings, programCompliance, sales_rep)
   * @param sort - Sort direction (ASC or DESC)
   * @param searchQuery - Optional search query for store name
   * @param selectedSalesRepId - Optional sales rep ID filter
   * @param warehouseId - Optional warehouse ID filter
   * @param programTimeline - Program timeline filter (CURRENT/HISTORICAL)
   * @param excludeChainStores - Whether to exclude chain stores
   * @returns Promise with stores data and total count
   */
  public async getFilteredStoreIdsFromAggregates({
    distributorId,
    manufacturerIds,
    page,
    limit,
    sortKey,
    sort,
    searchQuery,
    selectedSalesRepId,
    warehouseId,
    programTimeline,
    excludeChainStores,
    salesManagerId,
    generalManagerId
  }: {
    distributorId: number;
    manufacturerIds: number[];
    page: number;
    limit: number;
    sortKey: string;
    sort: string;
    searchQuery: string | null;
    selectedSalesRepId: number | null;
    warehouseId: number | null;
    programTimeline?: string;
    excludeChainStores?: boolean;
    salesManagerId?: number;
    generalManagerId?: number;
  }): Promise<{ stores: any[]; totalCount: number }> {
    return newrelic.startSegment(
      "StoreRepository.getFilteredStoreIdsFromAggregates",
      true,
      async () => {
        try {
          const debugContext = {
            distributorId,
            page,
            limit,
            sortKey,
            sort,
            selectedSalesRepId,
            warehouseId,
            programTimeline,
            excludeChainStores,
            salesManagerId,
            generalManagerId,
            hasSearchQuery: Boolean(
              searchQuery &&
                typeof searchQuery === "string" &&
                searchQuery.trim().length > 0
            )
          };
          console.info(
            "[StoreRepository] getFilteredStoreIdsFromAggregates start",
            debugContext
          );
          console.time(
            "[StoreRepository] getFilteredStoreIdsFromAggregates duration"
          );
          // Map programTimeline to program_type filter
          const programTypeFilter =
            programTimeline?.toUpperCase() === "HISTORICAL"
              ? "HISTORICAL"
              : programTimeline?.toUpperCase() === "UPCOMING"
                ? "UPCOMING"
                : programTimeline?.toUpperCase() === "CURRENT"
                  ? "CURRENT"
                  : "CURRENT"; // Default to CURRENT

          // Build dynamic ORDER BY clause based on sortKey
          let orderByClause = "";
          switch (sortKey) {
            case "purchaseSort":
              orderByClause = `sm.total_purchase_volume ${sort} NULLS LAST`;
              break;
            case "annualPurchaseVolSort":
              orderByClause = `sm.total_purchase_volume ${sort} NULLS LAST`;
              break;
            case "sort":
              orderByClause = `s.name ${sort}`;
              break;
            case "chain":
              orderByClause = `COALESCE(c.name, '') ${sort} NULLS LAST`;
              break;
            case "estimatedSavings":
              orderByClause = `se.total_earnings ${sort} NULLS LAST`;
              break;
            case "programCompliance":
              orderByClause = `sc.completed_programs ${sort} NULLS LAST`;
              break;
            case "sales_rep":
              orderByClause = `COALESCE(d.name, '') ${sort} NULLS LAST`;
              break;
            default:
              orderByClause = `s.name ASC`;
          }

          const offset = (page - 1) * limit;

          // Build search query condition
          // Ensure searchQuery is a non-empty string
          const hasSearchQuery =
            searchQuery &&
            typeof searchQuery === "string" &&
            searchQuery.trim().length > 0;
          const searchCondition = hasSearchQuery
            ? `AND s.name ILIKE :searchPattern`
            : "";

          // Build warehouse condition
          const warehouseCondition = warehouseId
            ? `AND s.warehouse_id = :warehouseId`
            : "";

          // Build sales rep condition
          // For sales manager: get all sales_rep_ids for the manager
          // For regular selectedSalesRepId: resolve user_id to sales_rep_id
          const salesRepCTE = salesManagerId
            ? `sales_rep_mapping AS (
                SELECT msrm.sales_rep_id
                FROM manager_sales_rep_mapping msrm
                WHERE msrm.sales_manager_id = :salesManagerId
                  AND msrm.deleted_at IS NULL
                  ${
                    selectedSalesRepId
                      ? `AND msrm.sales_rep_id = (SELECT d.id FROM distributors d 
                        INNER JOIN user_roles ur_sr ON d.id = ur_sr.associated_user_id 
                        WHERE ur_sr.user_id = :selectedSalesRepId 
                          AND ur_sr.role = 'DISTRIBUTOR_SALES_REP' 
                        LIMIT 1)`
                      : ""
                  }
              )`
            : selectedSalesRepId
              ? `sales_rep_mapping AS (
                  SELECT d.id as sales_rep_id
                  FROM distributors d
                  INNER JOIN user_roles ur_sr ON d.id = ur_sr.associated_user_id
                  WHERE ur_sr.user_id = :selectedSalesRepId
                    AND ur_sr.role = 'DISTRIBUTOR_SALES_REP'
                  LIMIT 1
                )`
              : "";

          // Pre-fetch general manager store ids to avoid long-running CTEs
          let generalManagerStoreIds: number[] | undefined;
          if (generalManagerId) {
            console.info(
              "[StoreRepository] fetching generalManager store ids",
              { generalManagerId }
            );
            const gmStoreRows = (await sequelize.query(
              `
                SELECT DISTINCT s.id as store_id
                FROM stores s
                INNER JOIN store_sales_reps ssr ON ssr.store_id = s.id
                  AND ssr.deleted_at IS NULL
                INNER JOIN user_roles ur_gm ON ur_gm.associated_user_id = ssr.sales_rep_id
                  AND ur_gm.role = 'DISTRIBUTOR_SALES_REP'
                INNER JOIN distributors d_gm ON d_gm.id = ur_gm.associated_user_id
                INNER JOIN distributor_manager_warehouses dmw 
                  ON dmw.warehouse_id = d_gm.primary_warehouse_id
                  AND dmw.distributor_id = :generalManagerId
                WHERE s.deleted_at IS NULL
              `,
              {
                type: QueryTypes.SELECT,
                replacements: { generalManagerId }
              }
            )) as { store_id: number }[];
            generalManagerStoreIds = gmStoreRows.map((r) => Number(r.store_id));
            console.info("[StoreRepository] generalManager store ids fetched", {
              count: generalManagerStoreIds.length
            });
            if (!generalManagerStoreIds.length) {
              return { stores: [], totalCount: 0 };
            }
          }

          const withClauseParts = [salesRepCTE].filter(
            (clause) => clause && clause.trim().length > 0
          );
          const withClause =
            withClauseParts.length > 0
              ? `WITH ${withClauseParts.join(",\n")}`
              : "";

          // Add filtered_stores CTE, handling absence of other CTEs
          const withClausePrefix = withClause ? `${withClause},` : "WITH";

          const salesRepCondition =
            salesManagerId || selectedSalesRepId
              ? salesManagerId
                ? `AND ssr.sales_rep_id = ANY(SELECT sales_rep_id FROM sales_rep_mapping)`
                : `AND ssr.sales_rep_id = (SELECT sales_rep_id FROM sales_rep_mapping LIMIT 1)`
              : "";

          const gmArrayLiteral =
            generalManagerStoreIds && generalManagerStoreIds.length
              ? `ARRAY[${generalManagerStoreIds.join(",")}]`
              : null;

          const generalManagerStoreCondition = gmArrayLiteral
            ? `AND s.id = ANY(${gmArrayLiteral})`
            : "";
          const generalManagerCountCondition = gmArrayLiteral
            ? `AND s.id = ANY(${gmArrayLiteral})`
            : "";

          // Build chain exclusion condition
          const chainExclusionCondition = excludeChainStores
            ? `AND cs.store_id IS NULL`
            : "";

          const query = `
            ${withClausePrefix}
            filtered_stores AS (
              -- Step 1: Pre-filter stores based on distributor and other filters
              SELECT DISTINCT s.id as store_id
              FROM stores s
              JOIN user_roles ur ON s.id = ur.associated_user_id 
                AND ur.role = 'STORE'
                AND ur.parent_entity_id = :distributorId
              LEFT JOIN store_sales_reps ssr ON s.id = ssr.store_id 
                AND ssr.deleted_at IS NULL
              LEFT JOIN chain_stores cs ON s.id = cs.store_id
              WHERE 1=1
                ${warehouseCondition}
                ${salesRepCondition}
                ${generalManagerStoreCondition}
                ${chainExclusionCondition}
                ${searchCondition}
            ),
            store_annual_volume AS (
              -- Step 1.5: Aggregate annual purchase volume for stores with program_id = -1
              SELECT 
                sla.store_id,
                SUM(sla.annual_purchase_volume) as total_annual_purchase_volume
              FROM store_listing_aggregates sla
              INNER JOIN filtered_stores fs ON sla.store_id = fs.store_id
              WHERE sla.program_id = -1
                AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
                AND sla.program_type = :programType
              GROUP BY sla.store_id
            ),
            store_metrics AS (
              -- Step 2: Calculate metrics only for filtered stores (optimized)
              SELECT 
                fs.store_id,
                -- Use annual purchase volume if store has ONLY annual volume (no regular programs)
                -- Otherwise use regular purchase volume
                CASE 
                  WHEN sav.store_id IS NOT NULL AND COUNT(mv.store_id) = 0 
                    THEN COALESCE(sav.total_annual_purchase_volume, 0)
                  ELSE COALESCE(SUM(mv.max_purchase_volume), 0)
                END as total_purchase_volume,
                -- Set flag to true only if store has annual volume AND no regular purchase volume
                CASE 
                  WHEN sav.store_id IS NOT NULL AND COUNT(mv.store_id) = 0 THEN true 
                  ELSE false 
                END as has_annual_volume_only
              FROM filtered_stores fs
              LEFT JOIN store_annual_volume sav ON fs.store_id = sav.store_id
              LEFT JOIN (
                SELECT 
                  sla.store_id,
                  sla.manufacturer_id,
                  MAX(sla.purchase_volume) as max_purchase_volume
                FROM store_listing_aggregates sla
                INNER JOIN filtered_stores fs2 ON sla.store_id = fs2.store_id
                WHERE sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
                  AND sla.program_type = :programType
                  AND sla.program_id != -1
                GROUP BY sla.store_id, sla.manufacturer_id
              ) mv ON fs.store_id = mv.store_id
              GROUP BY fs.store_id, sav.total_annual_purchase_volume, sav.store_id
            ),
            store_earnings AS (
              -- Step 3: Calculate total earnings (only for enrolled programs, exclude program_id = -1)
              SELECT 
                fs.store_id,
                COALESCE(SUM(CASE WHEN sla.program_enrolled = true AND sla.program_id != -1 THEN sla.earnings ELSE 0 END), 0) as total_earnings
              FROM filtered_stores fs
              LEFT JOIN store_listing_aggregates sla ON fs.store_id = sla.store_id
                AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
                AND sla.program_type = :programType
                AND sla.program_id != -1
              GROUP BY fs.store_id
            ),
            store_compliance AS (
              -- Step 4: Calculate completed and total enrolled programs (exclude program_id = -1)
              SELECT 
                fs.store_id,
                COALESCE(SUM(
                  CASE 
                    WHEN sla.program_compliance_achieved ~ '^[0-9]+/[0-9]+$' 
                      AND sla.program_id != -1
                    THEN CAST(SPLIT_PART(sla.program_compliance_achieved, '/', 1) AS INTEGER)
                    ELSE 0
                  END
                ), 0) as completed_programs,
                COALESCE(SUM(
                  CASE 
                    WHEN sla.program_compliance_achieved ~ '^[0-9]+/[0-9]+$' 
                      AND sla.program_id != -1
                    THEN CAST(SPLIT_PART(sla.program_compliance_achieved, '/', 2) AS INTEGER)
                    ELSE 0
                  END
                ), 0) as total_enrolled
              FROM filtered_stores fs
              LEFT JOIN store_listing_aggregates sla ON fs.store_id = sla.store_id
                AND sla.manufacturer_id = ANY(ARRAY[:manufacturerIds])
                AND sla.program_type = :programType
                AND sla.program_id != -1
              GROUP BY fs.store_id
            )
            -- Step 5: Join all data and apply sorting
            SELECT 
              s.id as store_id,
              s.external_store_id,
              s.name as store_name,
              COALESCE(u.address, '') as store_location,
              ur.user_id,
              COALESCE(u.status, 'INVITATION_PENDING') as user_status,
              COALESCE(d.name, '') as sales_rep_name,
              ur_sales_rep.associated_user_id as sales_rep_associated_user_id,
              COALESCE(c.id, 0) as chain_id,
              COALESCE(c.name, '') as chain_name,
              COALESCE(sm.total_purchase_volume, 0) as total_purchase_volume,
              COALESCE(se.total_earnings, 0) as total_earnings,
              COALESCE(sc.completed_programs, 0) as completed_programs,
              COALESCE(sc.total_enrolled, 0) as total_enrolled,
              COALESCE(sm.has_annual_volume_only, false) as has_annual_volume_only
            FROM filtered_stores fs
            JOIN stores s ON fs.store_id = s.id
            LEFT JOIN user_roles ur ON s.id = ur.associated_user_id 
              AND ur.role = 'STORE'
            LEFT JOIN users u ON ur.user_id = u.id
            LEFT JOIN store_sales_reps ssr ON s.id = ssr.store_id 
              AND ssr.deleted_at IS NULL
            LEFT JOIN distributors d ON ssr.sales_rep_id = d.id
            LEFT JOIN user_roles ur_sales_rep ON d.id = ur_sales_rep.associated_user_id
              AND ur_sales_rep.role = 'DISTRIBUTOR_SALES_REP'
            LEFT JOIN chain_stores cs ON s.id = cs.store_id
            LEFT JOIN chains c ON cs.chain_id = c.id
            LEFT JOIN store_metrics sm ON fs.store_id = sm.store_id
            LEFT JOIN store_earnings se ON fs.store_id = se.store_id
            LEFT JOIN store_compliance sc ON fs.store_id = sc.store_id
            ORDER BY ${orderByClause}
            LIMIT :limit OFFSET :offset
          `;

          // Count query for total stores
          // Note: For sales rep filter, use subquery directly instead of CTE since count query doesn't need CTEs
          // Must match the logic in salesRepCondition (lines 7559-7564)
          const countSalesRepCondition =
            salesManagerId || selectedSalesRepId
              ? salesManagerId
                ? selectedSalesRepId
                  ? `AND ssr.sales_rep_id = ANY(
                      SELECT msrm.sales_rep_id 
                      FROM manager_sales_rep_mapping msrm
                      WHERE msrm.sales_manager_id = :salesManagerId
                        AND msrm.deleted_at IS NULL
                        AND msrm.sales_rep_id = (
                          SELECT d.id FROM distributors d 
                          INNER JOIN user_roles ur_sr ON d.id = ur_sr.associated_user_id 
                          WHERE ur_sr.user_id = :selectedSalesRepId 
                            AND ur_sr.role = 'DISTRIBUTOR_SALES_REP' 
                          LIMIT 1
                        )
                    )`
                  : `AND ssr.sales_rep_id = ANY(
                      SELECT sales_rep_id 
                      FROM manager_sales_rep_mapping 
                      WHERE sales_manager_id = :salesManagerId 
                        AND deleted_at IS NULL
                    )`
                : `AND ssr.sales_rep_id = (SELECT d.id FROM distributors d 
                    INNER JOIN user_roles ur_sr ON d.id = ur_sr.associated_user_id 
                    WHERE ur_sr.user_id = :selectedSalesRepId 
                      AND ur_sr.role = 'DISTRIBUTOR_SALES_REP' 
                    LIMIT 1)`
              : "";

          const countQuery = `
            SELECT COUNT(DISTINCT s.id) as total_count
            FROM stores s
            JOIN user_roles ur ON s.id = ur.associated_user_id 
              AND ur.role = 'STORE'
              AND ur.parent_entity_id = :distributorId
            LEFT JOIN store_sales_reps ssr ON s.id = ssr.store_id 
              AND ssr.deleted_at IS NULL
            LEFT JOIN chain_stores cs ON s.id = cs.store_id
            WHERE 1=1
              ${warehouseCondition}
              ${countSalesRepCondition}
              ${generalManagerCountCondition}
              ${chainExclusionCondition}
              ${searchCondition}
          `;

          const replacements: any = {
            distributorId,
            manufacturerIds,
            programType: programTypeFilter,
            limit,
            offset
          };

          if (warehouseId) {
            replacements.warehouseId = warehouseId;
          }

          if (selectedSalesRepId) {
            replacements.selectedSalesRepId = selectedSalesRepId;
          }

          if (salesManagerId) {
            replacements.salesManagerId = salesManagerId;
          }

          if (generalManagerId) {
            replacements.generalManagerId = generalManagerId;
          }

          if (generalManagerStoreIds) {
            replacements.generalManagerStoreIds = generalManagerStoreIds;
          }

          if (hasSearchQuery) {
            // Trim and escape special characters for ILIKE
            const trimmedSearch = String(searchQuery).trim();
            // Escape special ILIKE characters: %, _, \
            const escapedSearch = trimmedSearch.replace(/[%_\\]/g, "\\$&");
            replacements.searchPattern = `%${escapedSearch}%`;
          }

          console.info("[StoreRepository] executing store query", {
            withClauseDefined: Boolean(withClauseParts.length),
            hasSalesRepCTE: Boolean(salesRepCTE),
            replacementsKeys: Object.keys(replacements)
          });
          console.time("[StoreRepository] store query duration");
          const storesResult = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements
          });
          console.timeEnd("[StoreRepository] store query duration");

          console.info("[StoreRepository] executing count query", {
            replacementsKeys: Object.keys(replacements)
          });
          console.time("[StoreRepository] count query duration");
          const countResult = await sequelize.query(countQuery, {
            type: QueryTypes.SELECT,
            replacements
          });
          console.timeEnd("[StoreRepository] count query duration");

          const totalCount = (countResult[0] as any)?.total_count || 0;

          console.info(
            "[StoreRepository] getFilteredStoreIdsFromAggregates done",
            { rows: storesResult.length, totalCount }
          );
          console.timeEnd(
            "[StoreRepository] getFilteredStoreIdsFromAggregates duration"
          );

          return {
            stores: storesResult as any[],
            totalCount: Number(totalCount)
          };
        } catch (error) {
          console.error("Error in getFilteredStoreIdsFromAggregates:", error);
          console.timeEnd(
            "[StoreRepository] getFilteredStoreIdsFromAggregates duration"
          );
          throw error;
        }
      }
    );
  }

  /**
   * Gets basic store information by store ID
   * Used when store_listing_aggregates doesn't have data for the store
   *
   * @param storeId - The store ID
   * @returns Promise with store basic info or null if store doesn't exist
   */
  public async getStoreBasicInfoById(storeId: number): Promise<any | null> {
    return newrelic.startSegment(
      "StoreRepository.getStoreBasicInfoById",
      true,
      async () => {
        try {
          const query = `
            SELECT 
              s.name as store_name,
              s.id as store_id,
              s.external_store_id as external_store_id,
              d.name as sales_rep_name,
              d.id as sales_rep_id,
              u.address as location,
              ur.id as user_id,
              u.status as user_status,
              ur_sales_rep.associated_user_id as sales_rep_associated_user_id
            FROM stores s
            LEFT JOIN store_sales_reps ssr ON ssr.store_id = s.id AND ssr.deleted_at IS NULL
            LEFT JOIN distributors d ON d.id = ssr.sales_rep_id
            LEFT JOIN user_roles ur ON ur.associated_user_id = s.id 
              AND ur.associated_entity_type = 'STORE'
            LEFT JOIN users u ON u.id = ur.user_id
            LEFT JOIN user_roles ur_sales_rep ON d.id = ur_sales_rep.associated_user_id
              AND ur_sales_rep.role = 'DISTRIBUTOR_SALES_REP'
            WHERE s.id = :storeId
            LIMIT 1
          `;

          const results: any[] = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: { storeId }
          });

          return results.length > 0 ? results[0] : null;
        } catch (error) {
          console.error("Error in getStoreBasicInfoById:", error);
          throw error;
        }
      }
    );
  }

  /**
   * Validates if a store belongs to the user based on their role.
   *
   * @param {number} storeId - The ID of the store to validate
   * @param {string} role - The role of the user (DISTRIBUTOR_ADMIN, DISTRIBUTOR_EXECUTIVE, DISTRIBUTOR_SALES_REP, DISTRIBUTOR_SALES_MANAGER)
   * @param {number} distributorId - The distributor ID
   * @param {number} [associatedUserId] - The associated user ID (for sales rep and sales manager roles)
   * @returns {Promise<boolean>} - True if the store belongs to the user, false otherwise
   */
  public async validateStoreAccess(
    storeId: number,
    role: string,
    distributorId: number,
    associatedUserId?: number
  ): Promise<boolean> {
    return newrelic.startSegment(
      "StoreRepository.validateStoreAccess",
      true,
      async () => {
        try {
          // First, get external_store_id from stores table
          const store = await Store.findOne({
            where: {
              id: storeId
            },
            attributes: ["external_store_id"],
            raw: true
          });

          if (!store || !(store as any).external_store_id) {
            return false;
          }

          const externalStoreId = (store as any).external_store_id;

          // For DISTRIBUTOR_ADMIN or DISTRIBUTOR_EXECUTIVE
          if (
            role === ENTITY_TYPE.DISTRIBUTOR_ADMIN ||
            role === ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
          ) {
            const userRole = await UserRole.findOne({
              where: {
                parent_entity_id: distributorId,
                associated_user_id: storeId,
                role: ENTITY_TYPE.STORE
              },
              raw: true
            });

            return !!userRole;
          }

          // For DISTRIBUTOR_SALES_REP
          if (role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
            if (!associatedUserId) {
              return false;
            }

            const storeSalesRep = await StoreSalesRep.findOne({
              where: {
                store_id: storeId,
                sales_rep_id: associatedUserId,
                deleted_at: null
              },
              raw: true
            });

            return !!storeSalesRep;
          }

          if (role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER) {
            if (!associatedUserId) {
              return false;
            }

            const query = `
            SELECT DISTINCT s.id
            FROM stores s
            INNER JOIN store_sales_reps ssr ON ssr.store_id = s.id
            INNER JOIN user_roles ur ON ur.associated_user_id = ssr.sales_rep_id
                AND ur.role = 'DISTRIBUTOR_SALES_REP'
            INNER JOIN distributors d ON d.id = ur.associated_user_id
            INNER JOIN distributor_manager_warehouses dmw ON dmw.warehouse_id = d.primary_warehouse_id
                AND dmw.distributor_id = :generalManagerId
            where s.id = :storeId
            ORDER BY s.id`;

            const result = await sequelize.query(query, {
              type: QueryTypes.SELECT,
              replacements: { storeId, generalManagerId: associatedUserId }
            });

            return result.length > 0;
          }

          // For DISTRIBUTOR_SALES_MANAGER
          if (role === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER) {
            if (!associatedUserId) {
              return false;
            }

            // Check if store belongs to one of the sales reps managed by the sales manager
            // Use raw SQL query to avoid Sequelize nested include issues
            const query = `
              SELECT ssr.id
              FROM store_sales_reps ssr
              INNER JOIN manager_sales_rep_mapping msrm 
                ON ssr.sales_rep_id = msrm.sales_rep_id
              WHERE ssr.store_id = :storeId
                AND ssr.deleted_at IS NULL
                AND msrm.sales_manager_id = :salesManagerId
                AND msrm.deleted_at IS NULL
              LIMIT 1
            `;

            const result = await sequelize.query(query, {
              type: QueryTypes.SELECT,
              replacements: {
                storeId,
                salesManagerId: associatedUserId
              }
            });

            return result.length > 0;
          }

          // For any other role, return false
          return false;
        } catch (error) {
          console.error("Error in validateStoreAccess:", error);
          return false;
        }
      }
    );
  }
}

export default new StoreRepository();
