import { Request, Response } from "express";
import crypto from "crypto";
import { ENTITY_TYPE, ENROLLMENT_REQUEST_STATUS } from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { HttpStatus } from "../config/HttpStatus";
import { ApiError } from "../lib/errors/APIError";
import DistributorRepository from "../repositories/DistributorRepository";
import StoreRepository from "../repositories/StoreRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import ProgramService from "../services/ProgramService";
import ProgramAgreementService from "../services/ProgramAgreementService";
import StoreDashboardService from "../services/StoreDashboardService";
import StoreService from "../services/StoreService";
import EnrollmentRequestService from "../services/EnrollmentRequestService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";
import {
  getDistributorIdAsRole,
  isDistributorAdminOrManagerOrExecutive,
  isDistributorGeneralManager
} from "../utils/roles";
import { validateEnrollmentParameters } from "../validations/programValidation";
import { ManualEnrollmentResponse } from "../types/StoreProgramTypes";
import { redisClient, scanKeys } from "../utils/redis";
import logger from "../lib/logger";

class StoreController {
  constructor() {
    this.manualEnrollment = this.manualEnrollment.bind(this);
    this.enrollByAgreement = this.enrollByAgreement.bind(this);
    this.clearRelatedCaches = this.clearRelatedCaches.bind(this);
    // Bind other methods that use 'this' if they are exposed as route handlers
  }

  /**
   * Retrieves a list of stores and their sales volumes for a given distributor.
   *
   * @param {Request} req - The request object, containing the distributorId, searchQuery, and selectedSalesRepId as query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the sales volume data response.
   */
  public async getListing(req: Request, res: Response): Promise<Response> {
    const {
      distributorId,
      searchQuery,
      selectedSalesRepId,
      page,
      sort,
      chainId,
      sortKey,
      warehouseId,
      returnSpiffEarning,
      programTimeline,
      isInternal,
      isExcludeChainStores
    } = req.query;

    try {
      if (!distributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      let warehouseIds = undefined;
      if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        const managerId = req.user.associatedUserId;
        const isGeneralManager = isDistributorGeneralManager(req.user.role);

        warehouseIds =
          isGeneralManager || !isNaN(Number(warehouseId))
            ? await DistributorRepository.getWarehouseIds(
                Number(distributorId),
                managerId,
                isGeneralManager,
                Number(warehouseId)
              )
            : undefined;
      }

      const searchString = searchQuery as string;
      const data = await StoreService.getListing(
        Number(distributorId),
        null,
        Number(page ?? 1),
        sort as string,
        searchString.includes("{") ? null : searchString,
        Number(selectedSalesRepId),
        Number(chainId),
        null,
        undefined,
        [],
        sortKey as string,
        undefined,
        warehouseIds,
        returnSpiffEarning == "true" ? true : false,
        programTimeline as string,
        isInternal === "true" ? true : false,
        isExcludeChainStores == "true" ? true : false
      );
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the details of a single store by its unique ID...
   *
   * @param {Request} req - The request object, containing the store ID as a route parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the store details response.
   */
  public async getStoreDetails(req: Request, res: Response): Promise<Response> {
    const { id: storeId } = req.params;
    const { programTimeline, isChainStore: isChainStoreStr } = req.query;
    const { role, userId, associatedUserId, parentEntityId } = req.user;

    try {
      const distributorId =
        role == ENTITY_TYPE.DISTRIBUTOR_ADMIN
          ? associatedUserId
          : parentEntityId;

      const isChainStore = isChainStoreStr?.toString()?.toLowerCase() == "true";

      const data = await StoreService.getStoreDetails(
        Number(storeId),
        Number(distributorId),
        role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP ? Number(userId) : undefined,
        programTimeline as string,
        isChainStore
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the details of a single store by its unique ID (v2 API).
   * This is an exact copy of getStoreDetails but uses the v2 service method.
   *
   * @param {Request} req - The request object, containing the store ID as a route parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the store details response.
   */
  public async getStoreDetailsV2(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id: storeId } = req.params;
    const { programTimeline, isChainStore: isChainStoreStr } = req.query;
    const { role, userId, associatedUserId, parentEntityId } = req.user;

    try {
      const distributorId =
        role == ENTITY_TYPE.DISTRIBUTOR_ADMIN
          ? associatedUserId
          : parentEntityId;

      // Validate store access based on user role
      const hasAccess = await StoreRepository.validateStoreAccess(
        Number(storeId),
        role,
        Number(distributorId),
        role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP ||
          role === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER ||
          role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
          ? Number(associatedUserId)
          : undefined
      );

      if (!hasAccess) {
        throw ApiError.notFound(
          ERROR_MESSAGES.ENTITY.NOT_FOUND("Store", Number(storeId))
        );
      }

      const isChainStore = isChainStoreStr?.toString()?.toLowerCase() == "true";

      const data = await StoreService.getStoreDetailsV2(
        Number(storeId),
        Number(distributorId),
        role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP ? Number(userId) : undefined,
        programTimeline as string,
        isChainStore
      );

      // Get agreement data for the store
      const agreementData =
        await ProgramRepository.getStoreManufacturerAgreements(
          Number(distributorId),
          Number(storeId)
        );

      // Transform and attach agreement info to data object
      if (data.stores && data.stores.length > 0 && agreementData.length > 0) {
        const store = data.stores[0]; // Get the first store (single store details endpoint)

        // Get manufacturer IDs from enrolled programs
        const enrolledManufacturerIds = new Set<number>();
        if (store.programData?.enrolledProgram) {
          store.programData.enrolledProgram.forEach((program: any) => {
            if (program.manufacturer?.id) {
              enrolledManufacturerIds.add(program.manufacturer.id);
            }
          });
        }

        // Get manufacturer IDs from remaining programs
        const remainingManufacturerIds = new Set<number>();
        if (store.programData?.remainingProgram) {
          store.programData.remainingProgram.forEach((program: any) => {
            if (program.manufacturer?.id) {
              remainingManufacturerIds.add(program.manufacturer.id);
            }
          });
        }

        // Transform agreement data - include all agreements for manufacturers in either enrolled or remaining
        // This ensures we show both enrolled and unenrolled agreements for manufacturers that appear in both sections
        const allManufacturerIds = new Set<number>([
          ...enrolledManufacturerIds,
          ...remainingManufacturerIds
        ]);

        const transformedAgreements = agreementData
          .map((manufacturerAgreement: any) => {
            const manufacturerId = manufacturerAgreement.manufacturer_id;

            // Only include manufacturers that appear in enrolledProgram or remainingProgram
            if (!allManufacturerIds.has(manufacturerId)) {
              return null;
            }

            // Include all agreements (both enrolled and available)
            // This allows showing agreement 77 as "available" even if manufacturer is in enrolledProgram
            const allAgreements = manufacturerAgreement.agreementInfo.map(
              (agreement: any) => {
                // Keep status as is (either "enrolled" or "available")
                return {
                  ...agreement
                };
              }
            );

            return {
              manufacturer_id: manufacturerId,
              agreementInfo: allAgreements
            };
          })
          .filter(
            (item: any) => item !== null && item.agreementInfo.length > 0
          ); // Only include manufacturers with agreements

        // Attach agreement info to data object (same level as stores)
        (data as any).agreementInfo = transformedAgreements;
      }

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves a list of stores and their sales volumes for a given distributor (v2 API).
   *
   * @param {Request} req - The request object, containing the distributorId, searchQuery, and selectedSalesRepId as query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the sales volume data response.
   */
  public async getListingV2(req: Request, res: Response): Promise<Response> {
    const {
      distributorId,
      searchQuery,
      selectedSalesRepId,
      page,
      sort,
      sortKey,
      warehouseId,
      programTimeline,
      isInternal,
      isExcludeChainStores
    } = req.query;

    try {
      const { role, associatedUserId, parentEntityId } = req.user;

      // Determine distributorId: use query param, or parentEntityId for manager roles
      const finalDistributorId = distributorId
        ? Number(distributorId)
        : role === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER ||
            role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
          ? Number(parentEntityId)
          : null;

      if (!finalDistributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const searchString = searchQuery as string;
      const processedSearchQuery =
        searchString && searchString.trim() && !searchString.includes("{")
          ? searchString.trim()
          : null;

      const processedSelectedSalesRepId =
        selectedSalesRepId && selectedSalesRepId !== ""
          ? Number(selectedSalesRepId)
          : null;

      // Get manager identifiers
      const salesManagerId =
        role === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
          ? Number(associatedUserId)
          : undefined;
      const generalManagerId =
        role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
          ? Number(associatedUserId)
          : undefined;

      const data = await StoreService.getListingV2({
        distributorId: finalDistributorId,
        page: Number(page ?? 1),
        sort: sort as string,
        sortKey: sortKey as string,
        searchQuery: processedSearchQuery,
        selectedSalesRepId: processedSelectedSalesRepId,
        warehouseId: warehouseId ? Number(warehouseId) : null,
        programTimeline: programTimeline as string,
        isInternalInitiative: isInternal === "true" ? true : false,
        excludeChainStores: isExcludeChainStores == "true" ? true : false,
        salesManagerId,
        generalManagerId,
        loggedInUser: req.user
      });
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the details of a store's Programs by its unique Manufacturer ID and Store ID.
   *
   * @param {Request} req - The request object, containing the store ID and manufacturer ID as route parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the store's program details response.
   */
  public async getStoreManufactureProgramsDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id: storeId, manufacturerId } = req.params;
    const {
      isEnrolledPrograms,
      programTimeline,
      isInternal,
      isChainPrograms,
      agreementId
    } = req.query;
    const { user } = req;

    try {
      const isManufacturerUser = [
        ENTITY_TYPE.MANUFACTURER_EXECUTIVE,
        ENTITY_TYPE.MANUFACTURER
      ].includes(user.role);

      const isInternalInitiative = isInternal === "true" ? true : false;
      const isChainProgramsBool = isChainPrograms === "true" ? true : false;

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

      const data = await StoreService.getStoreManufactureProgramsDetails(
        Number(storeId),
        Number(manufacturerId),
        typeof isEnrolledPrograms === "undefined"
          ? null
          : isEnrolledPrograms !== "false",
        undefined,
        true,
        isManufacturerUser,
        programTimeline as string,
        isInternalInitiative,
        isChainProgramsBool,
        agreementIds
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getStoreKeyMetrics(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id: userId } = req.user;

    try {
      const data = await StoreDashboardService.getStoreKeyMetrics(
        Number(userId),
        req.user
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves a list of sales representatives for a specific distributor.
   *
   * @param {Request} req - The request object, containing the distributor ID as a route parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with a list of sales representative objects.
   */
  public async getDistributorSalesReps(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { distributorId } = req.params;

    try {
      const isGeneralManager =
        req.user.role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER;

      if (isGeneralManager) {
        const data = await StoreService.getDistributorSalesRepsByGeneralManager(
          Number(req.user.associatedUserId)
        );
        return sendSuccessResponse(res, data);
      }

      //we need to fetch sales rep based on warehouse id if provided
      const { warehouseId } = req.query;
      if (warehouseId && warehouseId !== "" && warehouseId !== "undefined") {
        const warehouseIdNum = Number(warehouseId);
        if (isNaN(warehouseIdNum)) {
          return sendErrorResponse(res, "Invalid warehouseId parameter", 400);
        }

        const salesReps =
          (await DistributorRepository.getSalesRepsByWarehouseId(
            Number(distributorId),
            warehouseIdNum,
            true // return full details
          )) as Array<{ id: number; name: string; associatedUserId: number }>;
        // return as same structure as getDistributorSalesReps
        return sendSuccessResponse(res, {
          salesReps: salesReps
        });
      } else {
        const data = await StoreService.getDistributorSalesReps(
          Number(distributorId)
        );
        return sendSuccessResponse(res, data);
      }
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves a list of sales representatives associated to a sales rep manager for a specific distributor.
   *
   * @param {Request} req - The request object, containing the distributor ID and sales rep manager ID as route parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with a list of sales representative objects.
   */
  public async getSalesRepsForManager(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { distributorId } = req.params;
    const { salesRepManagerId } = req.query;

    try {
      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      if (!salesRepManagerId) {
        throw ApiError.badRequest("Sales rep manager ID is required");
      }

      const data = await StoreService.getSalesRepsForManager(
        Number(distributorId),
        Number(salesRepManagerId)
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves a list of store chains based on the user's associated ID and role.
   *
   * This method calls the StoreService to fetch store chains for the user, leveraging
   * their associated user ID and role. The result, which is an array of store chains,
   * is returned as a successful response. If an error occurs during the process,
   * an error response is sent back.
   *
   * @param {Request} req - The request object, containing the user's associated ID and role.
   * @param {Response} res - The response object used to send back the result or an error.
   * @returns {Promise<Response>} - A promise that resolves with the response containing
   *                                the list of store chains.
   */
  public async getStoreChains(req: Request, res: Response): Promise<Response> {
    try {
      const { role } = req.user;
      const { distributorID } = req.query;

      const associatedUserId = getDistributorIdAsRole(req?.user, role);

      const data = await StoreService.getStoreChains(
        associatedUserId,
        role,
        distributorID
      );
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getStoresByChainId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { chainId } = req.params;
      const data = await StoreService.getStoresByChainId(Number(chainId ?? 0));
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getDistibutorStores(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { associatedUserId, role } = req.user;
      const fetchAllStores =
        (req.query?.fetchAllStores && req.query?.fetchAllStores === "true") ||
        undefined;
      if (
        ![
          ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
        ].includes(role)
      ) {
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          ERROR_MESSAGES.INVALID_USER_TYPE
        );
      }

      const data = await StoreService.getStoresByDistributorId({
        distributorId: Number(associatedUserId),
        fetchAllStores: fetchAllStores
      });
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getStoreByCriteria(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { manufacturerId } = req.params;

      // Check if the request is GET or POST
      let distributorIds: number[] = [];
      let salesRepIds: number[] = [];
      let criteria: any;
      let minProductsPurchased: number = 1;

      if (Object.keys(req.body).length > 0) {
        // If body has content, process it as a JSON request
        const {
          distributor_ids,
          criteria: requestCriteria,
          min_products_purchased = 1,
          sales_rep_ids = []
        } = req.body;

        distributorIds = Array.isArray(distributor_ids) ? distributor_ids : [];
        criteria = requestCriteria;
        minProductsPurchased = Number(min_products_purchased);
        salesRepIds = Array.isArray(sales_rep_ids) ? sales_rep_ids : [];
      } else {
        // Process as query parameters
        const {
          distributor_ids,
          min_products_purchased = 1,
          criteria: criteriaParm = "core_retail",
          sales_rep_ids = []
        } = req.query;

        if (!distributor_ids) {
          throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
        }

        // Parse distributor IDs from comma-separated string to array of numbers
        distributorIds = String(distributor_ids)
          .split(",")
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id));

        salesRepIds = String(sales_rep_ids)
          .split(",")
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id));

        // For query parameters, criteria is a simple string
        criteria = criteriaParm;
        minProductsPurchased = Number(min_products_purchased);
      }

      // Check if manufacturer ID exists
      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      if (distributorIds.length === 0) {
        throw ApiError.badRequest(
          "At least one valid distributor ID is required"
        );
      }

      const data = await StoreService.getStoresByCriteria(
        Number(manufacturerId),
        distributorIds,
        minProductsPurchased,
        criteria,
        salesRepIds
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Manually enroll or unenroll a store from manufacturer programs
   * @param {Request} req - The request object containing action, manufacturerId, storeId, and optional programIds array
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the enrollment/unenrollment result
   */
  public async manualEnrollment(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { action, manufacturerId, storeId, programIds } = req.body;

      // Validate all parameters
      validateEnrollmentParameters(action, manufacturerId, storeId, programIds);

      // Extract userId from request context
      const userId = (req as any).user?.userId || 0;

      // Convert and prepare parameters with proper type safety
      const validatedParams = {
        action: action as "enroll" | "unenroll",
        manufacturerId: Number(manufacturerId),
        storeId: Number(storeId),
        programIds:
          action === "enroll"
            ? programIds?.map((id: any) => Number(id)) || []
            : programIds?.map((id: any) => Number(id)) || [],
        userId
      };

      // Call ProgramService to handle enrollment/unenrollment
      const enrollmentResult =
        await ProgramService.handleStoreEnrollment(validatedParams);

      // Cache clearing now handled by worker - no action needed here
      // The worker will handle targeted cache invalidation after MV refresh

      const response: ManualEnrollmentResponse = {
        success: enrollmentResult.success,
        message: enrollmentResult.message,
        data: {
          action: validatedParams.action,
          storeId: validatedParams.storeId,
          manufacturerId: validatedParams.manufacturerId,
          programIds: validatedParams.programIds
        }
      };

      return sendSuccessResponse(res, response);
    } catch (error: any) {
      // Handle different error types appropriately
      const errorMessage = error?.message || "Internal server error";
      const statusCode = error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;

      return sendErrorResponse(res, errorMessage, statusCode);
    }
  }

  /**
   * Enroll or unenroll stores in programs via agreement IDs
   * POST /api/v1/store/enroll-by-agreement
   */
  public async enrollByAgreement(
    req: Request,
    res: Response
  ): Promise<Response> {
    const requestId = crypto.randomBytes(8).toString("hex");

    logger.info("🔗 [AGREEMENT-ENROLLMENT] Endpoint hit", {
      requestId,
      action: req.body.action,
      agreementCount: req.body.agreementIds?.length,
      storeCount: req.body.storeIds?.length,
      userId: req.body.userId
    });

    // Declare variables outside try block for error logging
    let action: string | undefined;
    let agreementIds: number[] | undefined;
    let storeIds: number[] | undefined;
    let userId: number | undefined;
    let reason: string | undefined;

    try {
      ({ action, agreementIds, storeIds, userId, reason } = req.body);

      // Validate parameters
      if (!action || !["enroll", "unenroll"].includes(action)) {
        logger.warn("❌ [AGREEMENT-ENROLLMENT] Invalid action", {
          requestId,
          action
        });
        throw ApiError.badRequest(
          "Invalid action. Must be 'enroll' or 'unenroll'"
        );
      }

      if (
        !agreementIds ||
        !Array.isArray(agreementIds) ||
        agreementIds.length === 0
      ) {
        logger.warn("❌ [AGREEMENT-ENROLLMENT] Invalid agreementIds", {
          requestId
        });
        throw ApiError.badRequest(
          "agreementIds is required and must be a non-empty array"
        );
      }

      if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
        logger.warn("❌ [AGREEMENT-ENROLLMENT] Invalid storeIds", {
          requestId
        });
        throw ApiError.badRequest(
          "storeIds is required and must be a non-empty array"
        );
      }

      if (!userId) {
        logger.warn("❌ [AGREEMENT-ENROLLMENT] Missing userId", { requestId });
        throw ApiError.badRequest("userId is required");
      }

      // Create enrollment request record with PENDING status
      await EnrollmentRequestService.createRequest({
        requestId,
        action: action as "enroll" | "unenroll",
        agreementIds: agreementIds.map(Number),
        storeIds: storeIds.map(Number),
        userId: Number(userId),
        reason,
        status: ENROLLMENT_REQUEST_STATUS.PENDING
      });

      logger.info(
        "✅ [AGREEMENT-ENROLLMENT] Validation passed, calling service",
        {
          requestId,
          action,
          agreementCount: agreementIds.length,
          storeCount: storeIds.length,
          agreementIds: agreementIds.map(Number),
          storeIds: storeIds.map(Number),
          userId: Number(userId)
        }
      );

      // Call service layer to validate and enqueue
      logger.info(
        "📞 [AGREEMENT-ENROLLMENT] About to call ProgramAgreementService.enrollStoresByAgreement",
        {
          requestId,
          action,
          agreementIds: agreementIds.map(Number),
          storeIds: storeIds.map(Number),
          userId: Number(userId)
        }
      );

      const result = await ProgramAgreementService.enrollStoresByAgreement({
        action: action as "enroll" | "unenroll",
        agreementIds: agreementIds.map(Number),
        storeIds: storeIds.map(Number),
        userId: Number(userId),
        reason,
        requestId
      });

      logger.info(
        "✅ [AGREEMENT-ENROLLMENT] Service call completed successfully",
        {
          requestId,
          jobId: result.data.jobId,
          programCount: result.data.programCount
        }
      );

      // Update enrollment request with SQS message ID and QUEUED status
      await EnrollmentRequestService.updateAfterSqsSend(requestId, {
        sqsMessageId: result.data.jobId,
        programIds: result.data.programIds || [],
        status: ENROLLMENT_REQUEST_STATUS.QUEUED
      });

      logger.info("🎉 [AGREEMENT-ENROLLMENT] Job queued successfully", {
        requestId,
        jobId: result.data.jobId,
        programCount: result.data.programCount
      });

      return sendSuccessResponse(res, {
        ...result,
        data: {
          ...result.data,
          requestId
        }
      });
    } catch (error: any) {
      logger.error("💥 [AGREEMENT-ENROLLMENT] Failed", {
        requestId,
        action: action || req.body?.action,
        agreementIds: agreementIds || req.body?.agreementIds,
        storeIds: storeIds || req.body?.storeIds,
        userId: userId || req.body?.userId,
        error: error.message,
        errorName: error.name,
        errorCode: error.code || error.statusCode,
        errorStack: error.stack,
        fullError:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
                ...((error as any).code && { code: (error as any).code }),
                ...((error as any).statusCode && {
                  statusCode: (error as any).statusCode
                })
              }
            : String(error)
      });

      // Update enrollment request with failure status
      try {
        await EnrollmentRequestService.updateSqsSendFailed(requestId, error);
      } catch (trackingError: any) {
        logger.error("Failed to update enrollment request tracking", {
          requestId,
          trackingError: trackingError.message
        });
      }

      return sendErrorResponse(
        res,
        error.message || "Failed to process agreement-based enrollment",
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Clear caches related to the enrollment/unenrollment action
   */
  private async clearRelatedCaches(params: {
    manufacturerId: number;
    storeId: number;
  }): Promise<void> {
    try {
      const { manufacturerId, storeId } = params;

      // Clear cache using Redis pattern matching to catch all variations
      // getProgramsStoreComplianceDetail cache keys start with this pattern // TODO: Make this better and more specific
      const cachePattern = `getProgramsStoreComplianceDetail:*:${manufacturerId}:*:*:*:*:*`;

      // Get all keys matching the pattern
      const keys = await scanKeys(cachePattern);

      if (keys.length > 0) {
        // Delete all matching cache keys
        await redisClient.del(keys);
        logger.info(
          `[CACHE] Cleared ${keys.length} program details cache entries for store ${storeId} and manufacturer ${manufacturerId}`
        );
      } else {
        logger.info(
          `[CACHE] No cache entries found to clear for store ${storeId} and manufacturer ${manufacturerId}`
        );
      }
    } catch (error: any) {
      logger.error("[CACHE] Error clearing related caches:", error);
      // Don't throw error - cache clearing failure shouldn't break the main operation
    }
  }

  /**
   * Get agreement enrollments for a specific store
   *
   * @param req - Express request with storeId path param and optional manufacturerId query param
   * @param res - Express response
   * @returns List of agreements the store is enrolled in for active/future programs
   */
  public async getStoreAgreementEnrollments(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { storeId } = req.params;
      const { manufacturerId } = req.query;

      // Validate required parameter
      if (!storeId) {
        throw ApiError.badRequest("storeId is required");
      }

      const parsedStoreId = parseInt(storeId, 10);
      if (isNaN(parsedStoreId) || parsedStoreId <= 0) {
        throw ApiError.badRequest(
          "Invalid storeId format. Must be a positive integer."
        );
      }

      // Parse optional manufacturerIds (comma-separated)
      let parsedManufacturerIds: number[] | undefined;
      if (manufacturerId) {
        const manufacturerIdsStr = manufacturerId.toString();
        const manufacturerIdsParsed = manufacturerIdsStr
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0);

        // Validate format
        parsedManufacturerIds = manufacturerIdsParsed.map((id) => {
          const parsed = parseInt(id, 10);
          if (isNaN(parsed) || parsed <= 0) {
            throw ApiError.badRequest(
              `Invalid manufacturerId format: "${id}". Must be positive integer(s).`
            );
          }
          return parsed;
        });

        if (parsedManufacturerIds.length === 0) {
          throw ApiError.badRequest(
            "At least one valid manufacturerId is required when provided"
          );
        }
      }

      logger.info("Fetching store agreement enrollments", {
        storeId: parsedStoreId,
        manufacturerIds: parsedManufacturerIds,
        userId: req.user?.id
      });

      // Extract user context for approval filtering
      const user = req.user
        ? {
            role: req.user.role,
            parentEntityId: req.user.parentEntityId,
            associatedUserId: req.user.associatedUserId
          }
        : undefined;

      // Call service with user context
      const result = await ProgramAgreementService.getStoreAgreementEnrollments(
        {
          storeId: parsedStoreId,
          manufacturerIds: parsedManufacturerIds
        },
        user
      );

      logger.info("Successfully retrieved store agreement enrollments", {
        storeId: parsedStoreId,
        manufacturerIds: parsedManufacturerIds,
        enrollmentCount: result.count,
        availableCount: result.availableCount
      });

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      logger.error("Error fetching store agreement enrollments", {
        error: error.message,
        stack: error.stack,
        storeId: req.params.storeId,
        manufacturerId: req.query.manufacturerId
      });
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }
}

export default new StoreController();
