import { Request, Response } from "express";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { PROGRAM_TIMELINE } from "../config/appConstants";
import { ApiError } from "../lib/errors/APIError";
import StoreRepository from "../repositories/StoreRepository";
import StoreDashboardService from "../services/StoreDashboardService";
import StoreService from "../services/StoreService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";
import ChainService from "../services/ChainService";
import { ChainsWithStoresQueryOptions } from "../types/ChainTypes";
import ChainRepository from "../repositories/ChainRepository";
import {
  getDistributorIdAsRole,
  isDistributor,
  isDistributorAdminAndExecutive,
  getParentDistributorId
} from "../utils/roles";
import newrelic from "newrelic";
import { ChainDetailsQueryOptions } from "../types/ChainTypes";
import { ChainProgramsQueryOptions } from "../types/ChainTypes";
import { ChainStoresQueryOptions } from "../types/ChainTypes";
import { HttpStatus } from "../config/HttpStatus";

class ChainController {
  public async getChainKeyMetrics(
    req: Request,
    res: Response
  ): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getChainKeyMetrics",
      true,
      async () => {
        try {
          const { associatedUserId } = req.user;
          const { storeId } = req.query;

          // Add custom attributes for context
          newrelic.addCustomAttributes({
            associatedUserId: associatedUserId?.toString() || "null",
            storeId: storeId?.toString() || "null"
          });

          const chainStores = await StoreRepository.getStoresByChainId(
            Number(associatedUserId),
            Number(storeId) ? [Number(storeId)] : undefined
          );
          const storeIds = chainStores?.map((store: any) => store.id);

          const data = await StoreDashboardService.getStoreKeyMetrics(
            Number(associatedUserId),
            req.user,
            storeIds
          );

          return sendSuccessResponse(res, data);
        } catch (error: any) {
          newrelic.noticeError(error, {
            method: "getChainKeyMetrics",
            associatedUserId: req.user.associatedUserId?.toString() || "null",
            storeId: req.query.storeId?.toString() || "null"
          });
          return sendErrorResponse(res, error.message, error.statusCode);
        }
      }
    );
  }

  /**
   * Retrieves a list of stores associated with a chain.
   *
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the list of stores.
   */
  public async getStores(req: Request, res: Response): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getStores",
      true,
      async () => {
        try {
          const chainId = req.user.associatedUserId;

          // Add custom attributes for context
          newrelic.addCustomAttributes({
            chainId: chainId?.toString() || "null"
          });

          if (!chainId) {
            throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
          }

          const data = await StoreRepository.getStoresByChainId(
            Number(chainId)
          );

          return sendSuccessResponse(res, data);
        } catch (error: any) {
          newrelic.noticeError(error, {
            method: "getStores",
            chainId: req.user.associatedUserId?.toString() || "null"
          });
          return sendErrorResponse(res, error.message, error.statusCode);
        }
      }
    );
  }

  /**
   * Retrieves a list of stores associated with a chain.
   * The list includes the store names, distributor names, and total sales.
   * Optionally, the list can be filtered by a distributor ID.
   * The list can also be sorted by the store name or total sales.
   * @param {Request} req - The request object, containing the searchQuery, page, and sort as query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the list of stores.
   */
  public async getStoresListing(
    req: Request,
    res: Response
  ): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getStoresListing",
      true,
      async () => {
        try {
          const { searchQuery, page, sort, sortKey } = req.query;

          const chainId = req.user.associatedUserId;

          // assign distributor id to get program compliances count excluded disabled programs
          const distributorId = req.user.parentEntityId;

          // Add custom attributes for context
          newrelic.addCustomAttributes({
            chainId: chainId?.toString() || "null",
            distributorId: distributorId?.toString() || "null",
            searchQuery: searchQuery?.toString() || "null",
            page: page?.toString() || "1",
            sort: sort?.toString() || "null",
            sortKey: sortKey?.toString() || "null"
          });

          if (!chainId) {
            throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
          }

          const searchString = searchQuery as string;

          const data = await StoreService.getListing(
            distributorId,
            null,
            Number(page ?? 1),
            sort as string,
            searchString.includes("{") ? null : searchString,
            undefined,
            Number(chainId),
            null,
            undefined,
            [],
            sortKey as string
          );

          return sendSuccessResponse(res, data);
        } catch (error: any) {
          newrelic.noticeError(error, {
            method: "getStoresListing",
            chainId: req.user.associatedUserId?.toString() || "null",
            distributorId: req.user.parentEntityId?.toString() || "null",
            searchQuery: req.query.searchQuery?.toString() || "null",
            page: req.query.page?.toString() || "null"
          });
          console.error(error);
          return sendErrorResponse(res, error.message, error.statusCode);
        }
      }
    );
  }

  /**
   * Retrieves chains with their stores including purchase volume and rebate amounts
   * Now optimized to use the new distributor_id column for faster API calls
   * @param {Request} req - The request object, containing query parameters
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response containing chains with stores data
   */
  public async getChainsWithStores(
    req: Request,
    res: Response
  ): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getChainsWithStores",
      true,
      async () => {
        try {
          const {
            distributorId,
            page,
            limit,
            sort,
            sortKey,
            searchQuery,
            programTimeline,
            includeDetails = "false" // New parameter to control data depth
          } = req.query;

          const { associatedUserId, role } = req.user;

          // Add custom attributes for context
          newrelic.addCustomAttributes({
            associatedUserId: associatedUserId?.toString() || "null",
            role: role || "null",
            distributorId: distributorId?.toString() || "null",
            page: page?.toString() || "1",
            limit: limit?.toString() || "10",
            sort: sort?.toString() || "ASC",
            sortKey: sortKey?.toString() || "chain_name",
            searchQuery: searchQuery?.toString() || "null",
            programTimeline: programTimeline?.toString() || "null",
            includeDetails: includeDetails?.toString() || "false",
            optimization: "distributor_id_column"
          });

          // Parse query parameters
          const options: ChainsWithStoresQueryOptions = {};

          if (distributorId) {
            const parsedDistributorId = parseInt(distributorId as string);
            if (isNaN(parsedDistributorId)) {
              throw ApiError.badRequest("distributorId must be a valid number");
            }
            options.distributorId = parsedDistributorId;
          }

          if (page) {
            const parsedPage = parseInt(page as string);
            if (isNaN(parsedPage) || parsedPage < 1) {
              throw ApiError.badRequest(
                "page must be a valid number greater than 0"
              );
            }
            options.page = parsedPage;
          }

          if (limit) {
            const parsedLimit = parseInt(limit as string);
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
              // Reduced max limit
              throw ApiError.badRequest(
                "limit must be a valid number between 1 and 50"
              );
            }
            options.limit = parsedLimit;
          }

          if (sort) {
            const sortDirection = (sort as string).toUpperCase();
            if (!["ASC", "DESC"].includes(sortDirection)) {
              throw ApiError.badRequest("sort must be either ASC or DESC");
            }
            options.sort = sortDirection;
          }

          if (sortKey) {
            const validSortKeys = [
              "chain_name",
              "total_stores",
              "total_purchase_volume",
              "total_rebate_amount",
              "compliance_percentage"
            ];
            if (!validSortKeys.includes(sortKey as string)) {
              throw ApiError.badRequest(
                `sortKey must be one of: ${validSortKeys.join(", ")}`
              );
            }
            options.sortKey = sortKey as string;
          }

          if (searchQuery) {
            options.searchQuery = searchQuery as string;
          }

          if (programTimeline) {
            const validTimelines = Object.values(PROGRAM_TIMELINE);
            if (!validTimelines.includes(programTimeline as string)) {
              throw ApiError.badRequest(
                `programTimeline must be one of: ${validTimelines.join(", ")}`
              );
            }
            options.programTimeline = programTimeline as string;
          }

          if (includeDetails) {
            options.includeDetails = includeDetails === "true";
          } else {
            options.includeDetails = false; // Default to false for performance
          }

          const chainStores = isDistributor(role)
            ? await StoreService.getStoreChains(
                associatedUserId,
                role,
                distributorId
              )
            : [];

          options.chainIds = isDistributor(role)
            ? chainStores.map((raw: any) => raw.id)
            : undefined;

          // Call optimized service to get chains with stores using distributor_id column
          const data = await ChainService.getChainsWithStores(options);

          console.log(
            `[DEBUG] Optimized chains with stores API call completed for distributor ${distributorId}`
          );

          return sendSuccessResponse(res, data);
        } catch (error: any) {
          newrelic.noticeError(error, {
            method: "getChainsWithStores",
            associatedUserId: req.user.associatedUserId?.toString() || "null",
            role: req.user.role || "null",
            distributorId: req.query.distributorId?.toString() || "null",
            searchQuery: req.query.searchQuery?.toString() || "null",
            optimization: "distributor_id_column"
          });
          console.error("ChainController.getChainsWithStores error:", error);
          return sendErrorResponse(res, error.message, error.statusCode);
        }
      }
    );
  }

  /**
   * Get chains with stores including program data by distributor
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise<void>
   */
  public async getChainsWithStoresByDistributor(
    req: Request,
    res: Response
  ): Promise<void> {
    return newrelic.startSegment(
      "ChainController.getChainsWithStoresByDistributor",
      true,
      async () => {
        try {
          const {
            distributorId,
            page = 1,
            limit = 10,
            sort = "ASC",
            sortKey = "name",
            searchQuery = "",
            programTimeline = "Current"
            // Removed efficient parameter - always use efficient structure now
          } = req.query;

          // Add custom attributes for context
          newrelic.addCustomAttributes({
            distributorId: distributorId?.toString() || "null",
            page: page?.toString() || "1",
            limit: limit?.toString() || "10",
            sort: sort?.toString() || "ASC",
            sortKey: sortKey?.toString() || "name",
            searchQuery: searchQuery?.toString() || "",
            programTimeline: programTimeline?.toString() || "Current"
          });

          // Validate distributorId
          if (!distributorId) {
            res.status(400).json({
              status: "error",
              data: "distributorId is required"
            });
            return;
          }

          // Validate programTimeline
          const validTimelines = Object.values(PROGRAM_TIMELINE);
          if (!validTimelines.includes(programTimeline as string)) {
            res.status(400).json({
              status: "error",
              data: `programTimeline must be one of: ${validTimelines.join(", ")}`
            });
            return;
          }

          const options = {
            distributorId: parseInt(distributorId as string),
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            sort: sort as string,
            sortKey: sortKey as string,
            searchQuery: searchQuery as string,
            programTimeline: programTimeline as string
            // Removed efficient parameter
          };

          // Always use efficient structure now
          const result =
            await ChainRepository.getChainsWithStoresByDistributor(options);

          res.status(200).json({
            status: "success",
            data: result
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Internal server error";
          newrelic.noticeError(
            error instanceof Error ? error : new Error(errorMessage),
            {
              method: "getChainsWithStoresByDistributor",
              distributorId: req.query.distributorId?.toString() || "null",
              searchQuery: req.query.searchQuery?.toString() || "null",
              programTimeline: req.query.programTimeline?.toString() || "null"
            }
          );
          console.error("Error in getChainsWithStoresByDistributor:", error);
          res.status(500).json({
            status: "error",
            data: errorMessage
          });
        }
      }
    );
  }

  /**
   * Get lightweight chain listing for better performance
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise<Response>
   */
  public async getChainListing(req: Request, res: Response): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getChainListing",
      true,
      async () => {
        try {
          const {
            distributorId,
            page,
            limit,
            sort,
            sortKey,
            searchQuery,
            programTimeline
          } = req.query;

          const { associatedUserId, role } = req.user;

          // Add custom attributes for context
          newrelic.addCustomAttributes({
            associatedUserId: associatedUserId?.toString() || "null",
            role: role || "null",
            distributorId: distributorId?.toString() || "null",
            page: page?.toString() || "1",
            limit: limit?.toString() || "10",
            sort: sort?.toString() || "ASC",
            sortKey: sortKey?.toString() || "sort",
            searchQuery: searchQuery?.toString() || "null",
            programTimeline: programTimeline?.toString() || "null",
            optimization: "lightweight_materialized_view"
          });

          // Parse query parameters
          const options: ChainsWithStoresQueryOptions = {};

          if (distributorId) {
            const parsedDistributorId = parseInt(distributorId as string);
            if (isNaN(parsedDistributorId)) {
              throw ApiError.badRequest("distributorId must be a valid number");
            }
            options.distributorId = parsedDistributorId;
          }

          if (page) {
            const parsedPage = parseInt(page as string);
            if (isNaN(parsedPage) || parsedPage < 1) {
              throw ApiError.badRequest(
                "page must be a valid number greater than 0"
              );
            }
            options.page = parsedPage;
          }

          if (limit) {
            const parsedLimit = parseInt(limit as string);
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
              throw ApiError.badRequest(
                "limit must be a valid number between 1 and 50"
              );
            }
            options.limit = parsedLimit;
          }

          if (sort) {
            const sortDirection = (sort as string).toUpperCase();
            if (!["ASC", "DESC"].includes(sortDirection)) {
              throw ApiError.badRequest("sort must be either ASC or DESC");
            }
            options.sort = sortDirection;
          }

          if (sortKey) {
            const validSortKeys = [
              "sort",
              "purchaseSort",
              "estimatedSavings",
              "storeCountSort"
            ];
            if (!validSortKeys.includes(sortKey as string)) {
              throw ApiError.badRequest(
                `sortKey must be one of: ${validSortKeys.join(", ")}`
              );
            }
            options.sortKey = sortKey as string;
          }

          if (searchQuery) {
            options.searchQuery = searchQuery as string;
          }

          if (programTimeline) {
            const validTimelines = Object.values(PROGRAM_TIMELINE);
            if (!validTimelines.includes(programTimeline as string)) {
              throw ApiError.badRequest(
                `programTimeline must be one of: ${validTimelines.join(", ")}`
              );
            }
            options.programTimeline = programTimeline as string;
          }

          // Call lightweight service method
          const data = await ChainService.getChainListingLightweight(options);

          console.log(
            `[DEBUG] Lightweight chain listing API call completed for distributor ${distributorId}`
          );

          return sendSuccessResponse(res, data);
        } catch (error: any) {
          newrelic.noticeError(error, {
            method: "getChainListing",
            associatedUserId: req.user.associatedUserId?.toString() || "null",
            role: req.user.role || "null",
            distributorId: req.query.distributorId?.toString() || "null",
            searchQuery: req.query.searchQuery?.toString() || "null",
            optimization: "lightweight_materialized_view"
          });
          console.error("ChainController.getChainListing error:", error);
          return sendErrorResponse(res, error.message, error.statusCode);
        }
      }
    );
  }

  /**
   * Get detailed chain information by ID
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise<Response>
   */
  public async getChainDetails(req: Request, res: Response): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getChainDetails",
      true,
      async () => {
        try {
          const { chainId } = req.params;
          const {
            distributorId,
            programTimeline,
            includePrograms,
            includeStores,
            includeManufacturerSummaries
          } = req.query;

          const { associatedUserId, role } = req.user;

          // Add custom attributes for context
          newrelic.addCustomAttributes({
            chainId: chainId?.toString() || "null",
            associatedUserId: associatedUserId?.toString() || "null",
            role: role || "null",
            distributorId: distributorId?.toString() || "null",
            programTimeline: programTimeline?.toString() || "null",
            includePrograms: includePrograms?.toString() || "false",
            includeStores: includeStores?.toString() || "false",
            includeManufacturerSummaries:
              includeManufacturerSummaries?.toString() || "false",
            optimization: "chain_details_endpoint"
          });

          // Validate chainId
          if (!chainId || isNaN(parseInt(chainId))) {
            throw ApiError.badRequest("chainId must be a valid number");
          }

          // Parse query parameters
          const options: ChainDetailsQueryOptions = {
            chainId: parseInt(chainId),
            includePrograms: includePrograms === "true",
            includeStores: includeStores === "true",
            includeManufacturerSummaries:
              includeManufacturerSummaries === "true"
          };

          if (distributorId) {
            const parsedDistributorId = parseInt(distributorId as string);
            if (isNaN(parsedDistributorId)) {
              throw ApiError.badRequest("distributorId must be a valid number");
            }
            options.distributorId = parsedDistributorId;
          }

          if (programTimeline) {
            const validTimelines = Object.values(PROGRAM_TIMELINE);
            if (!validTimelines.includes(programTimeline as string)) {
              throw ApiError.badRequest(
                `programTimeline must be one of: ${validTimelines.join(", ")}`
              );
            }
            options.programTimeline = programTimeline as string;
          }

          // Call service method
          const data = await ChainService.getChainDetailsById(options);

          console.log(
            `[DEBUG] Chain details API call completed for chain ${chainId}`
          );

          return sendSuccessResponse(res, data);
        } catch (error: any) {
          newrelic.noticeError(error, {
            method: "getChainDetails",
            chainId: req.params.chainId?.toString() || "null",
            associatedUserId: req.user.associatedUserId?.toString() || "null",
            role: req.user.role || "null",
            distributorId: req.query.distributorId?.toString() || "null",
            optimization: "chain_details_endpoint"
          });
          console.error("ChainController.getChainDetails error:", error);
          return sendErrorResponse(res, error.message, error.statusCode);
        }
      }
    );
  }

  /**
   * Get programs for a specific chain with pagination and filtering
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise<Response>
   */
  public async getChainPrograms(
    req: Request,
    res: Response
  ): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getChainPrograms",
      true,
      async () => {
        try {
          const { chainId } = req.params;
          const {
            distributorId,
            programTimeline,
            page,
            limit,
            sort,
            sortKey,
            searchQuery
          } = req.query;

          const { associatedUserId, role } = req.user;

          // Add custom attributes for context
          newrelic.addCustomAttributes({
            chainId: chainId?.toString() || "null",
            associatedUserId: associatedUserId?.toString() || "null",
            role: role || "null",
            distributorId: distributorId?.toString() || "null",
            programTimeline: programTimeline?.toString() || "null",
            page: page?.toString() || "1",
            limit: limit?.toString() || "10",
            sort: sort?.toString() || "ASC",
            sortKey: sortKey?.toString() || "program_name",
            searchQuery: searchQuery?.toString() || "null",
            optimization: "chain_programs_endpoint"
          });

          // Validate chainId
          if (!chainId || isNaN(parseInt(chainId))) {
            throw ApiError.badRequest("chainId must be a valid number");
          }

          // Parse query parameters
          const options: ChainProgramsQueryOptions = {
            chainId: parseInt(chainId)
          };

          if (distributorId) {
            const parsedDistributorId = parseInt(distributorId as string);
            if (isNaN(parsedDistributorId)) {
              throw ApiError.badRequest("distributorId must be a valid number");
            }
            options.distributorId = parsedDistributorId;
          }

          if (page) {
            const parsedPage = parseInt(page as string);
            if (isNaN(parsedPage) || parsedPage < 1) {
              throw ApiError.badRequest(
                "page must be a valid number greater than 0"
              );
            }
            options.page = parsedPage;
          }

          if (limit) {
            const parsedLimit = parseInt(limit as string);
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
              throw ApiError.badRequest(
                "limit must be a valid number between 1 and 50"
              );
            }
            options.limit = parsedLimit;
          }

          if (sort) {
            const sortDirection = (sort as string).toUpperCase();
            if (!["ASC", "DESC"].includes(sortDirection)) {
              throw ApiError.badRequest("sort must be either ASC or DESC");
            }
            options.sort = sortDirection as "ASC" | "DESC";
          }

          if (sortKey) {
            const validSortKeys = [
              "program_name",
              "manufacturer_name",
              "compliance_percentage",
              "total_earned_rebate"
            ];
            if (!validSortKeys.includes(sortKey as string)) {
              throw ApiError.badRequest(
                `sortKey must be one of: ${validSortKeys.join(", ")}`
              );
            }
            options.sortKey = sortKey as
              | "program_name"
              | "manufacturer_name"
              | "compliance_percentage"
              | "total_earned_rebate";
          }

          if (searchQuery) {
            options.searchQuery = searchQuery as string;
          }

          if (programTimeline) {
            const validTimelines = Object.values(PROGRAM_TIMELINE);
            if (!validTimelines.includes(programTimeline as string)) {
              throw ApiError.badRequest(
                `programTimeline must be one of: ${validTimelines.join(", ")}`
              );
            }
            options.programTimeline = programTimeline as string;
          }

          // Call service method
          const data = await ChainService.getChainProgramsByChainId(options);

          console.log(
            `[DEBUG] Chain programs API call completed for chain ${chainId}`
          );

          return sendSuccessResponse(res, data);
        } catch (error: any) {
          newrelic.noticeError(error, {
            method: "getChainPrograms",
            chainId: req.params.chainId?.toString() || "null",
            associatedUserId: req.user.associatedUserId?.toString() || "null",
            role: req.user.role || "null",
            distributorId: req.query.distributorId?.toString() || "null",
            optimization: "chain_programs_endpoint"
          });
          console.error("ChainController.getChainPrograms error:", error);
          return sendErrorResponse(res, error.message, error.statusCode);
        }
      }
    );
  }

  /**
   * Get stores for a specific chain with pagination and filtering
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise<Response>
   */
  public async getChainStores(req: Request, res: Response): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getChainStores",
      true,
      async () => {
        try {
          const { chainId } = req.params;
          const {
            page = "1",
            limit = "10",
            sort = "ASC",
            sortKey = "name",
            searchQuery,
            manufacturerId
          } = req.query;

          // Validate chain ID
          if (!chainId || isNaN(Number(chainId))) {
            return sendErrorResponse(
              res,
              "Invalid chain ID",
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate manufacturer ID if provided
          if (manufacturerId && isNaN(Number(manufacturerId))) {
            return sendErrorResponse(
              res,
              "Invalid manufacturer ID",
              HttpStatus.BAD_REQUEST
            );
          }

          // Parse and validate query parameters
          const parsedPage = parseInt(page as string);
          const parsedLimit = parseInt(limit as string);

          if (parsedPage < 1) {
            return sendErrorResponse(
              res,
              "Page must be greater than 0",
              HttpStatus.BAD_REQUEST
            );
          }

          if (parsedLimit < 1 || parsedLimit > 50) {
            return sendErrorResponse(
              res,
              "Limit must be between 1 and 50",
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate sort key
          const validSortKeys = [
            "name",
            "total_programs",
            "enrolled_programs",
            "compliant_programs",
            "total_earned_rebate",
            "total_purchase_volume"
          ];

          if (!validSortKeys.includes(sortKey as string)) {
            return sendErrorResponse(
              res,
              `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`,
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate sort direction
          if (!["ASC", "DESC"].includes((sort as string).toUpperCase())) {
            return sendErrorResponse(
              res,
              "Sort must be ASC or DESC",
              HttpStatus.BAD_REQUEST
            );
          }

          const { id: userId, role } = req.user;
          const distributorId = getParentDistributorId(req.user, role);

          const options: ChainStoresQueryOptions = {
            chainId: Number(chainId),
            distributorId,
            manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
            page: parsedPage,
            limit: parsedLimit,
            sort: (sort as string).toUpperCase() as "ASC" | "DESC",
            sortKey: sortKey as any,
            searchQuery: searchQuery as string
          };

          const result = await ChainService.getChainStores(options);

          console.log(
            `[PERF] Chain stores query completed for chain ${chainId}${manufacturerId ? ` and manufacturer ${manufacturerId}` : ""}, returned ${result.stores.length} stores`
          );

          return sendSuccessResponse(res, result);
        } catch (error: any) {
          console.error(`[ERROR] ChainController.getChainStores:`, error);
          return sendErrorResponse(
            res,
            error.message,
            error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }
    );
  }

  /**
   * Get chains for a specific manufacturer with pagination and filtering
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise<Response>
   */
  public async getManufacturerChains(
    req: Request,
    res: Response
  ): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getManufacturerChains",
      true,
      async () => {
        try {
          const { manufacturerId } = req.params;
          const {
            page = "1",
            limit = "10",
            sort = "ASC",
            sortKey = "chain_name",
            searchQuery,
            programTimeline
          } = req.query;

          // Validate manufacturer ID
          if (!manufacturerId || isNaN(Number(manufacturerId))) {
            return sendErrorResponse(
              res,
              "Invalid manufacturer ID",
              HttpStatus.BAD_REQUEST
            );
          }

          // Parse and validate query parameters
          const parsedPage = parseInt(page as string);
          const parsedLimit = parseInt(limit as string);

          if (parsedPage < 1) {
            return sendErrorResponse(
              res,
              "Page must be greater than 0",
              HttpStatus.BAD_REQUEST
            );
          }

          if (parsedLimit < 1 || parsedLimit > 50) {
            return sendErrorResponse(
              res,
              "Limit must be between 1 and 50",
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate sort key
          const validSortKeys = [
            "chain_name",
            "total_stores",
            "compliance_percentage",
            "total_earned_rebate"
          ];

          if (!validSortKeys.includes(sortKey as string)) {
            return sendErrorResponse(
              res,
              `Invalid sort key. Must be one of: ${validSortKeys.join(", ")}`,
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate sort direction
          if (!["ASC", "DESC"].includes((sort as string).toUpperCase())) {
            return sendErrorResponse(
              res,
              "Sort must be ASC or DESC",
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate timeline
          const validTimelines = ["Past", "Present", "Future"];
          if (
            programTimeline &&
            !validTimelines.includes(programTimeline as string)
          ) {
            return sendErrorResponse(
              res,
              `Invalid program timeline. Must be one of: ${validTimelines.join(", ")}`,
              HttpStatus.BAD_REQUEST
            );
          }

          const { id: userId, role } = req.user;
          const distributorId = getParentDistributorId(req.user, role);

          const options = {
            page: parsedPage,
            limit: parsedLimit,
            sort: (sort as string).toUpperCase() as "ASC" | "DESC",
            sortKey: sortKey as any,
            searchQuery: searchQuery as string,
            programTimeline: programTimeline as string
          };

          const result = await ChainService.getManufacturerChains(
            distributorId,
            Number(manufacturerId),
            options
          );

          console.log(
            `[PERF] Manufacturer chains query completed for manufacturer ${manufacturerId}, returned ${result.chains.length} chains`
          );
          console.log(result);

          return sendSuccessResponse(res, result);
        } catch (error: any) {
          console.error(
            `[ERROR] ChainController.getManufacturerChains:`,
            error
          );
          return sendErrorResponse(
            res,
            error.message,
            error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }
    );
  }

  /**
   * Gets refactored chain details with nested program structure
   * GET /app/chain/:chainId/details
   */
  public async getRefactoredChainDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    return newrelic.startSegment(
      "ChainController.getRefactoredChainDetails",
      true,
      async () => {
        try {
          const { chainId } = req.params;
          const { distributorId, programTimeline } = req.query;

          // Add custom attributes for tracking
          newrelic.addCustomAttributes({
            chainId: chainId?.toString() || "null",
            distributorId: distributorId?.toString() || "null",
            programTimeline: programTimeline?.toString() || "null"
          });

          console.log(
            `[DEBUG] ChainController.getRefactoredChainDetails called:`,
            {
              chainId,
              distributorId,
              programTimeline,
              rawQuery: req.query
            }
          );

          // Validate chainId
          const parsedChainId = parseInt(chainId, 10);
          if (isNaN(parsedChainId)) {
            throw new ApiError(400, "Invalid chain ID");
          }

          // Parse optional distributorId
          const parsedDistributorId = distributorId
            ? parseInt(distributorId as string, 10)
            : undefined;

          if (distributorId && isNaN(parsedDistributorId!)) {
            throw new ApiError(400, "Invalid distributor ID");
          }

          // Call the service to get refactored chain details
          const result = await ChainService.getRefactoredChainDetails(
            parsedChainId,
            parsedDistributorId,
            programTimeline as string
          );

          console.log(
            `[DEBUG] ChainController.getRefactoredChainDetails completed:`,
            {
              chainId: result.id,
              chainName: result.name,
              enrolledPrograms: result.programs.enrolled.length,
              unenrolledPrograms: result.programs.unenrolled.length,
              totalStores: result.summary.totalStores
            }
          );

          return sendSuccessResponse(res, result);
        } catch (error: any) {
          console.error(
            `[ERROR] ChainController.getRefactoredChainDetails:`,
            error
          );
          return sendErrorResponse(
            res,
            error.message,
            error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }
    );
  }
}

export default new ChainController();
