import { Request, Response } from "express";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { HttpStatus } from "../config/HttpStatus";
import { ApiError } from "../lib/errors/APIError";
import logger from "../lib/logger";
import programService from "../services/ProgramService";

import { writeToString } from "@fast-csv/format";
import newrelic from "newrelic";

import crypto from "crypto";
import { Op, QueryTypes, Sequelize } from "sequelize";
import {
  CACHE_TTL_TIME,
  ENTITY_TYPE,
  ProgramsDetailCriteria,
  useApiCaching
} from "../config/appConstants";
import sequelize from "../db";
import Distributor from "../models/Distributor";
import Product from "../models/Product";
import ProductCodeMapping from "../models/ProductCodeMapping";
import ProgramDetail from "../models/ProgramDetail";
import Warehouse from "../models/Warehouse";
import DistributorRepository from "../repositories/DistributorRepository";
import ProgramProductRepository from "../repositories/ProgramProductRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import StoreRepository from "../repositories/StoreRepository";
import ManufacturerService from "../services/ManufacturerService";
import ProgramPdfService from "../services/ProgramPdfService";
import ProgramService from "../services/ProgramService";
import StoreService from "../services/StoreService";
import { createCacheKey } from "../utils/cacheUtils";
import { redisClient, addUserCacheKey } from "../utils/redis";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";
import {
  getParentDistributorId,
  isDistributorSalesRep,
  isDistributorGeneralManager,
  isManufacturer
} from "../utils/roles";
import {
  getActiveInternalCode,
  buildProgramTimelineSqlCondition,
  resolveProductName,
  getMinMaxProgramDates
} from "../utils/helpers";

interface ProgramQueryParams {
  type: string;
  manufacturerId?: number;
}

class ProgramController {
  constructor() {
    this.listPrograms = this.listPrograms.bind(this);
    this.listProgramsV2 = this.listProgramsV2.bind(this);
    this.getProgramDetails = this.getProgramDetails.bind(this);
    this.getProgramDetailsV2 = this.getProgramDetailsV2.bind(this);
    this.GetVoidFillProgramsSummary =
      this.GetVoidFillProgramsSummary.bind(this);
    this.getSpiffProducts = this.getSpiffProducts.bind(this);
    this.getProgramPdf = this.getProgramPdf.bind(this);
  }

  /**
   * List distributor programs based on the userId and type.
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} A promise that resolves with the list of distributor programs
   */
  public async listPrograms(req: Request, res: Response): Promise<Response> {
    try {
      const validationResult = await this.validateAndParseQueryParams(
        req.query,
        { requireManufacturerId: false }
      );

      const { type } = validationResult;
      const { id: userId } = req.user;
      const {
        storeId,
        warehouseId,
        programTimeline,
        isInternal,
        isExcludeChainStores
      } = req.query;
      const getInternalInitiative =
        isInternal === undefined
          ? undefined
          : isInternal === "true"
            ? true
            : false;

      const excludeChainStores =
        isExcludeChainStores?.toString()?.toLowerCase() === "true";

      // Normalize warehouseId - handle "undefined" string vs actual undefined/null
      const normalizedWarehouseId =
        warehouseId &&
        warehouseId !== "undefined" &&
        !isNaN(Number(warehouseId))
          ? Number(warehouseId)
          : undefined;

      // Enforce warehouse scoping for general managers
      let effectiveWarehouseId = normalizedWarehouseId;
      if (isDistributorGeneralManager(req.user.role)) {
        const distributorId = getParentDistributorId(req.user, req.user.role);

        // IMPORTANT: Don't pass the requested warehouseId to getWarehouseIds(), because that short-circuits
        // and would allow a GM to request any warehouseId.
        const assignedWarehouseIds =
          await DistributorRepository.getWarehouseIds(
            Number(distributorId),
            Number(req.user.associatedUserId),
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
          effectiveWarehouseId &&
          effectiveWarehouseId !== assignedWarehouseId
        ) {
          throw ApiError.authorizationFailed(
            "Not authorized for requested warehouse"
          );
        }

        effectiveWarehouseId = assignedWarehouseId;
      }

      const cacheKey = `programs_${userId}_${type}_${storeId || "null"}_${effectiveWarehouseId || "null"}_${programTimeline || "null"}_${getInternalInitiative ?? "null"}_${excludeChainStores}`;
      const hashedCacheKey = crypto
        .createHash("md5")
        .update(cacheKey)
        .digest("hex");
      let programs: any;
      if (useApiCaching) {
        const cachedPrograms = await redisClient.get(hashedCacheKey);
        if (cachedPrograms) {
          console.log(
            `[DEBUG] Returning cached programs Overview for cache key: ${hashedCacheKey}`
          );
          programs = JSON.parse(cachedPrograms);
        }
      }
      // Fetch programs using the service
      if (!programs) {
        programs = await programService.getPrograms({
          userId,
          type: type as string,
          storeId: Number(storeId),
          selectedWarehouseId: effectiveWarehouseId,
          programTimeline: programTimeline as string,
          getInternalInitiative,
          excludeChainStores
        });
      }
      if (useApiCaching) {
        console.log(
          "[DEBUG] Caching programs listing for cache key: ",
          hashedCacheKey
        );
        await redisClient.setEx(
          hashedCacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(programs)
        );
      }
      // Return the found programs
      return sendSuccessResponse(res, programs);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * List SPIFF programs (v2 optimized) for DISTRIBUTOR_ADMIN and DISTRIBUTOR_SALES_MANAGER users
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} A promise that resolves with the list of SPIFF programs
   */
  public async listProgramsV2(req: Request, res: Response): Promise<Response> {
    try {
      const {
        type,
        programTimeline,
        isInternal,
        isExcludeChainStores,
        warehouseId: requestedWarehouseId
      } = req.query;

      const getInternalInitiative = isInternal === "true" ? true : false;
      const excludeChainStores =
        isExcludeChainStores?.toString()?.toLowerCase() === "true";

      // Enforce warehouse scoping for general managers
      let effectiveWarehouseId = requestedWarehouseId
        ? Number(requestedWarehouseId)
        : undefined;
      if (isDistributorGeneralManager(req.user.role)) {
        const distributorId = getParentDistributorId(req.user, req.user.role);
        // IMPORTANT: Don't pass the requestedWarehouseId to getWarehouseIds(), because that short-circuits
        // and would allow a GM to request any warehouseId.
        const assignedWarehouseIds =
          await DistributorRepository.getWarehouseIds(
            Number(distributorId),
            Number(req.user.associatedUserId),
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
          effectiveWarehouseId &&
          effectiveWarehouseId !== assignedWarehouseId
        ) {
          throw ApiError.authorizationFailed(
            "Not authorized for requested warehouse"
          );
        }

        effectiveWarehouseId = assignedWarehouseId;
      }

      // Delegate role validation and business logic to service layer
      const programs = await programService.getSpiffProgramsOptimized({
        user: req.user,
        type: type as string,
        programTimeline: programTimeline as string,
        getInternalInitiative,
        excludeChainStores,
        warehouseId: effectiveWarehouseId
      });

      console.log(
        `[DEBUG] Returning ${programs?.length || 0} SPIFF programs for user ${req.user.id}`
      );

      return sendSuccessResponse(res, programs);
    } catch (error: any) {
      console.error("Error in listProgramsV2:", error);
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Fetches the program details for a distributor or retailer based on the provided user ID, type, and manufacturer ID.
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} A promise that resolves with the program details
   */
  public async getProgramDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    const {
      searchQuery,
      enrolledPage,
      notEnrolledPage,
      programId,
      programDetailId,
      sort,
      sortKey,
      forStore,
      warehouseId,
      programTimeline = "Current",
      isInternal,
      includeChainInfo,
      includeProducts,
      isExcludeChainStores,
      ischainPrograms
    } = req.query;

    try {
      const isChainPrograms =
        ischainPrograms?.toString()?.toLowerCase() === "true" ? true : false;

      // Validate userId
      const validationResult = await this.validateAndParseQueryParams(
        req.query,
        { requireManufacturerId: true }
      );

      const { type, manufacturerId } = validationResult;
      const { id: userId, role } = req.user;

      const isInternalInitiative = isInternal === "true" ? true : false;
      const shouldIncludeChainInfo = includeChainInfo === "true";
      const shouldIncludeProducts = includeProducts === "true";
      const excludeChainStores =
        isExcludeChainStores?.toString()?.toLowerCase() === "true";

      const isManufacturerUser = [
        ENTITY_TYPE.MANUFACTURER_EXECUTIVE,
        ENTITY_TYPE.MANUFACTURER
      ].includes(role);

      // Enforce warehouse scoping for general managers
      const normalizedWarehouseId =
        warehouseId &&
        warehouseId !== "undefined" &&
        !isNaN(Number(warehouseId))
          ? Number(warehouseId)
          : undefined;

      let effectiveWarehouseId = normalizedWarehouseId;
      if (isDistributorGeneralManager(role)) {
        const distributorId = getParentDistributorId(req.user, role);

        // IMPORTANT: Don't pass the requested warehouseId to getWarehouseIds(), because that short-circuits
        // and would allow a GM to request any warehouseId.
        const assignedWarehouseIds =
          await DistributorRepository.getWarehouseIds(
            Number(distributorId),
            Number(req.user.associatedUserId),
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
          effectiveWarehouseId &&
          effectiveWarehouseId !== assignedWarehouseId
        ) {
          throw ApiError.authorizationFailed(
            "Not authorized for requested warehouse"
          );
        }
        effectiveWarehouseId = assignedWarehouseId;
      }

      // return single program detail for distributor when program detail id Provided
      if (type === ENTITY_TYPE.DISTRIBUTOR && Number(programDetailId)) {
        const programDetails = await programService.getProgramDetailsByDetailId(
          userId,
          Number(manufacturerId),
          Number(programDetailId)
        );

        // Return the found program Details with recommended and purchased products
        return sendSuccessResponse(res, { ...programDetails });
      }

      // Fetch programs using the service
      const cacheKey = `programDetails_${userId}_${type}_${manufacturerId}_${searchQuery}_${enrolledPage}_${notEnrolledPage}_${sort}_${programId}_${programDetailId}_${sortKey}_${forStore}_${isManufacturerUser}_${effectiveWarehouseId}_${programTimeline}_${isInternalInitiative}_${shouldIncludeChainInfo}_${shouldIncludeProducts}_${excludeChainStores}`;

      let programDetails: any;
      const hashedCacheKey = crypto
        .createHash("md5")
        .update(cacheKey)
        .digest("hex");

      // Check if caching is enabled and try to get from cache
      if (useApiCaching) {
        const cachedProgramDetails = await newrelic.startSegment(
          "ProgramController.getProgramDetails.cacheCheck",
          true,
          async () => {
            return await redisClient.get(hashedCacheKey);
          }
        );

        if (cachedProgramDetails) {
          console.log(
            `[DEBUG] Returning cached program details for cache key: ${hashedCacheKey}`
          );
          programDetails = JSON.parse(cachedProgramDetails);
        }
      }

      // If no cached data found (either caching disabled or cache miss), fetch from service
      if (!programDetails) {
        // Fetch programs using the service
        programDetails = await newrelic.startSegment(
          "ProgramController.getProgramDetails.fetchProgramDetails",
          true,
          async () => {
            return await programService.getProgramDetails(
              userId,
              type as string,
              manufacturerId as number,
              searchQuery as string,
              Number(enrolledPage || 1),
              Number(notEnrolledPage || 1),
              sort as string,
              Number(programId),
              Number(programDetailId),
              sortKey as string,
              Number(forStore),
              isManufacturerUser,
              effectiveWarehouseId,
              programTimeline as string,
              isInternalInitiative,
              shouldIncludeChainInfo,
              shouldIncludeProducts,
              excludeChainStores,
              isChainPrograms
            );
          }
        );

        // Cache the result if caching is enabled
        if (useApiCaching) {
          await newrelic.startSegment(
            "ProgramController.getProgramDetails.cacheSet",
            true,
            async () => {
              await redisClient.setEx(
                hashedCacheKey,
                CACHE_TTL_TIME,
                JSON.stringify(programDetails)
              );
              console.log(
                `[DEBUG] Cached program details for cache key: ${hashedCacheKey}`
              );
            }
          );
        }
      }

      const manufacturerDetails = await newrelic.startSegment(
        "ProgramController.getProgramDetails.getManufacturerDetails",
        true,
        async () => {
          return await ManufacturerService.getManufacturerNameAndLogo(
            Number(manufacturerId)
          );
        }
      );
      programDetails.manufacturerDetails = manufacturerDetails;

      if (
        type == ENTITY_TYPE.STORE
        // (type == ENTITY_TYPE.STORE && !isDistributor(role)) ||
        // isDistributor(role)
      ) {
        // Fetch Programs and Manufacturer Products
        const programsResult = await newrelic.startSegment(
          "ProgramController.getProgramDetails.getManufacturerPrograms",
          true,
          async () => {
            return await StoreRepository.getManufacturerProgramsById(
              manufacturerId,
              type,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              programTimeline as string,
              isInternalInitiative
            );
          }
        );
        // Get all unique tags from program_details for these programs
        const programIds = programsResult.map(
          (pr: any) => pr.program_id || pr.id
        );
        let uniqueTags: string[] = [];
        if (programIds.length) {
          uniqueTags = await newrelic.startSegment(
            "ProgramController.getProgramDetails.getUniqueProductTags",
            true,
            async () => {
              return await ProgramRepository.getUniqueProductTagsByProgramIds(
                programIds
              );
            }
          );
        }

        // Get warehouse ID from store if forStore is provided
        let selectedWarehouseId: number | undefined;
        if (forStore) {
          const storeWarehouseId = await newrelic.startSegment(
            "ProgramController.getProgramDetails.getWarehouseId",
            true,
            async () => {
              return await StoreRepository.getWarehouseId(Number(forStore));
            }
          );
          selectedWarehouseId = storeWarehouseId ?? undefined;
        } else if (effectiveWarehouseId) {
          // Fall back to warehouseId query parameter if forStore not provided
          selectedWarehouseId = effectiveWarehouseId;
        }

        // For GM, always enforce the warehouseId on downstream warehouse-scoped queries
        if (isDistributorGeneralManager(role) && effectiveWarehouseId) {
          selectedWarehouseId = effectiveWarehouseId;
        }

        const productsResult = await newrelic.startSegment(
          "ProgramController.getProgramDetails.getManufacturerProducts",
          true,
          async () => {
            return await StoreRepository.getManufacturerProducts({
              manufacturerId: Number(manufacturerId),
              distributorId: getParentDistributorId(req.user, role),
              categoryTagsJSON: uniqueTags,
              selectedWarehouseId
            });
          }
        );

        const isManufacturerAuthorized = manufacturerDetails?.authorized;

        programDetails.manufacturer = programDetails.manufacturer || {};
        programDetails.manufacturer.authorized = isManufacturerAuthorized;

        const programsProductTags = programsResult
          .map((pr) => pr.products_tags)
          ?.join(",")
          ?.split(",")
          ?.filter((tag: string) => tag.trim())
          ?.map((tag: string) => tag.trim());

        // Get purchased product IDs (SKU IDs) if forStore is provided
        let purchasedProductIds: number[] = [];
        let transactionLineItems: any[] = [];
        if (forStore) {
          const productIds = productsResult.map((pr) => pr.id);
          const purchasedProductLineItems = await newrelic.startSegment(
            "ProgramController.getProgramDetails.getPurchasedProductIds",
            true,
            async () => {
              return (await StoreRepository.getPurchasedProductIdsByProgramIds(
                Number(forStore),
                ENTITY_TYPE.STORE,
                productIds,
                selectedWarehouseId ? [selectedWarehouseId] : undefined,
                true, // returnLineItems = true to get full line items
                getMinMaxProgramDates(programsResult)
              )) as any[];
            }
          );

          // Extract purchased SKU IDs from line items
          // Note: productId in line items is actually a SKU ID (unit_skus_id, box_skus_id, or case_skus_id)
          purchasedProductIds = purchasedProductLineItems
            .map((item: any) => Number(item.productId ?? 0))
            .filter((id) => id > 0);

          transactionLineItems = purchasedProductLineItems;
        }

        let categorizedProducts: any = {};
        categorizedProducts = await newrelic.startSegment(
          "ProgramController.getProgramDetails.getCategorizedProducts",
          true,
          async () => {
            return await StoreService.getCategorizedProducts(
              programsProductTags,
              productsResult,
              purchasedProductIds, // Pass actual purchased product IDs instead of empty array
              [],
              isManufacturerAuthorized,
              true, // includeCaseSKUsId - set to true to include case SKU IDs
              undefined, // displayAllInRequired
              undefined, // isDistributorProductsListing
              undefined, // filterRequiredByTagQuantity
              undefined, // returnListIfPurchasedRequired
              transactionLineItems, // Pass transaction line items for internal code mapping
              getParentDistributorId(req.user, role)
            );
          }
        );

        // Return the found programs
        return sendSuccessResponse(res, {
          ...programDetails,
          categorizedProducts: categorizedProducts
        });
      }

      // Return the found programs
      return sendSuccessResponse(res, programDetails);
    } catch (error: any) {
      return sendErrorResponse(
        res,
        error.message,
        error.statusCode || ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get SPIFF program details optimized for v2 API
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} A promise that resolves with SPIFF program details
   */
  public async getProgramDetailsV2(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Extract and validate user information
      const { id: userId, role, associatedUserId } = req.user;
      // Role validation - Support multiple roles like listProgramsV2
      const supportedRoles = [
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
        ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      ];

      if (!supportedRoles.includes(role)) {
        newrelic.addCustomAttribute("spiff_v2_userId", userId);
        newrelic.addCustomAttribute("spiff_v2_role", role);
        newrelic.addCustomAttribute("spiff_v2_error", "INVALID_ROLE");
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          `Access denied. Unsupported role: ${role}. Supported roles: DISTRIBUTOR_ADMIN, DISTRIBUTOR_EXECUTIVE, DISTRIBUTOR_GENERAL_MANAGER, DISTRIBUTOR_SALES_MANAGER, DISTRIBUTOR_SALES_REP`
        );
      }

      // Extract and validate query parameters
      const {
        type,
        manufacturerId,
        programTimeline = "Current",
        isInternal = "false",
        isExcludeChainStores = "false",
        warehouseId: requestedWarehouseId
      } = req.query;

      // Type validation - must be SPIFF
      if (type !== "SPIFF") {
        newrelic.addCustomAttribute("spiff_v2_userId", userId);
        newrelic.addCustomAttribute("spiff_v2_type", type as string);
        newrelic.addCustomAttribute("spiff_v2_error", "INVALID_TYPE");
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          "SPIFF v2 API only supports type=SPIFF"
        );
      }

      // Manufacturer ID validation
      if (!manufacturerId || isNaN(Number(manufacturerId))) {
        newrelic.addCustomAttribute("spiff_v2_userId", userId);
        newrelic.addCustomAttribute(
          "spiff_v2_manufacturerId",
          manufacturerId as string
        );
        newrelic.addCustomAttribute(
          "spiff_v2_error",
          "INVALID_MANUFACTURER_ID"
        );
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          "Valid manufacturerId is required"
        );
      }

      // Get distributorId and salesRepId - match listProgramsV2 logic
      const isSalesRep = isDistributorSalesRep(role);
      const distributorId = getParentDistributorId(req.user, role);
      const salesRepId = isSalesRep
        ? Number(associatedUserId)
        : role === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
          ? Number(associatedUserId) // For DISTRIBUTOR_SALES_MANAGER, pass their associatedUserId to get assigned sales reps
          : undefined;

      // Enforce warehouse scoping for general managers
      let effectiveWarehouseId = requestedWarehouseId
        ? Number(requestedWarehouseId)
        : undefined;
      if (isDistributorGeneralManager(role)) {
        // IMPORTANT: Don't pass the requestedWarehouseId to getWarehouseIds(), because that short-circuits
        // and would allow a GM to request any warehouseId.
        const assignedWarehouseIds =
          await DistributorRepository.getWarehouseIds(
            Number(distributorId),
            Number(associatedUserId),
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
          effectiveWarehouseId &&
          effectiveWarehouseId !== assignedWarehouseId
        ) {
          throw ApiError.authorizationFailed(
            "Not authorized for requested warehouse"
          );
        }

        effectiveWarehouseId = assignedWarehouseId;
      }

      // Generate cache key for Redis caching
      const hashedCacheKey = createCacheKey("spiff_program_details_v2", {
        distributorId,
        salesRepId: salesRepId ? Number(salesRepId) : undefined,
        manufacturerId: Number(manufacturerId),
        programTimeline,
        isInternal: isInternal === "true",
        isExcludeChainStores,
        warehouseId: effectiveWarehouseId
      });

      let programDetails: any;

      // Check Redis cache first
      if (useApiCaching) {
        const cachedData = await newrelic.startSegment(
          "ProgramController.getProgramDetailsV2.cacheCheck",
          true,
          async () => {
            return await redisClient.get(hashedCacheKey);
          }
        );

        if (cachedData) {
          console.log(
            `[DEBUG] Returning cached SPIFF program details for key: ${hashedCacheKey}`
          );
          programDetails = JSON.parse(cachedData);
        }
      }

      // If no cached data, fetch from service
      if (!programDetails) {
        console.log(
          `[DEBUG] Fetching SPIFF program details for distributor: ${distributorId}, salesRep: ${salesRepId}, manufacturer: ${manufacturerId}`
        );

        programDetails = await newrelic.startSegment(
          "ProgramController.getProgramDetailsV2.fetchProgramDetails",
          true,
          async () => {
            return await programService.getSpiffProgramDetailsOptimized({
              distributorId: distributorId,
              salesRepId: salesRepId ? Number(salesRepId) : undefined,
              manufacturerId: Number(manufacturerId),
              programTimeline: programTimeline as string,
              getInternalInitiative: isInternal === "true",
              excludeChainStores: isExcludeChainStores === "true",
              role: role,
              warehouseId: effectiveWarehouseId
            });
          }
        );

        // Cache the result if caching is enabled
        if (useApiCaching && programDetails) {
          await newrelic.startSegment(
            "ProgramController.getProgramDetailsV2.cacheSet",
            true,
            async () => {
              await redisClient.setEx(
                hashedCacheKey,
                CACHE_TTL_TIME,
                JSON.stringify(programDetails)
              );
              console.log(
                `[DEBUG] Cached SPIFF program details for key: ${hashedCacheKey}`
              );
            }
          );
        }
      }

      // Add performance metrics
      newrelic.addCustomAttribute("spiff_v2_userId", userId);
      newrelic.addCustomAttribute(
        "spiff_v2_manufacturerId",
        Number(manufacturerId)
      );
      newrelic.addCustomAttribute(
        "spiff_v2_programCount",
        programDetails?.spiffProgramDetails?.length || 0
      );
      newrelic.addCustomAttribute(
        "spiff_v2_totalEarnings",
        programDetails?.totalRepEarnings || 0
      );

      return sendSuccessResponse(res, programDetails);
    } catch (error: any) {
      console.error("SPIFF v2 Program Details API Error:", error);

      // Add error attributes for monitoring
      newrelic.addCustomAttribute("spiff_v2_error", error.message);
      newrelic.addCustomAttribute("spiff_v2_errorType", error.constructor.name);
      newrelic.noticeError(error);

      return sendErrorResponse(
        res,
        error.message || "Internal server error",
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getProgramsStoreComplianceDetail(
    req: Request,
    res: Response
  ): Promise<Response> {
    const {
      warehouseId: requestedWarehouseId,
      programTimeline,
      isInternal,
      manufacturerId,
      excludeChainStores = false
    } = req.query;

    try {
      const { id: userId, role } = req.user;

      logger.info({
        msg: "getProgramsStoreComplianceDetail: Request received",
        userId,
        role,
        requestedWarehouseId: requestedWarehouseId || "undefined",
        manufacturerId: manufacturerId || "undefined",
        programTimeline: programTimeline || "undefined",
        isInternal,
        excludeChainStores
      });

      const isInternalInitiative = isInternal === "true" ? true : false;

      const isManufacturerUser = [
        ENTITY_TYPE.MANUFACTURER_EXECUTIVE,
        ENTITY_TYPE.MANUFACTURER
      ].includes(role);

      // Fetch programs using the service
      let programDetails: any;
      const normalizedWarehouseId =
        requestedWarehouseId &&
        requestedWarehouseId !== "undefined" &&
        !isNaN(Number(requestedWarehouseId))
          ? Number(requestedWarehouseId)
          : undefined;

      logger.info({
        msg: "getProgramsStoreComplianceDetail: WarehouseId normalization",
        userId,
        requestedWarehouseId: requestedWarehouseId || "undefined",
        normalizedWarehouseId: normalizedWarehouseId || "undefined"
      });

      let effectiveWarehouseId = normalizedWarehouseId;
      if (isDistributorGeneralManager(role)) {
        const distributorId = getParentDistributorId(req.user, role);

        logger.info({
          msg: "getProgramsStoreComplianceDetail: General manager warehouse resolution",
          userId,
          role,
          distributorId,
          normalizedWarehouseId: normalizedWarehouseId || "undefined"
        });

        const assignedWarehouseIds =
          await DistributorRepository.getWarehouseIds(
            Number(distributorId),
            Number(req.user.associatedUserId),
            true
          );

        logger.info({
          msg: "getProgramsStoreComplianceDetail: Assigned warehouses retrieved",
          userId,
          distributorId,
          assignedWarehouseIds: assignedWarehouseIds || [],
          assignedWarehouseCount: assignedWarehouseIds?.length || 0
        });

        if (!assignedWarehouseIds?.length) {
          logger.warn({
            msg: "getProgramsStoreComplianceDetail: General manager has no warehouse assigned",
            userId,
            distributorId
          });
          throw ApiError.badRequest(
            "General manager has no warehouse assigned"
          );
        }
        if (assignedWarehouseIds.length !== 1) {
          logger.warn({
            msg: "getProgramsStoreComplianceDetail: General manager assigned to multiple warehouses",
            userId,
            distributorId,
            assignedWarehouseCount: assignedWarehouseIds.length,
            assignedWarehouseIds
          });
          throw ApiError.badRequest(
            "General manager must be assigned to exactly one warehouse"
          );
        }

        const assignedWarehouseId = assignedWarehouseIds[0];
        if (
          effectiveWarehouseId &&
          effectiveWarehouseId !== assignedWarehouseId
        ) {
          logger.warn({
            msg: "getProgramsStoreComplianceDetail: Warehouse authorization failed",
            userId,
            requestedWarehouseId: effectiveWarehouseId,
            assignedWarehouseId
          });
          throw ApiError.authorizationFailed(
            "Not authorized for requested warehouse"
          );
        }
        effectiveWarehouseId = assignedWarehouseId;

        logger.info({
          msg: "getProgramsStoreComplianceDetail: General manager effective warehouse set",
          userId,
          effectiveWarehouseId
        });
      }

      logger.info({
        msg: "getProgramsStoreComplianceDetail: Effective warehouseId determined",
        userId,
        role,
        effectiveWarehouseId: effectiveWarehouseId || "undefined",
        isGeneralManager: isDistributorGeneralManager(role)
      });

      const hashedKey = createCacheKey("getProgramsStoreComplianceDetail", {
        userId: userId,
        manufacturerId: Number(manufacturerId),
        isManufacturerUser: isManufacturerUser,
        programTimeline: programTimeline as string,
        isInternalInitiative: isInternalInitiative,
        excludeChainStores: excludeChainStores === "true" ? true : false,
        warehouseId: effectiveWarehouseId
      });
      // Prepend userId to make cache keys queryable by user
      const cacheKey = `getProgramsStoreComplianceDetail_${userId}_${hashedKey.replace("getProgramsStoreComplianceDetail_", "")}`;

      logger.info({
        msg: "getProgramsStoreComplianceDetail: Cache key generated",
        userId,
        cacheKey,
        effectiveWarehouseId: effectiveWarehouseId || "undefined"
      });

      // Check if caching is enabled and try to get from cache
      if (useApiCaching) {
        const cachedProgramDetails = await newrelic.startSegment(
          "ProgramController.getProgramsStoreComplianceDetail.cacheCheck",
          true,
          async () => {
            return await redisClient.get(cacheKey);
          }
        );

        if (cachedProgramDetails) {
          console.log(
            `[DEBUG] Returning cached program details for cache key: ${cacheKey}`
          );
          programDetails = JSON.parse(cachedProgramDetails);
        }
      }

      // If no cached data found (either caching disabled or cache miss), fetch from service
      if (!programDetails) {
        logger.info({
          msg: "getProgramsStoreComplianceDetail: Fetching from service (cache miss)",
          userId,
          effectiveWarehouseId: effectiveWarehouseId || "undefined",
          manufacturerId: Number(manufacturerId) || "undefined"
        });

        // Fetch programs using the service
        programDetails = await newrelic.startSegment(
          "ProgramController.getProgramsStoreComplianceDetail.fetchProgramDetails",
          true,
          async () => {
            return await programService.getProgramsStoreComplianceDetail({
              manufacturerId: Number(manufacturerId),
              userRole: req.user,
              programTimeline: programTimeline as string,
              isInternalInitiative,
              excludeChainStores: excludeChainStores === "true" ? true : false,
              warehouseId: effectiveWarehouseId
            });
          }
        );

        logger.info({
          msg: "getProgramsStoreComplianceDetail: Service call completed",
          userId,
          effectiveWarehouseId: effectiveWarehouseId || "undefined",
          programDetailsCount: programDetails?.length || 0
        });

        // Cache the result if caching is enabled
        if (useApiCaching) {
          await newrelic.startSegment(
            "ProgramController.getProgramsStoreComplianceDetail.cacheSet",
            true,
            async () => {
              await redisClient.setEx(
                cacheKey,
                CACHE_TTL_TIME,
                JSON.stringify(programDetails)
              );
              console.log(
                `[DEBUG] Cached program details Store Compliance for cache key: ${cacheKey}`
              );

              // Add to user cache index for efficient invalidation
              try {
                const userId = req.user.id;
                await addUserCacheKey(Number(userId), cacheKey);
              } catch (indexError) {
                // Log but don't throw - indexing is non-critical
                console.debug("[CACHE] Failed to add key to user index", {
                  userId: req.user.id,
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
      }

      // Return the found programs
      logger.info({
        msg: "getProgramsStoreComplianceDetail: Request completed successfully",
        userId,
        effectiveWarehouseId: effectiveWarehouseId || "undefined",
        programDetailsCount: programDetails?.length || 0,
        fromCache: !!programDetails && useApiCaching
      });

      return sendSuccessResponse(res, programDetails);
    } catch (error: any) {
      logger.error({
        msg: "getProgramsStoreComplianceDetail: Error occurred",
        userId: req.user?.id,
        role: req.user?.role,
        requestedWarehouseId: requestedWarehouseId || "undefined",
        error: error.message,
        statusCode: error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        stack: error.stack
      });

      return sendErrorResponse(
        res,
        error.message,
        error.statusCode || ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves analytics for a specific program detail.
   *
   * This method fetches detailed analytics for a program detail based on the
   * provided program detail ID and optional warehouse ID. The analytics include
   * various insights and metrics specific to the program detail.
   *
   * @param {Request} req - The request object, containing the programDetailId as
   * a route parameter and the warehouseId as an optional query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response
   * containing the program detail analytics.
   */
  public async getProgramDetailAnalytics(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { programDetailId } = req.params;
    const { warehouseId } = req.query;

    try {
      const userRole = req.user;
      const hashedCacheKey = createCacheKey("programDetailAnalytics", {
        userRoleId: userRole.id,
        programDetailId,
        warehouseId
      });

      let programDetails: any;
      if (useApiCaching) {
        const cachedProgramDetails = await redisClient.get(hashedCacheKey);
        if (cachedProgramDetails) {
          console.log(
            `[CACHE] Cache hit for program detail analytics: ${hashedCacheKey}`
          );
          programDetails = JSON.parse(cachedProgramDetails);
        }
      }

      if (!programDetails) {
        console.log(
          `[CACHE] Cache miss for program detail analytics: ${hashedCacheKey}`
        );
        // Fetch programs using the service
        programDetails = await programService.getProgramDetailAnalytics(
          userRole,
          Number(programDetailId),
          Number(warehouseId)
        );

        if (useApiCaching) {
          await redisClient.setEx(
            hashedCacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(programDetails)
          );
        }
      }

      // Return the found programs
      return sendSuccessResponse(res, programDetails);
    } catch (error: any) {
      return sendErrorResponse(
        res,
        error.message,
        error.statusCode || ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async validateAndParseQueryParams(
    query: any,
    options: { requireManufacturerId?: boolean } = {}
  ): Promise<ProgramQueryParams> {
    const { type, manufacturerId } = query;

    const parsedManufacturerId = manufacturerId
      ? parseInt(manufacturerId as string)
      : undefined;

    if (
      options.requireManufacturerId &&
      (parsedManufacturerId === undefined || isNaN(parsedManufacturerId))
    ) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_MANUFACTURER_ID
      );
    }

    if (!type) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_USER_TYPE
      );
    }

    return {
      type: type as string,
      manufacturerId: parsedManufacturerId
    };
  }

  public async getAllManufacturerIds(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const Ids = await ProgramService.getAllManufacturerIds();
      // Return the found programs
      return sendSuccessResponse(res, Ids);
    } catch (error: any) {
      return sendErrorResponse(
        res,
        error.message,
        error.statusCode || ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }
  public async getCategorizedProducts(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { type, manufacturerId, programTimeline, warehouseId } = req.query;
      if (!req.user) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH.UNAUTHORIZED,
          HttpStatus.UNAUTHORIZED
        );
      }

      const filteredManfId = manufacturerId ?? 0;

      const data = await ProgramService.getCategorizedProducts({
        programsType: String(type ?? ""),
        loggedInUser: req.user,
        manufacturerId: Number(filteredManfId),
        programTimeline: programTimeline as string,
        warehouseId: warehouseId ? Number(warehouseId) : undefined
      });

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(
        res,
        error.message,
        error.statusCode || ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getStoresListing(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const {
        searchQuery,
        enrolledPage,
        notEnrolledPage,
        sort,
        sortKey,
        enrolled,
        selectedSalesRepId,
        manufacturerId,
        warehouseId,
        programTimeline,
        isInternal,
        isIndependentStores,
        isDownload,
        hideEnrollTable,
        agreementId
      } = req.query;

      const isInternalInitiative = isInternal === "true" ? true : false;
      const excludeChainStores =
        isIndependentStores?.toString()?.toLowerCase() === "true"
          ? true
          : false;
      const isDownloadFlag = isDownload === "true" ? true : false;
      const hideEnrollTableFlag =
        hideEnrollTable?.toString()?.toLowerCase() === "true" ? true : false;

      const loggedInUser = req.user;

      // undefined for both, enrolled and not enrolled
      const enrolledBool = enrolled
        ? enrolled === "true"
          ? true
          : enrolled === "false"
            ? false
            : undefined
        : undefined;

      // Handle CSV download - Set timeout for the entire operation (2 minutes)
      if (isDownloadFlag) {
        res.setTimeout(2 * 60 * 1000, () => {
          console.log("Request timed out.");
          return sendErrorResponse(
            res,
            ERROR_MESSAGES.COMMON.REQUEST_TIMEOUT,
            504
          );
        });
      }

      // Parse agreementId - support comma-separated values like "1,3,4"
      let agreementIds: number[] | undefined = undefined;
      if (agreementId) {
        const agreementIdStr = String(agreementId);
        agreementIds = agreementIdStr
          .split(",")
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id) && id > 0);
        if (agreementIds.length === 0) {
          agreementIds = undefined;
        }
      }

      const data = await ProgramService.getStoresListing({
        loggedInUser,
        enrolled: enrolledBool,
        enrolledPage: Number(enrolledPage || 1),
        notEnrolledPage: Number(notEnrolledPage || 1),
        sort: String(sort ?? "ASC"),
        sortKey: String(sortKey ?? "sort"),
        searchQuery: String(searchQuery ?? ""),
        selectedSalesRepId: selectedSalesRepId
          ? Number(selectedSalesRepId)
          : null,
        manufacturerId: Number(manufacturerId),
        selectedWarehouseId: Number(warehouseId),
        programTimeline: programTimeline as string,
        isInternalInitiative: isInternalInitiative,
        excludeChainStores: excludeChainStores,
        isDownload: isDownloadFlag,
        hideEnrollTable: hideEnrollTableFlag,
        agreementId: agreementIds
      });

      // Handle CSV download - convert JSON response to CSV without any additional sorting
      if (isDownloadFlag) {
        // Combine stores from both enrolled and not enrolled (unless hideEnrollTable is true)
        // Preserve the order from the service (already sorted based on sort/sortKey parameters)
        const allStores: any[] = [];

        if (!hideEnrollTableFlag && data.storesListingEnrolled?.stores) {
          allStores.push(...data.storesListingEnrolled.stores);
        }

        if (data.storesListingNotEnrolled?.stores) {
          allStores.push(...data.storesListingNotEnrolled.stores);
        }

        // Map store data to CSV format matching frontend table columns
        // No sorting applied here - data is already sorted by the service
        const csvRows = allStores.map((store: any) => {
          const completedPrograms = store.programData?.completedPrograms || 0;
          const totalEnrolled = store.programData?.totalEnrolled || 0;
          const programCompliance = `${completedPrograms}/${totalEnrolled}`;
          const compliancePercentage =
            store.nearComplianceData?.highestCompliancePercentage || 0;

          return {
            "Store Name": store.storeInfo?.name || "",
            "Store ID": store.externalStoreId || "",
            "Chain Name": store.chainNames || "",
            "Purchase Volume": parseFloat(
              String(store.salesData?.purchaseVolume?.amount || 0)
            ).toFixed(2),
            "Store Earnings": parseFloat(
              String(store.salesData?.totalSavings?.amount || 0)
            ).toFixed(2),
            "Earnings Opp.": parseFloat(
              String(store.salesData?.totalOppSavings?.amount || 0)
            ).toFixed(2),
            "% Compliance to Next Tier":
              compliancePercentage > 0 ? `${compliancePercentage}%` : "0%",
            "Program Compliance": programCompliance,
            "Sales Rep Name": store.storeInfo?.rep?.name || ""
          };
        });

        // Convert to CSV string
        const csvString = await writeToString(csvRows, {
          headers: true
        });

        // Generate filename
        const currentDate = new Date().toISOString().split("T")[0];
        const filename = `stores-listing-${currentDate}.csv`;

        // Set response headers for CSV download
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Pragma", "no-cache");

        // Send the CSV data directly
        return res.send(csvString);
      }
      console.log("data", data);

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(
        res,
        error.message,
        error.statusCode || ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves spiff products for a specific manufacturer.
   *
   * This method fetches spiff products for a specific manufacturer based on the
   * provided manufacturer ID and optional warehouse ID. The products include
   * various insights and metrics specific to the manufacturer.
   *
   * @param {Request} req - The request object, containing the manufacturerId as
   * a query parameter and the warehouseId as an optional query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response
   * containing the spiff products.
   */
  /**
   * Check if manufacturer has only one VOID_FILL program that is approved by distributor
   * If true, we should use program_products from the program instead of showing all products
   * @param manufacturerId - The manufacturer ID
   * @param distributorId - The distributor ID (user.associatedUserId)
   * @param programTimeline - Optional program timeline filter
   * @returns Object with shouldUseProgramProducts flag and programId if applicable
   */
  private async checkVoidFillProgramsApproved({
    manufacturerId,
    distributorId,
    programTimeline
  }: {
    manufacturerId: number;
    distributorId: number;
    programTimeline?: string;
  }): Promise<{ shouldUseProgramProducts: boolean; programIds: number[] }> {
    try {
      // Build timeline filter with date-only comparisons
      const timelineCondition = buildProgramTimelineSqlCondition(
        programTimeline,
        "p"
      );

      // Use raw SQL query to get program details and criteria
      const query = `
        SELECT
            p.id AS program_id,
            p.name AS program_name,
            pd.id AS program_detail_id,
            pd.criteria,
            p.start_date,
            p.end_date,
            pa.id AS approval_id,
            pa.status AS approval_status,
            pa.created_at AS approval_created_at
        FROM programs p
        JOIN program_details pd ON pd.program_id = p.id AND pd.deleted_at IS NULL
        LEFT JOIN program_approvals pa ON pa.program_id = p.id
            AND pa.approver_id = :distributorId
            AND pa.approver_type = :distributorType
            AND pa.deleted_at IS NULL
        WHERE p.manufacturer_id = :manufacturerId
            AND p.participant_type = :participantType
            AND p.deleted_at IS NULL
            ${timelineCondition}
        ORDER BY p.id, pd.id;
      `;

      const results = (await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: {
          manufacturerId,
          distributorId,
          distributorType: ENTITY_TYPE.DISTRIBUTOR,
          participantType: ENTITY_TYPE.SALES_REP
        }
      })) as any[];

      // Check conditions:
      // 1. At least one program exists
      // 2. Each program has exactly one program_detail
      // 3. All criteria are VOID_FILL (no mixed criteria)
      // 4. All programs are approved

      if (results.length === 0) {
        return { shouldUseProgramProducts: false, programIds: [] };
      }

      // Group by program_id
      const programMap = new Map<number, any[]>();
      for (const row of results) {
        const programId = row.program_id;
        if (!programMap.has(programId)) {
          programMap.set(programId, []);
        }
        programMap.get(programId)!.push(row);
      }

      // Validate each program meets the criteria
      const validProgramIds: number[] = [];

      for (const [programId, programRows] of programMap.entries()) {
        // Check if only one program_detail exists for this program
        const uniqueProgramDetailIds = new Set(
          programRows.map((r) => r.program_detail_id)
        );
        if (uniqueProgramDetailIds.size !== 1) {
          // Skip this program - it has multiple program_details
          continue;
        }

        // Check if all criteria are VOID_FILL (no mixed criteria)
        const uniqueCriteria = new Set(
          programRows.map((r) => r.criteria).filter((c) => c !== null)
        );

        if (
          uniqueCriteria.size !== 1 ||
          !uniqueCriteria.has(ProgramsDetailCriteria.VOID_FILL)
        ) {
          // Skip this program - not all VOID_FILL
          continue;
        }

        // Check if program is approved
        const hasApproved = programRows.some(
          (r) => r.approval_status === "APPROVED"
        );

        if (!hasApproved) {
          // Skip this program - not approved
          continue;
        }

        // All conditions met for this program
        validProgramIds.push(programId);
      }

      // If we have at least one valid program, use program_products
      if (validProgramIds.length > 0) {
        return {
          shouldUseProgramProducts: true,
          programIds: validProgramIds
        };
      }

      return { shouldUseProgramProducts: false, programIds: [] };
    } catch (error: any) {
      console.error("[checkVoidFillProgramsApproved] Error occurred:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error,
        manufacturerId,
        distributorId,
        programTimeline
      });
      // On error, default to showing all products (safe fallback)
      // Re-throw to surface the error for debugging
      throw new Error(
        `Error in checkVoidFillProgramsApproved: ${error?.message || error?.toString() || "Unknown error"}`
      );
    }
  }

  public async getSpiffProducts(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // To Be Re-factored
      const {
        manufacturerId,
        programTimeline,
        warehouseId: queryWarehouseId
      } = req.query;

      if (!req.user) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH.UNAUTHORIZED,
          HttpStatus.UNAUTHORIZED
        );
      }

      if (!manufacturerId) {
        return sendErrorResponse(
          res,
          "manufacturerId is required",
          HttpStatus.BAD_REQUEST
        );
      }

      const distributorId =
        req.user.role === ENTITY_TYPE.DISTRIBUTOR_ADMIN
          ? req.user.associatedUserId
          : req.user.parentEntityId;

      // Check if we should use program_products for VOID_FILL programs
      let voidFillCheck: {
        shouldUseProgramProducts: boolean;
        programIds: number[];
      } = {
        shouldUseProgramProducts: false,
        programIds: []
      };
      try {
        voidFillCheck = await this.checkVoidFillProgramsApproved({
          manufacturerId: Number(manufacturerId),
          distributorId: distributorId,
          programTimeline: programTimeline as string | undefined
        });
      } catch (error: any) {
        console.error(
          "[getSpiffProducts] Error in checkVoidFillProgramsApproved:",
          {
            message: error?.message,
            stack: error?.stack,
            error: error
          }
        );
        // Continue with default behavior (show all products)
        voidFillCheck = { shouldUseProgramProducts: false, programIds: [] };
      }

      let programProductIds: number[] = [];
      if (
        voidFillCheck.shouldUseProgramProducts &&
        voidFillCheck.programIds.length > 0
      ) {
        try {
          programProductIds =
            await ProgramProductRepository.getProductIdsByProgramIds(
              voidFillCheck.programIds
            );

          // Fallback: If program_products don't exist (empty array), show all products
          if (programProductIds.length === 0) {
            voidFillCheck.shouldUseProgramProducts = false;
          }
        } catch (error: any) {
          console.error(
            "[getSpiffProducts] Error fetching program product IDs:",
            {
              message: error?.message,
              stack: error?.stack,
              error: error
            }
          );
          // Fallback: On error, show all products (original behavior)
          programProductIds = [];
          voidFillCheck.shouldUseProgramProducts = false;
        }
      }

      // Step 1: Get all products_tags from matching programs
      const participantType = "SALES_REP";
      // Build timeline condition with date-only comparisons (no table alias for subquery)
      const timelineCondition = buildProgramTimelineSqlCondition(
        programTimeline as string,
        "" // No table alias needed in subquery
      );

      const programDetails = await ProgramDetail.findAll({
        attributes: ["productsTags"],
        where: {
          program_id: {
            [Op.in]: Sequelize.literal(`(
              SELECT id FROM programs
              WHERE manufacturer_id = ${Number(manufacturerId)}
              AND participant_type = '${participantType}'
              ${timelineCondition}
              AND deleted_at IS NULL
            )`)
          }
        },
        raw: true
      });

      // Step 2: Parse and normalize tags
      const tagSet = new Set<string>();
      let hasProgramsWithoutTags = false;

      for (const row of programDetails) {
        if (row.productsTags && row.productsTags.trim()) {
          row.productsTags
            .split(",")
            .map((t: string) => t.trim().replace(/\s+/g, "_"))
            .forEach((tag) => tagSet.add(tag));
        } else {
          hasProgramsWithoutTags = true;
        }
      }

      const productTags = Array.from(tagSet);

      // Step 3: Get all products for the manufacturer first (needed for warehouse selection)
      const products = await Product.findAll({
        where: {
          manufacturer_id: manufacturerId,
          primary_variant: true,
          deleted_at: null
        },
        attributes: [
          "id",
          "name",
          "size",
          "caseSkusId",
          "unitSkusId",
          "boxSkusId",
          "category_tags_json"
        ],
        raw: true
      });

      const productIds = products.map((p: any) => p.id);

      // Early return if no products found
      if (productIds.length === 0) {
        return sendSuccessResponse(res, {});
      }

      // Step 4: Get warehouse ID - use query parameter if provided, otherwise use distributor's primary warehouse
      let warehouseId: number | null = null;

      if (queryWarehouseId) {
        // If warehouseId is provided in query, use it directly
        warehouseId = Number(queryWarehouseId);
        const warehouse = await Warehouse.findOne({
          where: {
            id: warehouseId,
            distributor_id: req.user.associatedUserId
          },
          attributes: ["id"],
          raw: true
        });

        if (!warehouse) {
          console.log("[getSpiffProducts] Warehouse not found:", {
            warehouseId,
            distributorId: req.user.associatedUserId
          });
          return sendErrorResponse(
            res,
            "Warehouse not found for the provided warehouseId and distributorId",
            HttpStatus.NOT_FOUND
          );
        }
      } else {
        // Get distributor's primary warehouse
        const distributor = await Distributor.findOne({
          where: { id: req.user.associatedUserId },
          attributes: ["primaryWarehouseId"],
          raw: true
        });

        console.log("[getSpiffProducts] Distributor primary warehouse:", {
          distributorId: req.user.associatedUserId,
          primaryWarehouseId: distributor?.primaryWarehouseId
        });

        if (distributor?.primaryWarehouseId) {
          warehouseId = distributor.primaryWarehouseId;
        } else {
          // Fallback: Get first warehouse from distributor if no primary warehouse
          const warehouseIds = await DistributorRepository.getWarehouseIds(
            distributorId,
            undefined,
            undefined,
            undefined,
            true
          );
          warehouseId = warehouseIds?.length ? warehouseIds[0] : null;
        }
      }

      // Step 5: Get codes, last_transaction_date, and product_name from product_code_mappings (only if we have a warehouseId)
      const codeMap: Record<number, string> = {};
      const lastTransactionDateMap: Record<number, Date | string | null> = {};
      const productNameMap: Record<number, string | null> = {};

      if (warehouseId) {
        const codeMappings = await ProductCodeMapping.findAll({
          where: {
            distributorId: distributorId,
            warehouseId: warehouseId,
            productId: { [Op.in]: productIds }
          },
          attributes: [
            "productId",
            "code",
            ["last_transaction_date", "lastTransactionDate"],
            ["product_name", "productName"]
          ],
          raw: true
        });

        for (const row of codeMappings) {
          codeMap[row.productId] = row.code;
          // Handle both camelCase (model) and snake_case (raw query) property names
          lastTransactionDateMap[row.productId] =
            (row as any).lastTransactionDate ||
            (row as any).last_transaction_date ||
            null;
          productNameMap[row.productId] =
            (row as any).productName || (row as any).product_name || null;
        }
      }

      // Determine if user is manufacturer (this endpoint is for distributor roles, so should be false)
      const isManufacturerUser = isManufacturer(req.user.role);

      // Step 6: Group by tag and enrich with code
      const productsByTag: Record<string, any> = {};

      // Always create "All Products" tab if any program has no tags
      if (hasProgramsWithoutTags) {
        let filteredProducts = products;

        // Apply filter based on VOID_FILL check
        if (
          voidFillCheck.shouldUseProgramProducts &&
          programProductIds.length > 0
        ) {
          // Use only products from program_products for VOID_FILL programs
          filteredProducts = products.filter((p: any) =>
            programProductIds.includes(p.id)
          );
        }
        // Fallback: If not VOID_FILL, or programProductIds is empty, show all products (original behavior)

        productsByTag["All Products"] = {
          sortOrder: 0,
          purchasedProducts: [],
          requiredProducts: filteredProducts.map((p: any) => {
            const lastTransactionDate = lastTransactionDateMap[p.id] || null;
            const originalCode = codeMap[p.id] || null;
            const internalCode = getActiveInternalCode(
              originalCode,
              lastTransactionDate,
              distributorId
            );
            // oldInternalCode should always contain the original code for reference/troubleshooting
            // It should be NULL only if there was no original code in the database
            const oldInternalCode = originalCode;

            // Prepare product object with warehouse-specific name if available
            const productWithWarehouseName = {
              ...p,
              product_name: productNameMap[p.id] || null,
              productName: productNameMap[p.id] || null
            };

            // Resolve product name based on user role and warehouse-specific data
            const { name, is_warehouse_specific_product } = resolveProductName(
              productWithWarehouseName,
              isManufacturerUser
            );

            return {
              id: p.id,
              name: name,
              size: p.size,
              caseSkusId: p.caseSkusId,
              unitSkusId: p.unitSkusId,
              boxSkusId: p.boxSkusId,
              wishlist: false,
              internalCode: internalCode,
              oldInternalCode: oldInternalCode,
              lastTransactionDate: lastTransactionDate,
              is_warehouse_specific_product: is_warehouse_specific_product
            };
          })
        };
      }

      // Create specific tag tabs if there are tags
      if (productTags.length > 0) {
        let sortOrder = hasProgramsWithoutTags ? 1 : 0;
        for (const tag of productTags) {
          const tagProducts = products.filter((p: any) =>
            Array.isArray(p.category_tags_json)
              ? p.category_tags_json.includes(tag)
              : false
          );

          // Set Flex category to have the highest sort order (at the end)
          const isFlexCategory =
            tag.replace(/_/g, " ")?.toLowerCase() == "flex" ||
            tag.replace(/_/g, " ")?.toLowerCase() == "recommended flex";
          const currentSortOrder = isFlexCategory
            ? hasProgramsWithoutTags
              ? productTags.length + 1
              : productTags.length
            : sortOrder++;

          // Apply filter based on VOID_FILL check
          let filteredTagProducts = tagProducts;
          if (
            voidFillCheck.shouldUseProgramProducts &&
            programProductIds.length > 0
          ) {
            // Use only products from program_products for VOID_FILL programs
            filteredTagProducts = tagProducts.filter((p: any) =>
              programProductIds.includes(p.id)
            );
          }
          // Fallback: If not VOID_FILL, or programProductIds is empty, show all tag products (original behavior)

          productsByTag[tag.replace(/_/g, " ")] = {
            sortOrder: currentSortOrder,
            purchasedProducts: [],
            requiredProducts: filteredTagProducts.map((p: any) => {
              const lastTransactionDate = lastTransactionDateMap[p.id] || null;
              const originalCode = codeMap[p.id] || null;
              const internalCode = getActiveInternalCode(
                originalCode,
                lastTransactionDate,
                distributorId
              );
              // oldInternalCode should always contain the original code for reference/troubleshooting
              // It should be NULL only if there was no original code in the database
              const oldInternalCode = originalCode;

              // Prepare product object with warehouse-specific name if available
              const productWithWarehouseName = {
                ...p,
                product_name: productNameMap[p.id] || null,
                productName: productNameMap[p.id] || null
              };

              // Resolve product name based on user role and warehouse-specific data
              const { name, is_warehouse_specific_product } =
                resolveProductName(
                  productWithWarehouseName,
                  isManufacturerUser
                );

              return {
                id: p.id,
                name: name,
                size: p.size,
                caseSkusId: p.caseSkusId,
                unitSkusId: p.unitSkusId,
                boxSkusId: p.boxSkusId,
                wishlist: false,
                internalCode: internalCode,
                oldInternalCode: oldInternalCode,
                lastTransactionDate: lastTransactionDate,
                is_warehouse_specific_product: is_warehouse_specific_product
              };
            })
          };
        }
      }

      return sendSuccessResponse(res, productsByTag);
    } catch (error: any) {
      console.error("[getSpiffProducts] Error occurred:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error
      });

      const errorMessage =
        error?.message ||
        (error?.toString ? error.toString() : "Unknown error occurred");

      return sendErrorResponse(
        res,
        `Error in getSpiffProducts: ${errorMessage}`,
        error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves void fill programs summary for distributors.
   *
   * This method fetches a summary of void fill programs based on the
   * provided user type and optional manufacturer ID and program timeline.
   *
   * @param {Request} req - The request object, containing query parameters
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response
   * containing the void fill programs summary.
   */
  public async GetVoidFillProgramsSummary(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const {
        salesRepIds,
        excludeChainStores,
        warehouseId: requestedWarehouseId,
        programId,
        warehouseIdFilter,
        isDownload,
        manufacturerId,
        programTimeline
      } = req.body;
      const distributorId = getParentDistributorId(req.user, req.user.role);

      const userId = req.user.associatedUserId;

      const parsedRequestedWarehouseId =
        requestedWarehouseId && !isNaN(Number(requestedWarehouseId))
          ? Number(requestedWarehouseId)
          : undefined;

      let effectiveWarehouseId = parsedRequestedWarehouseId;
      if (isDistributorGeneralManager(req.user.role)) {
        // IMPORTANT: Don't pass the requestedWarehouseId to getWarehouseIds(), because that short-circuits
        // and would allow a GM to request any warehouseId.
        const assignedWarehouseIds =
          (await DistributorRepository.getWarehouseIdsByGeneralManager({
            generalManagerUserId: Number(req.user.associatedUserId as number),
            fetchWarehouseName: false
          })) as number[];

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
          parsedRequestedWarehouseId &&
          parsedRequestedWarehouseId !== assignedWarehouseId
        ) {
          throw ApiError.authorizationFailed(
            "Not authorized for requested warehouse"
          );
        }

        effectiveWarehouseId = assignedWarehouseId;
      }

      const response = await ProgramService.getVoidFillProgramsSummary({
        distributorId,
        userId,
        salesRepIds,
        role: req.user.role,
        excludeChainStores,
        warehouseId: effectiveWarehouseId,
        programId,
        warehouseIdFilter,
        isDownload: isDownload && isDownload === true,
        manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
        programTimeline: programTimeline as string | undefined
      });

      // Handle CSV download
      if (isDownload && isDownload === true) {
        // Get CSV data from service (already processed)
        // When isDownload is true, service returns array directly from getVoidFillSummaryForCSV
        const csvData = Array.isArray(response) ? response : [];

        // Filter out rows with "N/A" sales rep names or no earnings
        const filteredData = csvData.filter((item: any) => {
          const hasValidName =
            item.sales_rep_name &&
            item.sales_rep_name.trim() !== "" &&
            item.sales_rep_name.trim().toUpperCase() !== "N/A";
          const hasEarnings =
            (item.actual_gaps && item.actual_gaps > 0) ||
            (item.total_earning && item.total_earning > 0);

          // Include only if has valid name AND has earnings
          return hasValidName && hasEarnings;
        });

        // Map data to CSV format based on screenshot requirements
        const csvRows = filteredData.map((item: any) => {
          // Use potential_dollars from service (calculated using fixed_amount from program_details)
          const potentialDollars = parseFloat(
            String(item.potential_dollars || 0)
          );

          // Calculate Opportunity Dollars: potential_dollars - total_earning
          const opportunityDollars = Math.max(
            0,
            potentialDollars - (item.total_earning || 0)
          );

          return {
            Salesperson: item.sales_rep_name || "",
            "Sales ID": item.sales_rep_external_id || item.sales_rep_id || "",
            "Potential Void Fill": item.total_remaining_target || 0,
            "Actual Void Fill": item.actual_gaps || 0,
            "%": item.percentage?.toFixed(2) || "0.00",
            "Potential Dollars": potentialDollars.toFixed(2),
            "Earned Dollars": parseFloat(
              String(item.total_earning || 0)
            ).toFixed(2),
            "Opportunity Dollars": parseFloat(
              String(opportunityDollars || 0)
            ).toFixed(2)
          };
        });

        // Convert to CSV string
        const csvString = await writeToString(csvRows, {
          headers: true
        });

        // Generate filename
        const currentDate = new Date().toISOString().split("T")[0];
        const filename = `void-fill-summary-report-${currentDate}.csv`;

        // Set response headers for CSV download
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Pragma", "no-cache");

        // Send the CSV data directly
        return res.send(csvString);
      }

      return sendSuccessResponse(res, response);
    } catch (error: any) {
      console.log("error =>", error);
      return sendErrorResponse(
        res,
        error.message,
        error.statusCode || ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get program PDF URL
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} A promise that resolves with the program PDF URL
   */
  public async getProgramPdf(req: Request, res: Response): Promise<Response> {
    try {
      const { manufacturerId } = req.params;
      const { timeline, programType } = req.query;
      const distributorId = getParentDistributorId(req.user, req.user.role);
      // Validate manufacturerId
      if (!manufacturerId || isNaN(Number(manufacturerId))) {
        return sendErrorResponse(
          res,
          "Invalid manufacturer ID",
          HttpStatus.BAD_REQUEST
        );
      }
      // Validate timeline
      const validTimeline = timeline === "Current" || timeline === "Upcoming";
      if (!validTimeline) {
        return sendErrorResponse(
          res,
          "Timeline must be 'Current' or 'Upcoming'",
          HttpStatus.BAD_REQUEST
        );
      }
      if (!distributorId) {
        return sendErrorResponse(
          res,
          "Distributor ID not found. Please contact support.",
          HttpStatus.BAD_REQUEST
        );
      }
      // Default programType to STORE if not provided and validate programType
      const validProgramType = ["DISTRIBUTOR", "STORE", "SPIFF"];
      const finalProgramType = validProgramType.includes(programType as string)
        ? (programType as string)
        : "STORE";
          // :key: CREATE CACHE KEY
      const cacheKey = createCacheKey("program_pdf_v1", {
        manufacturerId: Number(manufacturerId),
        distributorId: Number(distributorId),
        timeline,
        programType: finalProgramType
      });
      console.log("[CACHE] Checking cache for key: aaaaaa", cacheKey);
      let result;
      // :magnifying_glass: CHECK CACHE FIRST
      if (useApiCaching) {
        const cachedData = await redisClient.get(cacheKey);
        console.log("[CACHE] Found cached data: aaaaaa", cachedData);
        if (cachedData) {
          return sendSuccessResponse(res, JSON.parse(cachedData));
        }
      }
      // Get PDF URL
      // :turtle: CACHE MISS → DB / SERVICE CALL
      result = await ProgramPdfService.getProgramPdfUrl(
        Number(manufacturerId),
        Number(distributorId),
        timeline as "Current" | "Upcoming",
        finalProgramType as "DISTRIBUTOR" | "STORE" | "SPIFF"
      );
      // :floppy_disk: SAVE TO CACHE
      if (useApiCaching) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(result)
        );
      }
      return sendSuccessResponse(res, result);
    } catch (error: any) {
      console.error("Error getting program PDF:", error);
      return sendErrorResponse(
        res,
        error.message || "Failed to get program PDF",
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

// Export an instance of the class to use in routes
export default new ProgramController();
