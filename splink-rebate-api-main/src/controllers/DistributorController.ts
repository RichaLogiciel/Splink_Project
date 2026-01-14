import crypto from "crypto";
import { Request, Response } from "express";
import { Op } from "sequelize";
import {
  CACHE_TTL_TIME,
  ENTITY_TYPE,
  PROGRAM_TIMELINE,
  REPORT_TYPE,
  useApiCaching
} from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { HttpStatus } from "../config/HttpStatus";
import { USER_ROLES } from "../config/roles";
import sequelize from "../db";
import { ApiError } from "../lib/errors/APIError";
import logger from "../lib/logger";
import ManagerSalesRepMapping from "../models/ManagerSalesRepMapping";
import Manufacturer from "../models/Manufacturer";
import Program from "../models/Program";
import ProgramCompliance from "../models/ProgramCompliance";
import StoreSalesRep from "../models/StoreSalesRep";
import UserRole from "../models/UserRole";
import DistributorRepository from "../repositories/DistributorRepository";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import StoreRepository from "../repositories/StoreRepository";
import {
  default as DistributorDashboardService,
  default as DistributorService
} from "../services/DistributorService";
import { createCacheKey } from "../utils/cacheUtils";
import { getCacheKey, redisClient } from "../utils/redis";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";
import {
  getDistributorIdAsRole,
  getParentDistributorId,
  isDistributorAdminAndExecutive,
  isDistributorAdminOrManagerOrExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRep,
  isDistributorSalesRepManager
} from "../utils/roles";

class DistributorDashboardController {
  /**
   * This method returns the key metrics for a distributor.
   * The key metrics include:
   * 1. Total Savings
   * 2. Total Purchase Volume
   * 3. Stores Count
   * 4. Manufacturers Count
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */
  public async getKeyMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const { warehouseId: selectedWarehouseId } = req.query;
      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      if (!distributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      let managerId = undefined;
      let isGeneralManager = false;
      if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        managerId = req.user.associatedUserId;
        isGeneralManager = isDistributorGeneralManager(req.user.role);
      }

      const cacheKey = getCacheKey(
        "distributor_key_metrics",
        "getKeyMetrics",
        distributorId.toString(),
        managerId?.toString() || "null",
        isGeneralManager?.toString() || "false",
        selectedWarehouseId?.toString() || "null",
        req.user.role || "null",
        req.user.id?.toString() || "null"
      );
      const hashedCacheKey = crypto
        .createHash("md5")
        .update(cacheKey)
        .digest("hex");

      let data: any;
      if (useApiCaching) {
        const cached = await redisClient.get(hashedCacheKey);
        if (cached) {
          data = JSON.parse(cached);
        }
      }

      if (!data) {
        data = await DistributorDashboardService.getKeyMetrics(
          Number(distributorId),
          managerId,
          isGeneralManager,
          Number(selectedWarehouseId)
        );

        if (useApiCaching) {
          await redisClient.setEx(
            hashedCacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(data)
          );
        }
      }

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }
  /**
   * This method returns the store program overview data for a distributor.
   * The store program overview includes the top and bottom performing programs.
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */
  public async getStoreProgramOverview(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      if (!distributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const response =
        await DistributorDashboardService.getStoreProgramOverview(
          parseInt(distributorId as string)
        );

      return sendSuccessResponse(res, response);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * This method returns the total earnings for all sales representatives associated with a distributor.
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */

  public async getSalesRepEarnings(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const distributorId = getDistributorIdAsRole(req.user, req.user.role);
      const {
        sortBy,
        sortOrder,
        warehouseId: requestedWarehouseId,
        programTimeline
      } = req.query;

      if (!distributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const isGeneralManager = isDistributorGeneralManager(req.user.role);
      const parsedRequestedWarehouseId =
        requestedWarehouseId && !isNaN(Number(requestedWarehouseId))
          ? Number(requestedWarehouseId)
          : undefined;

      let effectiveWarehouseId = parsedRequestedWarehouseId;
      if (isGeneralManager) {
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
      // Default to "Current" if programTimeline is not provided
      const timeline = (programTimeline as string) || "Current";

      const cacheKey = createCacheKey("distributor_sales_rep_earnings", {
        distributorId: Number(distributorId),
        selectedWarehouseId: effectiveWarehouseId,
        sortBy: sortBy?.toString() || "storesName",
        sortOrder: sortOrder?.toString() || "ASC",
        programTimeline: timeline,
        role: req.user.role,
        userId: req.user.id?.toString() || "null"
      });

      const hashedCacheKey = crypto
        .createHash("md5")
        .update(cacheKey)
        .digest("hex");

      let response: any;
      if (useApiCaching) {
        const cached = await redisClient.get(hashedCacheKey);
        if (cached) {
          // console.log(`[CACHE] Cache hit for key: ${hashedCacheKey}`);
          response = JSON.parse(cached);
        }
      }

      if (!response) {
        // console.log(`[CACHE] Cache miss for key: ${hashedCacheKey}`);
        response = await DistributorDashboardService.getSalesRepEarnings({
          parentEntityId: parseInt(distributorId as string),
          selectedWarehouseId: effectiveWarehouseId,
          sortBy: sortBy as string | undefined,
          sortOrder: sortOrder as "ASC" | "DESC" | undefined,
          programTimeline: timeline
        });

        if (useApiCaching) {
          await redisClient.setEx(
            hashedCacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(response)
          );
        }
      }

      return sendSuccessResponse(res, response);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * This method retrieves sales data for a distributor.
   * The data includes total sales and bar chart data for the specified number of months.
   * @param {Request} req - The request object, containing the distributorId and months as query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the sales data response.
   */
  public async getSales(req: Request, res: Response): Promise<Response> {
    try {
      const {
        categoryId,
        isTotalSales,
        month,
        warehouseId: selectedWarehouseId
      } = req.query;

      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      const parsedDistributorId = parseInt(distributorId as string);

      let managerId = undefined;
      let isGeneralManager = false;
      if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        managerId = req.user.associatedUserId;
        isGeneralManager = isDistributorGeneralManager(req.user.role);
      }

      // Generate cache key with all relevant parameters
      const cacheKey = getCacheKey(
        "distributor_sales", // namespace
        "getSales",
        parsedDistributorId.toString(),
        categoryId?.toString() || "0",
        (isTotalSales as string) || "false",
        String(month ?? "1"),
        managerId?.toString() || "null",
        isGeneralManager?.toString() || "false",
        selectedWarehouseId?.toString() || "null"
      );

      let response;

      // Check cache first if caching is enabled
      if (useApiCaching) {
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            response = JSON.parse(cached);
            return sendSuccessResponse(res, response);
          }
        } catch (error) {
          console.error("Cache read error:", error);
        }
      }

      // Get fresh data from service
      response = await DistributorDashboardService.getSales(
        parsedDistributorId,
        categoryId ? parseInt(categoryId as string) : 0,
        (isTotalSales as string) == "true",
        String(month ?? "1"),
        managerId,
        isGeneralManager,
        Number(selectedWarehouseId)
      );

      // Cache the response if caching is enabled
      if (useApiCaching) {
        try {
          await redisClient.setEx(
            cacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(response)
          );
        } catch (error) {
          console.error("Cache write error:", error);
        }
      }

      return sendSuccessResponse(res, response);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the Store programs enrollment details for a distributor or sales representative.
   * The enrollment details include the manufacturer information and the number of stores participating in the programs.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the programs enrollment details.
   */
  public async getProgramsEnrollment(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const {
        warehouseId: requestedWarehouseId,
        excludeChainStores,
        programTimeline
      } = req.query;

      const distributorId =
        req.user.role == ENTITY_TYPE.DISTRIBUTOR_ADMIN
          ? req.user.associatedUserId
          : req.user.parentEntityId;

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const isGeneralManager = isDistributorGeneralManager(req.user.role);
      const parsedRequestedWarehouseId =
        requestedWarehouseId && !isNaN(Number(requestedWarehouseId))
          ? Number(requestedWarehouseId)
          : undefined;

      let effectiveWarehouseId = parsedRequestedWarehouseId;
      if (isGeneralManager) {
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
      // Default to "Current" if programTimeline is not provided
      const timeline = (programTimeline as string) || "Current";

      const data = await DistributorService.getProgramsEnrollment({
        salesRepId: Number(
          req.user.role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP
            ? req.user.associatedUserId
            : 0
        ),
        distributorId,
        loggedInUser: req.user,
        selectedWarehouseId: effectiveWarehouseId,
        excludeChainStores: excludeChainStores === "true" ? true : false,
        programTimeline: timeline
      });

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getProductInsightKeyMetrics(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("🎯 [PRODUCT-INSIGHTS-KEY-METRICS] Endpoint hit", {
      manufacturerId: req.body.manufacturerId,
      monthRange: req.body.monthRange,
      selectedProducts: req.body.selectedProducts?.length || "all",
      warehouseId: req.body.warehouseId || "none",
      userId: req.user?.userId,
      userRole: req.user?.role
    });

    try {
      const {
        manufacturerId,
        monthRange,
        selectedProducts,
        warehouseId: selectedWarehouseId
      } = req.body;

      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      let managerId = undefined;
      let isGeneralManager = false;
      if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        managerId = req.user.associatedUserId;
        isGeneralManager = isDistributorGeneralManager(req.user.role);
      }

      // Generate cache key with proper handling of undefined/null values
      const cacheKeyParams = {
        distributorId,
        manufacturerId: manufacturerId || "null",
        monthRange,
        selectedProducts: selectedProducts || "all",
        managerId: managerId || "null",
        isGeneralManager: isGeneralManager ? "true" : "false",
        selectedWarehouseId: selectedWarehouseId || "null"
      };

      const cacheKey = `dist_insights_key_metrics_${cacheKeyParams.distributorId}_${cacheKeyParams.manufacturerId}_${cacheKeyParams.monthRange}_${cacheKeyParams.selectedProducts}_${cacheKeyParams.managerId}_${cacheKeyParams.isGeneralManager}_${cacheKeyParams.selectedWarehouseId}`;

      let data: any;
      const hashedCacheKey = crypto
        .createHash("md5")
        .update(cacheKey)
        .digest("hex");
      if (useApiCaching) {
        const cachedData = await redisClient.get(hashedCacheKey);
        if (cachedData) {
          data = JSON.parse(cachedData);
          return sendSuccessResponse(res, data);
        }
      }

      // If no cached data, fetch from service
      if (!data) {
        // Fetch data from service
        data = await DistributorDashboardService.getProductInsightKeyMetrics(
          Number(distributorId),
          Number(manufacturerId),
          monthRange as string,
          selectedProducts,
          Number(managerId),
          isGeneralManager,
          Number(selectedWarehouseId)
        );

        // Cache the data
        if (useApiCaching) {
          await redisClient.setEx(
            hashedCacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(data)
          );
        }
      }

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getProductInsights(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("📊 [PRODUCT-INSIGHTS] Endpoint hit", {
      manufacturerId: req.body.manufacturerId,
      monthRange: req.body.monthRange,
      selectedProducts: req.body.selectedProducts?.length || "all",
      warehouseId: req.body.warehouseId || "none",
      userId: req.user?.userId,
      userRole: req.user?.role
    });

    try {
      const {
        manufacturerId,
        monthRange,
        selectedProducts,
        warehouseId: selectedWarehouseId
      } = req.body;

      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      let managerId = undefined;
      let isGeneralManager = false;
      if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        managerId = req.user.associatedUserId;
        isGeneralManager = isDistributorGeneralManager(req.user.role);
      }

      // Generate cache key with proper handling of undefined/null values
      const cacheKeyParams = {
        distributorId,
        manufacturerId: manufacturerId || "null",
        monthRange,
        selectedProducts: selectedProducts || "all",
        managerId: managerId || "null",
        isGeneralManager: isGeneralManager ? "true" : "false",
        selectedWarehouseId: selectedWarehouseId || "null"
      };

      const cacheKey = `dist_insights_${cacheKeyParams.distributorId}_${cacheKeyParams.manufacturerId}_${cacheKeyParams.monthRange}_${cacheKeyParams.selectedProducts}_${cacheKeyParams.managerId}_${cacheKeyParams.isGeneralManager}_${cacheKeyParams.selectedWarehouseId}`;

      let data: any;
      const hashedCacheKey = crypto
        .createHash("md5")
        .update(cacheKey)
        .digest("hex");
      if (useApiCaching) {
        const cachedData = await redisClient.get(hashedCacheKey);
        if (cachedData) {
          data = JSON.parse(cachedData);
          return sendSuccessResponse(res, data);
        }
      }

      // If no cached data, fetch from service
      if (!data) {
        // Fetch data from service
        data = await DistributorDashboardService.getProductInsights(
          Number(distributorId),
          Number(manufacturerId),
          monthRange as string,
          selectedProducts,
          Number(managerId),
          isGeneralManager,
          Number(selectedWarehouseId)
        );

        // Cache the data
        if (useApiCaching) {
          await redisClient.setEx(
            hashedCacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(data)
          );
        }
      }

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async updateStoreSalesRepRelation(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("👤 [ASSIGN-SALES-REP] Endpoint hit", {
      storeId: req.params.storeId,
      salesRepId: req.params.salesRepId,
      userId: req.user?.userId,
      userRole: req.user?.role
    });

    try {
      const { storeId, salesRepId } = req.params;

      const distributorId =
        req.user.role == USER_ROLES.DISTRIBUTOR_EXECUTIVE
          ? req.user.parentEntityId
          : req.user.associatedUserId;

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      if (!storeId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.STORE_ID);
      }

      if (!salesRepId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.SALESREP_ID);
      }

      const data =
        await DistributorDashboardService.updateStoreSalesRepRelation(
          Number(distributorId),
          Number(storeId),
          Number(salesRepId)
        );

      console.log("data", data);

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the list of warehouses associated with a distributor.
   *
   * This method fetches all warehouses linked to the distributor based on the user's role.
   * If the user is a `DISTRIBUTOR_EXECUTIVE`, the `parentEntityId` is used to identify the distributor.
   * Otherwise, the `associatedUserId` is used.
   *
   * @param {Request} req - The request object containing the user's role and associated IDs.
   * @param {Response} res - The response object used to send the result or error.
   * @returns {Promise<Response>} - A promise that resolves with the list of warehouses or an error response.
   * @throws Will throw an error if the distributor ID is missing or invalid.
   */
  public async getDistributorWarehouses(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("🏭 [GET-WAREHOUSES] Endpoint hit", {
      userId: req.user?.userId,
      userRole: req.user?.role
    });

    try {
      const distributorId =
        req.user.role == USER_ROLES.DISTRIBUTOR_EXECUTIVE
          ? req.user.parentEntityId
          : req.user.associatedUserId;

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const data = await DistributorDashboardService.getDistributorWarehouses(
        Number(distributorId)
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the list of warehouses associated with a distributor's general manager.
   *
   * This method fetches all warehouses linked to the distributor's general manager based on the user's role.
   * If the user is a `DISTRIBUTOR_EXECUTIVE`, the `parentEntityId` is used to identify the distributor.
   * Otherwise, the `associatedUserId` is used.
   *
   * @param {Request} req - The request object containing the user's role and associated IDs.
   * @param {Response} res - The response object used to send the result or error.
   * @returns {Promise<Response>} - A promise that resolves with the list of warehouses or an error response.
   * @throws Will throw an error if the distributor ID or manager ID is missing or invalid.
   */
  public async getDistributorManagerWarehouses(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("🏭 [GET-MANAGER-WAREHOUSES] Endpoint hit", {
      managerId: req.query.managerId,
      returnAssigned: req.query.returnAssigned,
      userId: req.user?.userId,
      userRole: req.user?.role
    });

    try {
      const { managerId: selectedManagerId, returnAssigned } = req.query;
      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      let distributorManagerId = undefined;
      const managerId = Number(selectedManagerId);

      if (
        isDistributorAdminOrManagerOrExecutive(req.user.role) &&
        isNaN(managerId)
      ) {
        distributorManagerId = req.user.associatedUserId;
      }

      if (!distributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      if (isNaN(managerId) && !distributorManagerId) {
        throw ApiError.notFound(
          ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_GENERAL_MANAGER_ID
        );
      }

      const isAdminOrExecutive = isDistributorAdminAndExecutive(req.user.role);

      if (isDistributorSalesRepManager(req.user.role)) {
        const warehouseData =
          await DistributorRepository.getDistributorSalesRepManagerWarehouse(
            req.user.associatedUserId as number
          );

        // Format response to match DistributorDashboardService.getDistributorManagerWarehouses
        const data =
          returnAssigned == "true"
            ? warehouseData
            : {
                warehouses: {
                  assigned: warehouseData,
                  unassigned: []
                }
              };

        return sendSuccessResponse(res, data);
      }

      const data =
        await DistributorDashboardService.getDistributorManagerWarehouses(
          Number(distributorId),
          Number(distributorManagerId ?? managerId),
          returnAssigned == "true",
          isAdminOrExecutive,
          req.user.role
        );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async updateDistributorManagerWarehouseAssignment(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("🔄 [ASSIGN-MANAGER-WAREHOUSE] Endpoint hit", {
      managerId: req.params.managerId,
      warehouseId: req.params.warehouseId,
      userId: req.user?.userId,
      userRole: req.user?.role
    });

    try {
      const { managerId, warehouseId } = req.params;
      const distributorId =
        req.user.role == USER_ROLES.DISTRIBUTOR_EXECUTIVE
          ? req.user.parentEntityId
          : req.user.associatedUserId;

      if (!distributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      if (!managerId) {
        throw ApiError.notFound(
          ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_GENERAL_MANAGER_ID
        );
      }

      if (!warehouseId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.WAREHOUSE_ID);
      }

      const data =
        await DistributorDashboardService.updateDistributorManagerWarehouseAssignment(
          Number(distributorId),
          Number(managerId),
          Number(warehouseId)
        );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getDistributorSpiffSummary(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("💰 [SPIFF-SUMMARY] Endpoint hit", {
      programTimeline: req.query.programTimeline,
      isInternal: req.query.isInternal,
      userId: req.user?.userId,
      userRole: req.user?.role
    });

    try {
      const { programTimeline, isInternal } = req.query;
      const isInternalInitiative: boolean =
        isInternal === "true" ? true : false;

      const isSalesRep = isDistributorSalesRep(req.user.role);
      const isSalesRepManager = isDistributorSalesRepManager(req.user.role);
      const distributorId = getParentDistributorId(req.user, req.user.role);

      if (!distributorId) {
        return sendErrorResponse(
          res,
          "Distributor ID not found for user.",
          400
        );
      }

      const excludedProgramIds =
        await ProgramRepository.getExcludedProgramIds(distributorId);

      const authorizedManufacturers =
        await ManufacturerRepository.getAuthorizedManufacturersIds(
          distributorId
        );
      const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
        Number(am.manufacturerId)
      );

      let salesRepIds: any[] = [];
      if (isSalesRepManager) {
        const salesReps = await ManagerSalesRepMapping.findAll({
          where: {
            salesManagerId: req.user.associatedUserId
          },
          attributes: ["salesRepId"],
          raw: true
        });
        salesRepIds = salesReps.map((sr) => sr.salesRepId);
      } else {
        const salesReps = await UserRole.findAll({
          where: {
            parentEntityId: distributorId,
            role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
            ...(isSalesRep
              ? { associatedUserId: req.user.associatedUserId }
              : {})
          },
          attributes: ["associatedUserId"],
          raw: true
        });

        salesRepIds = salesReps.map((sr) => sr.associatedUserId);
      }

      if (salesRepIds.length === 0) {
        return sendSuccessResponse(res, []);
      }

      const programWhere: any = {};
      if (excludedProgramIds?.length > 0) {
        programWhere.id = {
          [Op.notIn]: excludedProgramIds
        };
      }

      // Handle internal initiative filtering - include null/undefined for non-internal
      if (isInternal !== undefined) {
        if (isInternalInitiative === false) {
          programWhere[Op.or] = [
            { internal_initiative: false },
            { internal_initiative: { [Op.is]: null } }
          ];
        } else if (isInternalInitiative === true) {
          programWhere.internal_initiative = true;
        }
      }

      const storesCount = await StoreSalesRep.count({
        where: {
          sales_rep_id: {
            [Op.in]: salesRepIds
          }
        }
      });

      const data = await Program.findAll({
        attributes: [
          [sequelize.col("Manufacturer.name"), "manufacturer"],
          [sequelize.col("Manufacturer.logo"), "logo"],
          [sequelize.col("Manufacturer.id"), "id"],
          [
            sequelize.fn(
              "COALESCE",
              sequelize.fn(
                "SUM",
                sequelize.col("ProgramCompliances.earned_rebate")
              ),
              0
            ),
            "total_earnings"
          ],
          [sequelize.fn("MIN", sequelize.col("start_date")), "Start_Date"],
          [sequelize.fn("MAX", sequelize.col("end_date")), "End_Date"]
        ],
        include: [
          {
            model: Manufacturer,
            attributes: [],
            required: true
          },
          {
            model: ProgramCompliance,
            attributes: [],
            required: false,
            // Use allData scope for historical data to bypass current year restriction
            ...(programTimeline === PROGRAM_TIMELINE.HISTORICAL
              ? { scope: "allData" }
              : {}),
            where: {
              entity_id: { [Op.in]: salesRepIds },
              entity_type: ENTITY_TYPE.SALES_REP,
              status: "active",
              deleted_at: null,
              [Op.and]: [
                // Program ID approval check
                sequelize.literal(`
                  EXISTS (
                    SELECT 1 FROM program_approvals pa
                    INNER JOIN programs p
                      ON p.id = pa.program_id
                      AND p.deleted_at IS NULL
                      AND (p.internal_initiative = false OR p.internal_initiative IS NULL)
                      AND p.participant_type = 'SALES_REP'
                      AND p.manufacturer_id IN (${authorizedManufacturerIds.join(",")})
                    WHERE pa.program_id = "ProgramCompliances"."program_id"
                      AND pa.approver_type = 'DISTRIBUTOR'
                      AND pa.approver_id = ${distributorId}
                      AND pa.status = 'APPROVED'
                      AND pa.deleted_at IS NULL
                  )
                `)
              ]
            }
          }
        ],
        where: {
          participant_type: ENTITY_TYPE.SALES_REP,
          deleted_at: null,
          manufacturer_id: {
            [Op.in]: authorizedManufacturerIds
          },
          ...programWhere,
          ...Program.getProgramTimelineFilter(programTimeline as string)
        },
        group: [
          sequelize.col("Manufacturer.name"),
          sequelize.col("Manufacturer.logo"),
          sequelize.col("Manufacturer.id")
        ],
        order: [[sequelize.fn("MIN", sequelize.col("start_date")), "ASC"]],
        raw: true
      });

      const responseData = data.map((item) => ({
        ...item,
        eligibleStores: storesCount
      }));

      return sendSuccessResponse(res, responseData);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
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
   * @param {Request} req - The request object containing user details and role information.
   * @param {Response} res - The response object used to return the earnings data or an error.
   * @returns {Promise<Response>} - A promise that resolves with the total and top 10 store earnings or an error response.
   * @throws Will return an error response if the distributor ID is not found or if any internal error occurs.
   */
  public async getDistributorStoreEarnings(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("💵 [STORE-EARNINGS] Endpoint hit", {
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      warehouseId: req.query.warehouseId,
      programTimeline: req.query.programTimeline,
      userId: req.user?.userId,
      userRole: req.user?.role
    });
    try {
      const distributorId = getDistributorIdAsRole(req.user, req.user.role);
      const {
        sortBy,
        sortOrder,
        warehouseId: requestedWarehouseId,
        programTimeline
      } = req.query;

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const isGeneralManager = isDistributorGeneralManager(req.user.role);
      const parsedRequestedWarehouseId =
        requestedWarehouseId && !isNaN(Number(requestedWarehouseId))
          ? Number(requestedWarehouseId)
          : undefined;

      let effectiveWarehouseId = parsedRequestedWarehouseId;
      if (isGeneralManager) {
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
          parsedRequestedWarehouseId &&
          parsedRequestedWarehouseId !== assignedWarehouseId
        ) {
          throw ApiError.authorizationFailed(
            "Not authorized for requested warehouse"
          );
        }
        effectiveWarehouseId = assignedWarehouseId;
      }
      // Default to "Current" if programTimeline is not provided
      const timeline = (programTimeline as string) || "Current";

      const cacheKey = getCacheKey(
        "distributor_store_earnings",
        "getDistributorStoreEarnings",
        distributorId.toString(),
        sortBy?.toString() || "storeEarnings",
        sortOrder?.toString() || "DESC",
        effectiveWarehouseId?.toString() || "null",
        timeline,
        req.user.id?.toString() || "null",
        req.user.role || "null"
      );

      const hashedCacheKey = crypto
        .createHash("md5")
        .update(cacheKey)
        .digest("hex");

      let data: any;
      if (useApiCaching) {
        const cached = await redisClient.get(hashedCacheKey);
        if (cached) {
          data = JSON.parse(cached);
        }
      }

      if (!data) {
        data = await DistributorDashboardService.getDistributorStoreEarnings(
          distributorId,
          (sortBy as string) || "storeEarnings",
          (sortOrder as "ASC" | "DESC") || "DESC",
          effectiveWarehouseId ? String(effectiveWarehouseId) : undefined,
          timeline
        );

        if (useApiCaching) {
          await redisClient.setEx(
            hashedCacheKey,
            CACHE_TTL_TIME,
            JSON.stringify(data)
          );
        }
      }

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Exports store earnings data as CSV for distributor admin
   *
   * @param {Request} req - The request object containing user details and role information.
   * @param {Response} res - The response object used to return the CSV file or an error.
   * @returns {Promise<Response>} - A promise that resolves with the CSV file download or an error response.
   */
  public async exportStoreEarningsCSV(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info("📥 [EXPORT-STORE-EARNINGS-CSV] Endpoint hit", {
      manufacturerId: req.query.manufacturerId,
      programTimeline: req.query.programTimeline,
      reportType: req.query.reportType,
      userId: req.user?.userId,
      userRole: req.user?.role
    });

    try {
      // Check if user has distributor admin/executive permissions
      if (
        !isDistributorAdminAndExecutive(req.user.role) &&
        !isDistributorGeneralManager(req.user.role)
      ) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const distributorId = getDistributorIdAsRole(req.user, req.user.role);
      const { manufacturerId, programTimeline, reportType } = req.query;

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      // Get current year for filtering
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1); // January 1st
      const endDate = new Date(currentYear, 11, 31, 23, 59, 59); // December 31st

      // If no data found, return error
      if (!Object.values(REPORT_TYPE).includes(reportType as string)) {
        throw ApiError.badRequest(ERROR_MESSAGES.INVALID.REPORT_TYPE);
      }

      // For general managers, fetch sales rep IDs for filtering
      let salesRepIds: number[] | undefined = undefined;
      const isGeneralManager = isDistributorGeneralManager(req.user.role);
      if (isGeneralManager && reportType === REPORT_TYPE.SALES_REP_EARNINGS) {
        const salesReps = await StoreRepository.getSalesRepsByGeneralManager(
          Number(req.user.associatedUserId)
        );
        salesRepIds = salesReps.map((rep) => rep.associated_user_id);
      }

      // Get store earnings data using service
      const csvString = await DistributorService.getStoreEarningsForCSV({
        distributorId,
        startDate,
        endDate,
        manufacturerId: Number(manufacturerId),
        programTimeline: programTimeline as string | undefined,
        reportType: reportType as string | undefined,
        salesRepIds
      });

      // If no data found, return error
      if (!csvString) {
        return sendErrorResponse(
          res,
          "No store earnings data found for the selected period"
        );
      }

      // Generate filename
      const currentDate = new Date().toISOString().split("T")[0];
      const filename = `generated-csv-report-${currentDate}.csv`;

      // Set response headers for CSV download
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Pragma", "no-cache");

      // Send the CSV data
      return sendSuccessResponse(res, csvString);
    } catch (error: any) {
      console.log("Error exporting CSV:", error);
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Bulk enroll all distributor stores in programs
   * POST /api/v1/distributor/:distributorId/bulk-enroll-stores
   */
  public async bulkEnrollStoresInPrograms(
    req: Request,
    res: Response
  ): Promise<Response> {
    const requestId = crypto.randomBytes(8).toString("hex");

    logger.info("🚀 [BULK-ENROLLMENT] Endpoint hit", {
      requestId,
      distributorId: req.params.distributorId,
      action: req.body.action,
      programCount: req.body.programIds?.length,
      manufacturerId: req.body.manufacturerId,
      storeIds: req.body.storeIds?.length
        ? `${req.body.storeIds.length} specific stores`
        : "all stores",
      warehouseId: req.body.warehouseId || "none",
      userId: req.user.userId,
      userRole: req.user.role
    });

    try {
      const distributorId = Number(req.params.distributorId);
      const { action, programIds, manufacturerId, storeIds, warehouseId } =
        req.body;

      logger.info("🔍 [BULK-ENROLLMENT] Validating request", {
        requestId,
        distributorId,
        hasAction: !!action,
        hasProgramIds: !!programIds,
        hasManufacturerId: !!manufacturerId
      });

      // Validate parameters
      if (!action || !["enroll", "unenroll"].includes(action)) {
        logger.warn("❌ [BULK-ENROLLMENT] Invalid action", {
          requestId,
          action
        });
        throw ApiError.badRequest(
          "Invalid action. Must be 'enroll' or 'unenroll'"
        );
      }

      if (
        !programIds ||
        !Array.isArray(programIds) ||
        programIds.length === 0
      ) {
        logger.warn("❌ [BULK-ENROLLMENT] Invalid programIds", {
          requestId,
          programIds
        });
        throw ApiError.badRequest(
          "programIds is required and must be a non-empty array"
        );
      }

      if (!manufacturerId) {
        logger.warn("❌ [BULK-ENROLLMENT] Missing manufacturerId", {
          requestId
        });
        throw ApiError.badRequest("manufacturerId is required");
      }

      // Authorization: Verify distributor matches user's role
      const userDistributorId = getDistributorIdAsRole(req.user, req.user.role);

      logger.info("🔐 [BULK-ENROLLMENT] Authorization check", {
        requestId,
        requestedDistributorId: distributorId,
        userDistributorId,
        userRole: req.user.role
      });

      if (distributorId !== userDistributorId) {
        logger.warn("🚫 [BULK-ENROLLMENT] Authorization failed", {
          requestId,
          distributorId,
          userDistributorId
        });
        throw ApiError.authorizationFailed(
          "You do not have access to this distributor"
        );
      }

      logger.info(
        "✅ [BULK-ENROLLMENT] Validation passed, calling service layer",
        {
          requestId,
          distributorId,
          action,
          programCount: programIds.length,
          manufacturerId
        }
      );

      // Call service layer
      const result = await DistributorService.bulkEnrollStoresInPrograms({
        distributorId,
        action: action as "enroll" | "unenroll",
        programIds: programIds.map(Number),
        manufacturerId: Number(manufacturerId),
        storeIds: storeIds?.map(Number),
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        userId: req.user.userId,
        userRole: req.user.role
      });

      logger.info("🎉 [BULK-ENROLLMENT] Success", {
        requestId,
        distributorId,
        totalStores: result.data.totalStores,
        successful: result.data.successful,
        failed: result.data.failed,
        workerJobsQueued: result.data.workerJobsQueued
      });

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      logger.error("💥 [BULK-ENROLLMENT] Failed", {
        requestId,
        distributorId: req.params.distributorId,
        error: error.message,
        stack: error.stack
      });
      return sendErrorResponse(
        res,
        error.message || "Failed to process bulk enrollment",
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export default new DistributorDashboardController();
