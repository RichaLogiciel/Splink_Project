import newrelic from "newrelic";
import { Op, QueryTypes } from "sequelize";
import {
  CACHE_TTL_TIME,
  ENTITY_TYPE,
  ENTITY_TYPE_SHORT,
  PROGRAM_TIER_MODAL,
  ProgramsComplianceStatus,
  ProgramsDetailCriteria,
  useApiCaching
} from "../config/appConstants";
import { HttpStatus } from "../config/HttpStatus";
import sequelize from "../db";
import { ApiError } from "../lib/errors/APIError";
import logger from "../lib/logger";
import Distributor from "../models/Distributor";
import LineItem from "../models/LineItem";
import Product from "../models/Product";
import Program from "../models/Program";
import ProgramCompliance from "../models/ProgramCompliance";
import ProgramDetail from "../models/ProgramDetail";
import ProgramParticipant from "../models/ProgramParticipant";
import ProgramAgreement from "../models/ProgramAgreement";
import ProgramStoreIneligibility from "../models/ProgramStoreIneligibility";
import UserRole from "../models/UserRole";
import ComplianceRepository from "../repositories/ComplianceRepository";
import DistributorRepository from "../repositories/DistributorRepository";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import ProgramDetailRepository from "../repositories/ProgramDetailRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import StoreRepository from "../repositories/StoreRepository";
import UserRoleRepository from "../repositories/UserRoleRepository";
import {
  StoreEnrollmentParams,
  StoreEnrollmentResult
} from "../types/ProgramTypes";
import { ManufacturerTierDetail } from "../types/SalesRepTypes";
import { ManufacturerProgramCard } from "../types/StoreProgramResponseTypes";
import { LoggedInUser } from "../types/UserTypes";
import { executeWithIncreasedWorkMem } from "../utils/databaseOptimization";
import {
  buildGrowthData,
  buildGrowthProgramData,
  calculateYOYGrowth,
  extractYOYGrowthRange,
  formatPaymentTermLabel,
  getMinMaxProgramDatesWithManufacturerId,
  getPreviousYearDate,
  isListPriceApplicable,
  getActiveInternalCode,
  getLastTransactionDate,
  getInternalCode,
  sortManufacturersByAuthStatus,
  sortPrograms,
  updateProductInternalCodesByPurchasedItems
} from "../utils/helpers";
import { overrideProgramDetailOverviewText } from "../utils/programHelper";
import { getCacheKey, redisClient } from "../utils/redis";
import { getCurrentUser } from "../utils/requestContext";
import {
  getDistributorIdAsRole,
  getParentDistributorId,
  isChainAdmin,
  isDistributor,
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorAdminOrManagerOrExecutive,
  isDistributorExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRep,
  isDistributorSalesRepManager,
  isManufacturer
} from "../utils/roles";
import {
  getStorePenetrationChartData,
  processGrowthProgramChartData,
  processProgramChartData
} from "../utils/salesUtils";
import { validateEnrollmentParameters } from "../validations/programValidation";
import ChainService from "./ChainService";
import ManufacturerService from "./ManufacturerService";
import StoreDashboardService from "./StoreDashboardService";
import StoreService from "./StoreService";

interface Compliance {
  id: number;
  programId: number;
  entityId: number;
  entityType: string;
  isQualified: boolean;
  totalPurchaseVolume: number;
  totalCasePurchases: number;
  earnedRebate: number;
  complianceDate: Date;
  createdAt: Date;
  updatedAt: Date;
  status: string;
}

interface ProgramOverview {
  name: string;
  isQualified?: boolean;
  rebate?: number;
  programType?: string;
  programHeader?: string;
  rebatetype?: string;
  programDetails?: any[];
  compliances?: Compliance[];
  id: number;
  programTerms?: string;
  programEntityType?: string;
  startDate?: Date;
  endDate?: Date;
}

interface ManufacturerProgram {
  manufacturerName: string;
  manufacturerLogo?: string;
  authManufacturer?: boolean;
  manufacturerId: number;
  totalPurchaseVolume: number;
  totalSaving: number;
  programPaymentTerm?: string;
  program_overview: ProgramOverview[];
}

interface ResponseType {
  totalPurchasedVolume: number;
  totalPurchasedQuantity?: number;
  totalSaving: number;
  totalSavingsOpp: number;
  totalSalesRepSpiff: number;
  salesRepProgramOverview: ProgramRepository[];
  distributorProgramOverview: ProgramRepository[];
  retailerProgramOverview: ProgramRepository[];
  coreProducts?: Product[];
  enrolledStores?: any[];
  unenrolledStores?: any[];
  allProducts?: any;
  // New optional fields for extended /programs/details
  enrolledChains?: any[];
  unenrolledChains?: any[];
  chainProgramOverview?: any[];
  categorizedProducts?: {
    categories: Array<{
      name: string;
      products: Array<{
        id: number;
        name: string;
        internal_code: string;
        recommended: boolean;
        purchased: boolean;
      }>;
    }>;
    totalProducts: number;
  };
}

interface ProgramRepository {
  programDetails?: ProgramDetail[];
  compliances: Compliance[];
  id: number;
  programType: string;
  name: string;
}

/**
 * ProgramService class: responsible for fetching and manipulating program data.
 * Provides methods to fetch programs and program details, calculate compliance aggregates, build program overviews, and group manufacturer programs.
 */
class ProgramService {
  public async getPrograms({
    userId,
    type,
    storeId,
    selectedWarehouseId,
    programTimeline,
    getInternalInitiative,
    excludeChainStores
  }: {
    userId: number;
    type: string;
    storeId?: number;
    selectedWarehouseId?: number;
    programTimeline?: string;
    getInternalInitiative?: boolean;
    excludeChainStores?: boolean;
  }): Promise<ManufacturerProgram[] | ManufacturerProgramCard[] | null> {
    return newrelic.startSegment(
      "ProgramService.getPrograms",
      true,
      async () => {
        try {
          const startTime = process.hrtime();

          // Add custom attributes for context
          newrelic.addCustomAttribute("userId", userId);
          newrelic.addCustomAttribute("type", type);
          newrelic.addCustomAttribute("storeId", storeId || 0);
          newrelic.addCustomAttribute(
            "selectedWarehouseId",
            selectedWarehouseId || 0
          );
          newrelic.addCustomAttribute(
            "programTimeline",
            programTimeline || "default"
          );
          newrelic.addCustomAttribute(
            "getInternalInitiative",
            getInternalInitiative || false
          );
          newrelic.addCustomAttribute(
            "excludeChainStores",
            excludeChainStores || false
          );

          const user = getCurrentUser();
          const userRole: UserRole | null =
            await UserRoleRepository.getAssociatedUser(
              userId,
              user?.isMultiRole // If user has multiple roles, get the higher distributor role
            );

          if (userRole == null) {
            newrelic.addCustomAttribute("getPrograms.userRoleNotFound", true);
            return null;
          }

          newrelic.addCustomAttribute("userRole", userRole.role);

          let warehouseIds = undefined;
          let isGeneralManager = undefined;
          if (isDistributorAdminOrManagerOrExecutive(userRole.role)) {
            const managerId = userRole.associatedUserId;
            isGeneralManager = isDistributorGeneralManager(userRole.role);

            const distributorIdForWarehouses = isDistributorAdmin(userRole.role)
              ? userRole.associatedUserId
              : userRole.parentEntityId;

            if (isGeneralManager) {
              // IMPORTANT: Don't pass selectedWarehouseId to getWarehouseIds(), because that short-circuits
              // and would allow a GM to request any warehouseId.
              const assignedWarehouseIds =
                await DistributorRepository.getWarehouseIds(
                  distributorIdForWarehouses,
                  managerId,
                  true
                );

              if (!assignedWarehouseIds?.length) {
                throw ApiError.badRequest(
                  "General manager has no warehouse assigned"
                );
              }
              if (assignedWarehouseIds.length !== 1) {
                throw ApiError.badRequest(
                  "General manager must be assigned to exactly one warehouse"
                );
              }

              const assignedWarehouseId = assignedWarehouseIds[0];
              if (
                selectedWarehouseId &&
                !isNaN(Number(selectedWarehouseId)) &&
                Number(selectedWarehouseId) !== assignedWarehouseId
              ) {
                throw ApiError.authorizationFailed(
                  "Not authorized for requested warehouse"
                );
              }

              warehouseIds = [assignedWarehouseId];
            } else {
              warehouseIds = await DistributorRepository.getWarehouseIds(
                distributorIdForWarehouses,
                managerId,
                isGeneralManager,
                selectedWarehouseId
              );
            }
          }

          let result: ManufacturerProgram[] | ManufacturerProgramCard[] | null =
            null;

          switch (userRole.role) {
            case ENTITY_TYPE.STORE:
            case ENTITY_TYPE.CHAIN_ADMIN:
              newrelic.addCustomAttribute(
                "getPrograms.flow",
                "getStorePrograms"
              );
              result = await this.getStorePrograms(
                userRole,
                storeId,
                programTimeline,
                getInternalInitiative
              );
              break;

            case ENTITY_TYPE.DISTRIBUTOR:
            case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
            case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
            case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
            case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
            case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
              // If chain view is requested and user is distributor admin, use chain programs logic
              if (
                type === ENTITY_TYPE.CHAIN &&
                isDistributorAdminAndExecutive(userRole.role)
              ) {
                newrelic.addCustomAttribute(
                  "getPrograms.flow",
                  "getChainPrograms"
                );
                result = await this.getChainPrograms(
                  userRole,
                  storeId,
                  programTimeline,
                  getInternalInitiative
                );
              } else {
                newrelic.addCustomAttribute(
                  "getPrograms.flow",
                  "getDistributorPrograms"
                );
                result = await this.getDistributorPrograms({
                  userRole,
                  type,
                  warehouseIds,
                  isGeneralManager,
                  programTimeline,
                  getInternalInitiative,
                  excludeChainStores,
                  hasWarehouseFilter: !!(
                    selectedWarehouseId && !isNaN(selectedWarehouseId)
                  )
                });
              }
              break;

            default:
              newrelic.addCustomAttribute("getPrograms.flow", "unknown");
              result = null;
          }

          // Add result metrics
          if (result) {
            newrelic.addCustomAttribute(
              "getPrograms.resultCount",
              result.length
            );
          }

          // Track execution time
          const [s, ns] = process.hrtime(startTime);
          newrelic.addCustomAttribute(
            "getPrograms.duration_ms",
            s * 1000 + ns / 1000000
          );

          return result;
        } catch (error: unknown) {
          if (error instanceof Error) {
            newrelic.addCustomAttribute("getPrograms.error_userId", userId);
            newrelic.addCustomAttribute("getPrograms.error_type", type);
            newrelic.noticeError(error);
          }
          throw error;
        }
      }
    );
  }

  /**
   * Get SPIFF programs optimized for DISTRIBUTOR_ADMIN users (v2 API)
   * @param params - Parameters for SPIFF program retrieval
   * @returns Promise<ManufacturerProgram[]> - Optimized SPIFF programs grouped by manufacturer
   */
  public async getSpiffProgramsOptimized({
    user,
    type,
    programTimeline,
    getInternalInitiative,
    excludeChainStores,
    warehouseId
  }: {
    user: any;
    type: string;
    programTimeline?: string;
    getInternalInitiative?: boolean;
    excludeChainStores?: boolean;
    warehouseId?: number;
  }): Promise<ManufacturerProgram[]> {
    return newrelic.startSegment(
      "getSpiffProgramsOptimized",
      true,
      async () => {
        try {
          const { id: userId, role } = user;

          // Validate user role - must be DISTRIBUTOR_ADMIN or DISTRIBUTOR_SALES_MANAGER
          if (!isDistributor(role)) {
            throw new ApiError(
              HttpStatus.FORBIDDEN,
              "Access denied. SPIFF v2 API requires DISTRIBUTOR role."
            );
          }

          // Extract distributor and sales rep IDs based on role
          const distributorId = getParentDistributorId(user, role);
          const salesRepId = isDistributorSalesRep(role)
            ? user.associatedUserId
            : role === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
              ? user.associatedUserId // For DISTRIBUTOR_SALES_MANAGER, pass their associatedUserId to get assigned sales reps
              : undefined;

          // Valid & Supported types for the type parameter
          const ValidTypes = ["SPIFF", ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER];

          // Validate type parameter
          if (!ValidTypes.includes(type)) {
            throw new ApiError(
              HttpStatus.BAD_REQUEST,
              `Unsupported program type: ${type}. Supported types: ${ValidTypes.join(", ")}`
            );
          }

          // Switch case to determine program type and participant type based on user role
          let participantType: string;
          let programType: string;

          switch (role) {
            case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
            case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
            case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
            case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
              // DISTRIBUTOR_SALES_MANAGER can see both SPIFF and DISTRIBUTOR_SALES_MANAGER programs based on type parameter
              // DISTRIBUTOR_GENERAL_MANAGER behaves like DISTRIBUTOR_ADMIN but warehouse-scoped
              if (type === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER) {
                participantType = ENTITY_TYPE_SHORT.DISTRIBUTOR_SALES_MANAGER;
              } else {
                participantType = ENTITY_TYPE.SALES_REP;
              }
              break;

            case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
              // Regular sales reps can only see SPIFF programs
              if (type !== "SPIFF") {
                throw new ApiError(
                  HttpStatus.BAD_REQUEST,
                  `Sales reps can only access SPIFF programs. Requested type: ${type}`
                );
              }
              participantType = ENTITY_TYPE.SALES_REP;
              break;

            default:
              throw new ApiError(
                HttpStatus.FORBIDDEN,
                `Access denied. Unsupported role: ${role}. Supported roles: DISTRIBUTOR_ADMIN, DISTRIBUTOR_EXECUTIVE, DISTRIBUTOR_GENERAL_MANAGER, DISTRIBUTOR_SALES_MANAGER, DISTRIBUTOR_SALES_REP`
              );
          }

          // console.log("[DEBUG] Resolved participantType:", participantType, "programType:", programType);

          // Add custom attributes for context
          newrelic.addCustomAttribute("spiff_v2_distributorId", distributorId);
          newrelic.addCustomAttribute("spiff_v2_user_role", role);
          newrelic.addCustomAttribute(
            "spiff_v2_programTimeline",
            programTimeline || "all"
          );
          newrelic.addCustomAttribute(
            "spiff_v2_getInternalInitiative",
            getInternalInitiative || false
          );
          newrelic.addCustomAttribute(
            "spiff_v2_excludeChainStores",
            excludeChainStores || false
          );

          const spiffProgramsData =
            await ProgramRepository.getSpiffProgramsWithEarningsOptimized({
              distributorId,
              salesRepId,
              programTimeline,
              getInternalInitiative,
              excludeChainStores,
              participantType: participantType,
              role: role,
              warehouseId
            });

          newrelic.addCustomAttribute(
            "spiff_v2_programsCount",
            spiffProgramsData.length
          );

          // Transform to manufacturer program format
          const result = await newrelic.startSegment(
            "transformSpiffProgramsToManufacturerFormat",
            true,
            () =>
              this.transformSpiffProgramsToManufacturerFormat(spiffProgramsData)
          );

          newrelic.addCustomAttribute(
            "spiff_v2_manufacturersCount",
            result.length
          );

          return result;
        } catch (error: unknown) {
          if (error instanceof Error) {
            newrelic.addCustomAttribute("spiff_v2_error_userId", user.id);
            newrelic.addCustomAttribute(
              "spiff_v2_error_programTimeline",
              programTimeline || "all"
            );
            newrelic.addCustomAttribute(
              "spiff_v2_error_getInternalInitiative",
              getInternalInitiative || false
            );
            newrelic.addCustomAttribute(
              "spiff_v2_error_excludeChainStores",
              excludeChainStores || false
            );
            newrelic.noticeError(error);
            throw ApiError.internal(`SPIFF v2 API Error: ${error.message}`);
          } else {
            throw ApiError.internal(
              "An unknown error occurred in SPIFF v2 API"
            );
          }
        }
      }
    );
  }

  /**
   * Transform SPIFF programs data to manufacturer program format
   * @param spiffProgramsData - Raw SPIFF programs data from repository
   * @returns ManufacturerProgram[] - Transformed data matching sample_response_format.json
   */
  private transformSpiffProgramsToManufacturerFormat(
    spiffProgramsData: any[]
  ): ManufacturerProgram[] {
    // Group programs by manufacturer
    const manufacturerMap = new Map<number, any>();

    spiffProgramsData.forEach((program: any) => {
      const manufacturerId = program.manufacturer_id;

      if (!manufacturerMap.has(manufacturerId)) {
        manufacturerMap.set(manufacturerId, {
          manufacturerId: manufacturerId,
          manufacturerName: program.manufacturer_name,
          manufacturerLogo: program.manufacturer_logo,
          authManufacturer: program.manufacturer_authorized,
          totalPurchaseVolume: 0,
          totalSaving: 0,
          programPaymentTerm: program.payment_term,
          programs: new Map<number, any>()
        });
      }

      const manufacturer = manufacturerMap.get(manufacturerId);

      // Add to total purchase volume and savings
      manufacturer.totalPurchaseVolume += parseFloat(
        program.total_purchase_volume || 0
      );
      manufacturer.totalSaving += parseFloat(program.total_earning || 0);

      // Group by program
      const programId = program.program_id;
      if (!manufacturer.programs.has(programId)) {
        manufacturer.programs.set(programId, {
          id: programId,
          name: program.program_name,
          programType: "SPIFF",
          programTerms: program.payment_term,
          programHeader: program.program_header,
          compliances: [],
          programEntityType: "SALES_REP",
          programDetails: [],
          startDate: program.start_date,
          endDate: program.end_date,
          // Track compliance data per program (not per detail)
          programCompliance: {
            totalPurchaseVolume: 0,
            totalEarning: 0,
            hasCompliance: false
          }
        });
      }

      const programObj = manufacturer.programs.get(programId);

      // Add program detail
      programObj.programDetails.push({
        id: program.program_detail_id,
        tier: program.tier,
        min_qty: program.min_qty?.toString() || "0.00",
        max_qty: program.max_qty?.toString() || null,
        rebate_amount: program.rebate_amount?.toString() || null,
        rebateAmount: program.rebate_amount?.toString() || null,
        rebate_percentage: program.rebate_percentage?.toString() || null,
        rebate_type: program.rebate_type || null,
        rebateType: program.rebate_type || null,
        rebate_calculation: program.rebate_calculation || null,
        rebateCalculationType: null,
        program_id: programId,
        rebateCalculation: program.rebate_calculation || null,
        quantityType: null,
        productsTags: program.products_tags || null,
        fixed_rebate_amount: null,
        fixedRebateAmount: null,
        fixed_rebate_category: null,
        overview: program.overview || null,
        programLine: program.program_line || null,
        criteria: program.criteria || "SPIFF"
      });

      // Aggregate compliance data per program (not per detail)
      // Only process earnings data once per program (from the first detail)
      if (
        program.total_earning > 0 &&
        !programObj.programCompliance.hasCompliance
      ) {
        programObj.programCompliance.totalPurchaseVolume = parseFloat(
          program.total_purchase_volume || 0
        );
        programObj.programCompliance.totalEarning = parseFloat(
          program.total_earning || 0
        );
        programObj.programCompliance.hasCompliance = true;
      }
    });

    // After processing all data, create compliance entries (one per program)
    manufacturerMap.forEach((manufacturer) => {
      manufacturer.programs.forEach((program: any) => {
        if (program.programCompliance.hasCompliance) {
          program.compliances.push({
            programId: program.id,
            programDetailId: null, // No specific detail ID since it's aggregated
            totalPurchaseVolume:
              program.programCompliance.totalPurchaseVolume.toString(),
            earnedRebate: program.programCompliance.totalEarning.toString(),
            isQualified: true,
            status: ProgramsComplianceStatus.Active
          });
        }
        // Remove the temporary compliance tracking object
        delete program.programCompliance;
      });
    });

    // Convert to array format matching sample_response_format.json
    return Array.from(manufacturerMap.values()).map((manufacturer) => ({
      manufacturerName: manufacturer.manufacturerName,
      manufacturerLogo: manufacturer.manufacturerLogo,
      authManufacturer: manufacturer.authManufacturer,
      manufacturerId: manufacturer.manufacturerId,
      totalPurchaseVolume: Math.round(manufacturer.totalPurchaseVolume),
      totalSaving: Math.round(manufacturer.totalSaving * 100) / 100,
      programPaymentTerm: manufacturer.programPaymentTerm,
      program_overview: Array.from(manufacturer.programs.values())
    }));
  }

  public async getDistributorPrograms({
    userRole,
    type,
    warehouseIds,
    isGeneralManager,
    programTimeline,
    getInternalInitiative,
    excludeChainStores,
    hasWarehouseFilter
  }: {
    userRole: UserRole;
    type: string;
    warehouseIds?: number[];
    isGeneralManager?: boolean;
    programTimeline?: string;
    getInternalInitiative?: boolean;
    excludeChainStores?: boolean;
    hasWarehouseFilter?: boolean;
  }): Promise<ManufacturerProgram[] | ManufacturerProgramCard[] | any> {
    return newrelic.startSegment("getDistributorPrograms", true, async () => {
      try {
        // Add custom attributes for context
        newrelic.addCustomAttribute("userRole", userRole.role);
        newrelic.addCustomAttribute("type", type);

        const isSalesRepUser = isDistributorSalesRep(userRole.role);
        const isReturnStorePrograms: boolean = type === ENTITY_TYPE.STORE;

        const associatedUserId =
          userRole.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP
            ? userRole.parentEntityId
            : getDistributorIdAsRole(userRole, userRole.role);

        const isSalesRepManager = isDistributorSalesRepManager(userRole.role);

        // Step 1: Get excluded program detail IDs
        const excludedProgramDetailIds =
          await ProgramRepository.getExcludedProgramDetailIds([
            associatedUserId
          ]);

        // Step 2: Track store IDs fetching with warehouse filtering
        // Note: getStoreIdsByDistributorId and getStoreIdsBySalesRepId already filter by warehouse
        // Only getStoresBySalesRepManagerId needs manual warehouse filtering
        const storeIds = await newrelic.startSegment(
          "getDistributorPrograms.fetchStoreIds",
          true,
          async () => {
            if (isSalesRepUser) {
              // Sales rep user: repository method handles warehouse filtering
              const stores = await StoreRepository.getStoreIdsBySalesRepId(
                userRole.associatedUserId,
                excludeChainStores,
                warehouseIds
              );
              return stores.map((s: any) => s.storeId);
            }

            if (isSalesRepManager) {
              // Sales rep manager: use optimized single query that combines all filtering
              const managerStoreIds =
                await StoreRepository.getStoreIdsBySalesRepManagerIdOptimized({
                  salesRepManagerId: userRole.associatedUserId,
                  warehouseIds:
                    warehouseIds && warehouseIds.length > 0
                      ? warehouseIds
                      : undefined,
                  excludeChainStores: excludeChainStores || false
                });
              return managerStoreIds;
            } else {
              // Distributor admin/executive: repository method handles warehouse filtering
              const stores = await StoreRepository.getStoreIdsByDistributorId(
                associatedUserId,
                excludeChainStores,
                warehouseIds
              );
              return stores.map((s: any) => s.associatedUserId);
            }
          }
        );
        newrelic.addCustomAttribute("storeIdsCount", storeIds.length);

        // Step 3: Wrap key operations in segments
        const [allCompliances, authorizedManufacturers] = await Promise.all([
          type == ENTITY_TYPE.STORE || (warehouseIds && isGeneralManager)
            ? (async () => {
                const complianceStartTime = process.hrtime();
                const result =
                  await ComplianceRepository.findComplianceByEntityIdAndEntityType(
                    {
                      entityId: storeIds,
                      entityType: [ENTITY_TYPE.STORE],
                      programIds: undefined,
                      includeOnlyParticipatedProgramCompliances: true,
                      returnRawData: true,
                      complianceStatus: ProgramsComplianceStatus.Active,
                      excludeIneligibleStores: true
                    }
                  );
                const [complianceSec, complianceNs] =
                  process.hrtime(complianceStartTime);
                newrelic.addCustomAttribute(
                  "complianceQueryDuration_ms",
                  complianceSec * 1000 + complianceNs / 1000000
                );
                return result;
              })()
            : newrelic.startSegment("getCompliances", true, () =>
                this.getCompliances(associatedUserId, type, userRole)
              ),
          newrelic.startSegment("getAuthorizedManufacturers", true, () =>
            ManufacturerRepository.getAuthorizedManufacturers(associatedUserId)
          )
        ]);

        newrelic.addCustomAttribute("compliancesCount", allCompliances.length);
        newrelic.addCustomAttribute(
          "manufacturersCount",
          authorizedManufacturers.length
        );

        // Step 4: Track program ID mapping (Application Logic)
        const uniqueProgramIds = await newrelic.startSegment(
          "getDistributorPrograms.mapProgramIds",
          true,
          async () => [...new Set(allCompliances.map((c) => c.programId))]
        );

        // Step 5: Track manufacturer ID mapping (Application Logic)
        const authorizedManufacturerIds = await newrelic.startSegment(
          "getDistributorPrograms.mapManufacturerIds",
          true,
          async () =>
            authorizedManufacturers.map((am) => Number(am.manufacturerId))
        );

        const validProgramIdsStartTime = process.hrtime();
        const validProgramIds =
          await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
            participantType: type,
            creatorIds: authorizedManufacturerIds,
            creatorType: ENTITY_TYPE.MANUFACTURER,
            secondaryCreatorIds: [associatedUserId],
            secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
            visibilityEntitieIds: isReturnStorePrograms
              ? storeIds
              : [associatedUserId],
            getInternalInitiative: getInternalInitiative,
            distributorId: associatedUserId
          });

        const programsStartTime = process.hrtime();
        const programs = await newrelic.startSegment(
          "getDistributorPrograms.fetchPrograms",
          true,
          async () =>
            type === ENTITY_TYPE.DISTRIBUTOR || isReturnStorePrograms
              ? await ProgramRepository.getProgramsByParticipantType({
                  participantType: isReturnStorePrograms
                    ? ENTITY_TYPE.STORE
                    : type,
                  authorizedManufacturerIds,
                  excludedProgramDetailIds,
                  programIds: validProgramIds,
                  programTimeline,
                  isInternalInitiative: getInternalInitiative
                })
              : await ProgramRepository.getDistributorPrograms(
                  uniqueProgramIds,
                  excludedProgramDetailIds,
                  programTimeline
                )
        );
        const [programsSec, programsNs] = process.hrtime(programsStartTime);
        newrelic.addCustomAttribute(
          "fetchProgramsDuration_ms",
          programsSec * 1000 + programsNs / 1000000
        );

        newrelic.addCustomAttribute("programsCount", programs.length);

        // Step 8: Track program sorting (Application Logic)
        await newrelic.startSegment(
          "getDistributorPrograms.sortPrograms",
          true,
          async () => sortPrograms(programs)
        );

        // Step 9: Track manufacturer ID mapping (Application Logic)
        const manufacturerIds = await newrelic.startSegment(
          "getDistributorPrograms.mapManufacturerIds",
          true,
          async () =>
            programs.map(
              (pro) =>
                pro?.Manufacturer?.id ?? pro?.Manufacturer?.get("id") ?? 0
            )
        );

        // Step 10: Store exclusion logic moved to purchase volume query
        // Ineligibility check is now done per manufacturer within the purchase volume query
        // to ensure correct purchase volumes for each manufacturer independently
        // REMOVED: Pre-filtering of stores - all stores are now passed to the query
        // and ineligibility is handled per manufacturer in getTransactionsByManufacturerIdAndProgramTermsOptimizedWithIneligibility

        // Step 11: Data grouping (Most complex operation)
        const result = await newrelic.startSegment(
          "groupProgramByManufacturer",
          true,
          () =>
            this.groupProgramByManufacturer(
              programs,
              allCompliances,
              type,
              associatedUserId,
              warehouseIds,
              storeIds,
              userRole,
              excludeChainStores,
              hasWarehouseFilter
            )
        );

        // Step 12: Sort manufacturers (Application Logic)
        const sortedResult = sortManufacturersByAuthStatus(result);

        return sortedResult;
      } catch (error: unknown) {
        if (error instanceof Error) {
          newrelic.noticeError(error, {
            userRole: userRole.role,
            type,
            errorMessage: error.message
          });
        }
        throw error;
      }
    });
  }

  /**
   * Returns chain programs for distributor users requesting chain view
   * This replaces the old getChainViewPrograms functionality
   */
  public async getChainPrograms(
    userRole: UserRole,
    storeId?: number,
    programTimeline?: string,
    isInternal?: boolean
  ): Promise<ManufacturerProgram[] | ManufacturerProgramCard[] | any> {
    try {
      const associatedUserId = getParentDistributorId(userRole, userRole.role);

      // For distributor users requesting chain view:
      // 1. Get all stores under this distributor to find chain IDs
      // 2. Extract unique chain IDs
      // 3. Fetch chain stores using those chain IDs
      const allDistributorStores =
        await StoreRepository.getSalesRepWithStoresAndTotalAmount(
          [associatedUserId], // distributorIds
          null, // storeId filter
          null, // searchQuery
          null, // selectedSalesRepId
          1, // page
          "ASC", // sort
          null, // chainId filter
          1000, // large pageSize to get all stores
          [], // productIds
          null, // enrolled filter
          [], // programIds
          false, // excludedStoreWithNoTransaction
          "sort", // sortKey
          undefined, // manufacturerId
          undefined, // authorizedDistManufacturerIds
          undefined, // warehouseIds
          undefined, // programs
          false, // returnSpiffEarning
          false, // returnEnrolledProgramsEarning
          undefined // programTerms
        );

      const allStores = allDistributorStores.rows || [];

      // Extract unique chain IDs (filter out null/undefined)
      const chainIds: number[] = [
        ...new Set(
          allStores
            .map((store: any) => store.chain_id)
            .filter((chainId: any) => chainId !== null && chainId !== undefined)
        )
      ] as number[];

      let chainStores: any[] = [];
      let storeIds: number[] = [];
      let distributorIds: number[] = [];

      if (chainIds.length > 0) {
        // Get stores for all these chains
        const chainStorePromises = chainIds.map((chainId: number) =>
          StoreRepository.getStoresByChainId(chainId)
        );

        const chainStoreResults = await Promise.all(chainStorePromises);
        chainStores = chainStoreResults.flat(); // Flatten array of arrays

        // Filter to only include stores that belong to this distributor
        chainStores = chainStores.filter(
          (store: any) => store.parentEntityId === associatedUserId
        );

        storeIds = chainStores.map((store: any) => store.id);
        distributorIds = [associatedUserId];
      } else {
        // No chains found, return empty
        return [];
      }

      const storesEarningOpportunities =
        await StoreRepository.getStoresEarningOpportunity(
          storeIds,
          distributorIds[0]
        );

      const excludedProgramDetailIds =
        await ProgramRepository.getExcludedProgramDetailIds(distributorIds);

      const programCompliancesFilter = {
        entity_id: { [Op.in]: storeIds },
        entity_type: ENTITY_TYPE.STORE
      };

      const authorizedManufacturers =
        await ManufacturerRepository.getAuthorizedManufacturers(
          undefined,
          distributorIds
        );

      const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
        Number(am.manufacturerId)
      );

      const validProgramIds =
        await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
          participantType: ENTITY_TYPE.CHAIN,
          creatorIds: authorizedManufacturerIds,
          creatorType: ENTITY_TYPE.MANUFACTURER,
          secondaryCreatorIds: distributorIds,
          secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
          visibilityEntitieIds: storeIds,
          distributorId: distributorIds
        });

      const programs: Program[] =
        await ProgramRepository.getProgramsByParticipantType({
          participantType: ENTITY_TYPE.CHAIN,
          authorizedManufacturerIds,
          excludedProgramDetailIds,
          programIds: validProgramIds,
          programTimeline,
          isInternalInitiative: isInternal
        });
      const programIds = programs.map((pro) => pro.id);

      const programCompliances = await ProgramCompliance.findAll({
        include: [
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
        where: {
          program_id: programIds,
          "$ProgramComplianceStoreIneligibilities.id$": {
            [Op.is]: null
          },
          ...programCompliancesFilter
        }
      });

      const chanePurchaseAndRebate =
        await this.getChainsPurchaseAndEarningsByManufacturer(
          authorizedManufacturerIds,
          associatedUserId,
          programTimeline
        );

      const programsByManufacturers: any = {};

      sortPrograms(programs);

      programs.forEach((program: Program) => {
        const programPaymentTerm = formatPaymentTermLabel(program.paymentTerm);

        if (!programsByManufacturers[program.manufacturerId]) {
          programsByManufacturers[program.manufacturerId] = {
            id: program.manufacturerId,
            manufacturerId: program.manufacturerId,
            manufacturerName: program.Manufacturer?.name || "",
            manufacturerLogo: program.Manufacturer?.logo || "",
            authManufacturer: program.Manufacturer?.authorized || false,
            totalPurchaseVolume: 0,
            totalSaving: 0,
            programPaymentTerm: programPaymentTerm,
            program_overview: []
          };
        }

        // Find if this program already exists in program_overview
        let existingProgramOverview = programsByManufacturers[
          program.manufacturerId
        ].program_overview.find((po: any) => po.id === program.id);

        if (!existingProgramOverview) {
          // Create new program overview entry
          existingProgramOverview = {
            id: program.id,
            name: program.name,
            programType: program.programType,
            programHeader: program.programHeader,
            programTerms: program.paymentTerm,
            programEntityType: program.participantType,
            compliances: [],
            programDetails:
              program.ProgramDetails?.map((detail: ProgramDetail) => ({
                id: detail.id,
                tier: detail.tier,
                rebate_calculation_type: detail.rebateCalculation,
                rebate_type: detail.rebateType,
                rebate_amount: detail.rebateAmount,
                rebate_percentage: detail.rebatePercentage,
                fixed_rebate_amount: detail.fixedRebateAmount,
                min_qty: detail.minQty,
                max_qty: detail.maxQty,
                overview: detail.overview,
                description: detail.description
              })) || []
          };
          programsByManufacturers[program.manufacturerId].program_overview.push(
            existingProgramOverview
          );
        }

        // Add compliance information for each tier
        program.ProgramDetails?.forEach((detail: ProgramDetail) => {
          const tierCompliances = programCompliances.filter(
            (pc) =>
              pc.programId === program.id && pc.programDetailId === detail.id
          );

          const isQualified =
            storeIds.length > 0
              ? tierCompliances.filter((pc) => pc.isQualified).length ===
                storeIds.length
              : tierCompliances.length > 0 && tierCompliances[0]?.isQualified;

          existingProgramOverview.compliances.push({
            programId: program.id,
            programDetailId: detail.id,
            tier: detail.tier,
            isQualified: isQualified || false,
            description:
              program.programType === "TIER"
                ? `${program.programHeader} - Tier ${detail.tier}`
                : program.name,
            totalPurchaseVolume: tierCompliances.reduce(
              (sum, pc) => sum + (Number(pc.totalPurchaseVolume) || 0),
              0
            ),
            earnedRebate: tierCompliances.reduce(
              (sum, pc) => sum + (Number(pc.earnedRebate) || 0),
              0
            )
          });
        });

        // Update manufacturer totals
        const manufacturerCompliances = programCompliances.filter(
          (pc) => pc.programId === program.id
        );

        programsByManufacturers[program.manufacturerId].totalPurchaseVolume +=
          manufacturerCompliances.reduce(
            (sum, pc) => sum + (Number(pc.totalPurchaseVolume) || 0),
            0
          );
        programsByManufacturers[program.manufacturerId].totalSaving +=
          manufacturerCompliances.reduce(
            (sum, pc) => sum + (Number(pc.earnedRebate) || 0),
            0
          );
      });

      // Convert to array and sort by authorization status
      let result = Object.values(programsByManufacturers);

      // add purchase and rebate value in manufacturer Card
      if (chanePurchaseAndRebate?.length) {
        result = result?.map((r: any) => {
          return {
            ...r,
            totalPurchaseVolume:
              chanePurchaseAndRebate?.find(
                (dt) => dt.manufacturer_id == r.manufacturerId
              )?.total_purchase_volume ?? 0,
            totalSaving:
              chanePurchaseAndRebate?.find(
                (dt) => dt.manufacturer_id == r.manufacturerId
              )?.total_earned_rebate ?? 0
          };
        });
      }

      const sortedResult = sortManufacturersByAuthStatus(
        result as unknown as ManufacturerProgram[]
      );

      return sortedResult;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(error.message);
      } else {
        throw new ApiError(500, "Unknown error occurred");
      }
    }
  }

  public async getStorePrograms(
    userRole: UserRole,
    storeId?: number,
    programTimeline?: string,
    isInternal?: boolean
  ): Promise<ManufacturerProgram[] | ManufacturerProgramCard[] | any> {
    try {
      const associatedUserId = userRole.associatedUserId;
      const isChainUser = isChainAdmin(userRole.role);

      // For all cases, return the original manufacturer-organized structure
      return this.getRegularStorePrograms(
        userRole,
        !isChainUser ? associatedUserId : storeId,
        programTimeline
      );
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(error.message);
      } else {
        throw new ApiError(500, "Unknown error occurred");
      }
    }
  }

  /**
   * Returns the original manufacturer-organized structure for regular store/chain users
   */
  private async getRegularStorePrograms(
    userRole: UserRole,
    storeId?: number,
    programTimeline?: string
  ): Promise<ManufacturerProgram[] | ManufacturerProgramCard[]> {
    const associatedUserId = userRole.associatedUserId;
    const isChainUser = isChainAdmin(userRole.role);

    // Determine how to fetch stores based on user type
    let storeIds: number[] = [];
    let distributorIds: number[] = [];

    if (isChainUser) {
      // For actual chain users, get stores by chain ID
      const chainStores = await StoreRepository.getStoresByChainId(
        associatedUserId,
        storeId ? [storeId] : undefined
      );
      storeIds = chainStores?.map((store: any) => store.id) || [];
      distributorIds =
        Array.from(
          new Set(chainStores?.map((store: any) => store.parentEntityId))
        ) || [];
    } else {
      // For individual store users
      storeIds = [associatedUserId];
      distributorIds = [userRole.parentEntityId];
    }

    const storesEarningOpportunities =
      await StoreRepository.getStoresEarningOpportunity(
        storeIds,
        distributorIds[0]
      );

    const excludedProgramDetailIds =
      await ProgramRepository.getExcludedProgramDetailIds(distributorIds);

    const programCompliancesFilter = {
      entity_id: { [Op.in]: storeIds },
      entity_type: ENTITY_TYPE.STORE
    };

    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturers(
        undefined,
        distributorIds
      );

    const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );

    // const participantedEntities = !isChainUser
    //   ? await ProgramRepository.getParticipatedEntityWithManufacturerIds(
    //       userRole.associatedUserId,
    //       ENTITY_TYPE.STORE,
    //       authorizedManufacturerIds
    //     )
    //   : [];

    const validProgramIds =
      await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
        participantType: ENTITY_TYPE.STORE,
        creatorIds: authorizedManufacturerIds,
        creatorType: ENTITY_TYPE.MANUFACTURER,
        secondaryCreatorIds: distributorIds,
        secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
        visibilityEntitieIds: storeIds,
        distributorId: distributorIds
      });

    const programs: Program[] =
      await ProgramRepository.getProgramsByParticipantType({
        participantType: ENTITY_TYPE.STORE,
        authorizedManufacturerIds,
        excludedProgramDetailIds,
        programIds: validProgramIds,
        programTimeline
      });

    sortPrograms(programs);

    const programIds = programs.map((pro) => pro.id);

    const programCompliances = await ProgramCompliance.findAll({
      where: {
        program_id: programIds,
        ...programCompliancesFilter
      }
    });

    let ineligibleStoreProgramIds: any[] = [];
    if (storeId) {
      ineligibleStoreProgramIds =
        await ProgramRepository.getIneligibleProgramIds(storeId);
    }

    const programsByManufacturers: any = {};

    programs
      ?.filter((pro: any) => !ineligibleStoreProgramIds.includes(pro.id))
      .forEach((program: Program) => {
        const programPaymentTerm = formatPaymentTermLabel(program.paymentTerm);
        // const programOverview = this.buildProgramOverview(
        //   program,
        //   programCompliances.filter((pc) => pc.programId === program.id)
        // );

        const { programs, salesData } = this.getFormattedProgramsAndSalesData(
          program,
          programCompliances,
          undefined,
          isChainUser,
          isChainUser ? storeIds?.length : undefined,
          storesEarningOpportunities
        );

        if (!programsByManufacturers[program.manufacturerId]) {
          programsByManufacturers[program.manufacturerId] = {
            id: program.manufacturerId,
            chainId: isChainUser ? userRole.associatedUserId : null,
            manufacturer: {
              id: program.manufacturerId,
              name: program.Manufacturer?.name || "",
              avatar: program.Manufacturer?.logo || "",
              authorized: program.Manufacturer?.authorized || false
            },
            totalPurchaseVolume: 0,
            totalSaving: 0,
            programs,
            salesData,
            programPaymentTerm: programPaymentTerm,
            program_overview: []
          };
        } else {
          programsByManufacturers[program.manufacturerId] = {
            ...programsByManufacturers[program.manufacturerId],
            programs: [
              ...programsByManufacturers[program.manufacturerId].programs,
              ...programs
            ]
          };
        }

        // programsByManufacturers[program.manufacturerId].program_overview.push(
        //   programOverview
        // );

        // Update manufacturer totals
        const manufacturerCompliances = programCompliances.filter(
          (pc) => pc.programId === program.id
        );
        programsByManufacturers[program.manufacturerId].totalPurchaseVolume +=
          manufacturerCompliances.reduce(
            (sum, pc) => sum + (Number(pc.totalPurchaseVolume) || 0),
            0
          );
        programsByManufacturers[program.manufacturerId].totalSaving +=
          manufacturerCompliances.reduce(
            (sum, pc) => sum + (Number(pc.earnedRebate) || 0),
            0
          );
      });

    const result = Object.values(programsByManufacturers);
    const sortedResult = sortManufacturersByAuthStatus(
      result as unknown as ManufacturerProgram[]
    );

    return sortedResult;
  }

  /**
   * Determines if a program is specifically designed for chains by checking program_participants
   * @param program - The program to check
   * @returns Promise<boolean> - true if the program has chain participants, false otherwise
   */

  /**
   * Retrieves program details for a user based on their role and other parameters.
   *
   * This function fetches the program details for a user by determining their role
   * and calling the appropriate method for either store or distributor-related programs.
   *
   * @param {number} userId - The ID of the user requesting program details.
   * @param {string} type - The type of program entity (e.g., STORE, DISTRIBUTOR).
   * @param {number} manufacturerId - The ID of the manufacturer related to the program.
   * @param {string | null} [searchQuery=null] - Optional search query to filter results.
   * @param {number} [enrolledPage=1] - The page number for enrolled programs pagination.
   * @param {number} [notEnrolledPage=1] - The page number for unenrolled programs pagination.
   * @param {string} [sort="ASC"] - The sorting order for the results, either "ASC" or "DESC".
   * @param {number} [programId] - Optional ID of a specific program to fetch details for.
   * @param {number} [programDetailId] - Optional ID of a specific program detail to fetch.
   * @param {string} [sortKey="sort"] - Optional sort key for specific column sorting.
   * @returns {Promise<ResponseType | any>} A promise that resolves to the program details
   * or a suitable response based on the user's role.
   */
  public async getProgramDetails(
    userId: number,
    type: string,
    manufacturerId: number,
    searchQuery: string | null = null,
    enrolledPage: number = 1,
    notEnrolledPage: number = 1,
    sort: string = "ASC",
    programId?: number,
    programDetailId?: number,
    sortKey: string = "sort",
    forStore: number = 0,
    isManufacturerUser?: boolean,
    selectedWarehouseId?: number,
    programTimeline?: string,
    isInternalInitiative?: boolean,
    includeChainInfo?: boolean,
    includeProducts?: boolean,
    excludeChainStores?: boolean,
    isChainPrograms?: boolean
  ): Promise<ResponseType | any> {
    const user = getCurrentUser();
    const userRole: UserRole | null =
      await UserRoleRepository.getAssociatedUser(userId, user?.isMultiRole);
    if (userRole == null) return null;
    if (forStore) {
      return this.getStoreProgramDetails({
        userRole,
        manufacturerId,
        programId,
        programDetailId,
        forStore,
        isManufacturerUser,
        programTimeline,
        type,
        isChainPrograms
      });
    }
    let warehouseIds = undefined;
    if (isDistributorAdminOrManagerOrExecutive(userRole.role)) {
      const managerId = userRole.associatedUserId;
      const isGeneralManager = isDistributorGeneralManager(userRole.role);

      warehouseIds = await DistributorRepository.getWarehouseIds(
        isDistributorAdmin(userRole.role)
          ? userRole.associatedUserId
          : userRole.parentEntityId,
        managerId,
        isGeneralManager,
        selectedWarehouseId
      );
    }

    let response: ResponseType | any;
    switch (userRole.role) {
      case ENTITY_TYPE.STORE:
        response = await this.getStoreProgramDetails({
          userRole,
          manufacturerId,
          programId,
          programDetailId,
          programTimeline
        });
        break;
      case ENTITY_TYPE.DISTRIBUTOR:
      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
      case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
        if (type === "CHAIN" && isDistributorAdminAndExecutive(userRole.role)) {
          response = await this.getChainProgramDetails(
            userRole,
            manufacturerId,
            searchQuery,
            enrolledPage,
            notEnrolledPage,
            sort,
            sortKey,
            programTimeline,
            isInternalInitiative
          );
        } else {
          response = await this.getDistributorProgramDetails(
            userRole,
            type,
            manufacturerId,
            searchQuery,
            enrolledPage,
            notEnrolledPage,
            sort,
            sortKey,
            warehouseIds,
            programTimeline,
            selectedWarehouseId,
            isInternalInitiative,
            excludeChainStores
          );
        }
        break;
      default:
        return null;
    }

    // Optionally fetch and merge chain info
    if (includeChainInfo) {
      const distributorId = getParentDistributorId(userRole, userRole.role);

      // Start timing for enrolled/unenrolled chains fetch

      // Get enrolled and unenrolled chains using ChainService
      const [enrolledChains, unenrolledChains] = await Promise.all([
        this.getEnrolledChainsForManufacturer(
          manufacturerId,
          distributorId,
          programTimeline
        ),
        this.getUnenrolledChainsForManufacturer(
          manufacturerId,
          distributorId,
          programTimeline
        )
      ]);

      response.enrolledChains = enrolledChains;
      response.unenrolledChains = unenrolledChains;

      // Use the existing getChainsByManufacturer method for program-organized chain data
      const { chainProgramOverview, totalPurchaseVolume, totalSaving } =
        await this.getChainsByManufacturer(
          manufacturerId,
          distributorId,
          programTimeline
        );

      response.chainProgramOverview = chainProgramOverview;

      // // Recalculate totalPurchasedVolume and totalSaving to only include chain stores when includeChainInfo is true
      // const [chainStoresPurchaseVolume, chainStoresSavings] = await Promise.all(
      //   [
      //     this.getChainStoresPurchaseVolume(
      //       manufacturerId,
      //       distributorId,
      //       programTimeline
      //     ),
      //     this.getChainStoresSavings(
      //       manufacturerId,
      //       distributorId,
      //       programTimeline
      //     )
      //   ]
      // );

      // Update the response with chain-specific purchase volume and savings
      response.totalPurchaseVolume = totalPurchaseVolume;
      response.totalSaving = totalSaving;
    }

    // Optionally fetch and merge categorized products
    if (includeProducts) {
      const categorizedProducts = await this.getCategorizedProducts({
        programsType: type,
        loggedInUser: userRole as any,
        manufacturerId,
        programTimeline
      });
      response.categorizedProducts = categorizedProducts;
    }

    return response;
  }

  /**
   * Retrieves the program details for a given distributor user ID and manufacturer ID.
   *
   * If the program detail ID is provided, it will return the program details for the specific program detail ID.
   * Otherwise, it will return all program details for the provided distributor user ID and manufacturer ID.
   *
   * @param userRole - The user role object containing the associated user ID.
   * @param manufacturerId - The manufacturer ID to filter the programs by.
   * @param programDetailId - Optional program detail ID to filter the program details by.
   * @returns A promise that resolves to a `ResponseType` object containing the program details.
   * @throws An `ApiError` if an error occurs during the call to
   *   `StoreDashboardService.getManufacturerDetails`.
   */
  public async getProgramDetailsByDetailId(
    userId: number,
    manufacturerId: number,
    programDetailId?: number
  ): Promise<ResponseType | any> {
    const user = getCurrentUser();
    const userRole: UserRole | null =
      await UserRoleRepository.getAssociatedUser(userId, user?.isMultiRole);

    if (userRole == null) return null;

    return this.getDistributorProgramDetailsByDetailId(
      userRole,
      manufacturerId,
      programDetailId
    );
  }

  /**
   * Retrieves chain program details for distributor admin users
   * @param userRole - The user role object
   * @param manufacturerId - The manufacturer ID
   * @param searchQuery - Optional search query
   * @param enrolledPage - Page number for enrolled chains
   * @param notEnrolledPage - Page number for unenrolled chains
   * @param sort - Sort order
   * @param sortKey - Sort key
   * @param programTimeline - Program timeline filter
   * @param isInternalInitiative - Internal initiative filter
   * @returns Promise<any> - Chain program details response
   */
  public async getChainProgramDetails(
    userRole: UserRole,
    manufacturerId: number,
    searchQuery: string | null = null,
    enrolledPage: number = 1,
    notEnrolledPage: number = 1,
    sort: string = "ASC",
    sortKey: string = "sort",
    programTimeline?: string,
    isInternalInitiative?: boolean
  ): Promise<any> {
    return newrelic.startSegment(
      "ProgramService.getChainProgramDetails",
      true,
      async () => {
        try {
          const distributorId = getParentDistributorId(userRole, userRole.role);

          // Use ChainService to get chain program details
          const chainProgramDetails = await ChainService.getChainProgramDetails(
            {
              manufacturerId,
              distributorId,
              searchQuery: searchQuery || undefined,
              enrolledPage,
              notEnrolledPage,
              sort: sort as "ASC" | "DESC",
              sortKey,
              programTimeline,
              isInternal: isInternalInitiative
            }
          );

          return chainProgramDetails;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(
              `ProgramService.getChainProgramDetails: ${error.message}`
            );
          } else {
            throw ApiError.internal(
              "An unknown error occurred in ProgramService.getChainProgramDetails"
            );
          }
        }
      }
    );
  }

  /**
   * Retrieves the analytics data for a given program detail ID, including the total sales
   * and year-over-year growth.
   *
   * @param {UserRole} userRole The user role object.
   * @param {number} programdetailId The ID of the program detail.
   * @param {number | undefined} selectedWarehouseId The ID of the selected warehouse to filter by.
   *
   * @returns {Promise<ResponseType | any>} A promise that resolves to an object with two properties:
   *   - `totalSales`: An object with the current year's total sales (`value`), the previous year's total sales (`prevValue`), and the year-over-year growth (`yoy`).
   *   - `chartData`: An array of objects with the chart data for the program, including the program name, sales, and year-over-year growth.
   */
  public async getProgramDetailAnalytics(
    userRole: UserRole,
    programdetailId: number,
    selectedWarehouseId?: number
  ): Promise<ResponseType | any> {
    const [program] = await ProgramRepository.getProgramsByIdsOrDetailIds(
      undefined,
      [programdetailId]
    );
    if (!program) {
      throw ApiError.notFound("Program not found");
    }

    let warehouseIds = undefined;
    if (isDistributorAdminOrManagerOrExecutive(userRole.role)) {
      const managerId = userRole.associatedUserId;
      const isGeneralManager = isDistributorGeneralManager(userRole.role);

      warehouseIds = await DistributorRepository.getWarehouseIds(
        isDistributorAdmin(userRole.role)
          ? userRole.associatedUserId
          : userRole.parentEntityId,
        managerId,
        isGeneralManager,
        selectedWarehouseId
      );
    }

    const {
      manufacturerId,
      startDate: programStartDate,
      endDate: programEndDate,
      ProgramDetails
    } = program;

    const currentProgramDetail = ProgramDetails?.[0];
    const isOutreachProgram =
      currentProgramDetail?.criteria == ProgramsDetailCriteria.Outreach;

    const isPOD = currentProgramDetail?.criteria == ProgramsDetailCriteria.POD;
    const isGrowth =
      currentProgramDetail?.criteria == ProgramsDetailCriteria.Growth;

    const startDate = new Date(programStartDate);
    const endDate =
      new Date(programEndDate) > new Date()
        ? new Date()
        : new Date(programEndDate);
    const prevYearStartDate = getPreviousYearDate(startDate);
    const prevYearEndDate = getPreviousYearDate(endDate);

    const distributorId = getParentDistributorId(userRole, userRole.role);

    if (isPOD) {
      // Use generic utility to fetch unique tags for this program
      const uniqueTags =
        await ProgramRepository.getUniqueProductTagsByProgramIds([program.id]);
      const manufacturerProducts =
        await StoreRepository.getManufacturerProducts({
          manufacturerId,
          distributorId,
          selectedWarehouseId,
          categoryTagsJSON: uniqueTags
        });
      const productCategoryTags =
        await StoreRepository.getCategoryTagsReference(uniqueTags);

      const saleTransactionLineItemsResult =
        await StoreRepository.getTransactionsByManufacturerId(
          [distributorId],
          [manufacturerId],
          ENTITY_TYPE.DISTRIBUTOR,
          true,
          undefined,
          undefined,
          true,
          selectedWarehouseId ? [selectedWarehouseId] : undefined,
          { startDate: startDate.toString(), endDate: endDate.toString() }
        );
      const result = StoreService.generateGraphAndProgressText(
        currentProgramDetail,
        manufacturerProducts,
        productCategoryTags,
        undefined,
        saleTransactionLineItemsResult,
        undefined
      );

      return {
        graph: result.graph
      };
    }

    let manufacturerProducts = [];
    if (isGrowth) {
      const uniqueTags =
        await ProgramRepository.getUniqueProductTagsByProgramIds([program.id]);

      if (uniqueTags.length > 0) {
        manufacturerProducts = (
          await StoreRepository.getManufacturerProducts({
            manufacturerId,
            distributorId,
            selectedWarehouseId,
            categoryTagsJSON: uniqueTags
          })
        )?.map((product: any) => product.id);
      }
    }

    // Fetch transaction insights (current & previous year)
    const [currentResults, previousResults] = await Promise.all([
      DistributorRepository.getProductInsights(
        distributorId,
        startDate,
        endDate,
        [],
        manufacturerId,
        isGrowth && manufacturerProducts.length > 0
          ? manufacturerProducts
          : undefined,
        warehouseIds
      ),
      isOutreachProgram
        ? []
        : DistributorRepository.getProductInsights(
            distributorId,
            prevYearStartDate,
            prevYearEndDate,
            [],
            manufacturerId,
            isGrowth && manufacturerProducts.length > 0
              ? manufacturerProducts
              : undefined,
            warehouseIds
          )
    ]);

    if (isOutreachProgram) {
      return this.handleOutreachProgram(
        currentProgramDetail,
        manufacturerId,
        distributorId,
        selectedWarehouseId,
        currentResults,
        startDate,
        endDate
      );
    }

    const totalVal = currentResults.reduce(
      (sum: number, item: any) => sum + parseFloat(item.sales),
      0
    );

    const prevTotalVal = previousResults.reduce(
      (sum: number, item: any) => sum + parseFloat(item.sales),
      0
    );

    const maxTotal = Math.max(totalVal, prevTotalVal);

    let chartData, prevYearChartData;

    if (isGrowth) {
      // For growth programs, use the new cumulative/incremental chart data
      [chartData, prevYearChartData] = [
        processGrowthProgramChartData(currentResults, startDate, endDate),
        processGrowthProgramChartData(
          previousResults,
          prevYearStartDate,
          prevYearEndDate
        )
      ];
    } else {
      // For non-growth programs, use the regular chart data processing
      [chartData, prevYearChartData] = [
        processProgramChartData(currentResults, maxTotal, startDate, endDate),
        processProgramChartData(
          previousResults,
          maxTotal,
          prevYearStartDate,
          prevYearEndDate
        )
      ];
    }

    const yoyVal = calculateYOYGrowth(totalVal, prevTotalVal);

    const growthRange = extractYOYGrowthRange(
      currentProgramDetail?.overview ?? ""
    );

    let earnedRebate = 0;

    if (
      currentProgramDetail?.rebatePercentage &&
      yoyVal &&
      yoyVal >= (growthRange.min ?? 0)
    ) {
      const purchaseTransactionLineItemsResultAll =
        await StoreRepository.getTransactionsByManufacturerId(
          [distributorId],
          [manufacturerId],
          ENTITY_TYPE.DISTRIBUTOR,
          undefined,
          undefined,
          undefined,
          false,
          selectedWarehouseId ? [selectedWarehouseId] : undefined,
          { startDate: startDate.toString(), endDate: endDate.toString() }
        );

      const totalPurchasedVolumeSum =
        this.getTotalSumFromDistributorSaleTransacions(
          purchaseTransactionLineItemsResultAll
        );

      // Calculate earned rebate based on the total sales and rebate percentage
      earnedRebate =
        totalPurchasedVolumeSum * (currentProgramDetail.rebatePercentage / 100);
    }

    // Use different chart data building based on program type
    const finalChartData = isGrowth
      ? buildGrowthProgramData(prevYearChartData, chartData)
      : buildGrowthData(prevYearChartData, chartData, true);

    return {
      earnedRebate: earnedRebate,
      totalSales: {
        value: totalVal,
        prevValue: prevTotalVal,
        yoy: yoyVal
      },
      chartData: finalChartData
    };
  }

  /**
   * Handle outreach program data processing.
   * @param currentProgramDetail Current program details.
   * @param manufacturerId Manufacturer ID.
   * @param distributorId Distributor ID.
   * @param selectedWarehouseId Selected warehouse ID.
   * @param currentResults Current results.
   * @param startDate Start date.
   * @param endDate End date.
   * @returns Processed outreach program data.
   */
  private async handleOutreachProgram(
    currentProgramDetail: ProgramDetail,
    manufacturerId: number,
    distributorId: number,
    selectedWarehouseId: number | undefined,
    currentResults: any[],
    startDate: Date,
    endDate: Date
  ) {
    const isRebateTypeFixed =
      currentProgramDetail?.rebateType?.toLowerCase() != "percentage";
    const rebatePercentage = currentProgramDetail?.rebatePercentage ?? 0;
    const rebateAmount = currentProgramDetail?.rebateAmount ?? 0;
    let rebateOppertunity = 0;

    const totalStoresCount =
      currentProgramDetail?.targetQualifyingEntities ?? 0;

    const productTags = currentProgramDetail?.productsTags ?? "";
    const productTagsQuantity = currentProgramDetail?.productsTagsQty ?? "";

    // Use an array for categoryTagsJSON
    const outreachProductTagsArray = productTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const manufacturerProducts = await StoreRepository.getManufacturerProducts({
      manufacturerId,
      distributorId,
      selectedWarehouseId,
      categoryTagsJSON: outreachProductTagsArray
    });

    const purchaseTransactionLineItemsResultAll =
      await StoreRepository.getTransactionsByManufacturerId(
        [distributorId],
        [manufacturerId],
        ENTITY_TYPE.DISTRIBUTOR,
        undefined,
        undefined,
        undefined,
        true,
        selectedWarehouseId ? [selectedWarehouseId] : undefined,
        { startDate: startDate.toString(), endDate: endDate.toString() }
      );

    const totalPurchasedVolumeSum =
      this.getTotalSumFromDistributorSaleTransacions(
        purchaseTransactionLineItemsResultAll
      );

    if (isRebateTypeFixed) {
      rebateOppertunity = rebateAmount;
    } else {
      rebateOppertunity = (totalPurchasedVolumeSum * rebatePercentage) / 100;
    }

    const productTagsArray = productTags.split(",");
    const productTagsQuantityArray = productTagsQuantity.split(",").map(Number);

    const productCategoryMap = new Map<number, Record<string, boolean>>();
    manufacturerProducts.forEach((product: any) => {
      productCategoryMap.set(product.id, product.category_flags);
    });

    const storeTotals: Record<
      number,
      Record<string, { achievedCount: number; maxCount: number }>
    > = {};
    const processedStoreProduct: Set<string> = new Set();

    // Step 1: Aggregate total sales per store-product
    const productSalesMap: Map<string, number> = new Map();

    currentResults.forEach((result: any) => {
      const { store_id, product_id, sales } = result.dataValues;
      const key = `${store_id}_${product_id}`;

      if (!productSalesMap.has(key)) {
        productSalesMap.set(key, Number(sales));
      } else {
        productSalesMap.set(key, productSalesMap.get(key)! + Number(sales));
      }
    });

    currentResults.forEach((result: any) => {
      const { store_id, product_id } = result.dataValues;

      if (!productCategoryMap.has(product_id)) return;

      const categoryTags = productCategoryMap.get(product_id)!;
      const uniqueKey = `${store_id}_${product_id}`;

      // Skip if sales for this product-store is <= 0
      if ((productSalesMap.get(uniqueKey) ?? 0) <= 0) return;

      if (processedStoreProduct.has(uniqueKey)) return;
      processedStoreProduct.add(uniqueKey);

      // Determine applicable tags by priority
      for (let index = 0; index < productTagsArray.length; index++) {
        const tag = productTagsArray[index];

        // Check if this tag is assigned for the product
        if (!categoryTags[tag]) continue;

        const tagMaxCountMap = productTagsQuantityArray[index] ?? 0;

        if (!storeTotals[store_id]) storeTotals[store_id] = {};
        if (!storeTotals[store_id][tag]) {
          storeTotals[store_id][tag] = {
            achievedCount: 0,
            maxCount: tagMaxCountMap
          };
        }

        const currentTag = storeTotals[store_id][tag];

        if (currentTag.achievedCount < currentTag.maxCount) {
          currentTag.achievedCount += 1;
          processedStoreProduct.add(uniqueKey); // Mark this product as counted
          break; // Stop checking other tags once it's used in one
        }
      }
    });

    // Identify qualifying stores
    const qualifyingStores = Object.entries(storeTotals)
      .filter(([storeId, tags]) => {
        return Object.values(tags).every(
          ({ achievedCount, maxCount }) => achievedCount === maxCount
        );
      })
      .map(([storeId]) => Number(storeId));

    const filteredResults = currentResults?.filter((re: any) =>
      qualifyingStores.includes(re.store_id)
    );

    const storePenetration = getStorePenetrationChartData(
      filteredResults,
      "12",
      startDate,
      endDate,
      totalStoresCount
    );

    return {
      earnedRebate: 0,
      rebateOppertunity: rebateOppertunity,
      totalSales: {
        value: 0,
        prevValue: 0,
        yoy: 0
      },
      totalStoresCount: totalStoresCount,
      qualifiedStoresCount:
        new Set(filteredResults.map((re: any) => re.dataValues.store_id))
          ?.size ?? 0,
      chartData: storePenetration
    };
  }

  public async getDistributorProgramDetails(
    userRole: UserRole,
    type: string,
    manufacturerId: number,
    searchQuery: string | null = null,
    enrolledPage: number = 1,
    notEnrolledPage: number = 1,
    sort: string = "ASC",
    sortKey: string = "sort",
    warehouseIds?: number[],
    programTimeline?: string,
    selectedWarehouseId?: number,
    isInternalInitiative?: boolean,
    excludeChainStores?: boolean
  ): Promise<ResponseType | any> {
    return newrelic.startSegment(
      "ProgramService.getDistributorProgramDetails",
      true,
      async () => {
        const startTime = process.hrtime();
        try {
          const distributorId = getParentDistributorId(userRole, userRole.role);

          // Track compliances fetching
          const compliancesSegment = newrelic.startSegment(
            "getDistributorProgramDetails.fetchCompliances",
            true,
            async () => {
              return await this.fetchCompliancesAndAggregates(
                distributorId,
                type,
                userRole
              );
            }
          );

          const compliancesResult = await compliancesSegment;

          // Track manufacturer products fetching
          const manufacturerProductsSegment = newrelic.startSegment(
            "getDistributorProgramDetails.getManufacturerProducts",
            true,
            async () => {
              return await StoreRepository.getManufacturerProducts({
                manufacturerId,
                distributorId
                // categoryTagsJSON: uniqueTags
              });
            }
          );

          const manufacturerProductsData = await manufacturerProductsSegment;
          const allCompliances = compliancesResult.allCompliances;
          const response: ResponseType = {
            totalPurchasedVolume: 0,
            totalSaving: 0,
            totalSavingsOpp: 0,
            totalSalesRepSpiff: 0,
            salesRepProgramOverview: [],
            distributorProgramOverview: [],
            retailerProgramOverview: [],
            enrolledStores: [],
            unenrolledStores: []
          };

          // Track program overview building
          const buildOverviewSegment = newrelic.startSegment(
            "getDistributorProgramDetails.buildProgramOverview",
            true,
            async () => {
              return await this.buildProgramOverviewForDetails(
                manufacturerId,
                allCompliances,
                response,
                userRole,
                manufacturerProductsData,
                type,
                warehouseIds,
                programTimeline,
                selectedWarehouseId,
                isInternalInitiative,
                excludeChainStores
              );
            }
          );

          await buildOverviewSegment;
          // Track program sorting
          const sortingSegment = newrelic.startSegment(
            "getDistributorProgramDetails.sortPrograms",
            true,
            async () => {
              sortPrograms(response.salesRepProgramOverview, true);
              sortPrograms(response.distributorProgramOverview, true);
              sortPrograms(response.retailerProgramOverview, true);
            }
          );

          await sortingSegment;

          const [s, ns] = process.hrtime(startTime);
          const duration = s * 1000 + ns / 1000000;

          return response;
        } catch (error) {
          // Enhanced error tracking with context
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          newrelic.noticeError(
            error instanceof Error ? error : new Error(errorMessage),
            {
              method: "getDistributorProgramDetails",
              userRole: userRole.role || "null",
              associatedUserId: userRole.associatedUserId?.toString() || "null",
              type: type || "null",
              manufacturerId: manufacturerId?.toString() || "null",
              distributorId:
                userRole.role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP
                  ? userRole.parentEntityId?.toString() || "null"
                  : getDistributorIdAsRole(
                      userRole,
                      userRole.role
                    )?.toString() || "null",
              errorMessage: errorMessage
            }
          );

          if (error instanceof Error) {
            throw ApiError.internal(error.message);
          } else {
            throw new ApiError(500, "Unknown error occurred");
          }
        }
      }
    );
  }

  public getFormattedProgramsAndSalesData(
    program: Program,
    programCompliances: ProgramCompliance[],
    prevSalesData: any,
    isChainStoreCompliances?: boolean,
    chainStoresCount: number = 0,
    storesEarningOpportunities?: any[]
  ): any {
    let totalPurchaseVolume: number =
      Number(prevSalesData?.purchaseVolume?.amount) || 0;

    let totalSavings: number = Number(prevSalesData?.totalSavings?.amount) || 0;
    let totalSavingOpportunity: number =
      Number(prevSalesData?.totalOppSavings?.amount) || 0;

    const formattedPrograms = program?.ProgramDetails?.map(
      (details: ProgramDetail) => {
        const programDetail: any = details;
        const programCompliance = programCompliances.filter(
          ({ programDetailId }) => programDetailId == details.id
        );

        totalSavingOpportunity +=
          storesEarningOpportunities
            ?.filter(
              (er: any) =>
                er.highest_tier &&
                program.id == er.program_id &&
                er.program_detail_id == details.id
            )
            ?.reduce(
              (acc: number, er: any) =>
                acc + parseFloat(er.rebate_opportunity ?? "0"),
              0
            ) ?? 0;

        let complianceStatus = false;
        let completedComplianceEntityIds: number[] = [];

        if (programCompliance?.length) {
          totalPurchaseVolume += programCompliance.reduce(
            (acc, item) =>
              item.status === ProgramsComplianceStatus.InProgress
                ? acc + (Number(item.totalPurchaseVolume) || 0)
                : acc,
            0
          );

          totalSavings += programCompliance.reduce(
            (acc, item) =>
              item.status === ProgramsComplianceStatus.Active
                ? acc + (Number(item.earnedRebate) || 0)
                : acc,
            0
          );

          if (programCompliance?.length === 1 && !isChainStoreCompliances) {
            complianceStatus = programCompliance[0]?.isQualified || false;
          } else if (isChainStoreCompliances && chainStoresCount > 0) {
            completedComplianceEntityIds = programCompliance
              ?.filter((pc) => pc.isQualified)
              ?.map((pc) => pc.entityId);
            complianceStatus =
              completedComplianceEntityIds?.length === chainStoresCount;
          }
        }

        return {
          id: programDetail.program_id,
          programId: programDetail.program_id,
          programTier: details.tier,
          name: program.name, // Add program name
          programHeader: program.programHeader, // Add program header
          type: program.programType,
          programEntityType: program.participantType,
          // Add manufacturer details
          manufacturerName: program.Manufacturer?.name || "",
          manufacturerLogo: program.Manufacturer?.logo || "",
          manufacturerId: program.Manufacturer?.id || program.manufacturerId,
          rebate:
            details.rebateType == "percentage"
              ? details.rebatePercentage
              : details.rebateAmount,
          rebateType: details.rebateType,
          rebateCalculation: details.rebateCalculation,
          overview: details.description,
          paymentTerms: program.paymentTerm,
          complianceStatus: complianceStatus,
          additionalInfo: {
            info:
              program.programType == "TIER"
                ? `${program.programHeader} - Tier ${details.tier}`
                : `${program.name}`,
            title:
              program.programType == "TIER"
                ? `${program.programHeader} - Tier ${details.tier}`
                : `${program.programHeader}`
          },
          completedComplianceEntityIds: completedComplianceEntityIds,
          programdetailId: details.id,
          isRebateBasedOnListPrice: isListPriceApplicable(
            programDetail?.rebateCalculationType ?? ""
          )
        };
      }
    );

    return {
      salesData: {
        purchaseVolume: {
          amount: totalPurchaseVolume,
          yoy: 0
        },
        totalSavings: {
          amount: totalSavings,
          yoy: 0
        },
        totalOppSavings: {
          amount: totalSavingOpportunity
        },
        totalSalesRepSpiff: {
          amount: 0 // Not used
        }
      },
      programs: formattedPrograms
    };
  }

  /**
   * Retrieves a store's program details based on the provided parameters.
   *
   * This method takes in a `userRole` object, `manufacturerId`, and optional
   * `programId` and `programDetailId`. It then calls the
   * `StoreDashboardService.getManufacturerDetails` method to retrieve the
   * program details for the specified store and manufacturer.
   *
   * @param userRole - The user role object containing the associated user ID.
   * @param manufacturerId - The manufacturer ID to filter the programs by.
   * @param programId - Optional program ID to filter the program details by.
   * @param programDetailId - Optional program detail ID to filter the program details by.
   * @returns A promise that resolves to a `ResponseType` object containing the program details.
   * @throws An `ApiError` if an error occurs during the call to
   *   `StoreDashboardService.getManufacturerDetails`.
   */
  public async getStoreProgramDetails({
    userRole,
    manufacturerId,
    programId,
    programDetailId,
    forStore = 0,
    isManufacturerUser,
    programTimeline,
    type,
    isChainPrograms
  }: {
    userRole: UserRole;
    manufacturerId: number;
    programId?: number;
    programDetailId?: number;
    forStore?: number;
    isManufacturerUser?: boolean;
    programTimeline?: string;
    type?: string;
    isChainPrograms?: boolean;
  }): Promise<ResponseType | any> {
    return newrelic.startSegment("getStoreProgramDetails", true, async () => {
      const startTime = process.hrtime();
      try {
        const storeId = userRole.associatedUserId;
        const distributorId = userRole.parentEntityId;
        const data = await StoreDashboardService.getManufacturerDetails(
          manufacturerId,
          storeId,
          programId,
          programDetailId,
          forStore,
          distributorId,
          isManufacturerUser,
          programTimeline,
          type,
          isChainPrograms
        );
        const [s, ns] = process.hrtime(startTime);
        newrelic.addCustomAttribute(
          "getStoreProgramDetails.duration_ms",
          s * 1000 + ns / 1000000
        );
        return data;
      } catch (error: unknown) {
        if (error instanceof Error) {
          newrelic.noticeError(error);
        } else {
          newrelic.noticeError(new Error("Unknown error occurred"));
        }
        throw error;
      }
    });
  }

  /**
   * Retrieves the program details for a given distributor user ID and manufacturer ID.
   *
   * If the program detail ID is provided, it will return the program details for the specific program detail ID.
   * Otherwise, it will return all program details for the provided distributor user ID and manufacturer ID.
   *
   * @param userRole - The user role object containing the associated user ID.
   * @param manufacturerId - The manufacturer ID to filter the programs by.
   * @param programDetailId - Optional program detail ID to filter the program details by.
   * @returns A promise that resolves to a `ResponseType` object containing the program details.
   * @throws An `ApiError` if an error occurs during the call to
   *   `StoreDashboardService.getManufacturerDetails`.
   */
  public async getDistributorProgramDetailsByDetailId(
    userRole: UserRole,
    manufacturerId: number,
    programDetailId?: number
  ): Promise<ResponseType | any> {
    try {
      const distributorId = getParentDistributorId(userRole, userRole.role);
      const isGeneralManager = isDistributorGeneralManager(userRole.role);

      const warehouseIds = isGeneralManager
        ? await DistributorRepository.getWarehouseIds(
            distributorId,
            userRole.associatedUserId,
            true
          )
        : await DistributorRepository.getWarehouseIds(
            distributorId,
            undefined,
            undefined,
            undefined,
            true
          );

      if (isGeneralManager) {
        if (!warehouseIds?.length) {
          throw ApiError.badRequest(
            "General manager has no warehouse assigned"
          );
        }
        if (warehouseIds.length !== 1) {
          throw ApiError.badRequest(
            "General manager must be assigned to exactly one warehouse"
          );
        }
      }

      // Fetch Store Programs and Manufacturer Products
      const programsResult =
        await StoreRepository.getProgramsBymanufacturerIdAndEntityType(
          ENTITY_TYPE.DISTRIBUTOR,
          manufacturerId,
          programDetailId
        );

      // Extract program detail IDs and fetch aggregations
      const programDetailIds = programsResult.map(
        (pr: any) => pr.program_detail_id || pr.id
      );

      // Fetch aggregations from distributor_program_aggregations table
      const aggregationsMap =
        await ProgramRepository.getDistributorProgramDetailAggregations(
          distributorId,
          programDetailIds,
          ENTITY_TYPE.DISTRIBUTOR,
          false, // Don't exclude chain stores by default
          warehouseIds && warehouseIds.length ? warehouseIds : undefined
        );

      const warehouseId = warehouseIds?.length ? warehouseIds[0] : undefined;
      const [productsResult, purchaseLineItemsResult] = await Promise.all([
        StoreRepository.getManufacturerProducts({
          manufacturerId,
          selectedWarehouseId: warehouseId
        }),
        StoreRepository.getTransactionsByManufacturerId(
          [userRole.associatedUserId],
          [manufacturerId],
          ENTITY_TYPE.DISTRIBUTOR,
          undefined,
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          true
        )
      ]);

      const { coreProductPrograms, allNonTierPrograms } =
        StoreService.filterPrograms(programsResult);

      const purchasedProductIds: any[] =
        purchaseLineItemsResult?.map((lineItem: any) => lineItem?.product_id) ??
        [];

      const products = updateProductInternalCodesByPurchasedItems(
        productsResult,
        purchaseLineItemsResult
      );
      const { recommendedProducts, purchasedProducts } =
        StoreService.getRecommendedAndPurchasedProducts(
          products,
          purchasedProductIds
        );

      if (!coreProductPrograms.length && !allNonTierPrograms?.length) {
        return {
          tierDetails: [],
          recommendedProducts: recommendedProducts.slice(0, 20),
          purchasedProducts: purchasedProducts
        };
      }

      const tierDetails: ManufacturerTierDetail[] =
        await StoreService.getTierDetails(
          coreProductPrograms,
          productsResult,
          true,
          undefined,
          undefined,
          userRole.associatedUserId,
          manufacturerId,
          aggregationsMap
        );

      // Add base program details
      const baseProgramDetails = StoreService.getBaseProgramDetails(
        allNonTierPrograms,
        productsResult,
        true,
        undefined,
        undefined,
        userRole.associatedUserId,
        manufacturerId,
        aggregationsMap
      );

      return {
        tierDetails: [...tierDetails, ...baseProgramDetails],
        recommendedProducts,
        purchasedProducts,
        productsResult
      };
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(error.message);
      } else {
        throw new ApiError(500, "Unknown error occurred");
      }
    }
  }

  private calculateComplianceAggregates(compliances: Compliance[]) {
    return {
      totalPurchaseVolume: this.calculateTotal(
        compliances,
        "totalPurchaseVolume"
      ),
      totalSavings: this.calculateTotal(compliances, "earnedRebate")
    };
  }

  // Add this new method to your class
  private calculateAggregates(compliances: Compliance[]) {
    return {
      totalPurchaseVolume: this.calculateTotal(
        compliances,
        "totalPurchaseVolume"
      ),
      totalSavings: this.calculateTotal(compliances, "earnedRebate")
    };
  }

  // Method to fetch compliances and calculate aggregates
  private async fetchCompliancesAndAggregates(
    distributorId: number,
    type: string,
    loggedInUser?: UserRole
  ) {
    const allCompliances =
      type == ENTITY_TYPE.STORE
        ? []
        : await this.getCompliances(distributorId, type, loggedInUser);

    const uniqueProgramIds = Array.from(
      new Set(allCompliances.map((compliance) => compliance.programId))
    );

    return {
      allCompliances,
      uniqueProgramIds
    };
  }

  /**
   * Builds the program overview for distributors and sales reps.
   *
   * Here's what the method does:
   * 1. Iterates over the unique program IDs and fetches the program details for each ID.
   * 2. Calculates the total purchased volume, total saving, and total savings opportunity for each program.
   * 3. Calculates the total sales rep spiff for each program.
   * 4. Populates the sales rep program overview and distributor program overview arrays with the calculated values.
   * 5. Updates the response object with the calculated values.
   *
   * @param manufacturerId The ID of the manufacturer.
   * @param allCompliances The compliances for the given user ID and type.
   * @param response The response object to update with the calculated values.
   * @param userRole The user role object containing the associated user ID.
   * @param Products The Array of manufacturer Products.
   */
  private async buildProgramOverviewForDetails(
    manufacturerId: number,
    allCompliances: Compliance[],
    response: ResponseType,
    userRole: UserRole,
    filteredProducts: any[],
    type: string = ENTITY_TYPE.DISTRIBUTOR,
    warehouseIds?: number[],
    programTimeline?: string,
    selectedWarehouseId?: number,
    isInternalInitiative?: boolean,
    excludeChainStores?: boolean
  ) {
    const isGeneralManager = isDistributorGeneralManager(userRole.role);
    const isSalesRepManager = isDistributorSalesRepManager(userRole.role);
    const isDistributorUser =
      isDistributorAdminAndExecutive(userRole.role) || isGeneralManager;
    const isSalesRepUser = isDistributorSalesRep(userRole.role);
    const distributorId = getParentDistributorId(userRole, userRole.role);

    // const internalCodeWarehouseIds =
    //   await DistributorRepository.getWarehouseIds(
    //     distributorId,
    //     undefined,
    //     undefined,
    //     selectedWarehouseId,
    //     true
    //   );

    // TIMING: Qualified Compliances
    const QualifiedCompliancesByDistributorId: any[] = [];
    // type === ENTITY_TYPE.STORE &&
    // userRole.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP
    //   ? await StoreRepository.getQualifiedCompliancesCountBySalesRepId(
    //       userRole.associatedUserId,
    //       manufacturerId,
    //       true,
    //       excludeChainStores,
    //       true
    //     )
    //   : ((await StoreRepository.getQualifiedCompliancesCountByDistributorId(
    //       distributorId,
    //       manufacturerId,
    //       true,
    //       excludeChainStores,
    //       true
    //     )) ?? []);

    // TIMING: Excluded Program Detail IDs
    const excludedProgramDetailIds =
      await ProgramRepository.getExcludedProgramDetailIds([distributorId]);

    // TIMING: Store IDs
    const stores = (await isSalesRepUser)
      ? await StoreRepository.getStoreIdsBySalesRepId(
          userRole.associatedUserId,
          excludeChainStores,
          selectedWarehouseId ? [selectedWarehouseId] : undefined
        )
      : isSalesRepManager
        ? await StoreRepository.getStoresBySalesRepManagerId({
            salesRepManagerId: userRole?.associatedUserId
          })
        : await StoreRepository.getStoreIdsByDistributorId(
            distributorId,
            excludeChainStores,
            selectedWarehouseId ? [selectedWarehouseId] : undefined
          );

    let storeIds =
      isSalesRepUser || isSalesRepManager
        ? stores.map((s: any) => s.storeId)
        : stores.map((s: any) => s.associatedUserId);

    // Apply excludeChainStores filter for sales rep manager (getStoresBySalesRepManagerId doesn't support it)
    // This matches the behavior needed to filter out chain stores like API 1 does
    // CRITICAL: This filters out the 6 chain stores (33271, 33275, 33278, 33297, 33304, 33316)
    // that have transactions totaling 14,707.33 for manufacturer 598
    if (isSalesRepManager && excludeChainStores) {
      const chainStoreQuery = `
        SELECT DISTINCT cs.store_id
        FROM chain_stores cs
      `;
      const [chainStores] = await sequelize.query(chainStoreQuery);
      const chainStoreIds = chainStores.map((s: any) => s.store_id);
      const storeIdsBeforeChainFilter = storeIds.length;
      storeIds = storeIds.filter(
        (storeId: number) => !chainStoreIds.includes(storeId)
      );
    }

    // TIMING: Valid Program IDs
    const validProgramIds = await this.getDistributorAccumulativeProgramIds({
      manufacturerId,
      distributorId,
      storeIds,
      isTypeStoreProgram: type == ENTITY_TYPE.STORE,
      programTimeline,
      isInternalInitiative
    });

    // TIMING: Manufacturer, Programs, and Category Tags
    const [manufacturer, manufacturerPrograms, productCategoryTags] =
      await Promise.all([
        ManufacturerRepository.getManufacturerDetails(manufacturerId, [
          "authorized"
        ]),
        ProgramRepository.getAllProgramAndDetails(
          manufacturerId,
          "",
          excludedProgramDetailIds,
          validProgramIds,
          programTimeline,
          isInternalInitiative,
          storeIds
        ),
        StoreRepository.getCategoryTagsReference()
      ]);

    const isManufacturerAuthorized = manufacturer?.authorized;

    const associatedUserIdAsRole = getDistributorIdAsRole(
      userRole,
      userRole.role
    );

    if (type == ENTITY_TYPE.STORE && manufacturerId) {
      const storeIdsToExclude =
        await ProgramRepository.findStoreIdsWithAllProgramsIneligibleManufacturers(
          [manufacturerId],
          manufacturerPrograms?.map((pro: any) => pro.id),
          storeIds, // Pass current storeIds to limit search scope
          distributorId
        );
      storeIds = storeIds.filter(
        (storeId: number) => !storeIdsToExclude.includes(storeId)
      );
    }

    // TIMING: Store Compliances
    const storesCompliances =
      type == ENTITY_TYPE.STORE
        ? await ComplianceRepository.findComplianceByEntityIdAndEntityType({
            entityId: storeIds,
            entityType: [ENTITY_TYPE.STORE],
            programIds: manufacturerPrograms.map((pro) => pro.id),
            includeOnlyParticipatedProgramCompliances: true,
            returnRawData: true,
            complianceStatus: ProgramsComplianceStatus.Active
          })
        : [];

    const storesTotalEarnedRebate = storesCompliances?.reduce(
      (sum, item: any) => sum + parseFloat(item.earnedRebate || "0"),
      0
    );

    // TIMING: Purchase Transaction Line Items (ALL) - OPTIMIZED
    // Use manufacturer-specific date ranges for consistent filtering
    const programTerms = getMinMaxProgramDatesWithManufacturerId({
      programs: manufacturerPrograms?.filter((p) => p?.participantType == type),
      useCurrentYear: false
    });

    // Check if we should use pre-aggregated data for DISTRIBUTOR_ADMIN / DISTRIBUTOR_EXECUTIVE / DISTRIBUTOR_GENERAL_MANAGER
    // Aggregations now support warehouse filtering, so we can use them even when warehouseIds/selectedWarehouseId are provided
    const shouldUseAggregations =
      userRole &&
      (isDistributorAdmin(userRole.role) ||
        isDistributorExecutive(userRole.role) ||
        isDistributorGeneralManager(userRole.role)) &&
      distributorId &&
      type;

    let aggregationsMap = new Map<number, any>();
    let aggregationsDetailMap = new Map<number, any>();

    if (shouldUseAggregations) {
      // Fetch pre-aggregated data (OPTIMIZED PATH)
      const programIds = manufacturerPrograms.map((p) => p.id);
      const programDetailIds = manufacturerPrograms.flatMap(
        (program: any) => program.ProgramDetails?.map((pd: any) => pd.id) || []
      );

      // Determine warehouse IDs to use: prefer warehouseIds array, fallback to selectedWarehouseId as array
      const warehouseIdsToUse =
        warehouseIds ||
        (selectedWarehouseId ? [selectedWarehouseId] : undefined);

      // Fetch both program-level and program-detail-level aggregations
      const [progAggMap, detailAggMap] = await Promise.all([
        newrelic.startSegment(
          "buildProgramOverviewForDetails.fetchAggregations",
          true,
          async () =>
            await ProgramRepository.getDistributorProgramAggregations(
              distributorId,
              programIds,
              type,
              excludeChainStores || false,
              warehouseIdsToUse
            )
        ),
        newrelic.startSegment(
          "buildProgramOverviewForDetails.fetchDetailAggregations",
          true,
          async () =>
            await ProgramRepository.getDistributorProgramDetailAggregations(
              distributorId,
              programDetailIds,
              type,
              excludeChainStores || false,
              warehouseIdsToUse
            )
        )
      ]);

      aggregationsMap = progAggMap;
      aggregationsDetailMap = detailAggMap;

      newrelic.addCustomAttribute(
        "usingAggregationsInDetails",
        aggregationsMap.size > 0
      );
      newrelic.addCustomAttribute(
        "usingDetailAggregationsInDetails",
        aggregationsDetailMap.size > 0
      );
    }

    let totalPurchasedVolumeSum = 0;
    let totalSalesVolumeSum = 0;

    if (shouldUseAggregations) {
      // Use pre-aggregated data (FAST PATH)
      const allAggregations = Array.from(aggregationsMap.values());

      // Get max sales volume across all programs for this manufacturer
      totalPurchasedVolumeSum =
        allAggregations.length > 0
          ? Math.max(...allAggregations.map((agg) => agg.totalSalesVolume))
          : 0;

      totalSalesVolumeSum = totalPurchasedVolumeSum;
    } else {
      // Fetch transactions (LEGACY PATH)
      const purchaseTransactionLineItemsResultAll: any[] =
        isDistributorUser && type != ENTITY_TYPE.STORE
          ? await StoreRepository.getTransactionsByManufacturerIdAndProgramTermsOptimized(
              [associatedUserIdAsRole],
              [manufacturerId],
              ENTITY_TYPE.DISTRIBUTOR,
              false, // returnSaleTransactions = false for purchase transactions
              undefined,
              undefined,
              warehouseIds,
              programTerms,
              true,
              false,
              true
            )
          : [];
      // TIMING: Sales Transaction Line Items (ALL) - OPTIMIZED
      const salesTransactionLineItemsResultAll: any[] =
        type == ENTITY_TYPE.STORE
          ? await StoreRepository.getTransactionsByManufacturerIdAndProgramTermsOptimized(
              [distributorId],
              [manufacturerId],
              ENTITY_TYPE.DISTRIBUTOR,
              true, // returnSaleTransactions = true for sales transactions
              storeIds,
              ENTITY_TYPE.STORE,
              warehouseIds,
              programTerms,
              true,
              false,
              true
            )
          : [];

      totalPurchasedVolumeSum = this.getTotalSumFromDistributorSaleTransacions(
        purchaseTransactionLineItemsResultAll
      );

      totalSalesVolumeSum = this.getTotalSumFromDistributorSaleTransacions(
        salesTransactionLineItemsResultAll,
        manufacturerId,
        true
      );
    }

    const totalPurchasedProductIds: any[] = [];
    let totalSavingSum = 0; //total savings
    let totalSalesRepSpiff = 0;

    await Promise.all(
      manufacturerPrograms.map(async (program) => {
        const isDistributorProgram =
          program.participantType == ENTITY_TYPE.DISTRIBUTOR;

        const isPODProgram = isDistributorProgram
          ? program?.ProgramDetails?.some(
              (pr: any) => pr.criteria == ProgramsDetailCriteria.POD
            )
          : false;

        const ProgramVisibilities = program.ProgramVisibility?.length
          ? program.ProgramVisibility
          : undefined;

        // TIMING: Purchase Transaction Line Items (per program)
        const purchaseTransactionLineItemsResult =
          isDistributorUser && type != ENTITY_TYPE.STORE
            ? await StoreRepository.getTransactionsByManufacturerId(
                [associatedUserIdAsRole],
                [manufacturerId],
                ENTITY_TYPE.DISTRIBUTOR,
                undefined,
                undefined,
                undefined,
                true,
                warehouseIds,
                program.startDate && program.endDate
                  ? {
                      startDate: new Date(program.startDate).toDateString(),
                      endDate: new Date(program.endDate).toDateString()
                    }
                  : undefined,
                type == ENTITY_TYPE.DISTRIBUTOR
              )
            : [];

        const purchasedProductIds =
          purchaseTransactionLineItemsResult?.map(
            (item: any) => item.product_id
          ) || [];

        totalPurchasedProductIds.push(purchasedProductIds);

        // TIMING: Sale Transaction Line Items (per program) - OPTIMIZED
        const saleTransactionLineItemsResult: any[] =
          type != ENTITY_TYPE.STORE && isPODProgram
            ? await StoreRepository.getTransactionsByManufacturerIdAndProgramTermsOptimized(
                isSalesRepUser
                  ? [userRole.parentEntityId]
                  : [associatedUserIdAsRole],
                [manufacturerId],
                ENTITY_TYPE.DISTRIBUTOR,
                true, // returnSaleTransactions = true for sales transactions
                storeIds?.length ? storeIds : undefined,
                storeIds?.length ? ENTITY_TYPE.STORE : undefined,
                warehouseIds,
                program.startDate && program.endDate
                  ? {
                      [manufacturerId]: {
                        startDate: new Date(program.startDate).toISOString(),
                        endDate: new Date(program.endDate).toISOString()
                      }
                    }
                  : undefined,
                true
              )
            : [];

        const purchasedVolumeSum =
          type == ENTITY_TYPE.STORE
            ? 0
            : this.getTotalSumFromDistributorSaleTransacions(
                purchaseTransactionLineItemsResult
              );

        const filteredCompliances =
          warehouseIds && isGeneralManager && isDistributorProgram
            ? allCompliances
                .filter((compliance) => compliance.programId === program.id)
                .map((com: any) => ({
                  ...(com.get({ plain: true }) ?? {}),
                  earnedRebate: 0,
                  isQualified: false,
                  totalPurchaseVolume: purchasedVolumeSum
                }))
            : allCompliances.filter(
                (compliance) => compliance.programId === program.id
              );

        // Use aggregations if available, otherwise calculate from compliances
        const totalSavings =
          shouldUseAggregations && aggregationsMap.has(program.id)
            ? aggregationsMap.get(program.id).totalStoreEarnings
            : this.calculateComplianceAggregates(filteredCompliances)
                .totalSavings;

        // TIMING: Program Details Processing
        const details = [];
        if (program && program.ProgramDetails) {
          for (const programDetail of program.ProgramDetails) {
            const isStoreProgram = program.participantType == ENTITY_TYPE.STORE;

            // Use aggregations for DISTRIBUTOR_ADMIN, otherwise use existing logic
            const aggregationData =
              shouldUseAggregations &&
              aggregationsDetailMap.has(programDetail.id)
                ? aggregationsDetailMap.get(programDetail.id)
                : null;

            const programDetailsData = {
              ...programDetail.get({ plain: true }),
              totalEnrollments:
                aggregationData && isStoreProgram
                  ? (aggregationData.storesEnrolled ?? 0)
                  : isStoreProgram
                    ? new Set(
                        program.ProgramParticipants?.map(
                          (pp: any) => pp.entity_id
                        ) ?? []
                      ).size
                    : undefined,
              qualifiedComliances:
                aggregationData && isStoreProgram
                  ? (aggregationData.compliantStores ?? 0)
                  : (QualifiedCompliancesByDistributorId?.find(
                      (qc: any) => qc.program_detail_id == programDetail.id
                    )?.qualified_compliance_count ?? 0)
            };

            if (!programDetailsData.products_tags) {
              details.push(programDetailsData);
              continue;
            }
            // Fetch Programs and Manufacturer Products

            // TIMING: Categorized Products (most expensive operation)
            const programsProductTags = programDetailsData.products_tags
              ?.split(",")
              ?.map((tag: string) => tag.trim());

            // if type is DISTRIBUTOR and isStoreProgram true then set the category quantity to 50
            const diffCatQty: string[] =
              programDetailsData.products_tags_qty
                ?.split(",")
                ?.map((qty: string) =>
                  type == ENTITY_TYPE.DISTRIBUTOR && isStoreProgram
                    ? PROGRAM_TIER_MODAL.MAX_PRODUCTS
                    : qty.trim()
                ) ?? [];

            const categorizedProducts =
              await StoreService.getCategorizedProducts(
                programsProductTags,
                filteredProducts,
                type == ENTITY_TYPE.DISTRIBUTOR ? purchasedProductIds : [],
                diffCatQty,
                isManufacturerAuthorized,
                isDistributorUser,
                undefined,
                type == ENTITY_TYPE.DISTRIBUTOR && isStoreProgram
                  ? false
                  : type == ENTITY_TYPE.DISTRIBUTOR,
                undefined,
                undefined,
                type == ENTITY_TYPE.DISTRIBUTOR
                  ? purchaseTransactionLineItemsResult
                  : undefined,
                distributorId
              );
            details.push({
              ...programDetailsData,
              categorizedProducts: categorizedProducts
            });
          }
        }

        // Use aggregations for totalEnrollments if available (for DISTRIBUTOR_ADMIN + STORE programs)
        const programAggregation =
          shouldUseAggregations && aggregationsMap.has(program.id)
            ? aggregationsMap.get(program.id)
            : null;

        const programOverview = {
          compliances: filteredCompliances,
          id: program.id,
          programType: program.programType,
          name: program.name,
          programHeader: program.programHeader,
          programEntityType: program.participantType,
          programTerms: program.paymentTerm,
          programDetails: details,
          progressDetails: [] as any,
          totalEnrollments:
            programAggregation && program.participantType == ENTITY_TYPE.STORE
              ? (programAggregation.storesEnrolled ?? 0)
              : ProgramVisibilities?.length,
          startDate: program.startDate,
          endDate: program.endDate
        };

        // TIMING: Progress Data (for DISTRIBUTOR programs)
        if (isDistributorUser && type == ENTITY_TYPE.DISTRIBUTOR) {
          const data: any = [];
          program?.ProgramDetails?.forEach((pr) => {
            const { graph, progressText } =
              StoreService.generateGraphAndProgressText(
                pr.get({ plain: true }),
                filteredProducts,
                productCategoryTags,
                purchaseTransactionLineItemsResult,
                saleTransactionLineItemsResult,
                purchasedProductIds
              );
            data.push({ graph, progressText });
          });

          programOverview.progressDetails = data;
        }
        if (isDistributorUser) {
          const products = updateProductInternalCodesByPurchasedItems(
            filteredProducts,
            purchaseTransactionLineItemsResult
          );

          const { purchasedProducts } =
            StoreService.getRecommendedAndPurchasedProducts(
              products,
              purchasedProductIds
            );
          response.allProducts = purchasedProducts;
        }

        switch (program.participantType) {
          case ENTITY_TYPE.DISTRIBUTOR:
            response.distributorProgramOverview.push(programOverview);
            totalSavingSum += totalSavings;
            break;

          case ENTITY_TYPE.SALES_REP:
          case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
            response.salesRepProgramOverview.push(programOverview);
            totalSalesRepSpiff += totalSavings;
            break;

          case ENTITY_TYPE.STORE:
            response.retailerProgramOverview.push(programOverview);
            if (shouldUseAggregations) {
              totalSavingSum += totalSavings;
            } else {
              totalSavingSum = storesTotalEarnedRebate;
            }
            break;

          default:
            break;
        }
      })
    );

    response.totalPurchasedVolume =
      type == ENTITY_TYPE.STORE ? totalSalesVolumeSum : totalPurchasedVolumeSum;
    response.totalSaving = totalSavingSum;
    response.totalSalesRepSpiff = totalSalesRepSpiff;
    response.totalPurchasedQuantity = new Set(totalPurchasedProductIds)?.size;

    //  TO be refactored: Generate categorizedProducts for the entire response
    try {
      let categorizedProducts;

      // Temporary hardcoded logic for specific manufacturers
      if (manufacturerId === 523 && type === ENTITY_TYPE.DISTRIBUTOR) {
        // Manufacturer 523 + DISTRIBUTOR: Show Core products
        categorizedProducts = await this.getCategorizedProducts({
          programsType: type,
          loggedInUser: userRole as any,
          manufacturerId,
          programTimeline
        });
      } else if (type === ENTITY_TYPE.DISTRIBUTOR) {
        // For all other DISTRIBUTOR types (including 527), show all products
        const purchasedProducts = filteredProducts
          .filter((product: any) =>
            totalPurchasedProductIds.includes(product.id)
          )
          .map((product: any) => {
            const lastTransactionDate = getLastTransactionDate(product);
            const originalCode = getInternalCode(product);
            const internalCode = getActiveInternalCode(
              originalCode,
              lastTransactionDate,
              distributorId
            );
            // oldInternalCode should always contain the original code for reference/troubleshooting
            // It should be NULL only if there was no original code in the database
            const oldInternalCode = originalCode;

            return {
              ...product,
              internalCode: internalCode,
              oldInternalCode: oldInternalCode,
              lastTransactionDate: lastTransactionDate
            };
          });
        const requiredProducts = filteredProducts
          .filter(
            (product: any) => !totalPurchasedProductIds.includes(product.id)
          )
          .map((product: any) => {
            const lastTransactionDate = getLastTransactionDate(product);
            const originalCode = getInternalCode(product);
            const internalCode = getActiveInternalCode(
              originalCode,
              lastTransactionDate,
              distributorId
            );
            // oldInternalCode should always contain the original code for reference/troubleshooting
            // It should be NULL only if there was no original code in the database
            const oldInternalCode = originalCode;

            return {
              ...product,
              internalCode: internalCode,
              oldInternalCode: oldInternalCode,
              lastTransactionDate: lastTransactionDate
            };
          });

        categorizedProducts = {
          "All Products": {
            sortOrder: 0,
            purchasedProducts: purchasedProducts,
            requiredProducts: requiredProducts
          }
        };
      } else {
        // For other types, use the existing method
        categorizedProducts = await this.getCategorizedProducts({
          programsType: type,
          loggedInUser: userRole as any,
          manufacturerId,
          programTimeline
        });
      }
      response.categorizedProducts = categorizedProducts as any;
    } catch (error) {
      console.error(
        "***** buildProgramOverviewForDetails - error generating categorizedProducts #222 ",
        error
      );
    }

    return response;
  }

  public async getProgramsStoreComplianceDetail({
    manufacturerId,
    userRole,
    programTimeline,
    isInternalInitiative,
    excludeChainStores,
    warehouseId
  }: {
    manufacturerId: number;
    userRole: UserRole;
    programTimeline?: string;
    isInternalInitiative?: boolean;
    excludeChainStores?: boolean;
    warehouseId?: number;
  }) {
    const type = ENTITY_TYPE.STORE;
    const isSalesRepUser = userRole.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP;
    const isSalesRepManager = isDistributorSalesRepManager(userRole.role);
    const isDistributorUser =
      userRole.role === ENTITY_TYPE.DISTRIBUTOR_ADMIN ||
      userRole.role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER;

    // Safety check: DISTRIBUTOR_GENERAL_MANAGER must have warehouseId defined
    if (
      userRole.role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER &&
      !warehouseId
    ) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        "General manager must have a warehouse assigned"
      );
    }

    const distributorId = getParentDistributorId(userRole, userRole.role);

    const response: any = [];

    const excludedProgramDetailIds =
      await ProgramRepository.getExcludedProgramDetailIds([distributorId]);

    const stores = isSalesRepUser
      ? await StoreRepository.getStoreIdsBySalesRepId(
          userRole.associatedUserId,
          excludeChainStores,
          warehouseId ? [warehouseId] : undefined
        )
      : isSalesRepManager
        ? await StoreRepository.getStoresBySalesRepManagerId({
            salesRepManagerId: userRole?.associatedUserId
          })
        : await StoreRepository.getStoreIdsByDistributorId(
            distributorId,
            excludeChainStores,
            warehouseId ? [warehouseId] : undefined
          );

    const storeIds =
      isSalesRepUser || isSalesRepManager
        ? stores.map((s: any) => s.storeId)
        : stores.map((s: any) => s.associatedUserId);

    // TIMING: Valid Program IDs
    const validProgramIds = await this.getDistributorAccumulativeProgramIds({
      manufacturerId,
      distributorId,
      storeIds,
      isTypeStoreProgram: type == ENTITY_TYPE.STORE,
      programTimeline,
      isInternalInitiative
    });

    // TIMING: Manufacturer, Programs, and Category Tags
    const manufacturerPrograms =
      await ProgramRepository.getAllProgramAndDetails(
        manufacturerId,
        "",
        excludedProgramDetailIds,
        validProgramIds,
        programTimeline,
        isInternalInitiative,
        storeIds
      );

    // For DISTRIBUTOR_ADMIN / DISTRIBUTOR_GENERAL_MANAGER, use aggregations table (warehouse scoping supported)
    if (isDistributorUser) {
      const programDetailIds = manufacturerPrograms.flatMap(
        (program: any) => program.ProgramDetails?.map((pd: any) => pd.id) || []
      );

      const aggregationsMap =
        await ProgramRepository.getDistributorProgramDetailAggregations(
          distributorId,
          programDetailIds,
          ENTITY_TYPE.STORE,
          excludeChainStores,
          warehouseId ? [warehouseId] : undefined
        );

      manufacturerPrograms.forEach((program: any) => {
        if (program && program.ProgramDetails) {
          for (const programDetail of program.ProgramDetails) {
            const aggregationData = aggregationsMap.get(programDetail.id);

            const programDetailsData = {
              totalEnrollments: aggregationData?.storesEnrolled ?? 0,
              qualifiedComliances: aggregationData?.compliantStores ?? 0
            };

            response.push({
              programId: program.id,
              programDetailId: programDetail.id,
              ...programDetailsData
            });
          }
        }
      });
    } else {
      // For other roles, use existing logic
      // TIMING: Qualified Compliances
      const QualifiedCompliancesByDistributorId: any[] =
        type === ENTITY_TYPE.STORE &&
        userRole.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP
          ? await StoreRepository.getQualifiedCompliancesCountBySalesRepId({
              salesRepId: userRole.associatedUserId,
              manufacturerId,
              includeCurrentYearData: true,
              excludeChainStores,
              excludeUnenrolledStores: true,
              storeIds,
              distributorId: distributorId
            })
          : type === ENTITY_TYPE.STORE
            ? await StoreRepository.getQualifiedCompliancesCountByDistributorId(
                {
                  distributorId,
                  manufacturerId,
                  includeCurrentYearData: true,
                  excludeChainStores,
                  excludeUnenrolledStores: true,
                  storeIds,
                  isSalesRepManagerId: isSalesRepManager
                    ? userRole?.associatedUserId
                    : undefined
                }
              )
            : [];

      const ineligibleStoreIdsByProgramIds: any[] =
        await ProgramRepository.getIneligibleStoreIdsGroupByProgramId(
          manufacturerPrograms?.map((pro: any) => pro.id),
          storeIds
        );
      await Promise.all(
        manufacturerPrograms.map(async (program) => {
          const ProgramVisibilities = program.ProgramVisibility?.length
            ? program.ProgramVisibility
            : undefined;

          const isIneligibleStoreIds =
            ineligibleStoreIdsByProgramIds?.find(
              (it: any) => it.program_id == program.id
            )?.store_ids ?? [];

          if (program && program.ProgramDetails) {
            for (const programDetail of program.ProgramDetails) {
              const programDetailsData = {
                totalEnrollments:
                  ProgramVisibilities ??
                  new Set(
                    program.ProgramParticipants?.map(
                      (pp: any) => pp.entity_id
                    )?.filter(
                      (id: number) => !isIneligibleStoreIds?.includes(id)
                    ) ?? []
                  ).size,
                qualifiedComliances:
                  QualifiedCompliancesByDistributorId?.find(
                    (qc: any) => qc.program_detail_id == programDetail.id
                  )?.qualified_compliance_count ?? 0
              };

              response.push({
                programId: program.id,
                programDetailId: programDetail.id,
                ...programDetailsData
              });
            }
          }
        })
      );
    }

    return response;
  }

  private async getDistributorAccumulativeProgramIds({
    manufacturerId,
    distributorId,
    storeIds,
    isTypeStoreProgram,
    programTimeline,
    isInternalInitiative
  }: {
    manufacturerId: number;
    distributorId: number;
    storeIds: number[];
    isTypeStoreProgram?: boolean;
    programTimeline?: string;
    isInternalInitiative?: boolean;
  }): Promise<number[]> {
    const user = getCurrentUser();
    let salesRepIds: number[] = [];

    if (user?.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
      salesRepIds = [user.associatedUserId];
    } else {
      // Fetch sales rep IDs internally
      salesRepIds = await DistributorRepository.getSalesRepIdsByDistributor([
        distributorId
      ]);
    }

    const [validProgramIds, validStoreProgramIds, validSalesRepProgramIds] =
      await Promise.all([
        isTypeStoreProgram
          ? []
          : ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
              participantType: ENTITY_TYPE.DISTRIBUTOR,
              creatorIds: [manufacturerId],
              creatorType: ENTITY_TYPE.MANUFACTURER,
              secondaryCreatorIds: [distributorId],
              secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
              visibilityEntitieIds: [distributorId],
              programTimeline,
              getInternalInitiative: isInternalInitiative,
              distributorId: distributorId
            }),
        ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
          participantType: ENTITY_TYPE.STORE,
          creatorIds: [manufacturerId],
          creatorType: ENTITY_TYPE.MANUFACTURER,
          secondaryCreatorIds: [distributorId],
          secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
          visibilityEntitieIds: storeIds,
          programTimeline,
          getInternalInitiative: isInternalInitiative,
          distributorId: distributorId
        }),
        isTypeStoreProgram
          ? []
          : ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
              participantType: ENTITY_TYPE.SALES_REP,
              creatorIds: [manufacturerId],
              creatorType: ENTITY_TYPE.MANUFACTURER,
              secondaryCreatorIds: [distributorId],
              secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
              visibilityEntitieIds: salesRepIds,
              programTimeline,
              getInternalInitiative: isInternalInitiative,
              distributorId: distributorId
            })
      ]);

    return [
      ...validProgramIds,
      ...validStoreProgramIds,
      ...validSalesRepProgramIds
    ];
  }

  public getTotalSumFromDistributorSaleTransacions(
    lineItemsResult?:
      | LineItem[]
      | Array<{
          manufacturer_id: number;
          total_volume: number;
          transaction_count: number;
          total_quantity: number;
        }>,
    manufacturerId?: number,
    isMatView?: boolean
  ) {
    // With the new optimized query, we get aggregated results directly
    // Each result now has total_volume already calculated
    if (!lineItemsResult || lineItemsResult.length === 0) {
      return 0;
    }

    // Check if this is the new optimized format (has total_volume property)
    const isOptimizedFormat =
      lineItemsResult.length > 0 &&
      typeof lineItemsResult[0] === "object" &&
      "total_volume" in lineItemsResult[0];

    if (isOptimizedFormat) {
      // Handle optimized format (pre-aggregated by manufacturer)
      let filteredResults = lineItemsResult as Array<{
        manufacturer_id: number;
        total_volume: number;
        transaction_count: number;
        total_quantity: number;
      }>;

      if (manufacturerId) {
        // Filter to specific manufacturer
        filteredResults = filteredResults.filter((item: any) => {
          return item?.manufacturer_id === manufacturerId;
        });
      }

      // Sum the pre-calculated total_volume
      const totalPurchasedVolumeSum = filteredResults.reduce(
        (sum: number, item: any) => {
          const totalVolume = parseFloat(item?.total_volume || "0");
          return sum + totalVolume;
        },
        0
      );

      return Math.round(totalPurchasedVolumeSum);
    } else {
      // Handle legacy format (individual line items)
      let filteredLineItems = lineItemsResult as LineItem[];

      if (manufacturerId) {
        // Filter line items to only include those with products from this manufacturer
        filteredLineItems = isMatView
          ? (lineItemsResult as any[]).filter((item: any) => {
              return item?.manufacturer_id === manufacturerId;
            })
          : (lineItemsResult as any[]).filter((item: any) => {
              const product = item?.product || item?.dataValues?.product;
              const productManufacturerId =
                product?.dataValues?.manufacturer_id ||
                product?.manufacturer_id;

              return productManufacturerId === manufacturerId;
            });
      }

      // Since we're now getting aggregated results by manufacturer_id,
      // we can simply sum the total_purchase_volume from the results
      const totalPurchasedVolumeSum = filteredLineItems.reduce(
        (sum: number, item: any) => {
          const total_price =
            typeof item?.get === "function"
              ? item.get("total_price")
              : item?.total_price;
          const totalVolume = parseFloat(
            item?.total_purchase_volume || total_price || "0"
          );
          return sum + totalVolume;
        },
        0
      );

      return Math.round(totalPurchasedVolumeSum);
    }
  }

  /**
   * Fetches compliances records for the given user ID and type
   *
   * This method fetches compliances records for the given user ID and type.
   * If the type is "RETAILER", it fetches the user IDs associated with
   * the given distributor ID and retailer ID. Otherwise, it just uses the
   * provided user ID.
   *
   * @param userId - The user ID to fetch compliances for
   * @param type - The type of the user ID ("RETAILER" or "DISTRIBUTOR")
   * @returns A promise that resolves to an array of compliance records
   */
  private async getCompliances(
    associatedUserId: number,
    type: string,
    loggedInUser?: UserRole
  ): Promise<Compliance[]> {
    const entityIds: number[] = [];
    const entityType: string[] = [];
    let roles: string[] = [];

    // Set entity IDs and types based on the provided type
    switch (type) {
      case ENTITY_TYPE.DISTRIBUTOR:
        entityIds.push(associatedUserId);
        entityType.push(
          ENTITY_TYPE.DISTRIBUTOR,
          ENTITY_TYPE.SALES_REP,
          ENTITY_TYPE.DISTRIBUTOR_SALES_REP
        );
        roles = [ENTITY_TYPE.DISTRIBUTOR_ADMIN];
        break;
      case ENTITY_TYPE.SALES_REP:
        entityType.push(ENTITY_TYPE.SALES_REP);
        roles = [ENTITY_TYPE.SALES_REP];
        break;
      case ENTITY_TYPE.STORE:
      default:
        entityType.push(ENTITY_TYPE.STORE);
        roles = [ENTITY_TYPE.STORE];
    }

    // Parallelize user role IDs and sales rep IDs queries
    const [userRolesIds, salesRepIds] = await Promise.all([
      // Fetch user role IDs based on the type
      (async () => {
        if (
          loggedInUser &&
          loggedInUser.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP &&
          type === ENTITY_TYPE.STORE
        ) {
          return ProgramRepository.getRetailersIdBySalesRepIdAndRole(
            loggedInUser.associatedUserId
          );
        } else if (
          loggedInUser &&
          loggedInUser.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP &&
          type === ENTITY_TYPE.SALES_REP
        ) {
          return [loggedInUser.associatedUserId];
        } else {
          return ProgramRepository.getRetailersIdByDistributorIdAndRole(
            associatedUserId,
            roles
          );
        }
      })(),
      // Fetch sales rep IDs if needed (for DISTRIBUTOR type)
      (async () => {
        if (type === ENTITY_TYPE.DISTRIBUTOR) {
          const isSalesRepManager = isDistributorSalesRepManager(
            loggedInUser?.role
          );

          if (isSalesRepManager) {
            return DistributorRepository.getSalesRepIdsBySalesRepManagerId({
              salesRepManagerId: loggedInUser?.associatedUserId
            });
          } else {
            return DistributorRepository.getSalesRepIdsByDistributor([
              associatedUserId
            ]);
          }
        }
        return [];
      })()
    ]);

    // Combine all entity IDs
    entityIds.push(...(salesRepIds ?? []));
    entityIds.push(...userRolesIds);

    // Fetch and return compliance records using the entity IDs and types
    // Execute with increased work_mem for better performance on large compliance queries
    return executeWithIncreasedWorkMem(
      () =>
        ComplianceRepository.findComplianceByEntityIdAndEntityType({
          entityId: entityIds,
          entityType: entityType,
          programIds: undefined
          // type === ENTITY_TYPE.STORE
        }),
      "64MB" // Increase work_mem for complex program compliance queries
    );
  }

  private calculateTotal(
    compliances: Compliance[],
    key: keyof Compliance
  ): number {
    return compliances.reduce((total, compliance) => {
      // Convert string to number and handle null/undefined
      const value =
        compliance[key] &&
        ((key == "earnedRebate" &&
          compliance.status == ProgramsComplianceStatus.Active) ||
          key != "earnedRebate")
          ? parseFloat(compliance[key] as unknown as string)
          : 0;

      // Return sum with 2 decimal places
      return Number((total + value).toFixed(2));
    }, 0);
  }

  /**
   * Groups programs by manufacturer and calculates total purchase volume and total savings.
   * @param programs - List of programs
   * @param compliances - List of compliance records
   * @returns A list of ManufacturerProgram objects
   */
  private async groupProgramByManufacturer(
    programs: Program[],
    compliances: Compliance[],
    type?: string,
    distributorId?: number,
    warehouseIds?: number[],
    storeIds?: number[],
    userRole?: UserRole,
    excludeChainStores?: boolean,
    hasWarehouseFilter?: boolean
  ): Promise<ManufacturerProgram[]> {
    if (useApiCaching) {
      const cacheKey = getCacheKey(
        "pgm",
        "grp",
        `${programs.map((p) => p.id).join(",")}`,
        `${compliances.map((c) => c.id).join(",")}`,
        `${type ? type : "null"}`,
        `${distributorId ? distributorId.toString() : "null"}`,
        `${hasWarehouseFilter ? warehouseIds?.sort().join(",") : "all"}`,
        `${storeIds ? storeIds.sort().join(",") : "all"}`,
        `${userRole ? userRole.role : "null"}`,
        `${excludeChainStores ? "excl-chains" : "incl-chains"}`
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

    // Step 1: Pre-calculate compliances map (Application Logic)
    const compliancesByProgramId = new Map<number, Compliance[]>();
    compliances.forEach((compliance) => {
      if (!compliancesByProgramId.has(compliance.programId)) {
        compliancesByProgramId.set(compliance.programId, []);
      }
      compliancesByProgramId.get(compliance.programId)?.push(compliance);
    });

    const manufacturerPrograms = new Map<string, ManufacturerProgram>();
    const seenManufacturerIds = new Set<number>();

    // Step 2: Collect manufacturers needing transactions (Application Logic)
    const manufacturersNeedingTransactions = new Set<number>();

    programs.forEach((program) => {
      const manufacturerId =
        program.Manufacturer?.id ?? program.Manufacturer?.get("id");
      if (
        manufacturerId &&
        distributorId &&
        !seenManufacturerIds.has(manufacturerId)
      ) {
        manufacturersNeedingTransactions.add(manufacturerId);
        seenManufacturerIds.add(manufacturerId);
      }
    });

    const programTerms = getMinMaxProgramDatesWithManufacturerId({
      programs: programs?.filter((p) => p?.participantType == type),
      useCurrentYear: false
    });

    // Check if we should use pre-aggregated data for DISTRIBUTOR_ADMIN / DISTRIBUTOR_EXECUTIVE / DISTRIBUTOR_GENERAL_MANAGER
    // Aggregations now support warehouse filtering, so we can use them even when warehouseIds are provided
    const shouldUseAggregations =
      userRole &&
      (isDistributorAdmin(userRole.role) ||
        isDistributorExecutive(userRole.role) ||
        isDistributorGeneralManager(userRole.role)) &&
      distributorId &&
      type;

    let aggregationsMap = new Map<number, any>();
    const transactionsByManufacturerId = new Map<number, any[]>();

    if (shouldUseAggregations) {
      // Step 3a: Use pre-aggregated data for DISTRIBUTOR_ADMIN (OPTIMIZED PATH)
      const programIds = programs.map((p) => p.id);
      aggregationsMap = await newrelic.startSegment(
        "getDistributorPrograms.fetchAggregations",
        true,
        async () =>
          await ProgramRepository.getDistributorProgramAggregations(
            distributorId,
            programIds,
            type,
            excludeChainStores || false,
            warehouseIds
          )
      );

      newrelic.addCustomAttribute(
        "usingAggregations",
        aggregationsMap.size > 0
      );
      newrelic.addCustomAttribute(
        "excludeChainStores",
        excludeChainStores || false
      );
    } else {
      // Step 3b: Fetch transactions for other roles (LEGACY PATH)
      // Use ineligibility-aware method for STORE type to filter per manufacturer
      const isStoreType = type == ENTITY_TYPE.STORE;
      const returnSaleTransactions = type != ENTITY_TYPE.DISTRIBUTOR;
      const allTransactions =
        isStoreType && storeIds && storeIds.length > 0
          ? await StoreRepository.getTransactionsByManufacturerIdAndProgramTermsOptimizedWithIneligibility(
              distributorId ? [distributorId] : [],
              Array.from(manufacturersNeedingTransactions),
              programs.map((p) => p.id), // Pass programIds for ineligibility check
              distributorId || 0, // Pass distributorId for ineligibility filtering
              ENTITY_TYPE.DISTRIBUTOR,
              returnSaleTransactions,
              storeIds, // Pass ALL storeIds without pre-filtering
              ENTITY_TYPE.STORE,
              warehouseIds,
              programTerms,
              true
            )
          : await StoreRepository.getTransactionsByManufacturerIdAndProgramTermsOptimized(
              distributorId ? [distributorId] : [],
              Array.from(manufacturersNeedingTransactions),
              ENTITY_TYPE.DISTRIBUTOR,
              returnSaleTransactions,
              isStoreType ? storeIds : undefined,
              isStoreType ? ENTITY_TYPE.STORE : undefined,
              warehouseIds,
              programTerms,
              true
            );
      newrelic.addCustomAttribute(
        "transactionsCount",
        allTransactions?.length || 0
      );

      // Pre-group transactions by manufacturer ID (CRITICAL OPTIMIZATION)
      allTransactions?.forEach((transaction: any) => {
        const manufacturerId = transaction.manufacturer_id;
        if (manufacturerId) {
          if (!transactionsByManufacturerId.has(manufacturerId)) {
            transactionsByManufacturerId.set(manufacturerId, []);
          }
          transactionsByManufacturerId.get(manufacturerId)?.push(transaction);
        }
      });
    }

    await Promise.all(
      programs.map(async (program) => {
        // Extract manufacturer details with null checking
        const manufacturer = program.Manufacturer;
        const programPaymentTerm = formatPaymentTermLabel(program.paymentTerm);
        const manufacturerName = manufacturer?.name ?? "";
        const manufacturerLogo = manufacturer?.logo ?? "";
        const authManufacturer = manufacturer?.authorized ?? false;
        const manufacturerId = manufacturer?.id ?? manufacturer?.get("id");

        if (!manufacturerId) return;

        // Use pre-calculated compliances, find matching compliances for the program
        const matchingCompliances =
          compliancesByProgramId.get(program.id) || [];

        let total = 0;
        let totalSavings = 0;

        // Use aggregations if available (DISTRIBUTOR_ADMIN), otherwise use transactions
        if (shouldUseAggregations && aggregationsMap.has(program.id)) {
          // Get data from pre-aggregated table (FAST PATH)
          const aggregation = aggregationsMap.get(program.id);
          total = aggregation.totalSalesVolume;
          totalSavings = aggregation.totalStoreEarnings;
        } else {
          // Get transaction data from pre-grouped results (LEGACY PATH)
          if (distributorId && manufacturerId) {
            const manufacturerTransactions =
              transactionsByManufacturerId.get(manufacturerId) || [];
            total = this.getTotalSumFromDistributorSaleTransacions(
              manufacturerTransactions
            );
          }

          const aggregates =
            this.calculateComplianceAggregates(matchingCompliances);
          totalSavings = aggregates.totalSavings;
        }

        // Update or create manufacturer program
        if (manufacturerPrograms.has(manufacturerName)) {
          const existingProgram = manufacturerPrograms.get(manufacturerName)!;
          manufacturerPrograms.set(manufacturerName, {
            ...existingProgram,
            manufacturerLogo,
            authManufacturer,
            // For aggregations, take max across programs; for legacy, use manufacturer total
            totalPurchaseVolume: shouldUseAggregations
              ? Math.max(existingProgram.totalPurchaseVolume, total)
              : total > 0
                ? total
                : existingProgram.totalPurchaseVolume,
            totalSaving: existingProgram.totalSaving + totalSavings,
            program_overview: [
              ...existingProgram.program_overview,
              this.buildProgramOverview(
                program,
                type == ENTITY_TYPE.STORE ? [] : matchingCompliances
              )
            ]
          });
        } else {
          // Add new manufacturer
          manufacturerPrograms.set(manufacturerName, {
            manufacturerName,
            manufacturerLogo,
            authManufacturer,
            manufacturerId: (program.Manufacturer?.id ??
              program.Manufacturer?.get("id") ??
              0) as number,
            totalPurchaseVolume: total,
            totalSaving: totalSavings,
            programPaymentTerm: programPaymentTerm,
            program_overview: [
              this.buildProgramOverview(
                program,
                type == ENTITY_TYPE.STORE ? [] : matchingCompliances
              )
            ]
          });
        }
      })
    );

    // Step 6: Convert to array (Application Logic)
    const result = Array.from(manufacturerPrograms.values());

    // Step 7: Cache result (if enabled)
    if (useApiCaching && result.length > 0) {
      const cacheKey = getCacheKey(
        "pgm",
        "grp",
        `${programs.map((p) => p.id).join(",")}`,
        `${compliances.map((c) => c.id).join(",")}`,
        `${type ? type : "null"}`,
        `${distributorId ? distributorId.toString() : "null"}`,
        `${warehouseIds ? warehouseIds.sort().join(",") : "all"}`,
        `${storeIds ? storeIds.sort().join(",") : "all"}`,
        `${userRole ? userRole.role : "null"}`,
        `${excludeChainStores ? "excl-chains" : "incl-chains"}`
      );

      await redisClient.setEx(cacheKey, CACHE_TTL_TIME, JSON.stringify(result));
    }

    return result;
  }

  /**
   * Gets the rebate value based on the program detail's rebate type and amount.
   * If the program detail is null, returns 0.
   * If the rebate type is "percentage", returns the rebate percentage.
   * If the rebate type is "flat", returns the rebate amount.
   * If neither case is matched, returns the rebate amount. If the rebate amount is null, returns 0.
   * @param programDetail Program detail object
   * @returns Rebate value
   */
  private getRebateValue(programDetail: ProgramDetail): number {
    if (!programDetail) return 0;

    const { rebateType, rebatePercentage, rebateAmount } = programDetail;

    switch (rebateType) {
      case "percentage":
        return rebatePercentage ?? 0;

      case "flat":
        return rebateAmount ?? 0;

      default:
        return rebateAmount ?? 0; // Default value if neither case is matched
    }
  }

  private buildProgramOverview(
    program: Program,
    compliances?: Compliance[]
  ): ProgramOverview {
    const programOverview: ProgramOverview = {
      id: program.id,
      name: program.name,
      programType: program.programType,
      programTerms: program.paymentTerm,
      programHeader: program.programHeader,
      compliances: compliances,
      programEntityType: program.participantType,
      programDetails: program?.ProgramDetails,
      startDate: program.startDate,
      endDate: program.endDate
    };

    return programOverview;
  }

  public async getAllManufacturerIds() {
    const Ids = await ProgramRepository.getAllManufacturerIds();

    return Ids.map((row) => row.id);
  }

  public async getCategorizedProducts({
    programsType,
    loggedInUser,
    manufacturerId,
    programTimeline,
    warehouseId
  }: {
    programsType: string;
    loggedInUser: LoggedInUser;
    manufacturerId: number;
    programTimeline?: string;
    warehouseId?: number;
  }) {
    const loggedInUserRole = loggedInUser.role;

    if (
      (programsType == ENTITY_TYPE.STORE && !isDistributor(loggedInUserRole)) ||
      isDistributor(loggedInUserRole)
    ) {
      const distributorId = getParentDistributorId(
        loggedInUser,
        loggedInUserRole
      );
      let defaultWarehouseId;

      if (warehouseId) {
        defaultWarehouseId = warehouseId;
      } else if (
        isDistributorSalesRep(loggedInUserRole) ||
        isDistributorSalesRepManager(loggedInUserRole)
      ) {
        // For sales reps and Sales Rep Managers, use their primary warehouse ID
        const distributor = await Distributor.findOne({
          where: { id: loggedInUser.associatedUserId },
          attributes: ["primaryWarehouseId"],
          raw: true
        });

        if (distributor?.primaryWarehouseId) {
          defaultWarehouseId = distributor.primaryWarehouseId;
        }
      } else if (isDistributorGeneralManager(loggedInUserRole)) {
        // For General Managers, fetch their assigned warehouse from distributor_manager_warehouses
        // IMPORTANT: Don't pass warehouseId to getWarehouseIds() - that would allow GMs to bypass scoping
        const assignedWarehouseIds =
          await DistributorRepository.getWarehouseIds(
            distributorId,
            loggedInUser.associatedUserId, // managerId
            true, // isGeneralManager
            undefined, // Don't pass selectedWarehouseId to prevent short-circuit
            false // returnDefaultWarehouseId
          );

        // Validate GM has exactly one warehouse assigned
        if (!assignedWarehouseIds?.length) {
          throw ApiError.badRequest(
            "General manager has no warehouse assigned"
          );
        }
        if (assignedWarehouseIds.length !== 1) {
          throw ApiError.badRequest(
            "General manager must be assigned to exactly one warehouse"
          );
        }

        const assignedWarehouseId = assignedWarehouseIds[0];

        // If warehouseId was explicitly provided, validate it matches GM's assigned warehouse
        if (
          warehouseId &&
          !isNaN(Number(warehouseId)) &&
          Number(warehouseId) !== assignedWarehouseId
        ) {
          throw ApiError.authorizationFailed(
            "Not authorized for requested warehouse"
          );
        }

        defaultWarehouseId = assignedWarehouseId;
      } else if (distributorId) {
        const warehouseIds = await DistributorRepository.getWarehouseIds(
          distributorId,
          undefined,
          undefined,
          undefined,
          true
        );
        defaultWarehouseId = warehouseIds?.length ? warehouseIds[0] : undefined;
      }

      // Fetch Programs and Manufacturer Products
      // 1. Get valid program IDs for this manufacturer, type, and timeline
      const programsResult = await StoreRepository.getManufacturerProgramsById(
        manufacturerId,
        programsType,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        programTimeline,
        undefined, // isInternalInitiative - not available in this context
        distributorId // Filter by distributor-approved programs only
      );

      // 2. Extract program IDs
      const programIds = programsResult.map(
        (pr: any) => pr.program_id || pr.id
      );

      // 3. Get unique tags for these program IDs
      let uniqueTags: string[] = [];
      if (programIds.length) {
        uniqueTags = await ProgramRepository.getUniqueProductTagsByProgramIds(
          programIds,
          true // includeFixedRebateCategory
        );
      }
      // 4. Fetch products with only those tags
      const productsResult = await StoreRepository.getManufacturerProducts({
        manufacturerId: Number(manufacturerId),
        distributorId,
        selectedWarehouseId: defaultWarehouseId,
        categoryTagsJSON: uniqueTags
      });
      const manufacturerDetails =
        await ManufacturerService.getManufacturerNameAndLogo(
          Number(manufacturerId)
        );
      const isManufacturerAuthorized = manufacturerDetails?.authorized;
      const isManufacturerUser = isManufacturer(loggedInUserRole);

      // Get and deduplicate all valid product tags from both columns
      const tagSet = new Set<string>();
      programsResult.forEach((pr: any) => {
        [pr.products_tags, pr.fixed_rebate_category].forEach((tagGroup) => {
          if (tagGroup) {
            tagGroup
              .split(",")
              .map((tag: string) => tag.trim())
              .filter((tag: string) => !!tag)
              .forEach((tag: string) => tagSet.add(tag));
          }
        });
      });
      const programsProductTags = Array.from(tagSet);

      const categorizedProducts = await StoreService.getCategorizedProducts(
        programsProductTags,
        productsResult,
        [],
        [],
        isManufacturerAuthorized,
        programsType == ENTITY_TYPE.DISTRIBUTOR,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        distributorId,
        isManufacturerUser
      );

      return categorizedProducts;
    }
    return {};
  }

  public async getStoresListing({
    loggedInUser,
    enrolled,
    enrolledPage = 1,
    notEnrolledPage = 1,
    sort = "ASC",
    sortKey = "sort",
    searchQuery = "",
    selectedSalesRepId,
    manufacturerId,
    selectedWarehouseId,
    programTimeline,
    isInternalInitiative,
    excludeChainStores,
    isDownload,
    hideEnrollTable,
    agreementId
  }: {
    loggedInUser: UserRole;
    enrolled?: boolean;
    enrolledPage?: number;
    notEnrolledPage?: number;
    sort?: string;
    sortKey?: string;
    searchQuery?: string | null;
    selectedSalesRepId?: number | null;
    manufacturerId: number;
    selectedWarehouseId?: number;
    programTimeline?: string;
    isInternalInitiative?: boolean;
    excludeChainStores?: boolean;
    isDownload?: boolean;
    hideEnrollTable?: boolean;
    agreementId?: number | number[];
  }) {
    try {
      // Validate inputs
      if (!manufacturerId) {
        throw new ApiError(400, "Missing manufacturerId");
      }

      if (!loggedInUser?.role) {
        throw new ApiError(400, "Invalid user role");
      }

      const distributorId =
        loggedInUser.role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP
          ? loggedInUser.parentEntityId
          : getDistributorIdAsRole(loggedInUser, loggedInUser.role);

      let warehouseIds = undefined;
      if (isDistributorAdminOrManagerOrExecutive(loggedInUser.role)) {
        const managerId = loggedInUser.associatedUserId;
        const isGeneralManager = isDistributorGeneralManager(loggedInUser.role);

        warehouseIds =
          isGeneralManager || selectedWarehouseId
            ? await DistributorRepository.getWarehouseIds(
                distributorId,
                managerId,
                isGeneralManager,
                selectedWarehouseId
              )
            : undefined;
      }

      // Get programs with error handling
      let programsData: Program[] = [];
      try {
        programsData = await ProgramRepository.getProgramsByManufacturerId({
          manufacturerId,
          programTimeline,
          isInternalInitiative,
          distributorId
        });
      } catch (programsError) {
        console.error("[ERROR] Failed to fetch programs:", programsError);
        programsData = [];
      }

      // Get all manufacturer program IDs (used for not-enrolled stores and as fallback)
      const allProgramIds = programsData
        .filter((program) => program.participantType === ENTITY_TYPE.STORE)
        .map((program) => program.id);

      // If agreementId is provided, fetch program IDs from agreement
      let enrolledProgramIds: number[] = allProgramIds;
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

          // Filter to only include program IDs that belong to this manufacturer and are STORE type
          enrolledProgramIds = agreementProgramIds.filter((programId) =>
            allProgramIds.includes(programId)
          );

          // If no valid programs found for agreement, return empty enrolled list
          if (enrolledProgramIds.length === 0) {
            // Still fetch products for not-enrolled stores based on all programs
            let uniqueTagsForNotEnrolled: string[] = [];
            if (allProgramIds.length) {
              uniqueTagsForNotEnrolled =
                await ProgramRepository.getUniqueProductTagsByProgramIds(
                  allProgramIds
                );
            }
            const manufacturerProductsDataForNotEnrolled =
              await StoreRepository.getManufacturerProducts({
                manufacturerId,
                categoryTagsJSON: uniqueTagsForNotEnrolled
              });
            const manufacturerProductsIdsForNotEnrolled: number[] =
              manufacturerProductsDataForNotEnrolled.map(
                (product) => product.id
              );

            const selectedSalesRepIdForEarlyReturn =
              selectedSalesRepId === null
                ? loggedInUser.role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP
                  ? loggedInUser.userId
                  : null
                : selectedSalesRepId;

            return {
              storesListingEnrolled: {
                stores: [],
                totalStores: 0,
                currentPage: enrolledPage,
                totalPages: 0
              },
              storesListingNotEnrolled: !enrolled
                ? await StoreService.getListing(
                    distributorId,
                    null,
                    notEnrolledPage,
                    sort,
                    searchQuery,
                    selectedSalesRepIdForEarlyReturn,
                    0,
                    false,
                    allProgramIds,
                    manufacturerProductsIdsForNotEnrolled,
                    sortKey,
                    manufacturerId,
                    warehouseIds,
                    undefined,
                    programTimeline,
                    isInternalInitiative,
                    excludeChainStores,
                    undefined,
                    true,
                    isDownload ? 20000 : undefined
                  )
                : {
                    stores: [],
                    totalStores: 0,
                    currentPage: notEnrolledPage,
                    totalPages: 0
                  }
            };
          }
        } catch (agreementError) {
          console.error(
            "[ERROR] Failed to fetch programs from agreement:",
            agreementError
          );
          // Fallback to all programs if agreement query fails
          enrolledProgramIds = allProgramIds;
        }
      }

      // Use enrolledProgramIds for product tags (to ensure we get products for enrolled programs)
      const programIdsForProducts = enrolledProgramIds.length
        ? enrolledProgramIds
        : allProgramIds;

      // 2. Get unique tags for these program IDs
      let uniqueTags: string[] = [];
      if (programIdsForProducts.length) {
        uniqueTags = await ProgramRepository.getUniqueProductTagsByProgramIds(
          programIdsForProducts
        );
      }
      // 3. Fetch products with only those tags
      const manufacturerProductsData =
        await StoreRepository.getManufacturerProducts({
          manufacturerId,
          categoryTagsJSON: uniqueTags
        });
      const manufacturerProductsIds: number[] = manufacturerProductsData.map(
        (product) => product.id
      );

      selectedSalesRepId =
        selectedSalesRepId === null
          ? loggedInUser.role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP
            ? loggedInUser.userId
            : null
          : selectedSalesRepId;

      // Use 20K page size when isDownload is true to fetch all records for CSV export
      const pageSize = isDownload ? 20000 : undefined;

      let storesListingEnrolled: any = [];
      if (!hideEnrollTable && (enrolled || enrolled === undefined)) {
        // When agreementId is provided, show stores enrolled in agreement's programs
        // When agreementId is not provided, show stores enrolled in all manufacturer programs (existing behavior)
        storesListingEnrolled = await StoreService.getListing(
          distributorId,
          null,
          enrolledPage,
          sort,
          searchQuery,
          selectedSalesRepId,
          0,
          true,
          enrolledProgramIds,
          manufacturerProductsIds,
          sortKey,
          manufacturerId,
          warehouseIds,
          undefined,
          programTimeline,
          isInternalInitiative,
          excludeChainStores,
          undefined,
          true,
          pageSize
        );
      }

      let storesListingNotEnrolled: any = [];
      if (!enrolled) {
        // When agreementId is provided, show stores NOT enrolled in agreement's programs
        // When agreementId is not provided, show stores NOT enrolled in any manufacturer programs (existing behavior)
        const notEnrolledProgramIds = agreementId
          ? enrolledProgramIds
          : allProgramIds;

        storesListingNotEnrolled = await StoreService.getListing(
          distributorId,
          null,
          notEnrolledPage,
          sort,
          searchQuery,
          selectedSalesRepId,
          0,
          false,
          notEnrolledProgramIds,
          manufacturerProductsIds,
          sortKey,
          manufacturerId,
          warehouseIds,
          undefined,
          programTimeline,
          isInternalInitiative,
          excludeChainStores,
          undefined,
          true,
          pageSize
        );
      }

      return { storesListingEnrolled, storesListingNotEnrolled };
    } catch (error) {
      console.error("[ERROR] getStoresListing failed:", error);
      throw new ApiError(500, "Failed to get stores listing");
    }
  }

  /**
   * Retrieves chain information organized by programs for stores with a specific manufacturer under a distributor
   * Returns data in the same structure as retailerProgramOverview but with chain-level compliance instead of stores
   * Optimized for performance with minimal queries
   * @param manufacturerId - The manufacturer ID to filter programs by
   * @param distributorId - The distributor ID to filter stores by
   * @param programTimeline - Optional timeline filter for programs
   * @returns Promise resolving to program-organized chain information with associated stores
   */
  public async getChainsByManufacturer(
    manufacturerId: number,
    distributorId: number,
    programTimeline?: string
  ): Promise<{
    chainProgramOverview: any[];
    totalPurchaseVolume: number;
    totalSaving: number;
  }> {
    return newrelic.startSegment(
      "ProgramService.getChainsByManufacturer",
      true,
      async () => {
        try {
          const user = getCurrentUser();
          const isSalesRepManager = isDistributorSalesRepManager(user?.role);

          // Add caching for performance
          if (useApiCaching) {
            const cacheKey = getCacheKey(
              "pgm",
              "chains",
              `${manufacturerId}`,
              `${distributorId}`,
              `${programTimeline || "all"}`,
              `${isSalesRepManager ? user?.associatedUserId || "all" : "all"}`
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

          // Single optimized query to get everything we need
          const chainProgramData = await newrelic.startSegment(
            "getChainsByManufacturer.query",
            true,
            async () => {
              return await sequelize.query(
                `
                  WITH cte AS (
                    SELECT DISTINCT
                        p.id AS program_id,
                        p.name AS program_name,
                        p.program_type,
                        p.program_header,
                        p.participant_type,
                        p.payment_term,
                        p.start_date,
                        p.end_date,
                        c.id AS chain_id,
                        c.name AS chain_name,
                        p.manufacturer_id,
                        Count(DISTINCT cs.store_id) as total_stores,
                        Count(
                          DISTINCT CASE
                              WHEN pp.entity_id = c.id
                                  AND pp.entity_type = 'CHAIN'
                              THEN cs.store_id
                          END
                      )  AS enrolled_stores
                    FROM programs p
                    JOIN program_details pd
                        ON p.id = pd.program_id
                    -- Only include programs that have chain participants
                    JOIN program_participants pp_filter
                        ON pp_filter.program_id = p.id
                        AND pp_filter.entity_type = 'CHAIN'
                        AND pp_filter.deleted_at IS NULL
                    JOIN user_roles ur
                        ON ur.associated_entity_type = 'STORE'
                        AND ur.parent_entity_type = 'DISTRIBUTOR'
                    JOIN stores s
                        ON s.id = ur.associated_user_id
                    ${
                      isSalesRepManager
                        ? `
                    JOIN store_sales_reps ssr ON s.id = ssr.store_id
                    JOIN manager_sales_rep_mapping msrm ON ssr.sales_rep_id = msrm.sales_rep_id
                    `
                        : ""
                    }
                    JOIN chain_stores cs
                        ON cs.store_id = s.id
                    JOIN chains c
                        ON c.id = cs.chain_id AND c.distributor_id = :distributorId
                    LEFT JOIN excluded_distributor_programs AS edp
                        ON edp.program_id = p.id
                        AND edp.program_detail_id = pd.id
                        AND edp.deleted_at IS NULL
                        AND edp.distributor_id = :distributorId
                    LEFT JOIN program_participants pp
                        ON pp.entity_id = c.id
                        AND pp.entity_type = 'CHAIN'
                        AND pp.program_id = p.id
                        AND pp.deleted_at IS NULL
                    LEFT JOIN program_approvals pa ON pa.program_id = p.id
                      AND pa.approver_type = 'DISTRIBUTOR'
                      AND pa.approver_id = :distributorId
                      AND pa.deleted_at IS NULL
                    WHERE p.manufacturer_id = :manufacturerId
                        AND ur.parent_entity_type = 'DISTRIBUTOR'
                        AND ur.associated_entity_type = 'STORE'
                        ${
                          isSalesRepManager
                            ? `
                        AND msrm.sales_manager_id = :salesManagerId
                        AND msrm.deleted_at IS NULL
                        AND ssr.deleted_at IS NULL
                        `
                            : `AND ur.parent_entity_id = :distributorId`
                        }
                        AND pd.deleted_at IS NULL
                        AND p.deleted_at IS NULL
                        AND edp.id IS NULL
                        AND pa.status = 'APPROVED'
                        ${programTimeline === "Past" ? "AND p.end_date < NOW()" : ""}
                        ${programTimeline === "Future" ? "AND p.start_date > NOW()" : ""}
                        ${programTimeline === "Present" ? "AND p.start_date <= NOW() AND p.end_date >= NOW()" : ""}
                    GROUP BY
                      p.id, program_name, p.program_type, program_header, participant_type, payment_term,
                      start_date, end_date, c.id, c.name
                ),
                ineligible_stores AS (
                  SELECT psi.store_id
                    FROM program_store_ineligibility psi
                    JOIN programs AS pro
                        ON pro.id = psi.program_id
                    JOIN user_roles ur
                        ON ur.associated_user_id = psi.store_id
                        AND ur.associated_entity_type = 'STORE'
                        AND ur.parent_entity_type = 'DISTRIBUTOR'
                    ${
                      isSalesRepManager
                        ? `
                    JOIN store_sales_reps ssr ON psi.store_id = ssr.store_id
                    JOIN manager_sales_rep_mapping msrm ON ssr.sales_rep_id = msrm.sales_rep_id
                    `
                        : ""
                    }
                    JOIN chain_stores cs
                        ON cs.store_id = psi.store_id
                    WHERE pro.id IN (SELECT program_id FROM cte)
                  AND psi.deleted_at is null
                    ${
                      isSalesRepManager
                        ? `
                    AND msrm.sales_manager_id = :salesManagerId
                    AND msrm.deleted_at IS NULL
                    AND ssr.deleted_at IS NULL
                    `
                        : `AND ur.parent_entity_id = :distributorId`
                    }
                    GROUP BY psi.store_id
                    HAVING COUNT(DISTINCT pro.id) = (
                        SELECT COUNT(DISTINCT program_id) FROM cte
                    )
                ),
                store_purchase AS (
                  SELECT
                  cs.chain_id,
                  css.manufacturer_id,
                  COALESCE(SUM(css.total_purchase), 0) AS total_purchase_volume
                FROM combined_store_summary css
                JOIN user_roles ur
                  ON ur.associated_user_id = css.store_id
                  AND ur.associated_entity_type = 'STORE'
                  AND ur.parent_entity_type = 'DISTRIBUTOR'
                ${
                  isSalesRepManager
                    ? `
                JOIN store_sales_reps ssr ON css.store_id = ssr.store_id
                JOIN manager_sales_rep_mapping msrm ON ssr.sales_rep_id = msrm.sales_rep_id
                `
                    : ""
                }
                JOIN chain_stores cs ON cs.store_id = css.store_id
                  Where css.manufacturer_id = :manufacturerId
                  AND css.transaction_year = EXTRACT(YEAR FROM NOW())
                  AND css.store_id NOT IN (select store_id from ineligible_stores)
                  ${
                    isSalesRepManager
                      ? `
                  AND msrm.sales_manager_id = :salesManagerId
                  AND msrm.deleted_at IS NULL
                  AND ssr.deleted_at IS NULL
                  `
                      : `AND ur.parent_entity_id = :distributorId`
                  }
                  GROUP BY cs.chain_id, css.manufacturer_id
                ),
                store_program_earnings AS (
                  SELECT
                    cs.chain_id,
                  pc.program_id,
                  COALESCE(SUM(pc.earned_rebate), 0) AS total_earned_rebate,
                  COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN pc.entity_id END) AS compliant_stores
                  FROM program_compliances pc
                  JOIN user_roles ur
                    ON ur.associated_user_id = pc.entity_id
                    AND ur.associated_entity_type = 'STORE'
                    AND ur.parent_entity_type = 'DISTRIBUTOR'
                  ${
                    isSalesRepManager
                      ? `
                  JOIN store_sales_reps ssr ON pc.entity_id = ssr.store_id
                  JOIN manager_sales_rep_mapping msrm ON ssr.sales_rep_id = msrm.sales_rep_id
                  `
                      : ""
                  }
                  JOIN chain_stores cs ON cs.store_id = pc.entity_id
                  LEFT JOIN program_store_ineligibility AS psi on psi.program_id = pc.program_id AND pc.entity_id = psi.store_id AND psi.deleted_at IS NULL
                  Where pc.program_id in (SELECT DISTINCT program_id FROM cte)
                  AND pc.entity_type = 'STORE'
                  AND pc.deleted_at IS NULL
                  AND status = 'active'
                  AND psi.id IS NULL
                  ${
                    isSalesRepManager
                      ? `
                  AND msrm.sales_manager_id = :salesManagerId
                  AND msrm.deleted_at IS NULL
                  AND ssr.deleted_at IS NULL
                  `
                      : `AND ur.parent_entity_id = :distributorId`
                  }
                  GROUP BY pc.program_id, cs.chain_id
                )
				        SELECT
                    cte.program_id,
                    program_name,
                    program_type,
                    program_header,
                    participant_type,
                    payment_term,
                    start_date,
                    end_date,
                    cte.chain_id,
                    chain_name,
                    cte.total_stores,
                    cte.enrolled_stores,
                    spe.compliant_stores,
                    COALESCE(sp.total_purchase_volume, 0) as total_purchase_volume,
                    COALESCE(spe.total_earned_rebate, 0) as total_earned_rebate
                  FROM cte
                  LEFT JOIN store_purchase as sp on cte.chain_id = sp.chain_id AND cte.manufacturer_id = sp.manufacturer_id
                  LEFT JOIN store_program_earnings as spe on cte.program_id = spe.program_id and spe.chain_id = cte.chain_id
				        ORDER BY cte.program_id, chain_name
              `,
                {
                  replacements: {
                    manufacturerId,
                    distributorId,
                    salesManagerId: isSalesRepManager
                      ? user?.associatedUserId
                      : undefined,
                    programTimeline: programTimeline || "all"
                  },
                  type: QueryTypes.SELECT
                }
              );
            }
          );

          // Group by program and build the response structure
          const result = await newrelic.startSegment(
            "getChainsByManufacturer.dataProcessing",
            true,
            async () => {
              const programMap = new Map();
              const chainSet = new Set();
              let totalPurchaseVolume = 0;
              let totalSaving = 0;

              for (const row of chainProgramData as any[]) {
                const programId = row.program_id;

                if (!programMap.has(programId)) {
                  programMap.set(programId, {
                    id: programId,
                    programType: row.program_type,
                    name: row.program_name,
                    programHeader: row.program_header,
                    programEntityType: row.participant_type,
                    programTerms: row.payment_term,
                    programDetails: [], // Will be populated below
                    compliances: [], // Will be populated if needed
                    progressDetails: [],
                    totalEnrollments: 0,
                    startDate: row.start_date,
                    endDate: row.end_date,
                    totalChains: 0,
                    compliantChains: 0,
                    enrolledChains: 0,
                    totalStores: 0,
                    enrolledStores: 0,
                    compliantStores: 0,
                    totalPurchaseVolume: 0,
                    totalEarnedRebate: 0,
                    chains: []
                  });
                }

                const program = programMap.get(programId);
                const chainId = row.chain_id;

                // Skip if this chain has already been counted
                if (!chainSet.has(chainId)) {
                  chainSet.add(chainId);

                  // Add the total_purchase_volume only once per chain
                  totalPurchaseVolume += Number(row.total_purchase_volume || 0);
                }

                totalSaving += Number(row.total_earned_rebate || 0);

                // Add chain data
                const chainData = {
                  chainId: chainId,
                  chainName: row.chain_name,
                  totalStores: parseInt(row.total_stores || "0"),
                  enrolledStores: parseInt(row.enrolled_stores || "0"),
                  compliantStores: parseInt(row.compliant_stores || "0"),
                  isChainCompliant: parseInt(row.compliant_stores || "0") > 0,
                  isChainEnrolled: parseInt(row.enrolled_stores || "0") > 0,
                  totalPurchaseVolume: parseFloat(
                    row.total_purchase_volume || "0"
                  ),
                  totalEarnedRebate: parseFloat(row.total_earned_rebate || "0"),
                  stores: [] // Simplified - no detailed store data
                };

                program.chains.push(chainData);

                // Update program metrics
                program.totalChains++;
                if (chainData.isChainEnrolled) program.enrolledChains++;
                if (chainData.isChainCompliant) program.compliantChains++;
                program.totalStores += chainData.totalStores;
                program.enrolledStores += chainData.enrolledStores;
                program.compliantStores += chainData.compliantStores;
                program.totalPurchaseVolume += chainData.totalPurchaseVolume;
                program.totalEarnedRebate += chainData.totalEarnedRebate;
              }

              // Fetch program details (all tiers) for each program
              const programsArray = Array.from(programMap.values());
              await Promise.all(
                programsArray.map(async (program: any) => {
                  // ProgramDetailRepository is not constructable, so use its static method directly
                  const programDetails =
                    await ProgramDetailRepository.findByProgramId(program.id);

                  program.programDetails = programDetails.map(
                    (detail: any) => ({
                      id: detail.id,
                      tier: detail.tier,
                      rebateType: detail.rebateType,
                      rebateAmount: detail.rebateAmount,
                      rebatePercentage: detail.rebatePercentage,
                      minQty: detail.minQty,
                      maxQty: detail.maxQty,
                      overview: detail.overview,
                      description: detail.description,
                      criteria: detail.criteria,
                      minSpend: detail.minSpend,
                      productsTags: detail.productsTags,
                      rebateCalculation: detail.rebateCalculation,
                      rebateCalculationType: detail.rebateCalculationType,
                      fixedRebateCategory: detail.fixedRebateCategory,
                      fixedRebateAmount: detail.fixedRebateAmount,
                      quantityType: detail.quantityType,
                      points: detail.points,
                      pointsPerSku: detail.pointsPerSku,
                      maxPoints: detail.maxPoints
                    })
                  );
                })
              );

              return {
                chainProgramOverview: programsArray,
                totalPurchaseVolume,
                totalSaving
              };
            }
          );

          // Cache the result
          if (useApiCaching) {
            const cacheKey = getCacheKey(
              "pgm",
              "chains",
              `${manufacturerId}`,
              `${distributorId}`,
              `${programTimeline || "all"}`,
              `${isSalesRepManager ? user?.associatedUserId || "all" : "all"}`
            );
            await redisClient.setEx(cacheKey, 300, JSON.stringify(result)); // 5 minute cache
          }

          return result;
        } catch (error) {
          console.error(`[PERF] getChainsByManufacturer failed:`, error);
          if (error instanceof Error) {
            throw ApiError.internal(error.message);
          } else {
            throw ApiError.internal(
              "Unknown error occurred while fetching chain information"
            );
          }
        }
      }
    );
  }

  public async getChainsPurchaseAndEarningsByManufacturer(
    manufacturerIds: number[],
    distributorId?: number,
    programTimeline?: string,
    chainId?: number
  ): Promise<any[]> {
    return newrelic.startSegment(
      "ProgramService.getChainsByManufacturer",
      true,
      async () => {
        try {
          const user = getCurrentUser();
          const isSalesRepManager = isDistributorSalesRepManager(user?.role);

          // Add caching for performance
          if (useApiCaching) {
            const cacheKey = getCacheKey(
              "pgm",
              "chainsByManufactuere",
              `${manufacturerIds?.join(",")}`,
              `${distributorId || "all"}`,
              `${programTimeline || "all"}`,
              `${chainId || "all"}`,
              `${isSalesRepManager ? user?.associatedUserId || "all" : "all"}`
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

          // Single optimized query to get everything we need
          const result = await newrelic.startSegment(
            "getChainsByManufacturer.query",
            true,
            async () => {
              return await sequelize.query(
                `WITH distributor_chains AS (
                  select chain_id from chain_aggregations where  ${distributorId ? `distributor_id = :distributorId` : "1 = 1"}
                  ${chainId ? ` AND chain_id = ${chainId}` : ""}
                ),
                chain_store_filtered AS (
                    SELECT DISTINCT cs.store_id, cs.chain_id
                    FROM chain_stores cs
                    WHERE cs.chain_id in (select chain_id from distributor_chains)
                ),
                filtered_stores AS (
                    SELECT DISTINCT s.id AS store_id, ur.parent_entity_id, ur.parent_entity_type, csf.chain_id
                    FROM stores s
                    JOIN user_roles ur ON s.id = ur.associated_user_id
                    JOIN chain_store_filtered as csf on csf.store_id = s.id
                    ${
                      isSalesRepManager
                        ? `
                    JOIN store_sales_reps ssr ON s.id = ssr.store_id
                    JOIN manager_sales_rep_mapping msrm ON ssr.sales_rep_id = msrm.sales_rep_id
                    `
                        : ""
                    }
                    WHERE ur.parent_entity_type = 'DISTRIBUTOR'
                      AND ur.associated_entity_type = 'STORE'
                    ${
                      isSalesRepManager
                        ? `
                    AND msrm.sales_manager_id = :salesManagerId
                    AND msrm.deleted_at IS NULL
                    AND ssr.deleted_at IS NULL
                    `
                        : distributorId
                          ? `AND ur.parent_entity_id = :distributorId`
                          : ""
                    }
                ),
                program_data AS (
                    SELECT DISTINCT p.id AS program_id, p.manufacturer_id, pd.id AS program_detail_id
                    FROM programs p
                    JOIN program_details pd ON p.id = pd.program_id
                    LEFT JOIN excluded_distributor_programs AS edp
                        ON edp.program_id = p.id
                        AND edp.program_detail_id = pd.id
                        AND edp.deleted_at IS NULL
                        AND edp.distributor_id = :distributorId
                    WHERE p.manufacturer_id IN (:manufacturerIds)
                    ${programTimeline === "Past" ? "AND p.end_date < NOW()" : ""}
                    ${programTimeline === "Future" ? "AND p.start_date > NOW()" : ""}
                    ${programTimeline === "Present" ? "AND p.start_date <= NOW() AND p.end_date >= NOW()" : ""}
                    AND p.participant_type = 'CHAIN'
                    AND pd.deleted_at IS NULL
                    AND p.deleted_at IS NULL
                    AND edp.id IS NULL
                ),
                program_participants_filtered AS (
                    SELECT DISTINCT pp.entity_id, pp.program_id, p.manufacturer_id
                    FROM program_participants pp
                    JOIN Programs as p on p.id = pp.program_id
                    WHERE pp.entity_type = 'CHAIN'
                    AND pp.entity_id in (select chain_id from chain_store_filtered)
                    AND pp.program_id in (select program_id from program_data)
                      AND pp.deleted_at IS NULL
                ),
                store_rebates AS (
                    SELECT
                        pc.entity_id,
                        SUM(pc.earned_rebate) AS earned_rebate,
                        ppf.manufacturer_id
                    FROM program_compliances pc
                    JOIN program_participants_filtered as ppf on ppf.program_id = pc.program_id
                    JOIN filtered_stores as fst on fst.store_id = pc.entity_id and fst.chain_id = ppf.entity_id
                    LEFT JOIN program_store_ineligibility AS psi on psi.program_id = pc.program_id AND pc.entity_id = psi.store_id AND psi.deleted_at IS NULL
                    WHERE pc.entity_type = 'STORE'
                    AND pc.status = 'active'
                    AND pc.deleted_at IS NULL
                    AND psi.id IS NULL
                    Group By pc.entity_id, ppf.manufacturer_id
                ),
                store_rebates_opportunity AS (
                    SELECT
                        seos.store_id,
                        SUM(COALESCE(seos.rebate_opportunity, 0)) AS rebate_opportunity,
                    seos.manufacturer_id
                    FROM store_earning_opportunity_summary seos
                    LEFT JOIN program_store_ineligibility AS psi on psi.program_id = seos.program_id AND seos.store_id = psi.store_id AND psi.deleted_at IS NULL
                    WHERE seos.store_id in (select store_id from filtered_stores)
                    AND seos.program_id in (select program_id from program_participants_filtered)
                    AND seos.highest_tier = true
                    AND psi.id IS NULL
                  Group By seos.store_id, seos.manufacturer_id
                ),
                ineligible_stores_with_manufacturer_id AS (
                  SELECT
                    pro.manufacturer_id,
                    ARRAY_AGG(psi.store_id) AS excluded_store_ids
                  FROM program_store_ineligibility psi
                  JOIN programs AS pro
                      ON pro.id = psi.program_id
                  JOIN user_roles ur
                      ON ur.associated_user_id = psi.store_id
                      AND ur.associated_entity_type = 'STORE'
                      AND ur.parent_entity_type = 'DISTRIBUTOR'
                  ${
                    isSalesRepManager
                      ? `
                  JOIN store_sales_reps ssr ON psi.store_id = ssr.store_id
                  JOIN manager_sales_rep_mapping msrm ON ssr.sales_rep_id = msrm.sales_rep_id
                  `
                      : ""
                  }
                  JOIN chain_stores cs
                      ON cs.store_id = psi.store_id AND cs.chain_id in (select chain_id from distributor_chains)
                  WHERE pro.id IN (SELECT program_id FROM program_data)
                    AND psi.deleted_at is null
                    ${
                      isSalesRepManager
                        ? `
                    AND msrm.sales_manager_id = :salesManagerId
                    AND msrm.deleted_at IS NULL
                    AND ssr.deleted_at IS NULL
                    `
                        : `AND ur.parent_entity_id = :distributorId`
                    }
                  GROUP BY pro.manufacturer_id, psi.store_id
                  HAVING COUNT(DISTINCT pro.id) = (
                    SELECT COUNT(DISTINCT pd.program_id)
                    FROM program_data pd
                    WHERE pd.manufacturer_id = pro.manufacturer_id
                    )
                ),
                store_programs AS (
                    SELECT
                        fs.store_id,
                        css.manufacturer_id,
                        COALESCE(css.total_purchase, 0) AS total_purchase_volume,
                        COALESCE(sr.earned_rebate, 0) AS total_earned_rebate,
                        COALESCE(sro.rebate_opportunity, 0) AS total_rebate_opportunity
                    FROM filtered_stores fs
                    JOIN chain_store_filtered csf ON fs.store_id = csf.store_id
                    JOIN stores s ON fs.store_id = s.id
                    LEFT JOIN combined_store_summary css
                        ON css.store_id = s.id
                      AND css.manufacturer_id IN (:manufacturerIds)
                      AND css.transaction_year = EXTRACT(YEAR FROM NOW())
                    LEFT JOIN store_rebates sr ON sr.entity_id = s.id and css.manufacturer_id = sr.manufacturer_id
                    LEFT JOIN store_rebates_opportunity sro on sro.store_id = s.id and sro.manufacturer_id = sr.manufacturer_id
                    LEFT JOIN ineligible_stores_with_manufacturer_id iswm on s.id = ANY(iswm.excluded_store_ids) and iswm.manufacturer_id = css.manufacturer_id
                    Where iswm.manufacturer_id IS NULL
                )
                SELECT
                    manufacturer_id,
                    SUM(total_purchase_volume) AS total_purchase_volume,
                    SUM(total_earned_rebate) AS total_earned_rebate,
                    SUM(total_rebate_opportunity) AS total_rebate_opportunity
                FROM store_programs
                GROUP BY manufacturer_id
              `,
                {
                  replacements: {
                    manufacturerIds: manufacturerIds,
                    distributorId,
                    salesManagerId: isSalesRepManager
                      ? user?.associatedUserId
                      : undefined,
                    programTimeline: programTimeline || "all"
                  },
                  type: QueryTypes.SELECT
                }
              );
            }
          );

          // Cache the result
          if (useApiCaching) {
            const cacheKey = getCacheKey(
              "pgm",
              "chains",
              `${manufacturerIds?.join(",")}`,
              `${distributorId || "all"}`,
              `${programTimeline || "all"}`,
              `${chainId || "all"}`,
              `${isSalesRepManager ? user?.associatedUserId || "all" : "all"}`
            );
            await redisClient.setEx(cacheKey, 300, JSON.stringify(result)); // 5 minute cache
          }

          return result;
        } catch (error) {
          console.error(`[PERF] getChainsByManufacturer failed:`, error);
          if (error instanceof Error) {
            throw ApiError.internal(error.message);
          } else {
            throw ApiError.internal(
              "Unknown error occurred while fetching chain information"
            );
          }
        }
      }
    );
  }

  /**
   * Gets enrolled chains for a specific manufacturer and distributor
   * Uses the chain_program_aggregations materialized view for optimal performance
   * @param manufacturerId - The manufacturer ID
   * @param distributorId - The distributor ID
   * @param programTimeline - Optional timeline filter
   * @returns Promise<EnrolledChain[]>
   */
  private async getEnrolledChainsForManufacturer(
    manufacturerId: number,
    distributorId: number,
    programTimeline?: string
  ): Promise<any[]> {
    return newrelic.startSegment(
      "ProgramService.getEnrolledChainsForManufacturer",
      true,
      async () => {
        try {
          const user = getCurrentUser();
          const isSalesRepManager = isDistributorSalesRepManager(user?.role);

          // Use the chain_program_aggregations materialized view for optimal performance
          const timelineFilter =
            programTimeline === "Past"
              ? "AND p.end_date < NOW()"
              : programTimeline === "Future"
                ? "AND p.start_date > NOW()"
                : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

          const enrolledChainsQuery = `
            SELECT DISTINCT
              cpa.chain_id,
              cpa.chain_name,
              cpa.total_stores,
              cpa.enrolled_stores,
              cpa.compliant_stores,
              cpa.total_purchase_volume,
              cpa.total_earned_rebate,
              cpa.compliance_percentage,
              cpa.is_chain_enrolled
            FROM chain_program_aggregations cpa
            JOIN programs p ON p.id = cpa.program_id
            JOIN user_roles ur ON ur.associated_user_id = cpa.chain_id
            ${
              isSalesRepManager
                ? `
            JOIN chain_stores cs ON cs.chain_id = cpa.chain_id
            JOIN store_sales_reps ssr ON cs.store_id = ssr.store_id
            JOIN manager_sales_rep_mapping msrm ON ssr.sales_rep_id = msrm.sales_rep_id
            `
                : ""
            }
            WHERE cpa.manufacturer_id = :manufacturerId
              ${
                isSalesRepManager
                  ? `
              AND msrm.sales_manager_id = :salesManagerId
              AND msrm.deleted_at IS NULL
              AND ssr.deleted_at IS NULL
              `
                  : `AND ur.parent_entity_id = :distributorId`
              }
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND ur.associated_entity_type = 'CHAIN'
              AND cpa.is_chain_enrolled = true
              AND p.deleted_at IS NULL
              ${timelineFilter}
            ORDER BY cpa.chain_name ASC
          `;

          const enrolledChains = await sequelize.query(enrolledChainsQuery, {
            replacements: {
              manufacturerId,
              ...(isSalesRepManager
                ? { salesManagerId: user?.associatedUserId }
                : { distributorId })
            },
            type: QueryTypes.SELECT
          });

          // Transform to match EnrolledChain interface
          return enrolledChains.map((chain: any) => ({
            chainId: chain.chain_id,
            chainName: chain.chain_name,
            totalStores: parseInt(chain.total_stores || "0"),
            enrolledStores: parseInt(chain.enrolled_stores || "0"),
            compliantStores: parseInt(chain.compliant_stores || "0"),
            totalPurchaseVolume: parseFloat(chain.total_purchase_volume || "0"),
            totalEarnedRebate: parseFloat(chain.total_earned_rebate || "0"),
            compliancePercentage: parseFloat(
              chain.compliance_percentage || "0"
            ),
            stores: [] // Will be populated if needed
          }));
        } catch (error) {
          console.error("[ERROR] getEnrolledChainsForManufacturer:", error);
          return [];
        }
      }
    );
  }

  /**
   * Gets unenrolled chains for a specific manufacturer and distributor
   * Uses the chain_program_aggregations materialized view for optimal performance
   * @param manufacturerId - The manufacturer ID
   * @param distributorId - The distributor ID
   * @param programTimeline - Optional timeline filter
   * @returns Promise<UnenrolledChain[]>
   */
  private async getUnenrolledChainsForManufacturer(
    manufacturerId: number,
    distributorId: number,
    programTimeline?: string
  ): Promise<any[]> {
    return newrelic.startSegment(
      "ProgramService.getUnenrolledChainsForManufacturer",
      true,
      async () => {
        try {
          // Use the chain_program_aggregations materialized view for optimal performance
          const timelineFilter =
            programTimeline === "Past"
              ? "AND p.end_date < NOW()"
              : programTimeline === "Future"
                ? "AND p.start_date > NOW()"
                : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

          const unenrolledChainsQuery = `
            SELECT DISTINCT
              cpa.chain_id,
              cpa.chain_name,
              cpa.total_stores,
              cpa.total_purchase_volume
            FROM chain_program_aggregations cpa
            JOIN programs p ON p.id = cpa.program_id
            JOIN user_roles ur ON ur.associated_user_id = cpa.chain_id
            WHERE cpa.manufacturer_id = :manufacturerId
              AND ur.parent_entity_id = :distributorId
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND ur.associated_entity_type = 'CHAIN'
              AND cpa.is_chain_enrolled = false
              AND p.deleted_at IS NULL
              ${timelineFilter}
            ORDER BY cpa.chain_name ASC
          `;

          const unenrolledChains = await sequelize.query(
            unenrolledChainsQuery,
            {
              replacements: {
                manufacturerId,
                distributorId
              },
              type: QueryTypes.SELECT
            }
          );

          // Transform to match UnenrolledChain interface
          return unenrolledChains.map((chain: any) => ({
            chainId: chain.chain_id,
            chainName: chain.chain_name,
            totalStores: parseInt(chain.total_stores || "0"),
            potentialEarnings:
              parseFloat(chain.total_purchase_volume || "0") * 0.05 // 5% potential earnings estimate
          }));
        } catch (error) {
          console.error("[ERROR] getUnenrolledChainsForManufacturer:", error);
          return [];
        }
      }
    );
  }

  /**
   * Calculates total purchase volume for stores that belong to chains under a distributor
   * Uses the chain_program_aggregations materialized view for optimal performance
   * @param manufacturerId - The manufacturer ID
   * @param distributorId - The distributor ID
   * @param programTimeline - Optional timeline filter
   * @returns Promise<number> - Total purchase volume for chain stores only
   */
  private async getChainStoresPurchaseVolume(
    manufacturerId: number,
    distributorId: number,
    programTimeline?: string
  ): Promise<number> {
    return newrelic.startSegment(
      "ProgramService.getChainStoresPurchaseVolume",
      true,
      async () => {
        try {
          // Use the chain_program_aggregations materialized view for optimal performance
          const timelineFilter =
            programTimeline === "Past"
              ? "AND p.end_date < NOW()"
              : programTimeline === "Future"
                ? "AND p.start_date > NOW()"
                : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

          const purchaseVolumeQuery = `
            SELECT COALESCE(SUM(cpa.total_purchase_volume), 0) as total_purchase_volume
            FROM chain_program_aggregations cpa
            JOIN programs p ON p.id = cpa.program_id
            JOIN user_roles ur ON ur.associated_user_id = cpa.chain_id
            WHERE cpa.manufacturer_id = :manufacturerId
              AND ur.parent_entity_id = :distributorId
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND ur.associated_entity_type = 'CHAIN'
              AND p.deleted_at IS NULL
              ${timelineFilter}
          `;

          const result = await sequelize.query(purchaseVolumeQuery, {
            replacements: {
              manufacturerId,
              distributorId
            },
            type: QueryTypes.SELECT
          });

          const totalPurchaseVolume = parseFloat(
            (result[0] as any)?.total_purchase_volume || "0"
          );

          return Math.round(totalPurchaseVolume);
        } catch (error) {
          console.error("[ERROR] getChainStoresPurchaseVolume:", error);
          return 0;
        }
      }
    );
  }

  /**
   * Calculates total savings for stores that belong to chains under a distributor
   * Uses the chain_program_aggregations materialized view for optimal performance
   * @param manufacturerId - The manufacturer ID
   * @param distributorId - The distributor ID
   * @param programTimeline - Optional timeline filter
   * @returns Promise<number> - Total savings for chain stores only
   */
  private async getChainStoresSavings(
    manufacturerId: number,
    distributorId: number,
    programTimeline?: string
  ): Promise<number> {
    return newrelic.startSegment(
      "ProgramService.getChainStoresSavings",
      true,
      async () => {
        try {
          // Use the chain_program_aggregations materialized view for optimal performance
          const timelineFilter =
            programTimeline === "Past"
              ? "AND p.end_date < NOW()"
              : programTimeline === "Future"
                ? "AND p.start_date > NOW()"
                : "AND p.start_date <= NOW() AND p.end_date >= NOW()";

          const savingsQuery = `
            SELECT COALESCE(SUM(cpa.total_earned_rebate), 0) as total_savings
            FROM chain_program_aggregations cpa
            JOIN programs p ON p.id = cpa.program_id
            JOIN user_roles ur ON ur.associated_user_id = cpa.chain_id
            WHERE cpa.manufacturer_id = :manufacturerId
              AND ur.parent_entity_id = :distributorId
              AND ur.parent_entity_type = 'DISTRIBUTOR'
              AND ur.associated_entity_type = 'CHAIN'
              AND p.deleted_at IS NULL
              ${timelineFilter}
          `;

          const result = await sequelize.query(savingsQuery, {
            replacements: {
              manufacturerId,
              distributorId
            },
            type: QueryTypes.SELECT
          });

          const totalSavings = parseFloat(
            (result[0] as any)?.total_savings || "0"
          );

          return Math.round(totalSavings);
        } catch (error) {
          console.error("[ERROR] getChainStoresSavings:", error);
          return 0;
        }
      }
    );
  }

  /**
   * Enrolls a store in multiple programs (DATABASE ONLY - NO DOWNSTREAM OPERATIONS)
   *
   * ⚠️ IMPORTANT: This method ONLY updates the database. It does NOT:
   * - Refresh materialized views
   * - Invalidate caches
   * - Trigger downstream updates
   *
   * Callers MUST enqueue a STORE_PROGRAM_ENROLLMENT_CHANGED worker job after
   * calling this method to ensure downstream systems are updated.
   *
   * @param storeId - The ID of the store to enroll
   * @param manufacturerId - The ID of the manufacturer
   * @param programIds - Array of program IDs to enroll the store in
   * @returns Promise with enrollment results (enrolledCount, alreadyEnrolledCount, errorCount)
   *
   * @example
   * // Correct usage:
   * const result = await ProgramService.enrollStoreInPrograms(storeId, mfgId, programIds);
   * if (result.enrolledCount > 0) {
   *   await enqueueStoreProgramEnrollmentChanged(storeId, programIds, 'enroll', userId, mfgId);
   * }
   */
  public async enrollStoreInPrograms(
    storeId: number,
    manufacturerId: number,
    programIds: number[]
  ): Promise<StoreEnrollmentResult> {
    let enrolledCount = 0;
    let alreadyEnrolledCount = 0;
    let errorCount = 0;

    for (const programId of programIds) {
      try {
        // Check if store is already enrolled in this program
        const existingEnrollment = await ProgramParticipant.findOne({
          where: {
            program_id: programId,
            entity_id: storeId,
            entity_type: ENTITY_TYPE.STORE,
            deleted_at: null
          }
        });

        if (existingEnrollment) {
          alreadyEnrolledCount++;
          continue;
        }

        // Create new enrollment
        await ProgramParticipant.create({
          programId: programId,
          entityId: storeId,
          entityType: ENTITY_TYPE.STORE
        });

        enrolledCount++;
      } catch (error: any) {
        errorCount++;
        console.error(
          `Failed to enroll in program ${programId}:`,
          error.message
        );
      }
    }

    const message = `Store successfully enrolled in ${enrolledCount} programs`;

    return {
      success: true,
      message,
      enrolledCount,
      alreadyEnrolledCount,
      errorCount
    };
  }

  /**
   * Unenrolls a store from specific programs (DATABASE ONLY - NO DOWNSTREAM OPERATIONS)
   *
   * ⚠️ IMPORTANT: This method ONLY updates the database. It does NOT:
   * - Refresh materialized views
   * - Invalidate caches
   * - Trigger downstream updates
   *
   * Callers MUST enqueue a STORE_PROGRAM_ENROLLMENT_CHANGED worker job after
   * calling this method to ensure downstream systems are updated.
   *
   * @param storeId - The ID of the store to unenroll
   * @param manufacturerId - The ID of the manufacturer
   * @param programIds - Array of program IDs to unenroll the store from
   * @returns Promise with unenrollment results (enrolledCount = unenrolledCount, alreadyEnrolledCount = notEnrolledCount, errorCount)
   *
   * @example
   * // Correct usage:
   * const result = await ProgramService.unenrollStoreFromPrograms(storeId, mfgId, programIds);
   * if (result.enrolledCount > 0) {
   *   await enqueueStoreProgramEnrollmentChanged(storeId, programIds, 'unenroll', userId, mfgId);
   * }
   */
  public async unenrollStoreFromPrograms(
    storeId: number,
    manufacturerId: number,
    programIds: number[]
  ): Promise<StoreEnrollmentResult> {
    try {
      if (programIds.length === 0) {
        return {
          success: true,
          message: "No program IDs provided for unenrollment - no action taken",
          enrolledCount: 0, // For unenrollment, this represents unenrolledCount
          alreadyEnrolledCount: 0, // For unenrollment, this represents notEnrolledCount
          errorCount: 0
        };
      }

      let unenrolledCount = 0;
      let notEnrolledCount = 0;
      let errorCount = 0;

      for (const programId of programIds) {
        try {
          // Find existing enrollment
          const existingEnrollment = await ProgramParticipant.findOne({
            where: {
              program_id: programId,
              entity_id: storeId,
              entity_type: ENTITY_TYPE.STORE,
              deleted_at: null
            }
          });

          if (existingEnrollment) {
            // Delete the enrollment (hard delete - force: true bypasses paranoid mode)
            await existingEnrollment.destroy({ force: true });
            unenrolledCount++;
          } else {
            // Store was not enrolled in this program
            notEnrolledCount++;
          }
        } catch (error: any) {
          errorCount++;
          console.error(
            `Failed to unenroll from program ${programId}:`,
            error.message
          );
        }
      }

      const message = `Store successfully unenrolled from ${unenrolledCount} programs`;

      return {
        success: true,
        message,
        enrolledCount: unenrolledCount, // Reusing field name for consistency
        alreadyEnrolledCount: notEnrolledCount, // Reusing field name for consistency
        errorCount
      };
    } catch (error: any) {
      console.error("Error in unenrollStoreFromPrograms:", error);
      throw error;
    }
  }

  /**
   * Handles store enrollment/unenrollment in manufacturer programs
   * @param params - Object containing enrollment parameters
   * @returns Promise with enrollment results
   */
  public async handleStoreEnrollment(
    params: StoreEnrollmentParams
  ): Promise<StoreEnrollmentResult> {
    const { action, storeId, manufacturerId, programIds } = params;

    try {
      // Validate required parameters
      validateEnrollmentParameters(action, storeId, manufacturerId, programIds);

      // Log the operation for audit purposes
      // console.log(
      //   `Store enrollment operation: ${action} for store ${storeId}, manufacturer ${manufacturerId}, programs: ${programIds?.join(", ") || "none"}`
      // );

      // Route to appropriate enrollment method based on action
      const enrollmentMethod = this.getEnrollmentMethod(action);
      const result = await enrollmentMethod(
        storeId,
        manufacturerId,
        programIds || []
      );

      // Enqueue worker job for downstream updates (MV refresh, cache invalidation)
      // Only enqueue if there were actual changes
      if (result.enrolledCount > 0) {
        await this.enqueueEnrollmentChangedEvent({
          storeId,
          programIds: programIds || [],
          action,
          userId: (params as any).userId || 0,
          manufacturerId,
          reason: "Manual enrollment via API"
        });
      }

      // Log the result
      // console.log(
      //   `Store enrollment result: ${result.message}, enrolled: ${result.enrolledCount}, already enrolled: ${result.alreadyEnrolledCount}, errors: ${result.errorCount}`
      // );

      return result;
    } catch (error) {
      console.error("Error in handleStoreEnrollment:", error);
      throw error;
    }
  }

  /**
   * Enqueues STORE_PROGRAM_ENROLLMENT_CHANGED event to worker
   * @private
   */
  private async enqueueEnrollmentChangedEvent(params: {
    storeId: number;
    programIds: number[];
    action: "enroll" | "unenroll";
    userId: number;
    manufacturerId: number;
    reason?: string;
  }): Promise<void> {
    try {
      const { enqueueJob } = await import("../utils/sqsClient");

      await enqueueJob({
        jobType: "STORE_PROGRAM_ENROLLMENT_CHANGED",
        payload: params,
        messageGroupId: `enrollment-store-${params.storeId}`
      });

      logger.info("Enrollment changed event enqueued", {
        storeId: params.storeId,
        action: params.action,
        programCount: params.programIds.length
      });
    } catch (error) {
      // Log but don't fail - DB already updated, downstream is eventual consistency
      logger.error("Failed to enqueue enrollment changed event", {
        storeId: params.storeId,
        error
      });
    }
  }

  /**
   * Returns the appropriate enrollment method based on action
   * @param action - The enrollment action
   * @returns The enrollment method to call
   */
  private getEnrollmentMethod(action: "enroll" | "unenroll") {
    const enrollmentMethods = {
      enroll: this.enrollStoreInPrograms.bind(this),
      unenroll: this.unenrollStoreFromPrograms.bind(this)
    };

    return enrollmentMethods[action];
  }

  /**
   * Get SPIFF program details optimized for v2 API
   * This method fetches SPIFF program details with earnings using optimized queries
   * @param params - Parameters for fetching SPIFF program details
   * @returns Promise<SpiffProgramDetailsResponse> - Optimized SPIFF program details
   */
  public async getSpiffProgramDetailsOptimized({
    distributorId,
    salesRepId,
    manufacturerId,
    programTimeline,
    getInternalInitiative,
    excludeChainStores,
    role,
    warehouseId
  }: {
    distributorId: number;
    salesRepId?: number;
    manufacturerId: number;
    programTimeline?: string;
    getInternalInitiative?: boolean;
    excludeChainStores?: boolean;
    role?: string;
    warehouseId?: number;
  }): Promise<any> {
    return newrelic.startSegment(
      "ProgramService.getSpiffProgramDetailsOptimized",
      true,
      async () => {
        try {
          console.log(
            `[DEBUG] Starting SPIFF program details fetch for distributor: ${distributorId}, manufacturer: ${manufacturerId}`
          );

          // Fetch SPIFF program details with earnings using optimized repository method
          const spiffProgramDetails =
            await ProgramRepository.getSpiffProgramDetailsWithEarnings({
              distributorId,
              manufacturerId,
              salesRepId,
              programTimeline,
              getInternalInitiative,
              excludeChainStores,
              role,
              warehouseId
            });

          // Transform the raw data to the required response format
          const transformedResponse =
            await this.transformSpiffProgramDetailsToResponseFormat(
              spiffProgramDetails,
              manufacturerId,
              distributorId,
              ENTITY_TYPE.SALES_REP // SPIFF programs are always for SALES_REP
            );

          console.log(
            `[DEBUG] Transformed response with ${transformedResponse.spiffProgramDetails?.length || 0} programs`
          );

          const programIds = transformedResponse.manufacturers
            .flatMap((m: any) => m.program_overview)
            .filter((program: any) =>
              program.programDetails.some(
                (detail: any) => detail.criteria === "VOID_FILL"
              )
            )
            .map((program: any) => program.id);

          if (programIds.length === 0) {
            return transformedResponse;
          }

          //2. fetch the store ids based on the user role
          let storeIds = [];
          let salesRepIds = [];
          switch (role) {
            case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
            case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
              // If warehouseId is provided, filter sales reps by warehouse
              if (warehouseId) {
                salesRepIds =
                  await DistributorRepository.getSalesRepsByWarehouseId(
                    distributorId,
                    warehouseId
                  );
              } else {
                salesRepIds =
                  await DistributorRepository.getSalesRepIdsByDistributor([
                    distributorId
                  ]);
              }
              storeIds = await StoreRepository.getStoreIdsBySalesRepId(
                undefined,
                excludeChainStores,
                undefined,
                salesRepIds
              );
              break;
            case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
              salesRepIds =
                await DistributorRepository.getSalesRepIdsBySalesRepManagerId({
                  salesRepManagerId: salesRepId
                });
              storeIds = await StoreRepository.getStoresBySalesRepManagerId({
                salesRepManagerId: salesRepId
              });

              break;
            case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
              salesRepIds = [salesRepId as number];
              storeIds = await StoreRepository.getStoreIdsBySalesRepId(
                undefined,
                excludeChainStores,
                undefined,
                [salesRepId as number]
              );
              break;
          }

          // Normalize storeIds: getStoresBySalesRepManagerId returns Store instances with 'id',
          // while getStoreIdsBySalesRepId returns objects with 'storeId'
          const normalizedStoreIds = storeIds.map((s: any) =>
            Number(s.storeId ?? s.id)
          );
          const totalVoidsRemaining =
            await ProgramRepository.getTotalVoidsRemaining({
              programIds,
              storeIds: normalizedStoreIds
            });

          const salesRepEarningsResult =
            await ProgramRepository.getSalesRepEarningsWithCompliance({
              distributorId,
              programIds,
              salesRepIds: salesRepIds
            });

          // Create lookup maps for void fill data
          const totalVoidsMap = new Map();
          totalVoidsRemaining.forEach((item: any) => {
            totalVoidsMap.set(item.programId, item.remainingTarget);
          });

          const voidFilledMap = new Map();
          salesRepEarningsResult.forEach((item: any) => {
            voidFilledMap.set(item.programId, item.totalVoids);
          });

          // Update transformedResponse with void fill data
          transformedResponse.manufacturers.forEach((manufacturer: any) => {
            manufacturer.program_overview.forEach((program: any) => {
              program.programDetails.forEach((detail: any) => {
                if (detail.criteria === "VOID_FILL" && detail.program_id) {
                  const programId = detail.program_id;

                  // Update total_void from totalVoidsRemaining
                  const remainingTarget = totalVoidsMap.get(programId);
                  if (remainingTarget !== undefined) {
                    detail.total_void = remainingTarget;
                  }

                  // Update void_filled from salesRepEarningsResult
                  const totalVoids = voidFilledMap.get(programId);
                  if (totalVoids !== undefined) {
                    detail.void_filled = totalVoids;
                  }
                }
              });
            });
          });

          return transformedResponse;
        } catch (error: any) {
          console.error("Error in getSpiffProgramDetailsOptimized:", error);

          // Add error attributes for monitoring
          newrelic.addCustomAttribute("spiff_v2_service_error", error.message);
          newrelic.addCustomAttribute("spiff_v2_distributorId", distributorId);
          newrelic.addCustomAttribute(
            "spiff_v2_manufacturerId",
            manufacturerId
          );
          newrelic.noticeError(error);

          throw error;
        }
      }
    );
  }

  /**
   * Transform database-aggregated SPIFF program details to the required response format
   * @param aggregatedData - Database-aggregated program details from repository
   * @param manufacturerId - Manufacturer ID for additional data
   * @param distributorId - Distributor ID for overview override
   * @param participantType - Participant type (default: SALES_REP)
   * @returns Transformed response object
   */
  private async transformSpiffProgramDetailsToResponseFormat(
    aggregatedData: any[],
    manufacturerId: number,
    distributorId: number,
    participantType: string = ENTITY_TYPE.SALES_REP
  ): Promise<any> {
    try {
      console.log(
        `[DEBUG] Transforming ${aggregatedData.length} aggregated manufacturer records`
      );

      // Calculate total rep earnings across all manufacturers
      const totalRepEarnings = aggregatedData.reduce((total, manufacturer) => {
        return total + (manufacturer.total_saving || 0);
      }, 0);

      // Transform the database-aggregated data to the required response format
      const manufacturers = [];
      for (const manufacturer of aggregatedData) {
        // Transform program_overview to add total_void, void_filled, and override overview
        const programOverview = [];
        for (const program of manufacturer.program_overview || []) {
          const programDetails = [];
          for (const detail of program.programDetails || []) {
            let newDetailOverview = detail.overview;

            // If the participant type is a sales rep, override the detail overview
            if (participantType === ENTITY_TYPE.SALES_REP) {
              try {
                const adjustedDetail =
                  (await overrideProgramDetailOverviewText({
                    rebateType: detail.rebate_type || detail.rebateType,
                    criteria: detail.criteria,
                    rebateAmount: Number(
                      detail.rebate_amount || detail.rebateAmount || 0
                    ),
                    rebatePercentage: Number(
                      detail.rebate_percentage || detail.rebatePercentage || 0
                    ),
                    distributorId: distributorId,
                    overview: detail.overview
                  })) || detail.overview;
                newDetailOverview =
                  adjustedDetail?.newOverview || detail.overview;
                detail.rebateAmount =
                  adjustedDetail?.newAmount || Number(detail.rebateAmount);
                detail.rebate_amount =
                  adjustedDetail?.newAmount || Number(detail.rebateAmount);
              } catch (error) {
                newDetailOverview = detail.overview;
                detail.rebateAmount = Number(detail.rebateAmount);
                detail.rebate_amount = Number(detail.rebateAmount);
              }
            }

            programDetails.push({
              ...detail,
              overview: newDetailOverview,
              total_void: null,
              void_filled: null
            });
          }

          // add the program to the program overview array
          programOverview.push({
            ...program,
            programDetails
          });
        }

        // add the manufacturer to the manufacturers array
        manufacturers.push({
          manufacturerId: manufacturer.manufacturer_id,
          manufacturerName: manufacturer.manufacturer_name,
          manufacturerLogo: manufacturer.manufacturer_logo,
          manufacturerAuthorized: manufacturer.manufacturer_authorized,
          totalPurchaseVolume: manufacturer.total_purchase_volume || 0,
          totalSaving: manufacturer.total_saving || 0,
          programPaymentTerm: manufacturer.program_payment_term || "N/A",
          program_overview: programOverview
        });
      }

      console.log(
        `[DEBUG] Transformed to ${manufacturers.length} manufacturer records with total earnings: ${totalRepEarnings}`
      );

      return {
        manufacturers,
        totalRepEarnings,
        metadata: {
          totalPrograms: aggregatedData.reduce((total, manufacturer) => {
            return total + (manufacturer.program_overview?.length || 0);
          }, 0),
          totalManufacturers: manufacturers.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error("Error transforming SPIFF program details:", error);
      newrelic.addCustomAttribute("spiff_v2_transform_error", error.message);
      newrelic.noticeError(error);
      throw error;
    }
  }

  /**
   * Retrieves the sales manager programs for a specific distributor.
   * @param {Object} params - The parameters for the function.
   * @param {number} params.distributorId - The ID of the distributor.
   * @param {number[]} params.salesManagerIds - The IDs of the sales managers.
   * @param {string} params.programTimeline - The timeline of the program.
   * @param {boolean} params.isInternal - Whether the program is internal.
   */
  public async getDistributorSalesManagerPrograms({
    distributorId,
    salesManagerIds,
    programTimeline,
    isInternal,
    manufacturerId
  }: {
    distributorId: number;
    salesManagerIds: number[];
    programTimeline?: string;
    isInternal?: boolean;
    manufacturerId?: string;
  }) {
    // get the excluded program ids
    const excludedProgramIds =
      await ProgramRepository.getExcludedProgramIds(distributorId);

    // get the authorized manufacturers ids
    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturersIds(distributorId);
    const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );

    const manufacturerIds = manufacturerId
      ? authorizedManufacturerIds.filter((id) => id === Number(manufacturerId))
      : authorizedManufacturerIds;

    return await ProgramRepository.getDistributorSalesManagerProgram({
      distributorId,
      authorizedManufacturerIds: manufacturerIds,
      excludedProgramIds,
      programTimeline,
      isInternal,
      salesManagerIds
    });
  }

  public async getVoidFillProgramsSummary({
    distributorId,
    userId,
    salesRepIds,
    role,
    excludeChainStores,
    warehouseId,
    programId,
    warehouseIdFilter,
    isDownload,
    manufacturerId,
    programTimeline
  }: {
    distributorId: number;
    userId: number;
    salesRepIds?: number[];
    role?: string;
    excludeChainStores?: boolean;
    warehouseId?: number;
    programId?: number;
    isDownload?: boolean;
    manufacturerId?: number;
    warehouseIdFilter?: boolean | undefined;
    programTimeline?: string;
  }) {
    console.log("-------------warehouseidfilter", warehouseIdFilter);
    // Filter sales reps by warehouse if warehouseIdFilter is enabled
    if (warehouseIdFilter && warehouseIdFilter === true) {
      if (isDistributorGeneralManager(role)) {
        const assignedWarehouseIds =
          (await DistributorRepository.getWarehouseIdsByGeneralManager({
            generalManagerUserId: Number(userId),
            fetchWarehouseName: false
          })) as number[];
        return {
          salesReps: assignedWarehouseIds
        };
      } else {
        const salesRepsByWarehouse =
          await DistributorRepository.getSalesRepsByWarehouseId(
            distributorId,
            warehouseId as number
          );

        return {
          salesReps: salesRepsByWarehouse
        };
      }
    }

    //get warehouse details from distributor
    const distributorWarehouses = isDistributorGeneralManager(role)
      ? await DistributorRepository.getWarehouseIdsByGeneralManager({
          generalManagerUserId: Number(userId),
          fetchWarehouseName: false
        })
      : await DistributorRepository.getDistributorWarehouses(
          distributorId,
          warehouseId ? [warehouseId] : undefined
        );

    //1. get authorized manufacturers details- id, name, logo
    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturersIds(
        distributorId,
        undefined,
        true
      );

    // Filter authManufacturerIds based on manufacturerId if provided
    let authManufacturerIds: number[];
    if (manufacturerId) {
      // If manufacturerId is provided, use only that manufacturer (if authorized)
      const isAuthorized = authorizedManufacturers.some(
        (am: any) => Number(am.manufacturerId) === manufacturerId
      );
      authManufacturerIds = isAuthorized ? [manufacturerId] : [];
    } else {
      // Otherwise, use all authorized manufacturers
      authManufacturerIds = authorizedManufacturers.map((am) =>
        Number(am.manufacturerId)
      );
    }

    //2. fetch the store ids based on the user role
    //we already have sales rep ids from request body so fetching store ids by sales rep ids for distributor admin and sales rep
    let storeIds = [];
    switch (role) {
      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
        // if (salesRepIds?.length === 0) {
        //   salesRepIds = await DistributorRepository.getSalesRepIdsByDistributor(
        //     [distributorId]
        //   );
        // }
        storeIds = await StoreRepository.getStoreIdsBySalesRepId(
          undefined,
          false,
          warehouseId ? [warehouseId] : undefined,
          salesRepIds
        );

        break;
      case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
        // if (salesRepIds?.length === 0) {
        //   salesRepIds =
        //     await DistributorRepository.getSalesRepIdsBySalesRepManagerId({
        //       salesRepManagerId: userId
        //     });
        // }
        storeIds = await StoreRepository.getStoresBySalesRepManagerId({
          salesRepManagerId: userId,
          salesRepIds,
          warehouseId
        });
        break;
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
        storeIds = await StoreRepository.getStoreIdsBySalesRepId(
          undefined,
          false,
          warehouseId ? [warehouseId] : undefined,
          salesRepIds
        );
        break;
    }

    //3. fetch the void fill programs type for the authorized manufacturers
    const voidFillPrograms = await ProgramRepository.getVoidFillPrograms(
      distributorId,
      authManufacturerIds,
      programId,
      programTimeline
    );

    const programIds = Object.values(voidFillPrograms)
      .flat()
      .map((p: any) => p.programId);

    if (isDownload) {
      const res = await this.getVoidFillSummaryForCSV({
        distributorId,
        userId,
        salesRepIds,
        role,
        programIds,
        storeIds: storeIds.map((s: any) => Number(s.storeId))
      });
      return res;
    }

    //4. fetch the total voids remaining for each of the programs
    // Normalize storeIds: getStoresBySalesRepManagerId returns Store instances with 'id',
    // while getStoreIdsBySalesRepId returns objects with 'storeId'
    const normalizedStoreIds = (storeIds || []).map((s: any) =>
      Number(s.storeId ?? s.id)
    );

    // If no stores found, return empty response with same structure
    if (normalizedStoreIds.length === 0) {
      // Build empty response structure
      const emptyResponse = [];
      for (const [manufacturerId, programs] of Object.entries(
        voidFillPrograms
      )) {
        const manufacturerDetails = authorizedManufacturers.find(
          (am: any) => Number(am.manufacturerId) === Number(manufacturerId)
        );

        emptyResponse.push({
          manId: Number(manufacturerId),
          manName: (manufacturerDetails as any)?.manufacturerName || "Unknown",
          manLogo: (manufacturerDetails as any)?.manufacturerLogo || null,
          earnings: 0,
          voidsFilled: 0,
          totalVoids: 0,
          earningOpportunity: 0,
          voidFilledPercentage: "0.00"
        });
      }

      // Format warehouse data
      let warehouseData: any[] = [];
      if (!warehouseId) {
        warehouseData = distributorWarehouses.map((warehouse: any) => ({
          warehouseId: warehouse?.id,
          warehouseName: warehouse?.name
        }));
      }

      // Collect all programs from voidFillPrograms
      const allPrograms = Object.values(voidFillPrograms).flat();

      return {
        voidFillDetails: emptyResponse,
        warehouseIds: warehouseData,
        programs: allPrograms
      };
    }

    const totalVoidsRemaining = await ProgramRepository.getTotalVoidsRemaining({
      programIds,
      storeIds: normalizedStoreIds
    });

    //5. fetch the total earnings, opportunity savings for each of the void fill program
    // Build program date ranges from voidFillPrograms
    const programDateRanges: Record<
      number,
      { startDate: Date; endDate: Date }
    > = {};
    Object.values(voidFillPrograms)
      .flat()
      .forEach((program: any) => {
        programDateRanges[program.programId] = {
          startDate: new Date(program.startDate),
          endDate: new Date(program.endDate)
        };
      });

    // Get earnings and voids filled using the new method
    const salesRepEarningsResult =
      await ProgramRepository.getSalesRepEarningsWithCompliance({
        distributorId,
        programIds,
        salesRepIds: salesRepIds || []
      });

    //6. aggregate all the data for the response
    const finalResponse = [];

    // Create lookup maps for easier data access
    const remainingTargetsMap = new Map();
    totalVoidsRemaining.forEach((item) => {
      remainingTargetsMap.set(item.programId, item.remainingTarget);
    });

    const salesRepEarningsMap = new Map();
    salesRepEarningsResult.forEach((item) => {
      salesRepEarningsMap.set(item.programId, {
        totalEarning: item.totalEarning,
        totalVoids: item.totalVoids
      });
    });

    // Create program details map for rebate_type and rebate_amount lookup
    const programDetailsMap = new Map();
    Object.values(voidFillPrograms)
      .flat()
      .forEach((program: any) => {
        programDetailsMap.set(program.programId, {
          rebateType: program.rebateType || "percentage", // Default to percentage if not found
          rebateAmount: program.rebateAmount || "0" // Store rebate amount for calculation
        });
      });

    // Process each manufacturer and their programs
    for (const [manufacturerId, programs] of Object.entries(voidFillPrograms)) {
      let totalEarnings = 0;
      let totalVoidsFilled = 0;
      let totalVoidsRemaining = 0;
      let totalEarningOpportunity = 0;

      // Aggregate data for all programs under this manufacturer
      programs.forEach((program: any) => {
        const programId = program.programId;

        // Get earnings and voids filled from sales_rep_store_earnings
        const earningsData = salesRepEarningsMap.get(programId);
        if (earningsData) {
          totalEarnings += earningsData.totalEarning;
          totalVoidsFilled += earningsData.totalVoids;
        }

        // Add remaining voids
        const remainingTarget = remainingTargetsMap.get(programId);
        if (remainingTarget) {
          totalVoidsRemaining += remainingTarget;
        }

        // Calculate earning opportunity: (rebateAmount * remainingTarget) - earnings
        // Only calculate for fixed rebate types, others remain 0
        const programDetails = programDetailsMap.get(programId);
        if (
          programDetails &&
          programDetails.rebateType === "fixed" &&
          programDetails.rebateAmount
        ) {
          const currentEarnings = earningsData ? earningsData.totalEarning : 0;
          const currentRemainingTarget = remainingTarget || 0;
          const rebateAmount = parseFloat(programDetails.rebateAmount) || 0;
          // Total potential earnings = rebateAmount * remainingTarget
          const totalPotentialEarnings = rebateAmount * currentRemainingTarget;
          // Earning opportunity = total potential earnings - current earnings
          const earningOpp = Math.max(
            0,
            totalPotentialEarnings - currentEarnings
          );
          totalEarningOpportunity += earningOpp;
        }
        // For non-fixed rebate types, earningOpportunity remains 0
      });

      // Get manufacturer details from authorizedManufacturers
      const manufacturerDetails = authorizedManufacturers.find(
        (am: any) => Number(am.manufacturerId) === Number(manufacturerId)
      );

      finalResponse.push({
        manId: Number(manufacturerId),
        manName: (manufacturerDetails as any)?.manufacturerName || "Unknown",
        manLogo: (manufacturerDetails as any)?.manufacturerLogo || null,
        earnings: totalEarnings,
        voidsFilled: totalVoidsFilled,
        totalVoids: totalVoidsRemaining,
        earningOpportunity: totalEarningOpportunity,
        voidFilledPercentage:
          totalVoidsRemaining > 0
            ? ((totalVoidsFilled / totalVoidsRemaining) * 100).toFixed(2)
            : "0.00"
      });
    }

    // Collect all programs from voidFillPrograms
    const allPrograms = Object.values(voidFillPrograms).flat();

    // Format warehouse data
    let warehouseData: any[] = [];

    if (!warehouseId) {
      warehouseData = distributorWarehouses.map((warehouse: any) => ({
        warehouseId: warehouse?.id,
        warehouseName: warehouse?.name
      }));
    }

    // Create the new response structure
    const response = {
      voidFillDetails: finalResponse,
      warehouseIds: warehouseData,
      programs: allPrograms
    };

    return response;
  }

  private async getVoidFillSummaryForCSV({
    distributorId,
    userId,
    salesRepIds,
    role,
    programIds,
    storeIds
  }: {
    distributorId: number;
    userId: number;
    salesRepIds?: number[];
    role?: string;
    programIds?: number[];
    storeIds?: number[];
  }) {
    // Build WHERE conditions dynamically based on filters
    const whereConditions: string[] = ["ssr.deleted_at IS NULL"];

    // Only add sales_rep_id filter if salesRepIds is provided and has values
    if (salesRepIds && salesRepIds.length > 0) {
      whereConditions.push("ssr.sales_rep_id IN (:salesRepIds)");
    }

    if (programIds && programIds.length > 0) {
      whereConditions.push("svft.program_id IN (:programIds)");
    } else {
      whereConditions.push(
        `svft.program_id IN (select program_id from program_details where criteria = '${ProgramsDetailCriteria.VOID_FILL}')`
      );
    }

    if (storeIds && storeIds.length > 0) {
      whereConditions.push("ssr.store_id IN (:storeIds)");
    }

    const salesRepRemainingTargetsQuery = `SELECT 
        ssr.sales_rep_id,
        SUM(svft.remaining_target) AS total_remaining_target,
        SUM(COALESCE(pd.rebate_amount, 0) * svft.remaining_target) AS potential_dollars
    FROM 
        store_sales_reps ssr
    INNER JOIN 
        store_void_fill_targets svft ON ssr.store_id = svft.store_id
    INNER JOIN 
        program_details pd ON svft.program_id = pd.program_id
    WHERE 
        ${whereConditions.join(" AND ")}
        AND pd.deleted_at IS NULL
        AND pd.criteria = '${ProgramsDetailCriteria.VOID_FILL}'
    GROUP BY 
        ssr.sales_rep_id
    ORDER BY 
        ssr.sales_rep_id ASC;`;

    const replacementParams: any = {
      ...(programIds && programIds.length > 0 ? { programIds } : {}),
      ...(storeIds && storeIds.length > 0 ? { storeIds } : {})
    };

    // Only add salesRepIds to replacements if it's used in the query
    if (salesRepIds && salesRepIds.length > 0) {
      replacementParams.salesRepIds = salesRepIds;
    }

    const salesRepRemainingTargets: any = await sequelize.query(
      salesRepRemainingTargetsQuery,
      {
        replacements: replacementParams
      }
    );

    // Build WHERE conditions for earnings query
    const earningsWhereConditions: string[] = [
      "sre.distributor_id = :distributorId"
    ];

    // Only add sales_rep_id filter if salesRepIds is provided and has values
    if (salesRepIds && salesRepIds.length > 0) {
      earningsWhereConditions.push("sre.sales_rep_id IN (:salesRepIds)");
    }

    if (programIds && programIds.length > 0) {
      earningsWhereConditions.push("sre.program_id IN (:programIds)");
    }

    const salesRepResultQuery = `SELECT
        d.name AS sales_rep_name,
        d.sales_rep_external_id,
        sre.sales_rep_id,
        sre.program_id,
        sre.distributor_id,
        SUM(sre.earning) AS total_earning,
        SUM(sre.total_quantity) AS actual_gaps
    FROM sales_rep_store_earnings sre
    JOIN distributors d 
        ON d.id = sre.sales_rep_id
    WHERE ${earningsWhereConditions.join(" AND ")}
    GROUP BY 
        sre.sales_rep_id, 
        sre.program_id, 
        sre.distributor_id, 
        d.name,
        d.sales_rep_external_id
    ORDER BY sre.sales_rep_id;
    `;

    const earningsReplacementParams: any = {
      distributorId: distributorId,
      ...(programIds && programIds.length > 0 ? { programIds } : {})
    };

    // Only add salesRepIds to replacements if it's used in the query
    if (salesRepIds && salesRepIds.length > 0) {
      earningsReplacementParams.salesRepIds = salesRepIds;
    }

    const salesRepResult: any = await sequelize.query(salesRepResultQuery, {
      replacements: earningsReplacementParams
    });

    // Extract results from sequelize query format [results, metadata]
    const remainingTargetsData = salesRepRemainingTargets[0] || [];
    const earningsData = salesRepResult[0] || [];

    // Group earnings data by sales_rep_id (aggregate across multiple programs)
    const earningsBySalesRep = earningsData.reduce((acc: any, row: any) => {
      const salesRepId = row.sales_rep_id;

      if (!acc[salesRepId]) {
        acc[salesRepId] = {
          sales_rep_id: salesRepId,
          sales_rep_name: row.sales_rep_name,
          sales_rep_external_id: row?.sales_rep_external_id || "NA",
          distributor_id: row.distributor_id,
          total_earning: 0,
          actual_gaps: 0
        };
      }

      // Sum up earnings and gaps across all programs for this sales rep
      acc[salesRepId].total_earning += parseFloat(row.total_earning || 0);
      acc[salesRepId].actual_gaps += parseInt(row.actual_gaps || 0, 10);

      return acc;
    }, {});

    // Convert to array and combine with remaining targets
    const combinedResults = Object.values(earningsBySalesRep).map(
      (earningsRow: any) => {
        const remainingTargetRow = remainingTargetsData.find(
          (rt: any) => rt.sales_rep_id === earningsRow.sales_rep_id
        );

        const totalRemainingTarget =
          remainingTargetRow?.total_remaining_target || 0;
        const actualGaps = earningsRow.actual_gaps || 0;
        const potentialDollars =
          parseFloat(remainingTargetRow?.potential_dollars || 0) || 0;

        // Calculate percentage: (actual_gaps / total_remaining_target) * 100
        const percentage =
          totalRemainingTarget > 0
            ? (actualGaps / totalRemainingTarget) * 100
            : 0;

        return {
          ...earningsRow,
          total_remaining_target: totalRemainingTarget,
          potential_dollars: potentialDollars,
          percentage: parseFloat(percentage.toFixed(2))
        };
      }
    );

    // If there are sales reps in remaining targets but not in earnings, include them too
    remainingTargetsData.forEach((rtRow: any) => {
      if (
        !combinedResults.find(
          (cr: any) => cr.sales_rep_id === rtRow.sales_rep_id
        )
      ) {
        const totalRemainingTarget = rtRow.total_remaining_target || 0;
        const actualGaps = 0;
        const potentialDollars = parseFloat(rtRow?.potential_dollars || 0) || 0;

        // Calculate percentage: (actual_gaps / total_remaining_target) * 100
        const percentage =
          totalRemainingTarget > 0
            ? (actualGaps / totalRemainingTarget) * 100
            : 0;

        combinedResults.push({
          sales_rep_id: rtRow.sales_rep_id,
          sales_rep_name: null, // Will need to fetch if needed
          distributor_id: null,
          total_earning: 0,
          actual_gaps: 0,
          total_remaining_target: totalRemainingTarget,
          potential_dollars: potentialDollars,
          percentage: parseFloat(percentage.toFixed(2))
        });
      }
    });

    return combinedResults;
  }
}

export default new ProgramService();
