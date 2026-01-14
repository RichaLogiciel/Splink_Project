import newrelic from "newrelic";
import { Op } from "sequelize";
import {
  CACHE_TTL_TIME,
  ENTITY_TYPE,
  PROGRAM_TIMELINE,
  useApiCaching
} from "../config/appConstants";
import { ApiError } from "../lib/errors/APIError";
import Chain from "../models/Chain";
import ChainAggregation from "../models/ChainAggregation";
import Program from "../models/Program";
import ProgramParticipant from "../models/ProgramParticipant";
import UserRole from "../models/UserRole";
import ChainRepository from "../repositories/ChainRepository";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import { ProgramDetailRepository } from "../repositories/ProgramDetailRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import StoreRepository from "../repositories/StoreRepository";
import {
  ChainAggregatedData,
  ChainCategorizedProductsParams,
  CategorizedProductsResponse as ChainCategorizedProductsResponse,
  ChainDetailsQueryOptions,
  ChainDetailsResponse,
  ChainProgramDetailResponse,
  ChainProgramDetailsParams,
  ChainProgramOverview,
  ChainProgramsListingParams,
  ChainProgramsQueryOptions,
  ChainProgramsResponse,
  ChainQueryOptions,
  ChainStoresQueryOptions,
  ChainStoresResponse,
  ChainsWithStoresLightweightResponse,
  ChainsWithStoresQueryOptions,
  ChainsWithStoresResponse,
  EnrolledChain,
  ManufacturerChainsQueryOptions,
  ManufacturerChainsResponse,
  PaginatedChainResult,
  UnenrolledChain
} from "../types/ChainTypes";
import { ManufacturerProgram } from "../types/ProgramTypes";
import {
  formatPaymentTermLabel,
  mapTagsToCategoryObjects,
  sortManufacturersByAuthStatus
} from "../utils/helpers";
import { getCacheKey, redisClient } from "../utils/redis";
import { getCurrentUser } from "../utils/requestContext";
import {
  isChainAdmin,
  isDistributorAdminAndExecutive,
  isDistributorSalesRepManager
} from "../utils/roles";
import ProgramService from "./ProgramService";

/**
 * ChainService class: responsible for fetching and manipulating chain program data.
 * Provides methods to fetch chain programs, program details, and chain-specific aggregations.
 */
class ChainService {
  /**
   * Retrieves chain program details for a specific manufacturer
   * @param params - Parameters for chain program details request
   * @returns Promise<ChainProgramDetailResponse>
   */
  public async getChainProgramDetails(
    params: ChainProgramDetailsParams
  ): Promise<ChainProgramDetailResponse> {
    return newrelic.startSegment(
      "ChainService.getChainProgramDetails",
      true,
      async () => {
        try {
          const {
            manufacturerId,
            distributorId,
            searchQuery,
            enrolledPage = 1,
            notEnrolledPage = 1,
            sort = "ASC",
            sortKey = "chain_name",
            programTimeline,
            isInternal
          } = params;

          // Get manufacturer information
          const manufacturer =
            await ProgramRepository.getManufacturerById(manufacturerId);
          if (!manufacturer) {
            throw ApiError.notFound(
              `Manufacturer with ID ${manufacturerId} not found`
            );
          }

          // Check if manufacturer is authorized for this distributor
          const authorizedManufacturers =
            await ManufacturerRepository.getAuthorizedManufacturers(
              distributorId
            );
          const isAuthManufacturer = authorizedManufacturers.some(
            (auth: any) => parseInt(auth.manufacturerId) === manufacturerId
          );

          // Get programs for this manufacturer that support chains
          console.info(
            `[DEBUG] ChainService.getChainProgramDetails - Fetching chain programs:`,
            {
              manufacturerId,
              distributorId,
              programTimeline: programTimeline || "undefined",
              isInternal: isInternal !== undefined ? isInternal : "undefined"
            }
          );
          const programs = await this.getChainPrograms(
            manufacturerId,
            distributorId,
            programTimeline,
            isInternal
          );

          // Get chain aggregation data
          const chainQueryOptions: ChainQueryOptions = {
            searchQuery,
            sort,
            sortKey: sortKey as
              | "chain_name"
              | "total_stores"
              | "purchase_volume"
              | "earned_rebate"
              | "compliance_percentage",
            programTimeline,
            isInternal
          };

          const [enrolledChains, unenrolledChains] = await Promise.all([
            this.getEnrolledChains(programs, enrolledPage, chainQueryOptions),
            this.getUnenrolledChains(
              programs,
              notEnrolledPage,
              chainQueryOptions
            )
          ]);

          // Build chain program overview
          const chainProgramOverview = await this.buildChainProgramOverview(
            programs,
            enrolledChains,
            unenrolledChains
          );

          // Calculate totals
          const totalStores =
            enrolledChains.reduce((sum, chain) => sum + chain.totalStores, 0) +
            unenrolledChains.reduce((sum, chain) => sum + chain.totalStores, 0);
          const totalPurchaseVolume = enrolledChains.reduce(
            (sum, chain) => sum + chain.totalPurchaseVolume,
            0
          );
          const totalEarnings = enrolledChains.reduce(
            (sum, chain) => sum + chain.totalEarnedRebate,
            0
          );

          return {
            manufacturerName: manufacturer.name,
            manufacturerLogo: manufacturer.logo || "",
            authManufacturer: isAuthManufacturer,
            totalStores,
            totalPurchaseVolume,
            totalEarnings,
            chainProgramOverview,
            enrolledChains,
            unenrolledChains
          };
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.getChainProgramDetails: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.getChainProgramDetails"
            );
          }
        }
      }
    );
  }

  /**
   * Retrieves chain programs listing for distributor chain view
   * @param params - Parameters for chain programs listing request
   * @returns Promise<ManufacturerProgram[]>
   */
  public async getChainProgramsListing(
    params: ChainProgramsListingParams
  ): Promise<ManufacturerProgram[]> {
    return newrelic.startSegment(
      "ChainService.getChainProgramsListing",
      true,
      async () => {
        try {
          const { distributorId, warehouseId, programTimeline, isInternal } =
            params;

          // Use caching for performance
          const cacheKey = getCacheKey(
            "CS",
            "getChainProgramsListing",
            [
              distributorId.toString(),
              warehouseId || "null",
              programTimeline || "null",
              isInternal?.toString() || "false"
            ].join("_")
          );

          if (useApiCaching) {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
              return JSON.parse(cached);
            }
          }

          // Get authorized manufacturers for this distributor
          const authorizedManufacturers =
            await ManufacturerRepository.getAuthorizedManufacturers(
              distributorId
            );
          const manufacturerIds = authorizedManufacturers.map((auth: any) =>
            parseInt(auth.manufacturerId)
          );

          // Get programs that support chains
          const chainPrograms = await this.getChainProgramsByManufacturers(
            manufacturerIds,
            distributorId,
            programTimeline,
            isInternal
          );

          // Group programs by manufacturer
          const manufacturerPrograms =
            await this.groupChainProgramsByManufacturer(
              chainPrograms,
              authorizedManufacturers
            );

          // Sort manufacturers by authorization status
          const sortedManufacturerPrograms =
            sortManufacturersByAuthStatus(manufacturerPrograms);

          // Cache the result
          if (useApiCaching) {
            await redisClient.setEx(
              cacheKey,
              CACHE_TTL_TIME,
              JSON.stringify(sortedManufacturerPrograms)
            );
          }

          return sortedManufacturerPrograms;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.getChainProgramsListing: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.getChainProgramsListing"
            );
          }
        }
      }
    );
  }

  /**
   * Retrieves categorized products for chain programs
   * @param params - Parameters for chain categorized products request
   * @returns Promise<ChainCategorizedProductsResponse>
   */
  public async getChainCategorizedProducts(
    params: ChainCategorizedProductsParams
  ): Promise<ChainCategorizedProductsResponse> {
    return newrelic.startSegment(
      "ChainService.getChainCategorizedProducts",
      true,
      async () => {
        try {
          const { manufacturerId, distributorId, programId, chainId } = params;

          // Get chain programs for this manufacturer to extract product tags
          const programsResult = await this.getChainPrograms(
            manufacturerId,
            distributorId,
            undefined, // programTimeline
            undefined // isInternal
          );

          // Extract program IDs
          const programIds = programsResult.map(
            (pr: any) => pr.program_id || pr.id
          );

          // Get unique tags for these program IDs
          let uniqueTags: string[] = [];
          if (programIds.length) {
            uniqueTags =
              await ProgramRepository.getUniqueProductTagsByProgramIds(
                programIds
              );
          }

          // Get manufacturer products filtered by program tags
          const products = await StoreRepository.getManufacturerProducts({
            manufacturerId,
            distributorId,
            categoryTagsJSON: uniqueTags
          });

          // Get chain stores if chainId is provided
          let storeIds: number[] = [];
          if (chainId) {
            const chainStores =
              await StoreRepository.getStoresByChainId(chainId);
            storeIds = chainStores.map((store: any) => store.id);
          }

          // Get purchased products for chain stores
          const purchasedProducts =
            storeIds.length > 0
              ? await this.getChainPurchasedProducts(storeIds, programId)
              : [];

          // Categorize products using program tags
          const categorizedProducts = await this.categorizeChainProducts(
            products,
            purchasedProducts,
            programId,
            programsResult
          );

          return categorizedProducts;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.getChainCategorizedProducts: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.getChainCategorizedProducts"
            );
          }
        }
      }
    );
  }

  /**
   * Gets programs that support chains (have chain participants)
   * @param manufacturerId - The manufacturer ID
   * @param distributorId - The distributor ID
   * @param programTimeline - Optional program timeline filter
   * @param isInternal - Optional internal program filter
   * @returns Promise<Program[]>
   */
  private async getChainPrograms(
    manufacturerId: number,
    distributorId: number,
    programTimeline?: string,
    isInternal?: boolean
  ): Promise<Program[]> {
    return newrelic.startSegment(
      "ChainService.getChainPrograms",
      true,
      async () => {
        try {
          const user = getCurrentUser();
          const isSalesRepManager = isDistributorSalesRepManager(user?.role);

          console.log(
            `[DEBUG] ChainService.getChainPrograms - Calling StoreRepository.getManufacturerProgramsById:`,
            {
              manufacturerId,
              programTimeline: programTimeline || "undefined",
              isInternal: isInternal !== undefined ? isInternal : "undefined"
            }
          );

          let storeIds = undefined;
          if (isSalesRepManager) {
            storeIds = await StoreRepository.getStoresBySalesRepManagerId({
              salesRepManagerId: user?.associatedUserId
            });
            storeIds = storeIds.map((store: any) => store.id);
          }

          const validProgramIds =
            await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
              participantType: ENTITY_TYPE.CHAIN,
              distributorId: distributorId,
              storeIds:
                isSalesRepManager && storeIds && storeIds.length > 0
                  ? storeIds
                  : undefined
            });

          // Get all programs for this manufacturer
          const allPrograms = await StoreRepository.getManufacturerProgramsById(
            [manufacturerId],
            ENTITY_TYPE.CHAIN,
            validProgramIds, // programIds
            undefined, // excludedProgramDetailIds
            [manufacturerId], // creatorIds
            ENTITY_TYPE.MANUFACTURER,
            undefined, // secondaryCreatorIds
            undefined, // secondaryCreatorType
            programTimeline,
            isInternal // isInternalInitiative
          );

          console.log(
            `[DEBUG] getChainPrograms: Retrieved ${allPrograms.length} total programs for manufacturer ${manufacturerId}`
          );

          console.log(
            `[DEBUG] getChainPrograms: Programs found:`,
            allPrograms.map((program: any) => ({
              id: program.program_id || program.id,
              name: program.program_name || program.name,
              participantType: program.participant_type
            }))
          );

          // Filter programs that have chain participants
          const chainPrograms = await Promise.all(
            allPrograms
              .filter(
                (program: any) => program && (program.id || program.program_id)
              )
              .map(async (program: any) => {
                // Normalize the program object - ensure it has an 'id' field
                const normalizedProgram = {
                  ...program,
                  id: program.id || program.program_id
                };

                const hasChainParticipants =
                  await this.isProgramForChains(normalizedProgram);

                console.log(
                  `[DEBUG] getChainPrograms: Program ${normalizedProgram.id} (${program.program_name || program.name}) - Has chain participants: ${hasChainParticipants}`
                );

                return hasChainParticipants ? normalizedProgram : null;
              })
          );

          const filteredChainPrograms = chainPrograms.filter(
            (program: any) => program !== null
          ) as Program[];

          return filteredChainPrograms;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.getChainPrograms: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.getChainPrograms"
            );
          }
        }
      }
    );
  }

  /**
   * Gets programs that support chains for multiple manufacturers
   * @param manufacturerIds - Array of manufacturer IDs
   * @param distributorId - The distributor ID
   * @param programTimeline - Optional program timeline filter
   * @param isInternal - Optional internal program filter
   * @returns Promise<Program[]>
   */
  private async getChainProgramsByManufacturers(
    manufacturerIds: number[],
    distributorId: number,
    programTimeline?: string,
    isInternal?: boolean
  ): Promise<Program[]> {
    return newrelic.startSegment(
      "ChainService.getChainProgramsByManufacturers",
      true,
      async () => {
        try {
          const allChainPrograms = await Promise.all(
            manufacturerIds.map((manufacturerId) =>
              this.getChainPrograms(
                manufacturerId,
                distributorId,
                programTimeline,
                isInternal
              )
            )
          );

          return allChainPrograms.flat();
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.getChainProgramsByManufacturers: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.getChainProgramsByManufacturers"
            );
          }
        }
      }
    );
  }

  /**
   * Checks if a program is specifically for chains by verifying it has participants with entity_type = 'CHAIN'
   * @param program - The program to check
   * @returns Promise<boolean> - True if program has explicit chain participants
   */
  private async isProgramForChains(program: Program): Promise<boolean> {
    return newrelic.startSegment(
      "ChainService.isProgramForChains",
      true,
      async () => {
        try {
          // Defensive check for program ID
          const programId = program.id || (program as any).program_id;
          if (!programId) {
            console.warn(
              "[WARN] isProgramForChains: Program ID is undefined",
              program
            );
            return false;
          }

          // Check if program has participants with entity_type = 'CHAIN'
          const chainParticipants = await ProgramParticipant.findAll({
            where: {
              programId: programId,
              entityType: "CHAIN",
              deletedAt: null
            },
            attributes: ["id", "entityId", "entityType", "programId"]
          });

          console.log(
            `[DEBUG] isProgramForChains: Program ${programId} - Found ${chainParticipants.length} chain participants:`,
            chainParticipants.map((cp) => ({
              entityId: cp.entityId,
              entityType: cp.entityType
            }))
          );

          // Additional verification: ensure all found participants are actually CHAIN type
          const validChainParticipants = chainParticipants.filter(
            (cp) => cp.entityType === "CHAIN"
          );

          if (validChainParticipants.length !== chainParticipants.length) {
            console.warn(
              `[WARN] isProgramForChains: Program ${programId} - Found ${chainParticipants.length - validChainParticipants.length} invalid chain participants`
            );
          }

          // Only return true if there are explicit chain participants
          const hasChainParticipants = validChainParticipants.length > 0;

          console.log(
            `[DEBUG] isProgramForChains: Program ${programId} - Is chain program: ${hasChainParticipants} (${validChainParticipants.length} valid chain participants)`
          );

          return hasChainParticipants;
        } catch (error) {
          console.error("[ERROR] ChainService.isProgramForChains:", error);
          return false;
        }
      }
    );
  }

  /**
   * Gets enrolled chains for the given programs
   * @param programs - Array of programs
   * @param page - Page number for pagination
   * @param options - Query options
   * @returns Promise<EnrolledChain[]>
   */
  private async getEnrolledChains(
    programs: Program[],
    page: number,
    options: ChainQueryOptions
  ): Promise<EnrolledChain[]> {
    return newrelic.startSegment(
      "ChainService.getEnrolledChains",
      true,
      async () => {
        try {
          const allEnrolledChains: EnrolledChain[] = [];

          for (const program of programs) {
            const enrolledChains =
              await ChainRepository.getEnrolledChainsByProgram(program.id, {
                ...options,
                page
              });
            // Use concat instead of spread to avoid "more than 100 arguments" error
            allEnrolledChains.push(...enrolledChains);
          }

          // Remove duplicates based on chainId
          const uniqueEnrolledChains = allEnrolledChains.reduce(
            (acc, current) => {
              const existingChain = acc.find(
                (chain) => chain.chainId === current.chainId
              );
              if (!existingChain) {
                acc.push(current);
              } else {
                // Fix: Don't add purchase volumes when same chain appears in multiple programs
                // Purchase volume is total for the chain, not per program, so take the maximum
                existingChain.totalPurchaseVolume = Math.max(
                  existingChain.totalPurchaseVolume,
                  current.totalPurchaseVolume
                );
                existingChain.totalEarnedRebate = Math.max(
                  existingChain.totalEarnedRebate,
                  current.totalEarnedRebate
                );
                // For store counts, take the maximum as they represent total stores in chain
                existingChain.enrolledStores = Math.max(
                  existingChain.enrolledStores,
                  current.enrolledStores
                );
                existingChain.compliantStores = Math.max(
                  existingChain.compliantStores,
                  current.compliantStores
                );
              }
              return acc;
            },
            [] as EnrolledChain[]
          );

          return uniqueEnrolledChains;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.getEnrolledChains: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.getEnrolledChains"
            );
          }
        }
      }
    );
  }

  /**
   * Gets unenrolled chains for the given programs
   * @param programs - Array of programs
   * @param page - Page number for pagination
   * @param options - Query options
   * @returns Promise<UnenrolledChain[]>
   */
  private async getUnenrolledChains(
    programs: Program[],
    page: number,
    options: ChainQueryOptions
  ): Promise<UnenrolledChain[]> {
    return newrelic.startSegment(
      "ChainService.getUnenrolledChains",
      true,
      async () => {
        try {
          const allUnenrolledChains: UnenrolledChain[] = [];

          for (const program of programs) {
            const unenrolledChains =
              await ChainRepository.getUnenrolledChainsByProgram(program.id, {
                ...options,
                page
              });
            // Use concat instead of spread to avoid "more than 100 arguments" error
            allUnenrolledChains.push(...unenrolledChains);
          }

          // Remove duplicates based on chainId
          const uniqueUnenrolledChains = allUnenrolledChains.reduce(
            (acc, current) => {
              const existingChain = acc.find(
                (chain) => chain.chainId === current.chainId
              );
              if (!existingChain) {
                acc.push(current);
              } else {
                // Fix: Don't add potential earnings when same chain appears in multiple programs
                // Take the maximum potential earnings instead of summing
                existingChain.potentialEarnings = Math.max(
                  existingChain.potentialEarnings,
                  current.potentialEarnings
                );
              }
              return acc;
            },
            [] as UnenrolledChain[]
          );

          return uniqueUnenrolledChains;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.getUnenrolledChains: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.getUnenrolledChains"
            );
          }
        }
      }
    );
  }

  /**
   * Builds chain program overview from programs and chain data
   * @param programs - Array of programs
   * @param enrolledChains - Array of enrolled chains
   * @param unenrolledChains - Array of unenrolled chains
   * @returns Promise<ChainProgramOverview[]>
   */
  private async buildChainProgramOverview(
    programs: Program[],
    enrolledChains: EnrolledChain[],
    unenrolledChains: UnenrolledChain[]
  ): Promise<ChainProgramOverview[]> {
    return newrelic.startSegment(
      "ChainService.buildChainProgramOverview",
      true,
      async () => {
        try {
          const chainProgramOverviews = await Promise.all(
            programs.map(async (program) => {
              // Get program details
              const programDetailRepository = new ProgramDetailRepository();
              const programDetails =
                await programDetailRepository.findByProgramId(program.id);

              // Calculate chain compliance metrics
              const totalChains =
                enrolledChains.length + unenrolledChains.length;
              const enrolledChainsCount = enrolledChains.length;
              const chainCompliance =
                totalChains > 0 ? (enrolledChainsCount / totalChains) * 100 : 0;

              const overview: ChainProgramOverview = {
                id: program.id,
                programType: program.programType,
                programHeader: program.programHeader,
                overview: program.description || "",
                chainCompliance,
                totalChains,
                enrolledChains: enrolledChainsCount,
                rebateType: programDetails[0]?.rebateType || "N/A",
                paymentTerms: formatPaymentTermLabel(program.paymentTerm),
                complianceStatus: chainCompliance > 0,
                rebateCalculation:
                  programDetails[0]?.rebateCalculation || "N/A",
                programDetails: programDetails as any[]
              };

              return overview;
            })
          );

          return chainProgramOverviews;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.buildChainProgramOverview: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.buildChainProgramOverview"
            );
          }
        }
      }
    );
  }

  /**
   * Groups chain programs by manufacturer
   * @param programs - Array of programs
   * @param authorizedManufacturers - Array of authorized manufacturers
   * @returns Promise<ManufacturerProgram[]>
   */
  private async groupChainProgramsByManufacturer(
    programs: Program[],
    authorizedManufacturers: any[]
  ): Promise<ManufacturerProgram[]> {
    return newrelic.startSegment(
      "ChainService.groupChainProgramsByManufacturer",
      true,
      async () => {
        try {
          const manufacturerProgramsMap = new Map<
            number,
            ManufacturerProgram
          >();

          for (const program of programs) {
            const manufacturerId = program.manufacturerId;
            const manufacturer = authorizedManufacturers.find(
              (auth: any) => parseInt(auth.manufacturerId) === manufacturerId
            );

            if (!manufacturer) continue;

            if (!manufacturerProgramsMap.has(manufacturerId)) {
              manufacturerProgramsMap.set(manufacturerId, {
                manufacturerName: manufacturer.name,
                manufacturerLogo: manufacturer.logo,
                manufacturerId,
                totalPurchaseVolume: 0,
                totalSaving: 0,
                programPaymentTerm: formatPaymentTermLabel(program.paymentTerm),
                program_overview: []
              });
            }

            const manufacturerProgram =
              manufacturerProgramsMap.get(manufacturerId)!;

            // Add program overview
            manufacturerProgram.program_overview.push({
              id: program.id,
              name: program.name,
              programType: program.programType,
              programTerms: formatPaymentTermLabel(program.paymentTerm),
              programHeader: program.programHeader,
              compliances: [], // Will be populated with chain compliance data
              programEntityType: ENTITY_TYPE.CHAIN,
              programDetails: []
            });
          }

          return Array.from(manufacturerProgramsMap.values());
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.groupChainProgramsByManufacturer: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.groupChainProgramsByManufacturer"
            );
          }
        }
      }
    );
  }

  /**
   * Gets purchased products for chain stores
   * @param storeIds - Array of store IDs
   * @param programId - Optional program ID filter
   * @returns Promise<number[]>
   */
  private async getChainPurchasedProducts(
    storeIds: number[],
    programId?: number
  ): Promise<number[]> {
    return newrelic.startSegment(
      "ChainService.getChainPurchasedProducts",
      true,
      async () => {
        try {
          const purchasedProducts = await Promise.all(
            storeIds.map((storeId) =>
              StoreRepository.getPurchasedProductIdsByProgramIds(
                storeId,
                ENTITY_TYPE.STORE,
                [],
                undefined,
                false,
                programId ? { startDate: "", endDate: "" } : undefined
              )
            )
          );

          // Flatten and get unique product IDs
          const allPurchasedProducts = purchasedProducts.flat() as number[];
          return [...new Set(allPurchasedProducts)];
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.getChainPurchasedProducts: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.getChainPurchasedProducts"
            );
          }
        }
      }
    );
  }

  /**
   * Categorizes products for chain programs - simplified version
   * @param products - Array of products
   * @param purchasedProducts - Array of purchased product IDs
   * @param programId - Optional program ID filter
   * @param programsResult - Array of programs to extract product tags from
   * @returns Promise<ChainCategorizedProductsResponse>
   */
  private async categorizeChainProducts(
    products: any[],
    purchasedProducts: number[],
    programId?: number,
    programsResult?: any[]
  ): Promise<ChainCategorizedProductsResponse> {
    return newrelic.startSegment(
      "ChainService.categorizeChainProducts",
      true,
      async () => {
        try {
          // Extract product tags from programs
          const programsProductTags =
            programsResult
              ?.map((pr: any) => pr.products_tags)
              ?.join(",")
              ?.split(",")
              ?.filter((tag: string) => tag.trim())
              ?.map((tag: string) => tag.trim()) || [];

          // Get category tags reference for mapping
          const productCategoryTags =
            await StoreRepository.getCategoryTagsReference();

          // Map tags to category objects
          const diffCat = mapTagsToCategoryObjects(
            programsProductTags.join(","),
            productCategoryTags
          );

          // Categorize products based on program tags
          const categoryMap = new Map<string, any[]>();

          // Initialize all categories from program tags
          diffCat.forEach((cat: any) => {
            const categoryName = cat.tagName;
            categoryMap.set(categoryName, []);
          });

          for (const product of products) {
            // Check if product is purchased
            const isPurchased = purchasedProducts.includes(product.id);

            // Find the category based on category_flags
            let category = null;

            if (product.category_flags) {
              // Find the first flag that is true
              for (const [flagKey, flagValue] of Object.entries(
                product.category_flags
              )) {
                if (flagValue === true) {
                  // Map the flag key to category name
                  const categoryObj = diffCat.find(
                    (cat: any) => cat.tagKey === flagKey
                  );
                  if (categoryObj) {
                    category = categoryObj.tagName;
                    break;
                  }
                }
              }
            }

            // Add product to the appropriate category
            if (category && categoryMap.has(category)) {
              categoryMap.get(category)!.push({
                id: product.id,
                name: product.name,
                internal_code: product.internal_code || "NA",
                purchased: isPurchased
              });
            }
          }

          // Convert to array format
          const categories = Array.from(categoryMap.entries()).map(
            ([name, products]) => ({
              name,
              products
            })
          );

          const totalProducts = products.length;

          return {
            categories,
            totalProducts
          };
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ChainService.categorizeChainProducts: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ChainService.categorizeChainProducts"
            );
          }
        }
      }
    );
  }

  /**
   * Validates if a user can access chain functionality
   * @param userRole - The user role
   * @param chainView - Whether chain view is requested
   * @returns boolean
   */
  public validateChainAccess(userRole: UserRole, chainView: boolean): boolean {
    if (!chainView) return true;

    return (
      isDistributorAdminAndExecutive(userRole.role) ||
      isChainAdmin(userRole.role)
    );
  }

  /**
   * Gets chain aggregated data for a distributor
   * @param distributorId - The distributor ID
   * @param options - Query options
   * @returns Promise<PaginatedChainResult>
   */
  public async getChainsByDistributor(
    distributorId: number,
    options: ChainQueryOptions = {}
  ): Promise<PaginatedChainResult> {
    return newrelic.startSegment(
      "ChainService.getChainsByDistributor",
      true,
      async () => {
        return await ChainRepository.getChainsByDistributorId(
          distributorId,
          options
        );
      }
    );
  }

  /**
   * Gets detailed chain information
   * @param chainId - The chain ID
   * @param programId - Optional program ID filter
   * @returns Promise<ChainAggregatedData>
   */
  public async getChainDetails({
    chainId,
    programId
  }: {
    chainId: number;
    programId?: number;
  }): Promise<ChainAggregatedData> {
    return newrelic.startSegment(
      "ChainService.getChainDetails",
      true,
      async () => {
        return await ChainRepository.getChainDetails({
          chainId,
          options: { programId }
        });
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
      "ChainService.getChainDetailsById",
      true,
      async () => {
        try {
          console.log(
            `[DEBUG] Getting chain details for chain ${options.chainId}:`,
            options
          );

          // Validate timeline
          const validTimelines = Object.values(PROGRAM_TIMELINE);
          if (
            options.programTimeline &&
            !validTimelines.includes(options.programTimeline)
          ) {
            throw ApiError.badRequest(
              `Invalid program timeline. Must be one of: ${validTimelines.join(", ")}`
            );
          }

          // Use the repository method
          const result = await ChainRepository.getChainDetailsById(options);

          console.log(`[DEBUG] Chain details result:`, {
            chainId: result.id,
            chainName: result.name,
            totalStores: result.totalStores,
            includePrograms: !!result.programs,
            includeStores: !!result.stores,
            queryTime: "Chain details mode"
          });

          return result;
        } catch (error) {
          console.error(`[ERROR] ChainService.getChainDetailsById:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Get chains with their stores including purchase volume and rebate amounts
   * Now optimized to use the new distributor_id column for faster queries
   * @param options - Query options for filtering, pagination, and sorting
   * @returns Promise<ChainsWithStoresResponse>
   */
  public async getChainsWithStores(
    options: ChainsWithStoresQueryOptions = {}
  ): Promise<ChainsWithStoresResponse> {
    return newrelic.startSegment(
      "ChainService.getChainsWithStores",
      true,
      async () => {
        try {
          console.log(
            `[DEBUG] Getting chains with stores (optimized with distributor_id):`,
            options
          );

          // Validate sort key
          const validSortKeys = [
            "chain_name",
            "total_stores",
            "total_purchase_volume",
            "total_rebate_amount",
            "compliance_percentage"
          ];

          if (options.sortKey && !validSortKeys.includes(options.sortKey)) {
            throw ApiError.badRequest(
              `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`
            );
          }

          // Validate sort direction
          if (
            options.sort &&
            !["ASC", "DESC"].includes(options.sort.toUpperCase())
          ) {
            throw ApiError.badRequest("Sort must be ASC or DESC");
          }

          // Validate timeline
          const validTimelines = Object.values(PROGRAM_TIMELINE);
          if (
            options.programTimeline &&
            !validTimelines.includes(options.programTimeline)
          ) {
            throw ApiError.badRequest(
              `Invalid program timeline. Must be one of: ${validTimelines.join(", ")}`
            );
          }

          // Use the optimized method that leverages distributor_id column
          const result =
            await ChainRepository.getChainsWithStoresByDistributor(options);

          console.log(`[DEBUG] Optimized chains with stores result:`, {
            chainCount: result.chains.length,
            totalStores: result.pagination.totalStores,
            queryTime: "Optimized with distributor_id column"
          });

          return result;
        } catch (error) {
          console.error(`[ERROR] ChainService.getChainsWithStores:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Get lightweight chain listing for better performance
   * @param options - Query options for filtering, pagination, and sorting
   * @returns Promise<ChainsWithStoresLightweightResponse>
   */
  public async getChainListingLightweight(
    options: ChainsWithStoresQueryOptions = {}
  ): Promise<ChainsWithStoresLightweightResponse> {
    return newrelic.startSegment(
      "ChainService.getChainListingLightweight",
      true,
      async () => {
        try {
          console.log(`[DEBUG] Getting lightweight chain listing:`, options);

          // Validate sort key
          const validSortKeys = [
            "sort",
            "purchaseSort",
            "estimatedSavings",
            "storeCountSort"
          ];

          if (options.sortKey && !validSortKeys.includes(options.sortKey)) {
            throw ApiError.badRequest(
              `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`
            );
          }

          // Validate sort direction
          if (
            options.sort &&
            !["ASC", "DESC"].includes(options.sort.toUpperCase())
          ) {
            throw ApiError.badRequest("Sort must be ASC or DESC");
          }

          // Validate timeline
          const validTimelines = Object.values(PROGRAM_TIMELINE);
          if (
            options.programTimeline &&
            !validTimelines.includes(options.programTimeline)
          ) {
            throw ApiError.badRequest(
              `Invalid program timeline. Must be one of: ${validTimelines.join(", ")}`
            );
          }

          // Use the lightweight repository method
          const result =
            await ChainRepository.getChainListingLightweight(options);

          console.log(`[DEBUG] Lightweight chain listing result:`, {
            chainCount: result.chains.length,
            totalStores: result.pagination.totalStores,
            queryTime: "Lightweight mode using materialized view"
          });

          return result;
        } catch (error) {
          console.error(
            `[ERROR] ChainService.getChainListingLightweight:`,
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get chain aggregations from materialized view
   * @param options - Query options
   * @returns Promise<ChainAggregation[]>
   */
  public async getChainAggregations(
    options: {
      searchQuery?: string;
      page?: number;
      limit?: number;
      sort?: string;
      sortKey?: string;
    } = {}
  ): Promise<ChainAggregation[]> {
    return newrelic.startSegment(
      "ChainService.getChainAggregations",
      true,
      async () => {
        try {
          const {
            searchQuery,
            page = 1,
            limit = 10,
            sort = "ASC",
            sortKey = "chain_name"
          } = options;

          const offset = (page - 1) * limit;
          const whereClause: any = {};

          if (searchQuery) {
            whereClause.chainName = {
              [Op.iLike]: `%${searchQuery}%`
            };
          }

          const sortField = this.mapSortKeyToMaterializedViewField(sortKey);

          const aggregations = await ChainAggregation.findAll({
            where: whereClause,
            order: [[sortField, sort.toUpperCase()]],
            limit,
            offset
          });

          return aggregations;
        } catch (error) {
          console.error("[ERROR] Failed to get chain aggregations:", error);
          throw ApiError.internal(
            `Failed to get chain aggregations: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    );
  }

  /**
   * Map sort key to materialized view field
   * @param sortKey - The sort key from the API
   * @returns string - The actual database field in materialized view
   */
  private mapSortKeyToMaterializedViewField(sortKey: string): string {
    switch (sortKey) {
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
   * Get programs for a specific chain with pagination and filtering
   * @param options - Query options for chain programs
   * @returns Promise<ChainProgramsResponse>
   */
  public async getChainProgramsByChainId(
    options: ChainProgramsQueryOptions
  ): Promise<ChainProgramsResponse> {
    return newrelic.startSegment(
      "ChainService.getChainProgramsByChainId",
      true,
      async () => {
        try {
          console.log(`[DEBUG] Getting chain programs:`, options);

          // Validate sort key
          const validSortKeys = [
            "program_name",
            "manufacturer_name",
            "compliance_percentage",
            "total_earned_rebate"
          ];

          if (options.sortKey && !validSortKeys.includes(options.sortKey)) {
            throw ApiError.badRequest(
              `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`
            );
          }

          // Validate sort direction
          if (
            options.sort &&
            !["ASC", "DESC"].includes(options.sort.toUpperCase())
          ) {
            throw ApiError.badRequest("Sort must be ASC or DESC");
          }

          // Validate timeline
          const validTimelines = Object.values(PROGRAM_TIMELINE);
          if (
            options.programTimeline &&
            !validTimelines.includes(options.programTimeline)
          ) {
            throw ApiError.badRequest(
              `Invalid program timeline. Must be one of: ${validTimelines.join(", ")}`
            );
          }

          // Validate pagination
          if (options.page && options.page < 1) {
            throw ApiError.badRequest("Page must be greater than 0");
          }

          if (options.limit && (options.limit < 1 || options.limit > 50)) {
            throw ApiError.badRequest("Limit must be between 1 and 50");
          }

          // Use the repository method
          const result = await ChainRepository.getChainPrograms(options);

          console.log(`[DEBUG] Chain programs result:`, {
            programCount: result.programs.length,
            totalPrograms: result.pagination.totalPrograms,
            chainId: options.chainId
          });

          return result;
        } catch (error) {
          console.error(
            `[ERROR] ChainService.getChainProgramsByChainId:`,
            error
          );
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
      "ChainService.getChainStores",
      true,
      async () => {
        try {
          console.log(`[DEBUG] Getting chain stores:`, options);

          // Validate sort key
          const validSortKeys = [
            "name",
            "total_programs",
            "enrolled_programs",
            "compliant_programs",
            "total_earned_rebate",
            "total_purchase_volume"
          ];

          if (options.sortKey && !validSortKeys.includes(options.sortKey)) {
            throw ApiError.badRequest(
              `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`
            );
          }

          // Validate sort direction
          if (
            options.sort &&
            !["ASC", "DESC"].includes(options.sort.toUpperCase())
          ) {
            throw ApiError.badRequest("Sort must be ASC or DESC");
          }

          // Validate timeline
          const validTimelines = Object.values(PROGRAM_TIMELINE);
          if (
            options.programTimeline &&
            !validTimelines.includes(options.programTimeline)
          ) {
            throw ApiError.badRequest(
              `Invalid program timeline. Must be one of: ${validTimelines.join(", ")}`
            );
          }

          // Validate pagination
          if (options.page && options.page < 1) {
            throw ApiError.badRequest("Page must be greater than 0");
          }

          if (options.limit && (options.limit < 1 || options.limit > 50)) {
            throw ApiError.badRequest("Limit must be between 1 and 50");
          }

          // Use the repository method
          const result = await ChainRepository.getChainStores(options);

          console.log(`[DEBUG] Chain stores result:`, {
            storeCount: result.stores.length,
            totalStores: result.pagination.totalStores,
            chainId: options.chainId
          });

          return result;
        } catch (error) {
          console.error(`[ERROR] ChainService.getChainStores:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Gets manufacturer chains for a specific distributor
   * @param distributorId - The distributor ID
   * @param options - Query options for filtering and pagination
   * @returns Promise<ManufacturerChainsResponse>
   */
  public async getManufacturerChains(
    distributorId: number,
    manufacturerId: number,
    options: Partial<
      Omit<ManufacturerChainsQueryOptions, "distributorId" | "manufacturerId">
    > = {}
  ): Promise<ManufacturerChainsResponse> {
    return newrelic.startSegment(
      "ChainService.getManufacturerChains",
      true,
      async () => {
        try {
          console.log(`[DEBUG] Getting manufacturer chains for distributor:`, {
            distributorId,
            options
          });

          // Validate sort key
          const validSortKeys = [
            "chain_name",
            "total_stores",
            "total_purchase_volume",
            "total_rebate_amount",
            "compliance_percentage"
          ];

          if (options.sortKey && !validSortKeys.includes(options.sortKey)) {
            throw ApiError.badRequest(
              `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`
            );
          }

          // Validate sort direction
          if (
            options.sort &&
            !["ASC", "DESC"].includes(options.sort.toUpperCase())
          ) {
            throw ApiError.badRequest("Sort must be ASC or DESC");
          }

          // Validate timeline
          const validTimelines = Object.values(PROGRAM_TIMELINE);
          if (
            options.programTimeline &&
            !validTimelines.includes(options.programTimeline)
          ) {
            throw ApiError.badRequest(
              `Invalid program timeline. Must be one of: ${validTimelines.join(", ")}`
            );
          }

          // Validate pagination
          if (options.page && options.page < 1) {
            throw ApiError.badRequest("Page must be greater than 0");
          }

          if (options.limit && (options.limit < 1 || options.limit > 50)) {
            throw ApiError.badRequest("Limit must be between 1 and 50");
          }

          // Use the repository method
          const result = await ChainRepository.getManufacturerChains({
            ...options,
            distributorId,
            manufacturerId
          });

          console.log(`[DEBUG] Manufacturer chains result:`, {
            chainCount: result.chains.length,
            totalChains: result.pagination.totalChains,
            distributorId: distributorId
          });

          return result;
        } catch (error) {
          console.error(`[ERROR] ChainService.getManufacturerChains:`, error);
          throw error;
        }
      }
    );
  }

  /**
   * Gets refactored chain details with nested structure
   * @param chainId - The chain ID
   * @param distributorId - Optional distributor ID filter
   * @param programTimeline - Optional program timeline filter
   * @returns Promise with chain details in the new nested structure
   */
  async getRefactoredChainDetails(
    chainId: number,
    distributorId?: number,
    programTimeline?: string
  ): Promise<any> {
    return newrelic.startSegment(
      "ChainService.getRefactoredChainDetails",
      true,
      async () => {
        try {
          console.log(
            `[DEBUG] Building refactored chain details for chain ${chainId}`
          );

          // Get the chain basic info
          const chain = await Chain.findByPk(chainId);
          if (!chain) {
            throw new ApiError(404, `Chain with ID ${chainId} not found`);
          }

          // Get enrolled program and store compliance data
          const enrolledData =
            await ChainRepository.getEnrolledProgramAndStoreCompliance(
              chainId,
              distributorId, // Pass the distributorId to filter stores
              programTimeline
            );

          // Get manufacturer information for enrolled programs
          const enrolledManufacturerIds = [
            ...new Set(enrolledData.map((row: any) => row.manufacturer_id))
          ];
          const enrolledManufacturers =
            await ChainRepository.getManufacturerInfo(enrolledManufacturerIds);
          const manufacturerMap = new Map(
            enrolledManufacturers.map((m: any) => [m.id, m])
          );

          // Transform the flat data into the nested structure
          const programsMap = new Map<number, any>();

          enrolledData.forEach((row: any) => {
            const programId = row.program_id;
            const tierNumber = row.tier;
            const storeId = row.store_id;

            // Initialize program if not exists
            if (!programsMap.has(programId)) {
              const manufacturer = manufacturerMap.get(row.manufacturer_id);
              programsMap.set(programId, {
                id: programId,
                name: row.program_name,
                programType: row.program_type,
                programHeader: row.program_header,
                startDate: row.start_date,
                endDate: row.end_date,
                manufacturer: manufacturer
                  ? {
                      id: manufacturer.id,
                      name: manufacturer.name,
                      organizationName: manufacturer.organization_name,
                      logo: manufacturer.logo
                    }
                  : null,
                tiers: new Map<number, any>()
              });
            }

            const program = programsMap.get(programId)!;

            // Initialize tier if not exists
            if (!program.tiers.has(tierNumber)) {
              program.tiers.set(tierNumber, {
                programDetailId: row.program_detail_id,
                tier: tierNumber,
                rebateType: row.rebate_type,
                rebateAmount: row.rebate_amount,
                rebatePercentage: row.rebate_percentage,
                minQty: row.min_qty,
                maxQty: row.max_qty,
                quantityType: row.quantity_type,
                stores: {
                  compliant: [],
                  nonCompliant: []
                },
                totalOppSaving: Number(row.rebate_opportunity ?? "0")
              });
            }

            const tier = program.tiers.get(tierNumber)!;

            // Add store to appropriate compliance category
            const storeInfo = {
              id: storeId,
              name: row.name || row.store_name,
              earnedRebate: row.earned_rebate,
              purchaseVolume: row.purchase_volume
            };

            if (row.is_compliant) {
              tier.stores.compliant.push(storeInfo);
            } else {
              tier.stores.nonCompliant.push(storeInfo);
            }
          });

          // Convert Maps to arrays for JSON response
          const enrolledPrograms = Array.from(programsMap.values()).map(
            (program) => ({
              ...program,
              tiers: Array.from(program.tiers.values())
            })
          );

          // Get comprehensive summary data
          const summary = await ChainRepository.getChainSummaryData(
            chainId,
            programTimeline,
            distributorId
          );

          // Get unenrolled programs
          const unenrolledPrograms =
            await ChainRepository.getUnenrolledPrograms(
              chainId,
              programTimeline
            );

          // Get manufacturer information for unenrolled programs
          const unenrolledManufacturerIds = [
            ...new Set(
              unenrolledPrograms.map((program: any) => program.manufacturerId)
            )
          ];
          const unenrolledManufacturers =
            await ChainRepository.getManufacturerInfo(
              unenrolledManufacturerIds
            );
          const unenrolledManufacturerMap = new Map(
            unenrolledManufacturers.map((m: any) => [m.id, m])
          );

          // Add manufacturer information to unenrolled programs
          const unenrolledProgramsWithManufacturer = unenrolledPrograms.map(
            (program: any) => {
              const manufacturer = unenrolledManufacturerMap.get(
                program.manufacturerId
              );
              return {
                ...program,
                manufacturer: manufacturer
                  ? {
                      id: manufacturer.id,
                      name: manufacturer.name,
                      organizationName: manufacturer.organization_name,
                      logo: manufacturer.logo
                    }
                  : null
              };
            }
          );

          const chanePurchaseAndRebate =
            await ProgramService.getChainsPurchaseAndEarningsByManufacturer(
              [...enrolledManufacturerIds, ...unenrolledManufacturerIds],
              distributorId,
              programTimeline,
              chainId
            );

          const result = {
            id: chain.id,
            name: chain.name,
            distributorId: distributorId || null,
            summary: {
              ...summary,
              manufacturerWisePurchases: chanePurchaseAndRebate
            },
            programs: {
              enrolled: enrolledPrograms,
              unenrolled: unenrolledProgramsWithManufacturer
            }
          };

          console.log(`[DEBUG] Built refactored chain details:`, {
            chainId: result.id,
            chainName: result.name,
            enrolledPrograms: result.programs.enrolled.length,
            unenrolledPrograms: result.programs.unenrolled.length,
            enrolledManufacturers: enrolledManufacturerIds.length,
            unenrolledManufacturers: unenrolledManufacturerIds.length,
            summary: result.summary
          });

          return result;
        } catch (error) {
          console.error(
            `[ERROR] ChainService.getRefactoredChainDetails:`,
            error
          );
          throw error;
        }
      }
    );
  }
}

export default new ChainService();
