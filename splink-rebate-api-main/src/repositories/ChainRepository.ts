import newrelic from "newrelic";
import { Op, QueryTypes } from "sequelize";
import { ENTITY_TYPE, ProgramsComplianceStatus } from "../config/appConstants";
import sequelize from "../db";
import { ApiError } from "../lib/errors/APIError";
import Chain from "../models/Chain";
import ChainAggregation from "../models/ChainAggregation";
import ChainStore from "../models/ChainStore";
import Distributor from "../models/Distributor";
import ManagerSalesRepMapping from "../models/ManagerSalesRepMapping";
import Program from "../models/Program";
import ProgramCompliance from "../models/ProgramCompliance";
import ProgramParticipant from "../models/ProgramParticipant";
import Store from "../models/Store";
import StoreSalesRep from "../models/StoreSalesRep";
import User from "../models/User";
import UserRole from "../models/UserRole";
import {
  ChainAggregatedData,
  ChainDetailOptions,
  ChainDetailsQueryOptions,
  ChainDetailsResponse,
  ChainProgramInfo,
  ChainProgramsQueryOptions,
  ChainProgramsResponse,
  ChainQueryOptions,
  ChainStore as ChainStoreType,
  ChainStoresQueryOptions,
  ChainStoresResponse,
  ChainWithStoresEfficient,
  ChainWithStoresLightweight,
  ChainWithStoresStoreEfficient,
  ChainsWithStoresLightweightResponse,
  ChainsWithStoresQueryOptions,
  ChainsWithStoresResponse,
  EnrolledChain,
  ManufacturerChainsQueryOptions,
  ManufacturerChainsResponse,
  PaginatedChainResult,
  UnenrolledChain
} from "../types/ChainTypes";
import { getCurrentUser } from "../utils/requestContext";
import { isDistributorSalesRepManager } from "../utils/roles";
import ProgramRepository from "./ProgramRepository";
import StoreRepository from "./StoreRepository";

class ChainRepository {
  /**
   * Get chains by distributor ID with aggregated data
   * Now optimized to use the new distributor_id column for faster queries
   * @param distributorId - The distributor ID
   * @param options - Query options for filtering and pagination
   * @returns Promise<PaginatedChainResult>
   */
  public async getChainsByDistributorId(
    distributorId: number,
    options: ChainQueryOptions = {}
  ): Promise<PaginatedChainResult> {
    return newrelic.startSegment(
      "ChainRepository.getChainsByDistributorId",
      true,
      async () => {
        try {
          const {
            searchQuery,
            page = 1,
            limit = 10,
            sort = "ASC",
            sortKey = "chain_name",
            programTimeline,
            isInternal
          } = options;

          const offset = (page - 1) * limit;

          // Build where clause for search - now using direct distributor_id column
          const whereClause: any = {
            distributor_id: distributorId
          };

          if (searchQuery) {
            whereClause.name = {
              [Op.iLike]: `%${searchQuery}%`
            };
          }

          // Build order clause
          const orderClause: any = [];
          switch (sortKey) {
            case "chain_name":
              orderClause.push(["name", sort]);
              break;
            case "total_stores":
              orderClause.push([sequelize.literal("total_stores"), sort]);
              break;
            case "purchase_volume":
              orderClause.push([
                sequelize.literal("total_purchase_volume"),
                sort
              ]);
              break;
            case "earned_rebate":
              orderClause.push([
                sequelize.literal("total_earned_rebate"),
                sort
              ]);
              break;
            case "compliance_percentage":
              orderClause.push([
                sequelize.literal("compliance_percentage"),
                sort
              ]);
              break;
            default:
              orderClause.push(["name", sort]);
          }

          // Query for chains with aggregated data - now much faster with direct distributor_id
          const chainsQuery = await Chain.findAndCountAll({
            attributes: [
              "id",
              "name",
              [
                sequelize.fn("COUNT", sequelize.col("StoresForChain.id")),
                "total_stores"
              ],
              [
                sequelize.fn(
                  "SUM",
                  sequelize.col(
                    "StoresForChain->storeCompliances.total_purchase_volume"
                  )
                ),
                "total_purchase_volume"
              ],
              [
                sequelize.fn(
                  "SUM",
                  sequelize.col(
                    "StoresForChain->storeCompliances.earned_rebate"
                  )
                ),
                "total_earned_rebate"
              ],
              [
                sequelize.fn(
                  "COUNT",
                  sequelize.col("StoresForChain->storeCompliances.is_qualified")
                ),
                "compliant_stores"
              ],
              [
                sequelize.literal(
                  '(COUNT(CASE WHEN "StoresForChain->storeCompliances"."is_qualified" = true THEN 1 END) * 100.0 / COUNT("StoresForChain"."id"))'
                ),
                "compliance_percentage"
              ]
            ],
            include: [
              {
                model: Store,
                as: "StoresForChain",
                attributes: [],
                through: { attributes: [] },
                required: true,
                include: [
                  {
                    model: ProgramCompliance,
                    as: "storeCompliances",
                    attributes: [],
                    required: false,
                    where: {
                      ...(programTimeline && {
                        created_at: { [Op.gte]: new Date(programTimeline) }
                      })
                    }
                  }
                ]
              }
            ],
            where: whereClause,
            group: ["Chain.id", "Chain.name"],
            order: orderClause,
            limit,
            offset,
            subQuery: false
          });

          // Convert to EnrolledChain format
          const chains: EnrolledChain[] = chainsQuery.rows.map(
            (chain: any) => ({
              chainId: chain.id,
              chainName: chain.name,
              totalStores: parseInt(chain.getDataValue("total_stores") || "0"),
              enrolledStores: 0, // Will be calculated separately if needed
              compliantStores: parseInt(
                chain.getDataValue("compliant_stores") || "0"
              ),
              totalPurchaseVolume: parseFloat(
                chain.getDataValue("total_purchase_volume") || "0"
              ),
              totalEarnedRebate: parseFloat(
                chain.getDataValue("total_earned_rebate") || "0"
              ),
              compliancePercentage: parseFloat(
                chain.getDataValue("compliance_percentage") || "0"
              ),
              stores: [] // Will be populated by getChainDetails if needed
            })
          );

          const totalChains = Array.isArray(chainsQuery.count)
            ? chainsQuery.count.length
            : chainsQuery.count;

          return {
            chains,
            totalCount: totalChains,
            currentPage: page,
            totalPages: Math.ceil(totalChains / limit),
            hasNextPage: page < Math.ceil(totalChains / limit),
            hasPreviousPage: page > 1
          };
        } catch (error) {
          console.error(
            `[ERROR] ChainRepository.getChainsByDistributorId:`,
            error
          );
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainRepository.getChainsByDistributorId: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainRepository.getChainsByDistributorId"
            );
          }
        }
      }
    );
  }

  /**
   * Get detailed chain information including store-level data
   * @param chainId - The chain ID
   * @param options - Detail options for additional data
   * @returns Promise<ChainAggregatedData>
   */
  public async getChainDetails({
    chainId,
    options
  }: {
    chainId: number;
    options: ChainDetailOptions;
  }): Promise<ChainAggregatedData> {
    try {
      const user = getCurrentUser();
      const isSalesRepManager = isDistributorSalesRepManager(user?.role);

      const {
        programId,
        includeProgramDetails = false,
        includeStoreDetails = true
      } = options;

      // Get chain basic information
      const chain = await Chain.findByPk(chainId);
      if (!chain) {
        throw ApiError.notFound(`Chain with ID ${chainId} not found`);
      }

      // Get stores within the chain with detailed information
      const storesQuery = await ChainStore.findAll({
        attributes: [
          ["store_id", "storeId"],
          [sequelize.col("StoreUserRole.name"), "storeName"],
          [
            sequelize.col("StoreUserRole->StoreUserRole->user.address"),
            "address"
          ],
          [
            sequelize.col(
              "StoreUserRole->storeCompliances.total_purchase_volume"
            ),
            "purchaseVolume"
          ],
          [
            sequelize.col("StoreUserRole->storeCompliances.earned_rebate"),
            "earnedRebate"
          ],
          [
            sequelize.col("StoreUserRole->storeCompliances.is_qualified"),
            "complianceStatus"
          ],
          [
            sequelize.col("StoreUserRole->ProgramParticipants.program_id"),
            "enrollmentStatus"
          ]
        ],
        include: [
          {
            model: Store,
            as: "StoreUserRole",
            attributes: [],
            required: true,
            include: [
              {
                model: UserRole,
                as: "StoreUserRole",
                attributes: [],
                required: true,
                include: [
                  {
                    model: User,
                    as: "user",
                    attributes: [],
                    required: true
                  }
                ]
              },
              ...(isSalesRepManager
                ? [
                    {
                      model: StoreSalesRep,
                      as: "storeSalesReps",
                      attributes: [],
                      required: true,
                      include: [
                        {
                          model: Distributor,
                          as: "salesRep",
                          attributes: [],
                          required: true,
                          include: [
                            {
                              model: ManagerSalesRepMapping,
                              as: "managerSalesRepMappings",
                              attributes: [],
                              required: true,
                              where: {
                                sales_manager_id: user?.associatedUserId
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                : []),
              {
                model: ProgramCompliance,
                as: "storeCompliances",
                attributes: [],
                required: false,
                where: {
                  ...(programId && { program_id: programId })
                }
              },
              {
                model: ProgramParticipant,
                as: "ProgramParticipants",
                attributes: [],
                required: false,
                where: {
                  ...(programId && { program_id: programId }),
                  entity_type: ENTITY_TYPE.STORE
                }
              }
            ]
          }
        ],
        where: {
          chain_id: chainId
        },
        raw: true
      });

      const stores: ChainStoreType[] = storesQuery.map((store: any) => ({
        storeId: store.storeId,
        storeName: store.storeName || "Unknown Store",
        address: store.address || "Unknown Address",
        purchaseVolume: parseFloat(store.purchaseVolume || "0"),
        earnedRebate: parseFloat(store.earnedRebate || "0"),
        complianceStatus: store.complianceStatus || false,
        enrollmentStatus: !!store.enrollmentStatus
      }));

      // Calculate aggregated metrics
      const totalStores = stores.length;
      const enrolledStores = stores.filter(
        (store) => store.enrollmentStatus
      ).length;
      const compliantStores = stores.filter(
        (store) => store.complianceStatus
      ).length;
      const totalPurchaseVolume = stores.reduce(
        (sum, store) => sum + store.purchaseVolume,
        0
      );
      const totalEarnedRebate = stores.reduce(
        (sum, store) => sum + store.earnedRebate,
        0
      );
      const compliancePercentage =
        totalStores > 0 ? (compliantStores / totalStores) * 100 : 0;

      return {
        chainId: chain.id,
        chainName: chain.name,
        totalStores,
        enrolledStores,
        compliantStores,
        totalPurchaseVolume,
        totalEarnedRebate,
        compliancePercentage,
        stores: includeStoreDetails ? stores : []
      };
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(
          `ChainRepository.getChainDetails: ${error.message}`
        );
      } else {
        throw ApiError.internal(
          "An unknown error occurred in ChainRepository.getChainDetails"
        );
      }
    }
  }

  /**
   * Get chains enrolled in a specific program
   * @param programId - The program ID
   * @param options - Query options for filtering and pagination
   * @returns Promise<EnrolledChain[]>
   */
  public async getEnrolledChainsByProgram(
    programId: number,
    options: ChainQueryOptions = {}
  ): Promise<EnrolledChain[]> {
    try {
      const {
        searchQuery,
        page = 1,
        limit = 10,
        sort = "ASC",
        sortKey = "chain_name"
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause for search
      const whereClause: any = {};
      if (searchQuery) {
        whereClause.name = {
          [Op.iLike]: `%${searchQuery}%`
        };
      }

      // Map sort key to valid column names
      const getSortColumn = (key: string): string => {
        switch (key) {
          case "chain_name":
            return "name";
          case "total_stores":
          case "purchase_volume":
          case "earned_rebate":
          case "compliance_percentage":
            // For metrics not available in this basic query, default to name
            return "name";
          default:
            return "name";
        }
      };

      // Get chains that are directly enrolled in the program via program_participants
      const enrolledChains = await Chain.findAll({
        attributes: ["id", "name"],
        include: [
          {
            model: ProgramParticipant,
            as: "chainEnrollments",
            attributes: [],
            required: true,
            where: {
              programId: programId,
              entityType: ENTITY_TYPE.CHAIN,
              deletedAt: null
            }
          }
        ],
        where: whereClause,
        order: [[getSortColumn(sortKey), sort]],
        limit,
        offset,
        subQuery: false
      });

      // Convert to EnrolledChain format and get detailed chain information
      const results: EnrolledChain[] = await Promise.all(
        enrolledChains.map(async (chain) => {
          const chainDetails = await this.getChainDetails({
            chainId: chain.id,
            options: { programId }
          });
          return {
            chainId: chain.id,
            chainName: chain.name,
            totalStores: chainDetails.totalStores,
            enrolledStores: chainDetails.enrolledStores,
            compliantStores: chainDetails.compliantStores,
            totalPurchaseVolume: chainDetails.totalPurchaseVolume,
            totalEarnedRebate: chainDetails.totalEarnedRebate,
            compliancePercentage: chainDetails.compliancePercentage,
            stores: chainDetails.stores
          };
        })
      );

      return results;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(
          `ChainRepository.getEnrolledChainsByProgram: ${error.message}`
        );
      } else {
        throw ApiError.internal(
          "An unknown error occurred in ChainRepository.getEnrolledChainsByProgram"
        );
      }
    }
  }

  /**
   * Get chains not enrolled in a specific program
   * @param programId - The program ID
   * @param options - Query options for filtering and pagination
   * @returns Promise<UnenrolledChain[]>
   */
  public async getUnenrolledChainsByProgram(
    programId: number,
    options: ChainQueryOptions = {}
  ): Promise<UnenrolledChain[]> {
    try {
      const {
        searchQuery,
        page = 1,
        limit = 10,
        sort = "ASC",
        sortKey = "chain_name"
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause for search
      const whereClause: any = {};
      if (searchQuery) {
        whereClause.name = {
          [Op.iLike]: `%${searchQuery}%`
        };
      }

      // First, get all chain IDs that are enrolled in this program
      const enrolledChainIds = await ProgramParticipant.findAll({
        attributes: ["entityId"],
        where: {
          programId: programId,
          entityType: ENTITY_TYPE.CHAIN,
          deletedAt: null
        },
        raw: true
      }).then((results) => results.map((r) => r.entityId));

      // Add condition to exclude enrolled chains
      if (enrolledChainIds.length > 0) {
        whereClause.id = {
          [Op.notIn]: enrolledChainIds
        };
      }

      // Get chains that are NOT directly enrolled in the program
      const unenrolledChains = await Chain.findAll({
        attributes: [
          "id",
          "name",
          [
            sequelize.fn("COUNT", sequelize.col("StoresForChain.id")),
            "total_stores"
          ],
          [sequelize.literal("0"), "potential_earnings"] // Placeholder for potential earnings calculation
        ],
        include: [
          {
            model: Store,
            as: "StoresForChain",
            attributes: [],
            through: { attributes: [] },
            required: false // Changed to false to include chains even without stores
          }
        ],
        where: whereClause,
        group: ["Chain.id", "Chain.name"],
        order: [[sortKey === "chain_name" ? "name" : "name", sort]], // Default to name for unenrolled chains
        limit,
        offset,
        subQuery: false
      });

      // Convert to UnenrolledChain format
      const results: UnenrolledChain[] = unenrolledChains.map((chain) => ({
        chainId: chain.id,
        chainName: chain.name,
        totalStores: parseInt(chain.getDataValue("total_stores") || "0"),
        potentialEarnings: parseFloat(
          chain.getDataValue("potential_earnings") || "0"
        )
      }));

      return results;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(
          `ChainRepository.getUnenrolledChainsByProgram: ${error.message}`
        );
      } else {
        throw ApiError.internal(
          "An unknown error occurred in ChainRepository.getUnenrolledChainsByProgram"
        );
      }
    }
  }

  /**
   * Get chains that participate in programs for a specific manufacturer
   * @param manufacturerId - The manufacturer ID
   * @param distributorId - The distributor ID
   * @param options - Query options for filtering and pagination
   * @returns Promise<ChainAggregatedData[]>
   */
  public async getChainsByManufacturer(
    manufacturerId: number,
    distributorId: number,
    options: ChainQueryOptions = {}
  ): Promise<ChainAggregatedData[]> {
    try {
      const {
        searchQuery,
        page = 1,
        limit = 10,
        sort = "ASC",
        sortKey = "chain_name"
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause for search
      const whereClause: any = {};
      if (searchQuery) {
        whereClause.name = {
          [Op.iLike]: `%${searchQuery}%`
        };
      }

      // Get chains with stores participating in manufacturer programs
      const chains = await Chain.findAll({
        attributes: ["id", "name"],
        include: [
          {
            model: Store,
            as: "StoresForChain",
            attributes: [],
            through: { attributes: [] },
            required: true,
            include: [
              {
                model: ProgramParticipant,
                as: "ProgramParticipants",
                attributes: [],
                required: true,
                include: [
                  {
                    model: Program,
                    as: "program",
                    attributes: [],
                    required: true,
                    where: {
                      manufacturer_id: manufacturerId
                    }
                  }
                ]
              }
            ]
          }
        ],
        where: whereClause,
        group: ["Chain.id", "Chain.name"],
        order: [[sortKey === "chain_name" ? "name" : "name", sort]], // Default to name for manufacturer chains
        limit,
        offset,
        subQuery: false
      });

      // Get detailed information for each chain
      const results: ChainAggregatedData[] = await Promise.all(
        chains.map(async (chain) => {
          return await this.getChainDetails({
            chainId: chain.id,
            options: {
              includeProgramDetails: true
            }
          });
        })
      );

      return results;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(
          `ChainRepository.getChainsByManufacturer: ${error.message}`
        );
      } else {
        throw ApiError.internal(
          "An unknown error occurred in ChainRepository.getChainsByManufacturer"
        );
      }
    }
  }

  /**
   * Check if a chain exists
   * @param chainId - The chain ID
   * @returns Promise<boolean>
   */
  public async chainExists(chainId: number): Promise<boolean> {
    try {
      const chain = await Chain.findByPk(chainId);
      return !!chain;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(
          `ChainRepository.chainExists: ${error.message}`
        );
      } else {
        throw ApiError.internal(
          "An unknown error occurred in ChainRepository.chainExists"
        );
      }
    }
  }

  /**
   * Get chains with their stores including purchase volume and rebate amounts
   * Now optimized to use the new distributor_id column for faster queries
   * @param options - Query options for filtering, pagination, and sorting
   * @returns Promise<ChainsWithStoresResponse>
   */
  public async getChainsWithStoresByDistributor(
    options: ChainsWithStoresQueryOptions = {}
  ): Promise<ChainsWithStoresResponse> {
    return newrelic.startSegment(
      "ChainRepository.getChainsWithStoresByDistributor",
      true,
      async () => {
        try {
          const {
            distributorId,
            page = 1,
            limit = 10,
            sort = "ASC",
            sortKey = "chain_name",
            searchQuery,
            programTimeline,
            chainIds
          } = options;

          const offset = (page - 1) * limit;

          // Track sort field mapping
          const sortMappingSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributor.mapSortField",
            true,
            async () => {
              // Map sort key to materialized view field
              const sortField = this.mapSortKeyToMaterializedViewField(sortKey);
              return { sortField };
            }
          );

          const { sortField } = await sortMappingSegment;

          // Track materialized view query with proper filtering
          const materializedViewSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributor.materializedViewQuery",
            true,
            async () => {
              const startTime = Date.now();

              // Build where clause for ChainAggregation - note: no distributor_id in materialized view
              const whereClause: any = {};

              if (searchQuery) {
                whereClause.chain_name = {
                  [Op.iLike]: `%${searchQuery}%`
                };
              }

              if (chainIds && chainIds.length > 0) {
                whereClause.chain_id = {
                  [Op.in]: chainIds
                };
              }

              console.log(
                `[PERF] Starting materialized view query at ${new Date().toISOString()}`
              );
              console.log(`[PERF] Where clause:`, JSON.stringify(whereClause));

              // Get chains from materialized view
              const chainsQuery = await ChainAggregation.findAndCountAll({
                where: whereClause,
                order: [[sortField, sort.toUpperCase()]],
                limit,
                offset,
                distinct: true
              });

              const queryTime = Date.now() - startTime;
              console.log(
                `[PERF] Materialized view query completed in ${queryTime}ms, returned ${chainsQuery.rows.length} chains`
              );

              return chainsQuery;
            }
          );

          const chainsQuery = await materializedViewSegment;

          // Filter chains by distributor_id if specified
          let filteredChains = chainsQuery.rows;
          if (distributorId) {
            const chainIdsArray = filteredChains.map((chain) => chain.chainId);
            // Get chains that belong to the specified distributor
            const chainsForDistributor = await Chain.findAll({
              where: {
                id: { [Op.in]: chainIdsArray },
                distributor_id: distributorId
              },
              attributes: ["id"]
            });
            const validChainIds = chainsForDistributor.map((chain) => chain.id);
            filteredChains = filteredChains.filter((chain) =>
              validChainIds.includes(chain.chainId)
            );
            console.log(
              `[DEBUG] Filtered ${chainsQuery.rows.length} chains to ${filteredChains.length} chains for distributor ${distributorId}`
            );
          }

          const chainsWithStores: ChainWithStoresEfficient[] = [];

          // Batch process chains to avoid N+1 queries
          const chainIdsArray = filteredChains.map((chain) => chain.chainId);

          // Track batch data fetching
          const batchDataSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributor.batchDataFetch",
            true,
            async () => {
              const batchStartTime = Date.now();
              console.log(
                `[PERF] Starting batch data fetch for ${chainIdsArray.length} chains`
              );

              // Fetch all programs and store data in batches for better performance
              const [allProgramsData, allStoreIds] = await Promise.all([
                this.getProgramsDataForChains(chainIdsArray, programTimeline),
                this.getStoreIdsForChains(chainIdsArray)
              ]);

              const batchTime = Date.now() - batchStartTime;
              console.log(
                `[PERF] Batch data fetch completed in ${batchTime}ms`
              );
              console.log(
                `[PERF] Programs data: ${allProgramsData.size} chains, Store IDs: ${allStoreIds.size} chains`
              );

              return { allProgramsData, allStoreIds };
            }
          );

          const { allProgramsData, allStoreIds } = await batchDataSegment;

          // Track chain processing
          const chainProcessingSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributor.processChains",
            true,
            async () => {
              const processStartTime = Date.now();
              console.log(
                `[PERF] Starting chain processing for ${filteredChains.length} chains`
              );

              // Batch fetch all store data to avoid N+1 queries
              const uniqueStoreIds = Array.from(
                new Set(
                  filteredChains.flatMap(
                    (chain) => allStoreIds.get(chain.chainId) || []
                  )
                )
              );

              console.log(
                `[PERF] Batch fetching store data for ${uniqueStoreIds.length} unique stores`
              );
              const allStoresData = await this.getSimplifiedStoreDataBatch(
                uniqueStoreIds,
                allProgramsData
              );

              // Process each chain from materialized view
              for (let i = 0; i < filteredChains.length; i++) {
                const chainAggregation = filteredChains[i];
                const chainId = chainAggregation.chainId;
                const programs = allProgramsData.get(chainId) || [];
                const storeIds = allStoreIds.get(chainId) || [];

                // Get stores for this chain from the batch data
                const stores = storeIds
                  .map((storeId: number) =>
                    allStoresData.find((store: any) => store.id === storeId)
                  )
                  .filter(
                    (store): store is ChainWithStoresStoreEfficient =>
                      store !== undefined
                  );

                chainsWithStores.push({
                  id: chainAggregation.chainId,
                  name: chainAggregation.chainName,
                  totalStores: chainAggregation.totalStores,
                  enrolledStores: chainAggregation.enrolledStores,
                  compliantStores: chainAggregation.compliantStores,
                  compliancePercentage: parseFloat(
                    chainAggregation.compliancePercentage.toString()
                  ),
                  totalEarnedRebate: parseFloat(
                    chainAggregation.totalEarnedRebate.toString()
                  ),
                  totalPurchaseVolume: parseFloat(
                    chainAggregation.totalPurchaseVolume.toString()
                  ),
                  programs,
                  stores
                });

                if ((i + 1) % 10 === 0) {
                  console.log(
                    `[PERF] Processed ${i + 1}/${filteredChains.length} chains`
                  );
                }
              }

              const processTime = Date.now() - processStartTime;
              console.log(
                `[PERF] Chain processing completed in ${processTime}ms`
              );
              return chainsWithStores;
            }
          );

          await chainProcessingSegment;

          const totalChains = filteredChains.length;
          const totalPages = Math.ceil(totalChains / limit);
          const totalStores = chainsWithStores.reduce(
            (sum: number, chain: any) =>
              sum + parseInt(chain.totalStores?.toString() || "0"),
            0
          );

          const result: ChainsWithStoresResponse = {
            chains: chainsWithStores,
            pagination: {
              currentPage: page,
              totalPages,
              totalChains,
              totalStores,
              limit,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1
            }
          };

          console.log(
            `[DEBUG] Optimized chains with stores query completed with distributor_id column`
          );

          return result;
        } catch (error) {
          console.error(
            `[ERROR] ChainRepository.getChainsWithStoresByDistributor:`,
            error
          );
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainRepository.getChainsWithStoresByDistributor: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainRepository.getChainsWithStoresByDistributor"
            );
          }
        }
      }
    );
  }

  /**
   * Get chains with stores using materialized view for better performance
   * @param options - Query options
   * @returns Promise<ChainsWithStoresResponse>
   */
  private async getChainsWithStoresByDistributorEfficient(
    options: ChainsWithStoresQueryOptions = {}
  ): Promise<ChainsWithStoresResponse> {
    return newrelic.startSegment(
      "ChainRepository.getChainsWithStoresByDistributorEfficient",
      true,
      async () => {
        const startTime = Date.now();

        try {
          const {
            distributorId,
            page = 1,
            limit = Math.min(options.limit || 10, 50), // Cap at 50 chains per request
            sort = "ASC",
            sortKey = "chain_name",
            searchQuery,
            programTimeline,
            chainIds
          } = options;

          const offset = (page - 1) * limit;

          // Track where clause building
          const whereClauseSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributorEfficient.buildWhereClause",
            true,
            async () => {
              // Build where clause for search and distributor filtering
              const whereClause: any = {};

              // Exclude special chains that should be treated as independent stores
              const excludedChainNames = [
                "Independent Stores",
                "Independent",
                "Unaffiliated",
                "No Chain",
                "N/A"
              ];

              // Build name conditions with exclusions
              const nameConditions: any[] = [];

              // Exclude special chains (case-insensitive)
              excludedChainNames.forEach((name) => {
                nameConditions.push({
                  chainName: { [Op.notILike]: name }
                });
              });

              // Add search condition if provided
              if (searchQuery) {
                nameConditions.push({
                  chainName: { [Op.iLike]: `%${searchQuery}%` }
                });
              }

              // Apply all name conditions
              if (nameConditions.length > 0) {
                whereClause[Op.and] = nameConditions;
              }

              if (chainIds) {
                whereClause[Op.and] = {
                  chainId: { [Op.in]: chainIds }
                };
                console.log("[DEBUG] Chain IDs filter:", whereClause);
              }

              return { whereClause, excludedChainNames, nameConditions };
            }
          );

          const { whereClause, excludedChainNames, nameConditions } =
            await whereClauseSegment;

          // Track sort field mapping
          const sortMappingSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributorEfficient.mapSortField",
            true,
            async () => {
              // Map sort key to materialized view field
              const sortField = this.mapSortKeyToMaterializedViewField(sortKey);
              return { sortField };
            }
          );

          const { sortField } = await sortMappingSegment;

          // Track materialized view query
          const materializedViewSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributorEfficient.materializedViewQuery",
            true,
            async () => {
              // Get chains from materialized view
              const chainsQuery = await ChainAggregation.findAndCountAll({
                where: whereClause,
                order: [[sortField, sort.toUpperCase()]],
                limit,
                offset,
                distinct: true
              });

              console.log(
                `[DEBUG] Materialized view query returned ${chainsQuery.rows.length} chains`
              );

              return chainsQuery;
            }
          );

          const chainsQuery = await materializedViewSegment;

          // Filter chains by distributor_id if specified
          let filteredChains = chainsQuery.rows;
          if (distributorId) {
            const chainIdsArray = filteredChains.map((chain) => chain.chainId);
            // Get chains that belong to the specified distributor
            const chainsForDistributor = await Chain.findAll({
              where: {
                id: { [Op.in]: chainIdsArray },
                distributor_id: distributorId
              },
              attributes: ["id"]
            });
            const validChainIds = chainsForDistributor.map((chain) => chain.id);
            filteredChains = filteredChains.filter((chain) =>
              validChainIds.includes(chain.chainId)
            );
            console.log(
              `[DEBUG] Filtered ${chainsQuery.rows.length} chains to ${filteredChains.length} chains for distributor ${distributorId}`
            );
          }

          const chainsWithStores: ChainWithStoresEfficient[] = [];

          // Batch process chains to avoid N+1 queries
          const chainIdsArray = filteredChains.map((chain) => chain.chainId);

          // Track batch program data fetching
          const batchProgramsSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributorEfficient.getBatchProgramsData",
            true,
            async () => {
              // Get all program data for all chains in one batch
              const allProgramsData =
                await this.getChainProgramsDataBatchEfficient(
                  chainIdsArray,
                  distributorId || undefined,
                  programTimeline
                );
              return allProgramsData;
            }
          );

          const allProgramsData = await batchProgramsSegment;

          // Track batch store IDs fetching
          const batchStoreIdsSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributorEfficient.getBatchStoreIds",
            true,
            async () => {
              // Get all store IDs for all chains in one batch
              const allStoreIds = await this.getStoreIdsForChainsBatch(
                chainIdsArray,
                distributorId || undefined
              );
              return allStoreIds;
            }
          );

          const allStoreIds = await batchStoreIdsSegment;

          // Track chain processing
          const chainProcessingSegment = newrelic.startSegment(
            "getChainsWithStoresByDistributorEfficient.processChains",
            true,
            async () => {
              // Process each chain from materialized view
              for (const chainAggregation of filteredChains) {
                const chainId = chainAggregation.chainId;
                const programs = allProgramsData.get(chainId) || [];
                const storeIds = allStoreIds.get(chainId) || [];

                // Get simplified store data
                const stores = await this.getSimplifiedStoreData(
                  storeIds,
                  programs
                );

                chainsWithStores.push({
                  id: chainAggregation.chainId,
                  name: chainAggregation.chainName,
                  totalStores: chainAggregation.totalStores,
                  enrolledStores: chainAggregation.enrolledStores,
                  compliantStores: chainAggregation.compliantStores,
                  compliancePercentage: parseFloat(
                    chainAggregation.compliancePercentage.toString()
                  ),
                  totalEarnedRebate: parseFloat(
                    chainAggregation.totalEarnedRebate.toString()
                  ),
                  totalPurchaseVolume: parseFloat(
                    chainAggregation.totalPurchaseVolume.toString()
                  ),
                  programs,
                  stores
                });
              }
              return chainsWithStores;
            }
          );

          await chainProcessingSegment;

          const totalChains = filteredChains.length;

          const totalPages = Math.ceil(totalChains / limit);
          const totalStores = chainsWithStores.reduce(
            (sum: number, chain: any) =>
              sum + parseInt(chain.totalStores?.toString() || "0"),
            0
          );

          const duration = Date.now() - startTime;
          console.log(
            `[PERF] Materialized view query completed in ${duration}ms for ${chainsWithStores.length} chains`
          );

          return {
            chains: chainsWithStores,
            pagination: {
              currentPage: page,
              totalPages,
              totalChains,
              totalStores,
              limit,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1
            }
          };
        } catch (error) {
          const duration = Date.now() - startTime;

          // Enhanced error tracking with context
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          newrelic.noticeError(
            error instanceof Error ? error : new Error(errorMessage),
            {
              method: "getChainsWithStoresByDistributorEfficient",
              distributorId: options.distributorId?.toString() || "null",
              page: options.page?.toString() || "1",
              limit: options.limit?.toString() || "10",
              sort: options.sort || "ASC",
              sortKey: options.sortKey || "chain_name",
              searchQuery: options.searchQuery || "null",
              programTimeline: options.programTimeline || "null",
              chainIds: options.chainIds?.join(",") || "null",
              duration_ms: duration,
              errorMessage: errorMessage
            }
          );

          console.error(
            `[PERF] Materialized view query failed after ${duration}ms:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get simplified store data for efficient structure
   * @param storeIds - Array of store IDs
   * @param programs - Array of chain programs to calculate store metrics
   * @returns Promise<ChainWithStoresStoreEfficient[]>
   */
  private async getSimplifiedStoreData(
    storeIds: number[],
    programs: ChainProgramInfo[]
  ): Promise<ChainWithStoresStoreEfficient[]> {
    return newrelic.startSegment(
      "ChainRepository.getSimplifiedStoreData",
      true,
      async () => {
        const startTime = Date.now();
        console.log(
          `[PERF] getSimplifiedStoreData called with ${storeIds.length} stores, ${programs.length} programs`
        );

        try {
          // Add custom attributes for context
          newrelic.addCustomAttributes({
            storeIds_count: storeIds.length,
            programs_count: programs.length,
            storeIds: storeIds.join(",") || "null"
          });

          if (storeIds.length === 0) {
            return [];
          }

          // Track store query execution
          const storeQuerySegment = newrelic.startSegment(
            "getSimplifiedStoreData.executeQuery",
            true,
            async () => {
              const storeQuery = `
                SELECT
                  s.id,
                  s.name,
                  s.external_store_id
                FROM stores s
                WHERE s.id IN (${storeIds.join(",")})
                ORDER BY s.name
              `;

              const storeResults = await sequelize.query(storeQuery, {
                type: QueryTypes.SELECT,
                raw: true
              });

              return storeResults;
            }
          );

          const storeResults = await storeQuerySegment;

          // Track store metrics calculation
          const metricsCalculationSegment = newrelic.startSegment(
            "getSimplifiedStoreData.calculateMetrics",
            true,
            async () => {
              return storeResults.map((store: any) => {
                // Calculate store metrics from programs
                let totalPrograms = 0;
                let enrolledPrograms = 0;
                let compliantPrograms = 0;
                let totalEarnedRebate = 0;
                let totalPurchaseVolume = 0;

                programs.forEach((program) => {
                  const storeCompliance = program.storeCompliance.find(
                    (sc) => sc.storeId === store.id
                  );
                  if (storeCompliance) {
                    totalPrograms++;
                    if (storeCompliance.isEnrolled) enrolledPrograms++;
                    if (storeCompliance.isCompliant) compliantPrograms++;
                    totalEarnedRebate += storeCompliance.earnedRebate;
                    totalPurchaseVolume += storeCompliance.totalPurchaseVolume;
                  }
                });

                return {
                  id: store.id,
                  name: store.name,
                  address: "", // Not available in stores table
                  city: "", // Not available in stores table
                  state: "", // Not available in stores table
                  zip: "", // Not available in stores table
                  phone: "", // Not available in stores table
                  externalStoreId: store.external_store_id || "",
                  totalPrograms,
                  enrolledPrograms,
                  compliantPrograms,
                  totalEarnedRebate,
                  totalPurchaseVolume
                };
              });
            }
          );

          const result = await metricsCalculationSegment;

          const duration = Date.now() - startTime;

          // Add performance metrics
          newrelic.addCustomAttributes({
            "getSimplifiedStoreData.duration_ms": duration,
            "getSimplifiedStoreData.result_count": result.length,
            "getSimplifiedStoreData.store_results_count": storeResults.length
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          // Enhanced error tracking with context
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          newrelic.noticeError(
            error instanceof Error ? error : new Error(errorMessage),
            {
              method: "getSimplifiedStoreData",
              storeIds_count: storeIds.length,
              programs_count: programs.length,
              duration_ms: duration,
              errorMessage: errorMessage
            }
          );

          console.error(
            `[PERF] getSimplifiedStoreData failed after ${duration}ms:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get simplified store data in batch for better performance
   * @param storeIds - Array of store IDs
   * @param allProgramsData - Map of chain programs data
   * @returns Promise<ChainWithStoresStoreEfficient[]>
   */
  private async getSimplifiedStoreDataBatch(
    storeIds: number[],
    allProgramsData: Map<number, ChainProgramInfo[]>
  ): Promise<ChainWithStoresStoreEfficient[]> {
    return newrelic.startSegment(
      "ChainRepository.getSimplifiedStoreDataBatch",
      true,
      async () => {
        const startTime = Date.now();
        console.log(
          `[PERF] getSimplifiedStoreDataBatch called with ${storeIds.length} stores`
        );

        try {
          if (storeIds.length === 0) {
            return [];
          }

          // Track store query execution
          const storeQuerySegment = newrelic.startSegment(
            "getSimplifiedStoreDataBatch.executeQuery",
            true,
            async () => {
              const storeQuery = `
                SELECT
                  s.id,
                  s.name,
                  s.external_store_id
                FROM stores s
                WHERE s.id IN (${storeIds.join(",")})
                ORDER BY s.name
              `;

              const storeResults = await sequelize.query(storeQuery, {
                type: QueryTypes.SELECT,
                raw: true
              });

              return storeResults;
            }
          );

          const storeResults = await storeQuerySegment;

          // Track store metrics calculation
          const metricsCalculationSegment = newrelic.startSegment(
            "getSimplifiedStoreDataBatch.calculateMetrics",
            true,
            async () => {
              return storeResults.map((store: any) => {
                // Calculate store metrics from all programs data
                let totalPrograms = 0;
                let enrolledPrograms = 0;
                let compliantPrograms = 0;
                let totalEarnedRebate = 0;
                let totalPurchaseVolume = 0;

                // Iterate through all programs data to find this store
                allProgramsData.forEach((programs) => {
                  programs.forEach((program) => {
                    const storeCompliance = program.storeCompliance.find(
                      (sc) => sc.storeId === store.id
                    );
                    if (storeCompliance) {
                      totalPrograms++;
                      if (storeCompliance.isEnrolled) enrolledPrograms++;
                      if (storeCompliance.isCompliant) compliantPrograms++;
                      totalEarnedRebate += storeCompliance.earnedRebate;
                      totalPurchaseVolume +=
                        storeCompliance.totalPurchaseVolume;
                    }
                  });
                });

                return {
                  id: store.id,
                  name: store.name,
                  address: "", // Not available in stores table
                  city: "", // Not available in stores table
                  state: "", // Not available in stores table
                  zip: "", // Not available in stores table
                  phone: "", // Not available in stores table
                  externalStoreId: store.external_store_id || "",
                  totalPrograms,
                  enrolledPrograms,
                  compliantPrograms,
                  totalEarnedRebate,
                  totalPurchaseVolume
                };
              });
            }
          );

          const result = await metricsCalculationSegment;

          const duration = Date.now() - startTime;
          console.log(
            `[PERF] getSimplifiedStoreDataBatch completed in ${duration}ms for ${result.length} stores`
          );

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(
            `[PERF] getSimplifiedStoreDataBatch failed after ${duration}ms:`,
            error
          );
          throw error;
        }
      }
    );
  }

  // Removed old inefficient methods:
  // - getStoreDetailsForChain (replaced by efficient approach)
  // - getStoreProgramsData (replaced by getChainProgramsDataEfficient)

  /**
   * Get chain programs data efficiently (avoiding duplication)
   * Fetches unique programs for the chain and their store compliance data
   * @param chainId - The chain ID
   * @param distributorId - Optional distributor ID filter
   * @param programTimeline - Program timeline filter
   * @returns Promise<ChainProgramInfo[]>
   */
  private async getChainProgramsDataEfficient(
    chainId: number,
    distributorId?: number,
    programTimeline?: string
  ): Promise<ChainProgramInfo[]> {
    // Use the chain_program_aggregations materialized view for better performance
    const timelineFilter =
      programTimeline === "Past"
        ? "AND p.end_date < NOW()"
        : programTimeline === "Future"
          ? "AND p.start_date > NOW()"
          : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

    // Query the materialized view for this chain
    const chainProgramsQuery = `
      SELECT
        cpa.program_id,
        cpa.program_name,
        cpa.program_type,
        cpa.program_header,
        cpa.participant_type,
        cpa.payment_term,
        cpa.manufacturer_id,
        cpa.manufacturer_name,
        cpa.manufacturer_logo,
        cpa.manufacturer_authorized,
        cpa.chain_id,
        cpa.chain_name,
        cpa.total_stores,
        cpa.enrolled_stores,
        cpa.compliant_stores,
        cpa.total_purchase_volume,
        cpa.total_earned_rebate,
        cpa.compliance_percentage,
        cpa.is_chain_enrolled,
        pd.id as program_detail_id,
        pd.tier,
        pd.rebate_type,
        pd.rebate_amount,
        pd.rebate_percentage,
        pd.overview,
        pd.criteria,
        pd.min_spend,
        pd.min_qty,
        pd.max_qty,
        pd.products_tags,
        pd.rebate_calculation,
        p.start_date,
        p.end_date
      FROM chain_program_aggregations cpa
      JOIN programs p ON p.id = cpa.program_id
      JOIN program_details pd ON pd.program_id = p.id AND pd.deleted_at IS NULL
      WHERE cpa.chain_id = ${chainId}
        AND p.deleted_at IS NULL
        ${timelineFilter}
        ${
          distributorId
            ? `AND cpa.chain_id IN (
          SELECT DISTINCT cs.chain_id
          FROM chain_stores cs
          JOIN user_roles ur ON ur.associated_user_id = cs.store_id
          WHERE ur.parent_entity_type = 'DISTRIBUTOR'
            AND ur.associated_entity_type = 'STORE'
            AND ur.parent_entity_id = ${distributorId}
        )`
            : ""
        }
      ORDER BY cpa.program_id, pd.id
    `;

    const chainPrograms = (await sequelize.query(chainProgramsQuery, {
      type: QueryTypes.SELECT,
      raw: true
    })) as any[];

    // Get store compliance data for this chain's programs
    const storeComplianceQuery = `
      SELECT
        pc.program_detail_id,
        pc.entity_id as store_id,
        s.name as store_name,
        CASE WHEN pp.id IS NOT NULL THEN true ELSE false END as is_enrolled,
        CASE WHEN pc.is_qualified = true THEN true ELSE false END as is_compliant,
        CASE
          WHEN pc.is_qualified = true THEN 'Compliant'
          WHEN pc.is_qualified = false THEN 'Non-Compliant'
          ELSE 'Pending'
        END as compliance_status,
        COALESCE(pc.earned_rebate, 0) as earned_rebate,
        COALESCE(pc.total_purchase_volume, 0) as total_purchase_volume
      FROM program_compliances pc
      JOIN stores s ON s.id = pc.entity_id
      LEFT JOIN program_participants pp ON pp.entity_id = pc.entity_id
        AND pp.entity_type = 'STORE'
        AND pp.program_id = pc.program_id
        AND pp.deleted_at IS NULL
      WHERE pc.entity_type = 'STORE'
        AND pc.deleted_at IS NULL
        AND pc.program_detail_id IN (
          SELECT pd.id
          FROM program_details pd
          JOIN programs p ON p.id = pd.program_id
          WHERE p.id IN (${chainPrograms.map((cp: any) => cp.program_id).join(",")})
            AND pd.deleted_at IS NULL
        )
        AND pc.entity_id IN (
          SELECT cs.store_id
          FROM chain_stores cs
          WHERE cs.chain_id = ${chainId}
            ${
              distributorId
                ? `AND cs.store_id IN (
              SELECT ur.associated_user_id
              FROM user_roles ur
              WHERE ur.parent_entity_type = 'DISTRIBUTOR'
                AND ur.associated_entity_type = 'STORE'
                AND ur.parent_entity_id = ${distributorId}
            )`
                : ""
            }
        )
      ORDER BY pc.program_detail_id, pc.entity_id
    `;

    const storeCompliance = await sequelize.query(storeComplianceQuery, {
      type: QueryTypes.SELECT,
      raw: true
    });

    // Group store compliance by program detail ID
    const storeComplianceMap = new Map<number, any[]>();
    storeCompliance.forEach((row: any) => {
      const programDetailId = row.program_detail_id;
      if (!storeComplianceMap.has(programDetailId)) {
        storeComplianceMap.set(programDetailId, []);
      }
      storeComplianceMap.get(programDetailId)!.push(row);
    });

    // Build the final program info array
    const programs: ChainProgramInfo[] = [];

    chainPrograms.forEach((chainProgram: any) => {
      const programDetailId = chainProgram.program_detail_id;
      const storeComplianceData = storeComplianceMap.get(programDetailId) || [];

      const program: ChainProgramInfo = {
        id: programDetailId,
        programId: chainProgram.program_id,
        programDetailId,
        name: chainProgram.program_name,
        programType: chainProgram.program_type,
        programHeader: chainProgram.program_header,
        tier: chainProgram.tier || 1,
        paymentTerms: chainProgram.payment_term,
        startDate: chainProgram.start_date,
        endDate: chainProgram.end_date,
        manufacturer: {
          id: chainProgram.manufacturer_id,
          name: chainProgram.manufacturer_name,
          logo: chainProgram.manufacturer_logo || "",
          authorized: chainProgram.manufacturer_authorized || false
        },
        rebateType: chainProgram.rebate_type || "",
        rebateAmount: parseFloat(chainProgram.rebate_amount || "0"),
        rebatePercentage: parseFloat(chainProgram.rebate_percentage || "0"),
        overview: chainProgram.overview || "",
        criteria: chainProgram.criteria || "",
        minSpend: parseFloat(chainProgram.min_spend || "0"),
        minQty: parseInt(chainProgram.min_qty || "0"),
        maxQty: parseInt(chainProgram.max_qty || "0"),
        productsTags: chainProgram.products_tags || "",
        rebateCalculation: chainProgram.rebate_calculation || "",
        storeCompliance: storeComplianceData.map((sc: any) => ({
          storeId: sc.store_id,
          storeName: sc.store_name,
          isEnrolled: sc.is_enrolled,
          isCompliant: sc.is_compliant,
          complianceStatus: sc.compliance_status,
          earnedRebate: parseFloat(sc.earned_rebate || "0"),
          totalPurchaseVolume: parseFloat(sc.total_purchase_volume || "0")
        })),
        totalStores: parseInt(chainProgram.total_stores || "0"),
        enrolledStores: parseInt(chainProgram.enrolled_stores || "0"),
        compliantStores: parseInt(chainProgram.compliant_stores || "0"),
        compliancePercentage: parseFloat(
          chainProgram.compliance_percentage || "0"
        ),
        totalEarnedRebate: parseFloat(chainProgram.total_earned_rebate || "0"),
        totalPurchaseVolume: parseFloat(
          chainProgram.total_purchase_volume || "0"
        )
      };

      programs.push(program);
    });

    return programs;
  }

  /**
   * Helper method to get store IDs for a chain
   * @param chainId - The chain ID
   * @param distributorId - Optional distributor ID filter
   * @returns Promise<number[]>
   */
  private async getStoreIdsForChain(
    chainId: number,
    distributorId?: number
  ): Promise<number[]> {
    const storeQuery = `
      SELECT DISTINCT ur.associated_user_id as store_id
      FROM user_roles ur
      JOIN chain_stores cs ON cs.store_id = ur.associated_user_id
      WHERE cs.chain_id = ${chainId}
        AND ur.associated_entity_type = 'STORE'
        AND ur.parent_entity_type = 'DISTRIBUTOR'
        ${distributorId ? `AND ur.parent_entity_id = ${distributorId}` : ""}
    `;

    const results = await sequelize.query(storeQuery, {
      type: QueryTypes.SELECT,
      raw: true
    });

    return results.map((row: any) => row.store_id);
  }

  /**
   * Batch method to get store IDs for multiple chains
   * @param chainIds - Array of chain IDs
   * @param distributorId - Optional distributor ID filter
   * @returns Promise<Map<number, number[]>>
   */
  private async getStoreIdsForChainsBatch(
    chainIds: number[],
    distributorId?: number
  ): Promise<Map<number, number[]>> {
    if (chainIds.length === 0) {
      return new Map();
    }

    const query = `
      SELECT DISTINCT cs.chain_id, cs.store_id
      FROM chain_stores cs
      JOIN user_roles ur ON ur.associated_user_id = cs.store_id
      WHERE cs.chain_id IN (${chainIds.join(",")})
        AND ur.associated_entity_type = 'STORE'
        AND ur.parent_entity_type = 'DISTRIBUTOR'
        ${distributorId ? `AND ur.parent_entity_id = ${distributorId}` : ""}
      ORDER BY cs.chain_id, cs.store_id
    `;

    const results = (await sequelize.query(query, {
      type: QueryTypes.SELECT,
      raw: true
    })) as any[];

    const storeIdsMap = new Map<number, number[]>();
    results.forEach((row: any) => {
      const chainId = row.chain_id;
      if (!storeIdsMap.has(chainId)) {
        storeIdsMap.set(chainId, []);
      }
      storeIdsMap.get(chainId)!.push(row.store_id);
    });

    return storeIdsMap;
  }

  /**
   * Batch method to get program data for multiple chains using materialized view
   * @param chainIds - Array of chain IDs
   * @param distributorId - Optional distributor ID filter
   * @param programTimeline - Program timeline filter
   * @returns Promise<Map<number, ChainProgramInfo[]>>
   */
  private async getChainProgramsDataBatchEfficient(
    chainIds: number[],
    distributorId?: number,
    programTimeline?: string
  ): Promise<Map<number, ChainProgramInfo[]>> {
    if (chainIds.length === 0) {
      return new Map();
    }

    // Use the chain_program_aggregations materialized view for better performance
    const timelineFilter =
      programTimeline === "Past"
        ? "AND p.end_date < NOW()"
        : programTimeline === "Future"
          ? "AND p.start_date > NOW()"
          : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

    // Query the materialized view for all chains
    const chainProgramsQuery = `
      SELECT
        cpa.program_id,
        cpa.program_name,
        cpa.program_type,
        cpa.program_header,
        cpa.participant_type,
        cpa.payment_term,
        cpa.manufacturer_id,
        cpa.manufacturer_name,
        cpa.manufacturer_logo,
        cpa.manufacturer_authorized,
        cpa.chain_id,
        cpa.chain_name,
        cpa.total_stores,
        cpa.enrolled_stores,
        cpa.compliant_stores,
        cpa.total_purchase_volume,
        cpa.total_earned_rebate,
        cpa.compliance_percentage,
        cpa.is_chain_enrolled,
        pd.id as program_detail_id,
        pd.tier,
        pd.rebate_type,
        pd.rebate_amount,
        pd.rebate_percentage,
        pd.overview,
        pd.criteria,
        pd.min_spend,
        pd.min_qty,
        pd.max_qty,
        pd.products_tags,
        pd.rebate_calculation,
        p.start_date,
        p.end_date
      FROM chain_program_aggregations cpa
      JOIN programs p ON p.id = cpa.program_id
      JOIN program_details pd ON pd.program_id = p.id AND pd.deleted_at IS NULL
      WHERE cpa.chain_id IN (${chainIds.join(",")})
        AND p.deleted_at IS NULL
        ${timelineFilter}
        ${
          distributorId
            ? `AND cpa.chain_id IN (
          SELECT DISTINCT cs.chain_id
          FROM chain_stores cs
          JOIN user_roles ur ON ur.associated_user_id = cs.store_id
          WHERE ur.parent_entity_type = 'DISTRIBUTOR'
            AND ur.associated_entity_type = 'STORE'
            AND ur.parent_entity_id = ${distributorId}
        )`
            : ""
        }
      ORDER BY cpa.chain_id, cpa.program_id, pd.id
    `;

    const chainPrograms = (await sequelize.query(chainProgramsQuery, {
      type: QueryTypes.SELECT,
      raw: true
    })) as any[];

    // Get store compliance data for all chains' programs
    const programIds = [
      ...new Set(chainPrograms.map((cp: any) => cp.program_id))
    ];

    if (programIds.length === 0) {
      return new Map();
    }

    const storeComplianceQuery = `
      SELECT
        pc.program_detail_id,
        pc.entity_id as store_id,
        s.name as store_name,
        CASE WHEN pp.id IS NOT NULL THEN true ELSE false END as is_enrolled,
        CASE WHEN pc.is_qualified = true THEN true ELSE false END as is_compliant,
        CASE
          WHEN pc.is_qualified = true THEN 'Compliant'
          WHEN pc.is_qualified = false THEN 'Non-Compliant'
          ELSE 'Pending'
        END as compliance_status,
        COALESCE(pc.earned_rebate, 0) as earned_rebate,
        COALESCE(pc.total_purchase_volume, 0) as total_purchase_volume
      FROM program_compliances pc
      JOIN stores s ON s.id = pc.entity_id
      LEFT JOIN program_participants pp ON pp.entity_id = pc.entity_id
        AND pp.entity_type = 'STORE'
        AND pp.program_id = pc.program_id
        AND pp.deleted_at IS NULL
      WHERE pc.entity_type = 'STORE'
        AND pc.deleted_at IS NULL
        AND pc.program_detail_id IN (
          SELECT pd.id
          FROM program_details pd
          JOIN programs p ON p.id = pd.program_id
          WHERE p.id IN (${programIds.join(",")})
            AND pd.deleted_at IS NULL
        )
        AND pc.entity_id IN (
          SELECT cs.store_id
          FROM chain_stores cs
          WHERE cs.chain_id IN (${chainIds.join(",")})
            ${
              distributorId
                ? `AND cs.store_id IN (
              SELECT ur.associated_user_id
              FROM user_roles ur
              WHERE ur.parent_entity_type = 'DISTRIBUTOR'
                AND ur.associated_entity_type = 'STORE'
                AND ur.parent_entity_id = ${distributorId}
            )`
                : ""
            }
        )
      ORDER BY pc.program_detail_id, pc.entity_id
    `;

    const storeCompliance = (await sequelize.query(storeComplianceQuery, {
      type: QueryTypes.SELECT,
      raw: true
    })) as any[];

    // Group store compliance by program detail ID
    const storeComplianceMap = new Map<number, any[]>();
    storeCompliance.forEach((row: any) => {
      const programDetailId = row.program_detail_id;
      if (!storeComplianceMap.has(programDetailId)) {
        storeComplianceMap.set(programDetailId, []);
      }
      storeComplianceMap.get(programDetailId)!.push(row);
    });

    // Group programs by chain ID
    const programsMap = new Map<number, ChainProgramInfo[]>();

    chainPrograms.forEach((chainProgram: any) => {
      const chainId = chainProgram.chain_id;
      const programDetailId = chainProgram.program_detail_id;
      const storeComplianceData = storeComplianceMap.get(programDetailId) || [];

      if (!programsMap.has(chainId)) {
        programsMap.set(chainId, []);
      }

      const program: ChainProgramInfo = {
        id: programDetailId,
        programId: chainProgram.program_id,
        programDetailId,
        name: chainProgram.program_name,
        programType: chainProgram.program_type,
        programHeader: chainProgram.program_header,
        tier: chainProgram.tier || 1,
        paymentTerms: chainProgram.payment_term,
        startDate: chainProgram.start_date,
        endDate: chainProgram.end_date,
        manufacturer: {
          id: chainProgram.manufacturer_id,
          name: chainProgram.manufacturer_name,
          logo: chainProgram.manufacturer_logo || "",
          authorized: chainProgram.manufacturer_authorized || false
        },
        rebateType: chainProgram.rebate_type || "",
        rebateAmount: parseFloat(chainProgram.rebate_amount || "0"),
        rebatePercentage: parseFloat(chainProgram.rebate_percentage || "0"),
        overview: chainProgram.overview || "",
        criteria: chainProgram.criteria || "",
        minSpend: parseFloat(chainProgram.min_spend || "0"),
        minQty: parseInt(chainProgram.min_qty || "0"),
        maxQty: parseInt(chainProgram.max_qty || "0"),
        productsTags: chainProgram.products_tags || "",
        rebateCalculation: chainProgram.rebate_calculation || "",
        storeCompliance: storeComplianceData.map((sc: any) => ({
          storeId: sc.store_id,
          storeName: sc.store_name,
          isEnrolled: sc.is_enrolled,
          isCompliant: sc.is_compliant,
          complianceStatus: sc.compliance_status,
          earnedRebate: parseFloat(sc.earned_rebate || "0"),
          totalPurchaseVolume: parseFloat(sc.total_purchase_volume || "0")
        })),
        totalStores: parseInt(chainProgram.total_stores || "0"),
        enrolledStores: parseInt(chainProgram.enrolled_stores || "0"),
        compliantStores: parseInt(chainProgram.compliant_stores || "0"),
        compliancePercentage: parseFloat(
          chainProgram.compliance_percentage || "0"
        ),
        totalEarnedRebate: parseFloat(chainProgram.total_earned_rebate || "0"),
        totalPurchaseVolume: parseFloat(
          chainProgram.total_purchase_volume || "0"
        )
      };

      programsMap.get(chainId)!.push(program);
    });

    return programsMap;
  }

  /**
   * Get programs data for chains
   * @param chainIds - Array of chain IDs
   * @param programTimeline - Program timeline filter
   * @returns Promise<Map<number, ChainProgramInfo[]>>
   */
  private async getProgramsDataForChains(
    chainIds: number[],
    programTimeline?: string
  ): Promise<Map<number, ChainProgramInfo[]>> {
    if (chainIds.length === 0) {
      return new Map();
    }

    // Use the chain_program_aggregations materialized view for better performance
    const timelineFilter =
      programTimeline === "Past"
        ? "AND p.end_date < NOW()"
        : programTimeline === "Future"
          ? "AND p.start_date > NOW()"
          : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

    // Query the materialized view for all chains
    const chainProgramsQuery = `
      SELECT
        cpa.program_id,
        cpa.program_name,
        cpa.program_type,
        cpa.program_header,
        cpa.participant_type,
        cpa.payment_term,
        cpa.manufacturer_id,
        cpa.manufacturer_name,
        cpa.manufacturer_logo,
        cpa.manufacturer_authorized,
        cpa.chain_id,
        cpa.chain_name,
        cpa.total_stores,
        cpa.enrolled_stores,
        cpa.compliant_stores,
        cpa.total_purchase_volume,
        cpa.total_earned_rebate,
        cpa.compliance_percentage,
        cpa.is_chain_enrolled,
        pd.id as program_detail_id,
        pd.tier,
        pd.rebate_type,
        pd.rebate_amount,
        pd.rebate_percentage,
        pd.overview,
        pd.criteria,
        pd.min_spend,
        pd.min_qty,
        pd.max_qty,
        pd.products_tags,
        pd.rebate_calculation,
        p.start_date,
        p.end_date
      FROM chain_program_aggregations cpa
      JOIN programs p ON p.id = cpa.program_id
      JOIN program_details pd ON pd.program_id = p.id AND pd.deleted_at IS NULL
      WHERE cpa.chain_id IN (${chainIds.join(",")})
        AND p.deleted_at IS NULL
        ${timelineFilter}
      ORDER BY cpa.chain_id, cpa.program_id, pd.id
    `;

    const chainPrograms = (await sequelize.query(chainProgramsQuery, {
      type: QueryTypes.SELECT,
      raw: true
    })) as any[];

    // Get store compliance data for all chains' programs
    const programIds = [
      ...new Set(chainPrograms.map((cp: any) => cp.program_id))
    ];

    if (programIds.length === 0) {
      return new Map();
    }

    const storeComplianceQuery = `
      SELECT
        pc.program_detail_id,
        pc.entity_id as store_id,
        s.name as store_name,
        CASE WHEN pp.id IS NOT NULL THEN true ELSE false END as is_enrolled,
        CASE WHEN pc.is_qualified = true THEN true ELSE false END as is_compliant,
        CASE
          WHEN pc.is_qualified = true THEN 'Compliant'
          WHEN pc.is_qualified = false THEN 'Non-Compliant'
          ELSE 'Pending'
        END as compliance_status,
        COALESCE(pc.earned_rebate, 0) as earned_rebate,
        COALESCE(pc.total_purchase_volume, 0) as total_purchase_volume
      FROM program_compliances pc
      JOIN stores s ON s.id = pc.entity_id
      LEFT JOIN program_participants pp ON pp.entity_id = pc.entity_id
        AND pp.entity_type = 'STORE'
        AND pp.program_id = pc.program_id
        AND pp.deleted_at IS NULL
      WHERE pc.entity_type = 'STORE'
        AND pc.deleted_at IS NULL
        AND pc.program_detail_id IN (
          SELECT pd.id
          FROM program_details pd
          JOIN programs p ON p.id = pd.program_id
          WHERE p.id IN (${programIds.join(",")})
            AND pd.deleted_at IS NULL
        )
        AND pc.entity_id IN (
          SELECT cs.store_id
          FROM chain_stores cs
          WHERE cs.chain_id IN (${chainIds.join(",")})
        )
      ORDER BY pc.program_detail_id, pc.entity_id
    `;

    const storeCompliance = (await sequelize.query(storeComplianceQuery, {
      type: QueryTypes.SELECT,
      raw: true
    })) as any[];

    // Group store compliance by program detail ID
    const storeComplianceMap = new Map<number, any[]>();
    storeCompliance.forEach((row: any) => {
      const programDetailId = row.program_detail_id;
      if (!storeComplianceMap.has(programDetailId)) {
        storeComplianceMap.set(programDetailId, []);
      }
      storeComplianceMap.get(programDetailId)!.push(row);
    });

    // Group programs by chain ID
    const programsMap = new Map<number, ChainProgramInfo[]>();

    chainPrograms.forEach((chainProgram: any) => {
      const chainId = chainProgram.chain_id;
      const programDetailId = chainProgram.program_detail_id;
      const storeComplianceData = storeComplianceMap.get(programDetailId) || [];

      if (!programsMap.has(chainId)) {
        programsMap.set(chainId, []);
      }

      const program: ChainProgramInfo = {
        id: programDetailId,
        programId: chainProgram.program_id,
        programDetailId,
        name: chainProgram.program_name,
        programType: chainProgram.program_type,
        programHeader: chainProgram.program_header,
        tier: chainProgram.tier || 1,
        paymentTerms: chainProgram.payment_term,
        startDate: chainProgram.start_date,
        endDate: chainProgram.end_date,
        manufacturer: {
          id: chainProgram.manufacturer_id,
          name: chainProgram.manufacturer_name,
          logo: chainProgram.manufacturer_logo || "",
          authorized: chainProgram.manufacturer_authorized || false
        },
        rebateType: chainProgram.rebate_type || "",
        rebateAmount: parseFloat(chainProgram.rebate_amount || "0"),
        rebatePercentage: parseFloat(chainProgram.rebate_percentage || "0"),
        overview: chainProgram.overview || "",
        criteria: chainProgram.criteria || "",
        minSpend: parseFloat(chainProgram.min_spend || "0"),
        minQty: parseInt(chainProgram.min_qty || "0"),
        maxQty: parseInt(chainProgram.max_qty || "0"),
        productsTags: chainProgram.products_tags || "",
        rebateCalculation: chainProgram.rebate_calculation || "",
        storeCompliance: storeComplianceData.map((sc: any) => ({
          storeId: sc.store_id,
          storeName: sc.store_name,
          isEnrolled: sc.is_enrolled,
          isCompliant: sc.is_compliant,
          complianceStatus: sc.compliance_status,
          earnedRebate: parseFloat(sc.earned_rebate || "0"),
          totalPurchaseVolume: parseFloat(sc.total_purchase_volume || "0")
        })),
        totalStores: parseInt(chainProgram.total_stores || "0"),
        enrolledStores: parseInt(chainProgram.enrolled_stores || "0"),
        compliantStores: parseInt(chainProgram.compliant_stores || "0"),
        compliancePercentage: parseFloat(
          chainProgram.compliance_percentage || "0"
        ),
        totalEarnedRebate: parseFloat(chainProgram.total_earned_rebate || "0"),
        totalPurchaseVolume: parseFloat(
          chainProgram.total_purchase_volume || "0"
        )
      };

      programsMap.get(chainId)!.push(program);
    });

    return programsMap;
  }

  /**
   * Get store IDs for chains
   * @param chainIds - Array of chain IDs
   * @returns Promise<Map<number, number[]>>
   */
  private async getStoreIdsForChains(
    chainIds: number[]
  ): Promise<Map<number, number[]>> {
    if (chainIds.length === 0) {
      return new Map();
    }

    const query = `
      SELECT DISTINCT cs.chain_id, cs.store_id
      FROM chain_stores cs
      WHERE cs.chain_id IN (${chainIds.join(",")})
      ORDER BY cs.chain_id, cs.store_id
    `;

    const results = (await sequelize.query(query, {
      type: QueryTypes.SELECT,
      raw: true
    })) as any[];

    const storeIdsMap = new Map<number, number[]>();
    results.forEach((row: any) => {
      const chainId = row.chain_id;
      if (!storeIdsMap.has(chainId)) {
        storeIdsMap.set(chainId, []);
      }
      storeIdsMap.get(chainId)!.push(row.store_id);
    });

    return storeIdsMap;
  }

  /**
   * Map sort key to materialized view field
   * @param sortKey - The sort key from the API
   * @returns string - The actual database field in materialized view
   */
  private mapSortKeyToMaterializedViewField(sortKey: string): string {
    switch (sortKey) {
      case "sort":
        return "chainName";
      case "purchaseSort":
        return "totalPurchaseVolume";
      case "estimatedSavings":
        return "totalEarnedRebate";
      case "storeCountSort":
        return "totalStores";
      case "chain_name":
        return "chainName";
      case "total_stores":
        return "totalStores";
      case "total_purchase_volume":
        return "totalPurchaseVolume";
      case "total_rebate_amount":
        return "totalEarnedRebate";
      case "compliance_percentage":
        return "compliancePercentage";
      default:
        return "chainName";
    }
  }

  /**
   * Map sort key to actual database field (legacy method)
   * @param sortKey - The sort key from the API
   * @returns string - The actual database field or expression
   */
  private mapSortKeyToField(sortKey: string): any {
    switch (sortKey) {
      case "chain_name":
        return "name";
      case "total_stores":
        return "name"; // Store count sorting will be handled in application layer
      case "total_rebate_amount":
        return "name"; // Rebate amount sorting will be handled in application layer
      // Purchase volume sorting will be handled in application layer
      case "total_purchase_volume":
        return "name"; // Default to name sorting for now
      default:
        return "name";
    }
  }

  /**
   * Get lightweight chain listing using materialized view
   * @param options - Query options for filtering, pagination, and sorting
   * @returns Promise<ChainsWithStoresLightweightResponse>
   */
  public async getChainListingLightweight(
    options: ChainsWithStoresQueryOptions = {}
  ): Promise<ChainsWithStoresLightweightResponse> {
    return newrelic.startSegment(
      "ChainRepository.getChainListingLightweight",
      true,
      async () => {
        try {
          const {
            distributorId,
            page = 1,
            limit = 10,
            sort = "ASC",
            sortKey = "sort",
            searchQuery,
            programTimeline
          } = options;

          const offset = (page - 1) * limit;

          // Map sort key to materialized view field
          const sortField = this.mapSortKeyToMaterializedViewField(sortKey);

          // Build where clause
          const whereClause: any = {};

          if (searchQuery) {
            whereClause.chain_name = {
              [Op.iLike]: `%${searchQuery}%`
            };
          }

          // Add distributor filter directly to materialized view
          if (distributorId) {
            whereClause.distributor_id = distributorId;
          }

          console.log(
            `[PERF] Starting lightweight chain listing query at ${new Date().toISOString()}`
          );

          // Get chains from materialized view (lightweight)
          const chainsQuery = await ChainAggregation.findAndCountAll({
            where: whereClause,
            order: [[sortField, sort.toUpperCase()]],
            limit,
            offset,
            distinct: true
          });

          console.log(
            `[PERF] Materialized view query completed in ${Date.now()}ms, returned ${chainsQuery.rows.length} chains`
          );

          // Convert to lightweight format
          const chainsWithStores: ChainWithStoresLightweight[] =
            chainsQuery.rows.map((chainAggregation) => ({
              id: chainAggregation.chainId,
              name: chainAggregation.chainName,
              totalStores: chainAggregation.totalStores,
              enrolledStores: chainAggregation.enrolledStores,
              compliantStores: chainAggregation.compliantStores,
              compliancePercentage: parseFloat(
                chainAggregation.compliancePercentage.toString()
              ),
              totalEarnedRebate: parseFloat(
                chainAggregation.totalEarnedRebate.toString()
              ),
              totalPurchaseVolume: parseFloat(
                chainAggregation.totalPurchaseVolume.toString()
              ),
              programCount: 0, // Will be calculated if needed
              storeCount: chainAggregation.totalStores
            }));

          const totalChains = chainsQuery.count;
          const totalPages = Math.ceil(totalChains / limit);
          const totalStores = chainsWithStores.reduce(
            (sum: number, chain: any) =>
              sum + parseInt(chain.totalStores?.toString() || "0"),
            0
          );

          const result: ChainsWithStoresLightweightResponse = {
            chains: chainsWithStores,
            pagination: {
              currentPage: page,
              totalPages,
              totalChains,
              totalStores,
              limit,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1
            }
          };

          console.log(
            `[PERF] Lightweight chain listing completed in ${Date.now()}ms for ${chainsWithStores.length} chains`
          );

          return result;
        } catch (error) {
          console.error(
            `[ERROR] ChainRepository.getChainListingLightweight:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get detailed chain information by ID
   * @param options - Query options for chain details
   * @returns Promise<ChainDetailsResponse>
   */
  public async getChainDetailsById(
    options: ChainDetailsQueryOptions
  ): Promise<ChainDetailsResponse> {
    return newrelic.startSegment(
      "ChainRepository.getChainDetailsById",
      true,
      async () => {
        try {
          const {
            chainId,
            distributorId,
            programTimeline,
            includePrograms = false,
            includeStores = false,
            includeManufacturerSummaries = false
          } = options;

          console.log(
            `[PERF] Starting chain details query for chain ${chainId}`
          );

          // Get basic chain data from materialized view
          const chainAggregation = await ChainAggregation.findOne({
            where: { chainId }
          });

          if (!chainAggregation) {
            throw ApiError.notFound("Chain not found");
          }

          // Verify distributor access if specified
          if (
            distributorId &&
            chainAggregation.distributorId !== distributorId
          ) {
            throw ApiError.authorizationFailed("Access denied to this chain");
          }

          // Build response with basic data
          const chainDetails: ChainDetailsResponse = {
            id: chainAggregation.chainId,
            name: chainAggregation.chainName,
            distributorId: chainAggregation.distributorId,
            totalStores: chainAggregation.totalStores,
            enrolledStores: chainAggregation.enrolledStores,
            compliantStores: chainAggregation.compliantStores,
            compliancePercentage: parseFloat(
              chainAggregation.compliancePercentage.toString()
            ),
            totalEarnedRebate: parseFloat(
              chainAggregation.totalEarnedRebate.toString()
            ),
            totalPurchaseVolume: parseFloat(
              chainAggregation.totalPurchaseVolume.toString()
            )
          };

          // Fetch detailed data only if requested
          if (
            includePrograms ||
            includeStores ||
            includeManufacturerSummaries
          ) {
            const [programs, stores, manufacturerSummaries] = await Promise.all(
              [
                includePrograms
                  ? this.getChainProgramsDataEfficient(
                      chainId,
                      distributorId,
                      programTimeline
                    )
                  : Promise.resolve([]),
                includeStores
                  ? this.getSimplifiedStoreData(
                      await this.getStoreIdsForChain(chainId, distributorId),
                      []
                    )
                  : Promise.resolve([]),
                includeManufacturerSummaries
                  ? this.getManufacturerSummariesForChain(
                      chainId,
                      distributorId,
                      programTimeline
                    )
                  : Promise.resolve([])
              ]
            );

            if (includePrograms) {
              chainDetails.programs = programs;
            }

            if (includeStores) {
              chainDetails.stores = stores;
            }

            if (includeManufacturerSummaries) {
              chainDetails.manufacturerSummaries = manufacturerSummaries;
            }
          }

          console.log(
            `[PERF] Chain details query completed for chain ${chainId}`
          );

          return chainDetails;
        } catch (error) {
          console.error(`[ERROR] ChainRepository.getChainDetailsById:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Get programs for a specific chain with pagination and filtering
   * @param options - Query options for chain programs
   * @returns Promise<ChainProgramsResponse>
   */
  public async getChainPrograms(
    options: ChainProgramsQueryOptions
  ): Promise<ChainProgramsResponse> {
    return newrelic.startSegment(
      "ChainRepository.getChainPrograms",
      true,
      async () => {
        try {
          const {
            chainId,
            distributorId,
            programTimeline,
            page = 1,
            limit = 10,
            sort = "ASC",
            sortKey = "program_name",
            searchQuery
          } = options;

          console.log(
            `[PERF] Starting chain programs query for chain ${chainId}`
          );

          // Verify chain exists and distributor has access
          const chainAggregation = await ChainAggregation.findOne({
            where: { chainId }
          });

          if (!chainAggregation) {
            throw ApiError.notFound("Chain not found");
          }

          if (
            distributorId &&
            chainAggregation.distributorId !== distributorId
          ) {
            throw ApiError.authorizationFailed("Access denied to this chain");
          }

          // Get all programs for this chain first
          const allPrograms = await this.getChainProgramsDataEfficient(
            chainId,
            distributorId,
            programTimeline
          );

          // Apply search filter if provided
          let filteredPrograms = allPrograms;
          if (searchQuery) {
            filteredPrograms = allPrograms.filter(
              (program) =>
                program.name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                program.manufacturer.name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
            );
          }

          // Apply sorting
          const sortedPrograms = this.sortChainPrograms(
            filteredPrograms,
            sortKey,
            sort
          );

          // Apply pagination
          const offset = (page - 1) * limit;
          const paginatedPrograms = sortedPrograms.slice(
            offset,
            offset + limit
          );

          const totalPrograms = filteredPrograms.length;
          const totalPages = Math.ceil(totalPrograms / limit);

          const result: ChainProgramsResponse = {
            programs: paginatedPrograms,
            pagination: {
              currentPage: page,
              totalPages,
              totalPrograms,
              limit,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1
            }
          };

          console.log(
            `[PERF] Chain programs query completed for chain ${chainId}, returned ${paginatedPrograms.length} programs`
          );

          return result;
        } catch (error) {
          console.error(`[ERROR] ChainRepository.getChainPrograms:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Get stores for a specific chain with pagination and filtering
   * @param options - Query options for chain stores
   * @returns Promise<ChainStoresResponse>
   */
  public async getChainStores(
    options: ChainStoresQueryOptions
  ): Promise<ChainStoresResponse> {
    return newrelic.startSegment(
      "ChainRepository.getChainStores",
      true,
      async () => {
        try {
          const {
            chainId,
            distributorId,
            manufacturerId,
            programTimeline,
            page = 1,
            limit = 10,
            sort = "ASC",
            sortKey = "name",
            searchQuery
          } = options;

          console.log(
            `[PERF] Starting chain stores query for chain ${chainId}${manufacturerId ? ` with manufacturer ${manufacturerId}` : ""}`
          );

          // Verify chain exists and distributor has access
          const chainAggregation = await ChainAggregation.findOne({
            where: { chainId }
          });

          if (!chainAggregation) {
            throw ApiError.notFound("Chain not found");
          }

          if (
            distributorId &&
            chainAggregation.distributorId !== distributorId
          ) {
            throw ApiError.authorizationFailed("Access denied to this chain");
          }

          // Get store IDs for this chain
          const storeIds = await this.getStoreIdsForChain(
            chainId,
            distributorId
          );

          if (storeIds.length === 0) {
            return {
              stores: [],
              pagination: {
                currentPage: page,
                totalPages: 0,
                totalStores: 0,
                limit,
                hasNextPage: false,
                hasPrevPage: false
              }
            };
          }

          // Get detailed store data with purchase volumes, optionally filtered by manufacturer
          const allStores = await this.getStoreDataWithPurchaseVolumes(
            storeIds,
            manufacturerId,
            distributorId
          );

          // Apply search filter if provided
          let filteredStores = allStores;
          if (searchQuery) {
            filteredStores = allStores.filter(
              (store) =>
                store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                store.address.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }

          // Apply sorting
          const sortedStores = this.sortChainStores(
            filteredStores,
            sortKey,
            sort
          );

          // Apply pagination
          const offset = (page - 1) * limit;
          const paginatedStores = sortedStores.slice(offset, offset + limit);

          const totalStores = filteredStores.length;
          const totalPages = Math.ceil(totalStores / limit);

          const result: ChainStoresResponse = {
            stores: paginatedStores,
            pagination: {
              currentPage: page,
              totalPages,
              totalStores,
              limit,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1
            }
          };

          console.log(
            `[PERF] Chain stores query completed for chain ${chainId}, returned ${paginatedStores.length} stores`
          );

          return result;
        } catch (error) {
          console.error(`[ERROR] ChainRepository.getChainStores:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Sort chain programs based on sort key and direction
   * @param programs - Array of chain programs to sort
   * @param sortKey - The field to sort by
   * @param sort - Sort direction (ASC or DESC)
   * @returns ChainProgramInfo[] - Sorted array of programs
   */
  private sortChainPrograms(
    programs: ChainProgramInfo[],
    sortKey: string,
    sort: string
  ): ChainProgramInfo[] {
    return [...programs].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortKey) {
        case "program_name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "manufacturer_name":
          aValue = a.manufacturer.name.toLowerCase();
          bValue = b.manufacturer.name.toLowerCase();
          break;
        case "compliance_percentage":
          aValue = a.compliancePercentage;
          bValue = b.compliancePercentage;
          break;
        case "total_earned_rebate":
          aValue = a.totalEarnedRebate;
          bValue = b.totalEarnedRebate;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sort === "ASC") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }

  /**
   * Sort chain stores based on sort key and direction
   * @param stores - Array of chain stores to sort
   * @param sortKey - The field to sort by
   * @param sort - Sort direction (ASC or DESC)
   * @returns ChainWithStoresStoreEfficient[] - Sorted array of stores
   */
  private sortChainStores(
    stores: ChainWithStoresStoreEfficient[],
    sortKey: string,
    sort: string
  ): ChainWithStoresStoreEfficient[] {
    return [...stores].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortKey) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "total_programs":
          aValue = a.totalPrograms;
          bValue = b.totalPrograms;
          break;
        case "enrolled_programs":
          aValue = a.enrolledPrograms;
          bValue = b.enrolledPrograms;
          break;
        case "compliant_programs":
          aValue = a.compliantPrograms;
          bValue = b.compliantPrograms;
          break;
        case "total_earned_rebate":
          aValue = a.totalEarnedRebate;
          bValue = b.totalEarnedRebate;
          break;
        case "total_purchase_volume":
          aValue = a.totalPurchaseVolume;
          bValue = b.totalPurchaseVolume;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sort === "ASC") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }

  /**
   * Get chains for a specific manufacturer with pagination and filtering
   * @param options - Query options for manufacturer chains
   * @returns Promise<ManufacturerChainsResponse>
   */
  public async getManufacturerChains(
    options: ManufacturerChainsQueryOptions
  ): Promise<ManufacturerChainsResponse> {
    return newrelic.startSegment(
      "ChainRepository.getManufacturerChains",
      true,
      async () => {
        try {
          const {
            manufacturerId,
            distributorId,
            programTimeline,
            page = 1,
            limit = 10,
            sort = "ASC",
            sortKey = "chain_name",
            searchQuery
          } = options;

          console.log(
            `[PERF] Starting manufacturer chains query for manufacturer ${manufacturerId}`
          );

          // Validate sort parameters to prevent SQL injection
          const validSortKeys = [
            "chain_name",
            "total_stores",
            "enrolled_stores",
            "compliant_stores",
            "total_purchase_volume",
            "total_earned_rebate",
            "program_count",
            "compliance_percentage"
          ];
          const validSortOrders = ["ASC", "DESC"];

          const safeSortKey = validSortKeys.includes(sortKey)
            ? sortKey
            : "chain_name";
          const safeSortOrder = validSortOrders.includes(sort.toUpperCase())
            ? sort.toUpperCase()
            : "ASC";

          // Get valid program IDs for this manufacturer and distributor
          const distributorStores =
            await StoreRepository.getStoreIdsByDistributorId(distributorId);
          const storeIds = distributorStores.map(
            (store: any) => store.associatedUserId
          );

          if (!storeIds.length) {
            return {
              chains: [],
              pagination: {
                currentPage: page,
                totalPages: 0,
                totalChains: 0,
                limit,
                hasNextPage: false,
                hasPrevPage: false
              }
            };
          }

          const validProgramIds =
            await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
              participantType: ENTITY_TYPE.STORE,
              creatorIds: [manufacturerId],
              creatorType: ENTITY_TYPE.MANUFACTURER,
              secondaryCreatorIds: [distributorId],
              secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
              visibilityEntitieIds: storeIds,
              programTimeline,
              distributorId
            });

          if (!validProgramIds.length) {
            return {
              chains: [],
              pagination: {
                currentPage: page,
                totalPages: 0,
                totalChains: 0,
                limit,
                hasNextPage: false,
                hasPrevPage: false
              }
            };
          }

          // Build timeline filter
          const timelineFilter =
            programTimeline === "Past"
              ? "AND p.end_date < NOW()"
              : programTimeline === "Future"
                ? "AND p.start_date > NOW()"
                : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

          // Query chains for this manufacturer using materialized view
          const chainsQuery = `
            SELECT DISTINCT
              c.id as chain_id,
              c.name as chain_name,
              COUNT(DISTINCT cs.store_id) as total_stores,
              COUNT(DISTINCT CASE WHEN pp.id IS NOT NULL THEN cs.store_id END) as enrolled_stores,
              COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN cs.store_id END) as compliant_stores,
              COALESCE(SUM(css.total_purchase), 0) as total_purchase_volume,
              COALESCE(SUM(pc.earned_rebate), 0) as total_earned_rebate,
              COUNT(DISTINCT p.id) as program_count,
              CASE
                WHEN COUNT(DISTINCT cs.store_id) > 0 THEN
                  COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN cs.store_id END) * 100.0 / COUNT(DISTINCT cs.store_id)
                ELSE 0
              END as compliance_percentage
            FROM chains c
            JOIN chain_stores cs ON cs.chain_id = c.id
            JOIN stores s ON cs.store_id = s.id
            JOIN user_roles ur ON s.id = ur.associated_user_id
            LEFT JOIN program_participants pp ON pp.entity_id = cs.store_id
              AND pp.entity_type = 'STORE'
              AND pp.deleted_at IS NULL
            LEFT JOIN program_compliances pc ON pc.entity_id = cs.store_id
              AND pc.entity_type = 'STORE'
            LEFT JOIN combined_store_summary css ON css.store_id = cs.store_id
            LEFT JOIN programs p ON p.id IN (${validProgramIds.join(",")})
            WHERE ur.parent_entity_id = ${distributorId}
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND ur.associated_entity_type = 'STORE'
              AND cs.store_id IN (${storeIds.join(",")})
              ${searchQuery ? `AND c.name ILIKE :searchPattern` : ""}
              ${timelineFilter}
            GROUP BY c.id, c.name
            ORDER BY ${safeSortKey} ${safeSortOrder}
            LIMIT ${limit} OFFSET ${(page - 1) * limit}
          `;

          const queryReplacements: any = {};
          if (searchQuery) {
            queryReplacements.searchPattern = `%${searchQuery}%`;
          }

          const chains = await sequelize.query(chainsQuery, {
            replacements: queryReplacements,
            type: QueryTypes.SELECT,
            raw: true
          });

          // Get total count for pagination
          const countQuery = `
            SELECT COUNT(DISTINCT c.id) as total
            FROM chains c
            JOIN chain_stores cs ON cs.chain_id = c.id
            JOIN stores s ON cs.store_id = s.id
            JOIN user_roles ur ON s.id = ur.associated_user_id
            WHERE ur.parent_entity_id = ${distributorId}
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND ur.associated_entity_type = 'STORE'
              AND cs.store_id IN (${storeIds.join(",")})
              ${searchQuery ? `AND c.name ILIKE :searchPattern` : ""}
          `;

          const countResult = await sequelize.query(countQuery, {
            replacements: queryReplacements,
            type: QueryTypes.SELECT,
            raw: true
          });

          const totalChains = parseInt((countResult[0] as any)?.total || "0");
          const totalPages = Math.ceil(totalChains / limit);

          const result: ManufacturerChainsResponse = {
            chains: chains.map((chain: any) => ({
              chainId: chain.chain_id,
              chainName: chain.chain_name,
              totalStores: parseInt(chain.total_stores || "0"),
              enrolledStores: parseInt(chain.enrolled_stores || "0"),
              compliantStores: parseInt(chain.compliant_stores || "0"),
              compliancePercentage: parseFloat(
                chain.compliance_percentage || "0"
              ),
              totalEarnedRebate: parseFloat(chain.total_earned_rebate || "0"),
              totalPurchaseVolume: parseFloat(
                chain.total_purchase_volume || "0"
              ),
              programCount: parseInt(chain.program_count || "0")
            })),
            pagination: {
              currentPage: page,
              totalPages,
              totalChains,
              limit,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1
            }
          };

          console.log(
            `[PERF] Manufacturer chains query completed for manufacturer ${manufacturerId}, returned ${chains.length} chains`
          );

          return result;
        } catch (error) {
          console.error(
            `[ERROR] ChainRepository.getManufacturerChains:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get store data with purchase volumes, optionally filtered by manufacturer
   * @param storeIds - Array of store IDs to fetch data for
   * @param manufacturerId - Optional manufacturer ID to filter by
   * @returns Promise<ChainWithStoresStoreEfficient[]>
   */
  private async getStoreDataWithPurchaseVolumes(
    storeIds: number[],
    manufacturerId?: number,
    distributorId?: number
  ): Promise<ChainWithStoresStoreEfficient[]> {
    return newrelic.startSegment(
      "ChainRepository.getStoreDataWithPurchaseVolumes",
      true,
      async () => {
        try {
          if (storeIds.length === 0) {
            return [];
          }

          // Build manufacturer filter for the query
          const manufacturerFilter = manufacturerId
            ? `AND css.manufacturer_id = ${manufacturerId}`
            : "";

          const storesCombinedRebateFilter = manufacturerId
            ? `AND p.manufacturer_id = ${manufacturerId}`
            : "";

          const chainProgramManufacturerFilter = manufacturerId
            ? `AND manufacturer_id = ${manufacturerId}`
            : "";

          // Query stores with purchase volumes from materialized view
          // Fixed: Aggregate the data to prevent duplicates caused by multiple rows per store
          // in combined_store_summary (one per manufacturer/year/warehouse combination)
          // Always use LEFT JOIN to include all stores, even those with no purchase volume for the manufacturer
          const storeQuery = `
            WITH distributor_excluded_programs AS (
              select edp.program_detail_id as program_detail_id, p.id as program_id
              FROM excluded_distributor_programs as edp
              JOIN programs as p ON p.id = edp.program_id AND participant_type = 'CHAIN' ${storesCombinedRebateFilter}
              AND p.deleted_at IS NULL
              AND edp.deleted_at IS NULL
              ${distributorId ? `AND edp.distributor_id = ${distributorId}` : ""}
            ),
            stores_combined_rebate AS (
              SELECT pc.entity_id as store_id, SUM(pc.earned_rebate) as earned_rebate, p.manufacturer_id
              FROM program_compliances as pc
              JOIN programs as p ON p.id = pc.program_id AND participant_type = 'CHAIN' ${storesCombinedRebateFilter}
              LEFT JOIN program_store_ineligibility AS psi on psi.program_id = p.id AND pc.entity_id = psi.store_id AND psi.deleted_at IS NULL
              WHERE pc.entity_id IN (${storeIds.join(",")})
              AND pc.entity_type = 'STORE'
              AND pc.deleted_at IS NULL
              AND pc.status = '${ProgramsComplianceStatus.Active}'
              AND pc.program_detail_id NOT IN (SELECT program_detail_id FROM distributor_excluded_programs)
              AND psi.id IS NULL
              GROUP BY pc.entity_id, p.manufacturer_id
            ),
            chain_program_manufacturer AS (
              SELECT manufacturer_id, id as program_id
              FROM programs
              WHERE participant_type = 'CHAIN' AND deleted_at IS NULL ${chainProgramManufacturerFilter}
              AND id NOT IN (SELECT program_id FROM distributor_excluded_programs)
            ),
            ineligible_stores AS (
              SELECT psi.store_id
                FROM program_store_ineligibility psi
                JOIN programs AS pro
                    ON pro.id = psi.program_id
                JOIN user_roles ur
                    ON ur.associated_entity_type = 'STORE'
                    ${distributorId ? `AND ur.parent_entity_id = ${distributorId}` : ""}
                    AND ur.parent_entity_type = 'DISTRIBUTOR'
                    AND ur.associated_user_id = psi.store_id
                JOIN chain_stores cs
                    ON cs.store_id = psi.store_id
                WHERE pro.id IN (SELECT program_id FROM chain_program_manufacturer)
              AND psi.deleted_at is null
                GROUP BY psi.store_id
                HAVING COUNT(DISTINCT pro.id) = (
                    SELECT COUNT(DISTINCT program_id) FROM chain_program_manufacturer
                )
            ),
            stores_combined_rebate_opportunity AS (
              SELECT seos.store_id as store_id, SUM(seos.rebate_opportunity) as rebate_opportunity, p.manufacturer_id
              FROM store_earning_opportunity_summary as seos
              JOIN programs as p ON p.id = seos.program_id AND p.participant_type = 'CHAIN' ${storesCombinedRebateFilter}
              LEFT JOIN program_store_ineligibility AS psi on psi.program_id = p.id AND seos.store_id = psi.store_id AND psi.deleted_at IS NULL
              WHERE seos.store_id IN (${storeIds.join(",")})
              AND seos.highest_tier = true
              AND p.id NOT IN (SELECT program_id FROM distributor_excluded_programs)
              AND psi.id IS NULL
              GROUP BY seos.store_id, p.manufacturer_id
            )
            SELECT
              s.id,
              s.name,
              s.external_store_id,
              COALESCE(SUM(css.total_purchase), 0) as total_purchase_volume,
              COALESCE(SUM(scr.earned_rebate), 0) as total_earned_rebate,
              COALESCE(SUM(scro.rebate_opportunity), 0) as total_rebate_opportunity,
              0 as total_programs,
              0 as enrolled_programs,
              0 as compliant_programs
            FROM stores s
            LEFT JOIN combined_store_summary css ON s.id = css.store_id ${manufacturerFilter} AND css.manufacturer_id in (SELECT manufacturer_id FROM chain_program_manufacturer) AND transaction_year = EXTRACT(YEAR FROM NOW())
            LEFT JOIN stores_combined_rebate scr ON s.id = scr.store_id AND scr.manufacturer_id = css.manufacturer_id
            LEFT JOIN stores_combined_rebate_opportunity scro ON s.id = scro.store_id AND scro.manufacturer_id = css.manufacturer_id
            WHERE s.id IN (${storeIds.join(",")})
            AND s.id NOT IN (select store_id from ineligible_stores)
            GROUP BY s.id, s.name, s.external_store_id
            ORDER BY s.name
          `;

          const storeResults = await sequelize.query(storeQuery, {
            type: QueryTypes.SELECT,
            // logging: (sql) => console.log("Sequelize raw SQL:", sql),
            raw: true
          });

          return storeResults.map((store: any) => ({
            id: store.id,
            name: store.name,
            address: "", // Not available in stores table
            city: "", // Not available in stores table
            state: "", // Not available in stores table
            zip: "", // Not available in stores table
            phone: "", // Not available in stores table
            externalStoreId: store.external_store_id || "",
            totalPrograms: parseInt(store.total_programs || "0"),
            enrolledPrograms: parseInt(store.enrolled_programs || "0"),
            compliantPrograms: parseInt(store.compliant_programs || "0"),
            totalEarnedRebate: parseFloat(store.total_earned_rebate || "0"),
            totalRebateOpportunity: parseFloat(
              store.total_rebate_opportunity || "0"
            ),
            totalPurchaseVolume: parseFloat(store.total_purchase_volume || "0")
          }));
        } catch (error) {
          console.error(
            `[ERROR] ChainRepository.getStoreDataWithPurchaseVolumes:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get manufacturer summaries for a specific chain
   * @param chainId - The chain ID
   * @param distributorId - Optional distributor ID filter
   * @param programTimeline - Optional program timeline filter
   * @returns Promise<ChainManufacturerSummary[]>
   */
  public async getManufacturerSummariesForChain(
    chainId: number,
    distributorId?: number,
    programTimeline?: string
  ): Promise<any[]> {
    return newrelic.startSegment(
      "ChainRepository.getManufacturerSummariesForChain",
      true,
      async () => {
        try {
          console.log(
            `[PERF] Starting manufacturer summaries query for chain ${chainId}`
          );

          // Build timeline filter
          const timelineFilter =
            programTimeline === "Past"
              ? "AND p.end_date < NOW()"
              : programTimeline === "Future"
                ? "AND p.start_date > NOW()"
                : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

          // Get manufacturer summaries for this chain
          const manufacturerSummariesQuery = `
            SELECT
              m.id as manufacturer_id,
              m.name as manufacturer_name,
              m.logo as manufacturer_logo,
              m.authorized,
              COUNT(DISTINCT p.id) as total_programs,
              COUNT(DISTINCT CASE WHEN pp.id IS NOT NULL THEN p.id END) as enrolled_programs,
              COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN p.id END) as compliant_programs,
              CASE
                WHEN COUNT(DISTINCT p.id) > 0 THEN
                  COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN p.id END) * 100.0 / COUNT(DISTINCT p.id)
                ELSE 0
              END as compliance_percentage,
              COUNT(DISTINCT cs.store_id) as total_stores,
              COUNT(DISTINCT CASE WHEN pp.id IS NOT NULL THEN cs.store_id END) as enrolled_stores,
              COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN cs.store_id END) as compliant_stores,
              COALESCE(SUM(css.total_purchase), 0) as total_purchase_volume,
              COALESCE(SUM(pc.earned_rebate), 0) as total_earned_rebate
            FROM manufacturers m
            JOIN programs p ON p.manufacturer_id = m.id
            JOIN chain_stores cs ON cs.chain_id = ${chainId}
            JOIN stores s ON s.id = cs.store_id
            JOIN user_roles ur ON ur.associated_user_id = s.id
            LEFT JOIN program_participants pp ON pp.entity_id = cs.store_id
              AND pp.entity_type = 'STORE'
              AND pp.program_id = p.id
              AND pp.deleted_at IS NULL
            LEFT JOIN program_compliances pc ON pc.entity_id = cs.store_id
              AND pc.entity_type = 'STORE'
              AND pc.program_id = p.id
              AND pc.deleted_at IS NULL
            LEFT JOIN combined_store_summary css ON css.store_id = cs.store_id
              AND css.manufacturer_id = m.id
            WHERE ur.associated_entity_type = 'STORE'
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND p.deleted_at IS NULL
              ${distributorId ? `AND ur.parent_entity_id = ${distributorId}` : ""}
              ${timelineFilter}
            GROUP BY m.id, m.name, m.logo, m.authorized
            HAVING COUNT(DISTINCT p.id) > 0
            ORDER BY total_purchase_volume DESC
          `;

          const manufacturerSummaries = await sequelize.query(
            manufacturerSummariesQuery,
            {
              type: QueryTypes.SELECT,
              raw: true
            }
          );

          const result = manufacturerSummaries.map((summary: any) => ({
            manufacturerId: parseInt(summary.manufacturer_id),
            manufacturerName: summary.manufacturer_name,
            manufacturerLogo: summary.manufacturer_logo || "",
            authorized: summary.authorized || false,
            totalPurchaseVolume: parseFloat(
              summary.total_purchase_volume || "0"
            ),
            totalEarnedRebate: parseFloat(summary.total_earned_rebate || "0"),
            totalPrograms: parseInt(summary.total_programs || "0"),
            enrolledPrograms: parseInt(summary.enrolled_programs || "0"),
            compliantPrograms: parseInt(summary.compliant_programs || "0"),
            compliancePercentage: parseFloat(
              summary.compliance_percentage || "0"
            ),
            totalStores: parseInt(summary.total_stores || "0"),
            enrolledStores: parseInt(summary.enrolled_stores || "0"),
            compliantStores: parseInt(summary.compliant_stores || "0")
          }));

          console.log(
            `[PERF] Manufacturer summaries query completed for chain ${chainId}, returned ${result.length} manufacturers`
          );

          return result;
        } catch (error) {
          console.error(
            `[ERROR] ChainRepository.getManufacturerSummariesForChain:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Fetches enrolled programs and store compliance data for a specific chain
   * Returns a flat array that can be transformed into the nested structure
   * @param chainId - The chain ID to fetch data for
   * @param distributorId - Optional distributor ID to filter stores by
   * @param programTimeline - Optional program timeline filter
   * @returns Promise<any[]> - Flat array of program/tier/store/compliance data
   */
  async getEnrolledProgramAndStoreCompliance(
    chainId: number,
    distributorId?: number,
    programTimeline?: string
  ): Promise<any[]> {
    return newrelic.startSegment(
      "ChainRepository.getEnrolledProgramAndStoreCompliance",
      true,
      async () => {
        try {
          console.log(
            `[DEBUG] Fetching enrolled program and store compliance data for chain ${chainId}`,
            {
              chainId,
              distributorId,
              programTimeline
            }
          );

          // Build the base query with CTEs for optimal performance
          let timelineCondition = "";
          if (
            programTimeline &&
            programTimeline !== "All" &&
            programTimeline !== "undefined"
          ) {
            if (programTimeline === "Current") {
              timelineCondition = `AND p.start_date <= NOW() AND p.end_date >= NOW()`;
            } else if (programTimeline === "Past") {
              timelineCondition = `AND p.end_date < NOW()`;
            } else if (programTimeline === "Future") {
              timelineCondition = `AND p.start_date > NOW()`;
            }
          }

          // Remove distributor filtering - chain programs don't require distributor participation
          const distributorCondition = "";

          console.log(`[DEBUG] Query conditions:`, {
            timelineCondition: timelineCondition || "none",
            distributorCondition: distributorCondition || "none"
          });

          const query = `
            WITH chain_stores AS (
              SELECT s.id, s.name
              FROM stores s
              JOIN chain_stores cs ON s.id = cs.store_id
              ${
                distributorId
                  ? `
              JOIN user_roles ur ON s.id = ur.associated_user_id
              WHERE cs.chain_id = :chainId
              AND ur.parent_entity_id = :distributorId
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND ur.role = 'STORE'
              `
                  : `
              WHERE cs.chain_id = :chainId
              `
              }
            ),
            enrolled_programs AS (
              SELECT DISTINCT p.id, p.name, p.program_type, p.program_header, p.start_date, p.end_date, p.manufacturer_id
              FROM programs p
              JOIN program_participants pp ON p.id = pp.program_id
              ${
                distributorId
                  ? `
              JOIN program_approvals pa ON p.id = pa.program_id
              WHERE pp.entity_id = :chainId
              AND pp.entity_type = 'CHAIN'
              AND pa.approver_id = :distributorId
              AND pa.approver_type = 'DISTRIBUTOR'
              AND pa.status = 'APPROVED'
              AND pa.deleted_at IS NULL
              `
                  : `
              WHERE pp.entity_id = :chainId
              AND pp.entity_type = 'CHAIN'
              `
              }
              ${timelineCondition}
              ${distributorCondition}
            ),
            program_tiers AS (
              SELECT
                pd.program_id,
                pd.id as program_detail_id,
                pd.tier,
                pd.rebate_type,
                pd.rebate_amount,
                pd.rebate_percentage,
                pd.min_qty,
                pd.max_qty,
                pd.quantity_type
              FROM program_details pd
              WHERE pd.program_id IN (SELECT id FROM enrolled_programs)
            ),
            store_compliance AS (
              SELECT
                pc.program_detail_id,
                pc.entity_id as store_id,
                pc.is_qualified as is_compliant,
                pc.earned_rebate,
                pc.total_purchase_volume as purchase_volume
              FROM program_compliances pc
              LEFT JOIN program_store_ineligibility AS psi on psi.program_id = pc.program_id AND pc.entity_id = psi.store_id AND psi.deleted_at IS NULL
              WHERE pc.program_detail_id IN (SELECT program_detail_id FROM program_tiers)
              AND pc.entity_type = 'STORE'
              AND pc.entity_id IN (SELECT id FROM chain_stores)
              AND psi.id IS NULL
            ),
            combined_earning_opportunity AS (
              SELECT
                seos.store_id,
                seos.program_detail_id,
                SUM(seos.rebate_opportunity) as rebate_opportunity
              FROM store_earning_opportunity_summary seos
              LEFT JOIN program_store_ineligibility AS psi on psi.program_id = seos.program_id AND seos.store_id = psi.store_id AND psi.deleted_at IS NULL
              ${
                distributorId
                  ? `
              JOIN user_roles ur ON seos.store_id = ur.associated_user_id
              WHERE seos.program_detail_id IN (SELECT program_detail_id FROM program_tiers)
              AND seos.store_id IN (SELECT id FROM chain_stores)
              AND seos.highest_tier = true
              AND seos.transaction_year = EXTRACT(YEAR FROM NOW())
              AND ur.parent_entity_id = :distributorId
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND ur.role = 'STORE'
              AND psi.id IS NULL
              `
                  : `
              WHERE seos.program_detail_id IN (SELECT program_detail_id FROM program_tiers)
              AND seos.store_id IN (SELECT id FROM chain_stores)
              AND seos.highest_tier = true
              AND seos.transaction_year = EXTRACT(YEAR FROM NOW())
              AND psi.id IS NULL
              `
              }
              Group By seos.store_id, seos.program_detail_id
            )
            SELECT
              ep.id as program_id,
              ep.name as program_name,
              ep.program_type,
              ep.program_header,
              ep.start_date,
              ep.end_date,
              ep.manufacturer_id,
              pt.program_detail_id,
              pt.tier,
              pt.rebate_type,
              pt.rebate_amount,
              pt.rebate_percentage,
              pt.min_qty,
              pt.max_qty,
              pt.quantity_type,
              cs.id as store_id,
              cs.name as store_name,
              COALESCE(sc.is_compliant, false) as is_compliant,
              COALESCE(sc.earned_rebate, 0) as earned_rebate,
              COALESCE(ceo.rebate_opportunity, 0) as rebate_opportunity,
              COALESCE(sc.purchase_volume, 0) as purchase_volume
            FROM enrolled_programs ep
            JOIN program_tiers pt ON ep.id = pt.program_id
            CROSS JOIN chain_stores cs
            LEFT JOIN store_compliance sc ON pt.program_detail_id = sc.program_detail_id AND cs.id = sc.store_id
            LEFT JOIN combined_earning_opportunity ceo ON ceo.program_detail_id = pt.program_detail_id AND ceo.store_id = sc.store_id
            LEFT JOIN program_store_ineligibility AS psi on psi.program_id = ep.id AND cs.id = psi.store_id AND psi.deleted_at IS NULL
            WHERE psi.id IS NULL
            ORDER BY ep.id, pt.tier, cs.id;
          `;

          const results = await sequelize.query(query, {
            replacements: { chainId, distributorId },
            type: QueryTypes.SELECT,
            raw: true
          });

          console.log(
            `[DEBUG] Retrieved ${results.length} program/tier/store combinations for chain ${chainId}`
          );
          console.log(results);

          return results;
        } catch (error) {
          console.error(
            `[ERROR] ChainRepository.getEnrolledProgramAndStoreCompliance:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Gets comprehensive chain summary data including total stores, compliance metrics, etc.
   * @param chainId - The chain ID to get summary for
   * @param programTimeline - Optional program timeline filter
   * @param distributorId - Optional distributorId filter
   * @returns Promise<any> - Chain summary data
   */
  async getChainSummaryData(
    chainId: number,
    programTimeline?: string,
    distributorId?: number
  ): Promise<any> {
    return newrelic.startSegment(
      "ChainRepository.getChainSummaryData",
      true,
      async () => {
        try {
          console.log(
            `[DEBUG] Fetching comprehensive chain summary data for chain ${chainId}`
          );

          // Build timeline condition for programs
          let timelineCondition = "";
          if (
            programTimeline &&
            programTimeline !== "All" &&
            programTimeline !== "undefined"
          ) {
            if (programTimeline === "Current") {
              timelineCondition = `AND p.start_date <= NOW() AND p.end_date >= NOW()`;
            } else if (programTimeline === "Past") {
              timelineCondition = `AND p.end_date < NOW()`;
            } else if (programTimeline === "Future") {
              timelineCondition = `AND p.start_date > NOW()`;
            }
          }

          const query = `
            WITH chain_stores_alias AS (
              SELECT s.id, s.name
              FROM stores s
              JOIN chain_stores cs ON s.id = cs.store_id
              WHERE cs.chain_id = :chainId
            ),
            enrolled_programs AS (
              SELECT DISTINCT p.id, p.manufacturer_id
              FROM programs p
              JOIN program_participants pp ON p.id = pp.program_id
              WHERE pp.entity_id = :chainId
              AND pp.entity_type = 'CHAIN'
              ${timelineCondition}
            ),
            program_tiers AS (
              SELECT pd.id as program_detail_id, pd.program_id
              FROM program_details pd
              WHERE pd.program_id IN (SELECT id FROM enrolled_programs)
            ),
            ineligible_stores_with_manufacturer_id AS (
              SELECT
                pro.manufacturer_id,
                ARRAY_AGG(psi.store_id) AS excluded_store_ids
              FROM program_store_ineligibility psi
              JOIN programs AS pro
                  ON pro.id = psi.program_id
              JOIN user_roles ur
                  ON ur.associated_entity_type = 'STORE'
                  ${distributorId ? `AND ur.parent_entity_id = ${distributorId}` : ""}
                  AND ur.parent_entity_type = 'DISTRIBUTOR'
                  AND ur.associated_user_id = psi.store_id
              JOIN chain_stores_alias csa ON csa.id = psi.store_id
              WHERE pro.id IN (SELECT id FROM enrolled_programs)
                AND psi.deleted_at is null
              GROUP BY pro.manufacturer_id, psi.store_id
              HAVING COUNT(DISTINCT pro.id) = (
                SELECT COUNT(DISTINCT pd.id)
                FROM enrolled_programs pd
                WHERE pd.manufacturer_id = pro.manufacturer_id
                )
            ),
            store_purchase_volumes AS (
              SELECT
                css.store_id,
                SUM(css.total_purchase) AS total_purchase
              FROM combined_store_summary as css
              LEFT JOIN ineligible_stores_with_manufacturer_id iswm on css.store_id = ANY(iswm.excluded_store_ids) and iswm.manufacturer_id = css.manufacturer_id
              WHERE css.transaction_year = EXTRACT(YEAR FROM CURRENT_DATE)
              AND css.store_id in (SELECT DISTINCT id from chain_stores_alias)
              AND css.manufacturer_id in (SELECT DISTINCT manufacturer_id FROM enrolled_programs)
              AND iswm.manufacturer_id IS NULL
              GROUP BY css.store_id
            ),
            stores_compliances AS (
              SELECT
                pc.entity_id,
                SUM(CASE When pc.status = 'active' THEN pc.earned_rebate ELSE 0 END) AS earned_rebate,
                COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN pc.entity_id END) as compliant_stores
              FROM program_compliances as pc
              LEFT JOIN program_store_ineligibility AS psi on psi.program_id = pc.program_id AND pc.entity_id = psi.store_id AND psi.deleted_at IS NULL
              WHERE pc.entity_id in (select id from chain_stores_alias)
                AND pc.entity_type = 'STORE'
                AND pc.program_detail_id IN (SELECT program_detail_id FROM program_tiers)
                AND psi.id IS NULL
              GROUP BY pc.entity_id
            ),
            store_compliance_summary AS (
              SELECT
                COUNT(DISTINCT csa.id) as total_stores,
                COUNT(sc.compliant_stores) as compliant_stores,
                COALESCE(SUM(sc.earned_rebate), 0) as total_earned_rebate,
                COALESCE(SUM(spv.total_purchase), 0) AS total_purchase_volume
              FROM chain_stores_alias csa
              LEFT JOIN store_purchase_volumes spv ON spv.store_id = csa.id
              LEFT JOIN stores_compliances sc ON sc.entity_id = csa.id
            )
            SELECT
              scs.total_stores,
              scs.compliant_stores,
              scs.total_stores as enrolled_stores, -- All chain stores are considered enrolled
              CASE
                WHEN scs.total_stores > 0 THEN
                  ROUND((scs.compliant_stores::decimal / scs.total_stores::decimal) * 100, 2)
                ELSE 0
              END as compliance_percentage,
              ROUND(scs.total_purchase_volume, 2) as total_purchase_volume,
              ROUND(scs.total_earned_rebate, 2) as total_earned_rebate
            FROM store_compliance_summary scs;
          `;

          const results = await sequelize.query(query, {
            replacements: { chainId, distributorId },
            type: QueryTypes.SELECT,
            // logging: (sql) => {
            //   console.log("raw query", sql);
            // },
            raw: true
          });

          const summary = (results[0] as any) || {
            total_stores: 0,
            enrolled_stores: 0,
            compliant_stores: 0,
            compliance_percentage: 0,
            total_purchase_volume: 0,
            total_earned_rebate: 0
          };

          console.log(`[DEBUG] Retrieved chain summary data:`, summary);

          return {
            totalStores: parseInt(summary.total_stores) || 0,
            enrolledStores: parseInt(summary.enrolled_stores) || 0,
            compliantStores: parseInt(summary.compliant_stores) || 0,
            compliancePercentage:
              parseFloat(summary.compliance_percentage) || 0,
            totalPurchaseVolume: parseFloat(summary.total_purchase_volume) || 0,
            totalEarnedRebate: parseFloat(summary.total_earned_rebate) || 0
          };
        } catch (error) {
          console.error(`[ERROR] ChainRepository.getChainSummaryData:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Gets manufacturer information for programs
   * @param manufacturerIds - Array of manufacturer IDs
   * @returns Promise<any[]> - Array of manufacturer information
   */
  async getManufacturerInfo(manufacturerIds: number[]): Promise<any[]> {
    return newrelic.startSegment(
      "ChainRepository.getManufacturerInfo",
      true,
      async () => {
        try {
          console.log(
            `[DEBUG] Fetching manufacturer info for ${manufacturerIds.length} manufacturers`
          );

          // Return empty array if no manufacturer IDs provided
          if (!manufacturerIds || manufacturerIds.length === 0) {
            console.log(
              `[DEBUG] No manufacturer IDs provided, returning empty array`
            );
            return [];
          }

          const query = `
            SELECT id, name, organization_name, logo
            FROM manufacturers
            WHERE id IN (:manufacturerIds)
          `;

          const results = await sequelize.query(query, {
            replacements: { manufacturerIds },
            type: QueryTypes.SELECT,
            raw: true
          });

          console.log(
            `[DEBUG] Retrieved ${results.length} manufacturer records`
          );

          return results;
        } catch (error) {
          console.error(`[ERROR] ChainRepository.getManufacturerInfo:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Gets programs that the chain is eligible for but not enrolled in
   * Eligibility is defined as programs from manufacturers that the chain's stores purchase from
   * @param chainId - The chain ID
   * @param programTimeline - Optional program timeline filter
   * @returns Promise<any[]> - Array of unenrolled programs
   */
  async getUnenrolledPrograms(
    chainId: number,
    programTimeline?: string
  ): Promise<any[]> {
    return newrelic.startSegment(
      "ChainRepository.getUnenrolledPrograms",
      true,
      async () => {
        try {
          console.log(
            `[DEBUG] Fetching unenrolled programs for chain ${chainId}`
          );

          // Build timeline condition for programs
          let timelineCondition = "";
          if (
            programTimeline &&
            programTimeline !== "All" &&
            programTimeline !== "undefined"
          ) {
            if (programTimeline === "Current") {
              timelineCondition = `AND p.start_date <= NOW() AND p.end_date >= NOW()`;
            } else if (programTimeline === "Past") {
              timelineCondition = `AND p.end_date < NOW()`;
            } else if (programTimeline === "Future") {
              timelineCondition = `AND p.start_date > NOW()`;
            }
          }

          const query = `
            WITH chain_stores AS (
              SELECT DISTINCT s.id
              FROM stores s
              JOIN chain_stores cs ON s.id = cs.store_id
              WHERE cs.chain_id = :chainId
            ),
            chain_manufacturers AS (
              -- Get manufacturers that chain stores purchase from
              SELECT DISTINCT p.manufacturer_id
              FROM products p
              JOIN line_items li ON li.splink_product_id = p.id
              WHERE li.buyer_id IN (SELECT id FROM chain_stores)
              AND li.deleted_at IS NULL
            ),
            enrolled_programs AS (
              -- Programs the chain is already enrolled in
              SELECT DISTINCT p.id
              FROM programs p
              JOIN program_participants pp ON p.id = pp.program_id
              WHERE pp.entity_id = :chainId
              AND pp.entity_type = 'CHAIN'
            ),
            eligible_programs AS (
              -- Programs from manufacturers the chain purchases from
              SELECT DISTINCT p.id, p.name, p.program_type, p.program_header, p.start_date, p.end_date, p.manufacturer_id
              FROM programs p
              WHERE p.manufacturer_id IN (SELECT manufacturer_id FROM chain_manufacturers)
              AND p.id NOT IN (SELECT id FROM enrolled_programs)
              AND EXISTS (
                -- Ensure the program has chain participants (is chain-compatible)
                SELECT 1 FROM program_participants pp2
                WHERE pp2.program_id = p.id
                AND pp2.entity_type = 'CHAIN'
              )
              ${timelineCondition}
            )
            SELECT
              ep.id as program_id,
              ep.name as program_name,
              ep.program_type,
              ep.program_header,
              ep.start_date,
              ep.end_date,
              ep.manufacturer_id
            FROM eligible_programs ep
            ORDER BY ep.id;
          `;

          const results = await sequelize.query(query, {
            replacements: { chainId },
            type: QueryTypes.SELECT,
            raw: true
          });

          console.log(
            `[DEBUG] Retrieved ${results.length} unenrolled programs for chain ${chainId}`
          );

          return results.map((row: any) => ({
            id: row.program_id,
            name: row.program_name,
            programType: row.program_type,
            programHeader: row.program_header,
            startDate: row.start_date,
            endDate: row.end_date,
            manufacturerId: row.manufacturer_id
          }));
        } catch (error) {
          console.error(
            `[ERROR] ChainRepository.getUnenrolledPrograms:`,
            error
          );
          throw error;
        }
      }
    );
  }
}

export default new ChainRepository();
