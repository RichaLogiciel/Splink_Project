import { Request, Response } from "express";
import { HttpStatus } from "../config/HttpStatus";
import { USER_ROLES } from "../config/roles";
import { ApiError } from "../lib/errors/APIError";
import DistributorAdminService from "../services/DistributorAdminService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";

class DistributorAdminController {
  /**
   * Retrieves all products with metadata for distributor admin dashboard
   * @param req - The request object with query parameters
   * @param res - The response object
   */
  public async getProducts(req: Request, res: Response): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      // Extract and validate query parameters
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        manufacturerId,
        categoryId,
        search,
        fields,
        includeSchema,
        categoryTags
      } = req.query;

      // Validate numeric parameters
      const parsedPage = page ? parseInt(page as string, 10) : undefined;
      const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
      const parsedManufacturerId = manufacturerId
        ? parseInt(manufacturerId as string, 10)
        : undefined;
      const parsedCategoryId = categoryId
        ? parseInt(categoryId as string, 10)
        : undefined;

      // Validate page and limit
      if (parsedPage !== undefined && (parsedPage < 1 || parsedPage > 10000)) {
        return sendErrorResponse(
          res,
          "Page must be between 1 and 10000",
          HttpStatus.BAD_REQUEST
        );
      }

      if (
        parsedLimit !== undefined &&
        (parsedLimit < 1 || parsedLimit > 1000)
      ) {
        return sendErrorResponse(
          res,
          "Limit must be between 1 and 1000",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate manufacturer and category IDs
      if (parsedManufacturerId !== undefined && parsedManufacturerId < 1) {
        return sendErrorResponse(
          res,
          "Manufacturer ID must be a positive integer",
          HttpStatus.BAD_REQUEST
        );
      }

      if (parsedCategoryId !== undefined && parsedCategoryId < 1) {
        return sendErrorResponse(
          res,
          "Category ID must be a positive integer",
          HttpStatus.BAD_REQUEST
        );
      }

      // Parse fields parameter
      let parsedFields: string[] | undefined;
      if (fields) {
        if (typeof fields === "string") {
          parsedFields = fields
            .split(",")
            .map((field) => field.trim())
            .filter((field) => field.length > 0);
        } else if (Array.isArray(fields)) {
          parsedFields = (fields as string[])
            .map((field) => field.trim())
            .filter((field) => field.length > 0);
        }
      }

      // Validate sort order
      const validSortOrder = (sortOrder as string)?.toUpperCase();
      if (validSortOrder && !["ASC", "DESC"].includes(validSortOrder)) {
        return sendErrorResponse(
          res,
          "Sort order must be ASC or DESC",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate categoryTags parameter
      if (categoryTags && typeof categoryTags !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: categoryTags must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (categoryTags && categoryTags.length > 100) {
        return sendErrorResponse(
          res,
          "Invalid parameter: categoryTags must be 100 characters or less",
          HttpStatus.BAD_REQUEST
        );
      }

      // Build service options
      const serviceOptions = {
        page: parsedPage,
        limit: parsedLimit,
        sortBy: sortBy as string,
        sortOrder: validSortOrder as "ASC" | "DESC",
        manufacturerId: parsedManufacturerId,
        categoryId: parsedCategoryId,
        search: search as string,
        fields: parsedFields,
        includeSchema: includeSchema === "true" || includeSchema === "1",
        categoryTags: categoryTags as string
      };

      // Get products data from service
      const result = await DistributorAdminService.getProducts(serviceOptions);

      // Send successful response
      return sendSuccessResponse(res, result);
    } catch (error) {
      console.error("Error in DistributorAdminController.getProducts:", error);

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving products",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves products schema/metadata information
   * @param req - The request object
   * @param res - The response object
   */
  public async getProductsSchema(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const schema = await DistributorAdminService.getProductsSchema();

      return sendSuccessResponse(res, schema);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getProductsSchema:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving schema",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves products statistics for dashboard
   * @param req - The request object
   * @param res - The response object
   */
  public async getProductsStatistics(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const statistics = await DistributorAdminService.getProductsStatistics();

      return sendSuccessResponse(res, statistics);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getProductsStatistics:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving statistics",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves distinct values for filtering options
   * @param req - The request object with field parameter
   * @param res - The response object
   */
  public async getFilterOptions(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const { field } = req.params;
      const { limit } = req.query;

      if (!field) {
        return sendErrorResponse(
          res,
          "Field parameter is required",
          HttpStatus.BAD_REQUEST
        );
      }

      const parsedLimit = limit ? parseInt(limit as string, 10) : 50;

      if (parsedLimit < 1 || parsedLimit > 500) {
        return sendErrorResponse(
          res,
          "Limit must be between 1 and 500",
          HttpStatus.BAD_REQUEST
        );
      }

      const options = await DistributorAdminService.getFilterOptions(
        field,
        parsedLimit
      );

      return sendSuccessResponse(res, options);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getFilterOptions:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving filter options",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves all product categories with product counts
   * @param req - The request object
   * @param res - The response object
   */
  public async getCategories(req: Request, res: Response): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const categories = await DistributorAdminService.getCategories();

      return sendSuccessResponse(res, categories);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getCategories:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving categories",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves all manufacturers with product counts
   * @param req - The request object
   * @param res - The response object
   */
  public async getManufacturers(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const manufacturers = await DistributorAdminService.getManufacturers();

      return sendSuccessResponse(res, manufacturers);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getManufacturers:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving manufacturers",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves all authorized distributor manufacturers (Super Admin only)
   * @param req - The request object
   * @param res - The response object
   */
  public async getAuthorizedDistributorManufacturers(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const authorizedData =
        await DistributorAdminService.getAuthorizedDistributorManufacturers();

      return sendSuccessResponse(res, authorizedData);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getAuthorizedDistributorManufacturers:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving authorized distributor manufacturers",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves store lookup data with filters (Super Admin only)
   * @param req - The request object with query parameters
   * @param res - The response object
   */
  public async getStoreLookup(req: Request, res: Response): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      // Extract and validate query parameters
      const { startDate, endDate, storeName, manufacturerName, categoryTags } =
        req.query;

      console.log(req.query);

      // Validate required parameters
      if (!storeName) {
        return sendErrorResponse(
          res,
          "Missing required parameter: storeName is required",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate parameter types
      if (typeof storeName !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: storeName must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (startDate && typeof startDate !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: startDate must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (endDate && typeof endDate !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: endDate must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (manufacturerName && typeof manufacturerName !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: manufacturerName must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (categoryTags && typeof categoryTags !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: categoryTags must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate parameter lengths
      if (storeName.trim().length === 0) {
        return sendErrorResponse(
          res,
          "Invalid parameter: storeName cannot be empty",
          HttpStatus.BAD_REQUEST
        );
      }

      if (storeName.length > 255) {
        return sendErrorResponse(
          res,
          "Invalid parameter: storeName must be 255 characters or less",
          HttpStatus.BAD_REQUEST
        );
      }

      if (manufacturerName && manufacturerName.length > 255) {
        return sendErrorResponse(
          res,
          "Invalid parameter: manufacturerName must be 255 characters or less",
          HttpStatus.BAD_REQUEST
        );
      }

      if (categoryTags && categoryTags.length > 100) {
        return sendErrorResponse(
          res,
          "Invalid parameter: categoryTags must be 100 characters or less",
          HttpStatus.BAD_REQUEST
        );
      }

      // Get store lookup data from service
      const lookupData = await DistributorAdminService.getStoreLookup(
        storeName.trim(),
        startDate as string | undefined,
        endDate as string | undefined,
        manufacturerName ? (manufacturerName as string).trim() : undefined,
        categoryTags as string | undefined
      );

      return sendSuccessResponse(res, lookupData);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getStoreLookup:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving store lookup data",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves all manufacturers that have products (Super Admin only)
   * @param req - The request object
   * @param res - The response object
   */
  public async getAllManufacturersFromProducts(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const manufacturers =
        await DistributorAdminService.getAllManufacturersFromProducts();

      return sendSuccessResponse(res, manufacturers);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getAllManufacturersFromProducts:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving manufacturers from products",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves programs with filters (Super Admin only)
   * @param req - The request object with query parameters
   * @param res - The response object
   */
  public async getProgramsWithFilters(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      // Extract and validate query parameters
      const {
        participantType,
        manufacturerName,
        startDate,
        endDate,
        distributorName
      } = req.query;

      // Validate parameter types
      if (participantType && typeof participantType !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: participantType must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (manufacturerName && typeof manufacturerName !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: manufacturerName must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (startDate && typeof startDate !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: startDate must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (endDate && typeof endDate !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: endDate must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      if (distributorName && typeof distributorName !== "string") {
        return sendErrorResponse(
          res,
          "Invalid parameter type: distributorName must be a string",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate parameter lengths
      if (manufacturerName && manufacturerName.length > 255) {
        return sendErrorResponse(
          res,
          "Invalid parameter: manufacturerName must be 255 characters or less",
          HttpStatus.BAD_REQUEST
        );
      }

      if (distributorName && distributorName.length > 255) {
        return sendErrorResponse(
          res,
          "Invalid parameter: distributorName must be 255 characters or less",
          HttpStatus.BAD_REQUEST
        );
      }

      // Get programs data from service
      const programs = await DistributorAdminService.getProgramsWithFilters(
        participantType as string | undefined,
        manufacturerName ? (manufacturerName as string).trim() : undefined,
        startDate as string | undefined,
        endDate as string | undefined,
        distributorName ? (distributorName as string).trim() : undefined
      );

      return sendSuccessResponse(res, programs);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getProgramsWithFilters:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving programs with filters",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves all distributors with organization names (Super Admin only)
   * @param req - The request object
   * @param res - The response object
   */
  public async getAllDistributors(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const distributors = await DistributorAdminService.getAllDistributors();

      return sendSuccessResponse(res, distributors);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getAllDistributors:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving distributors",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  /**
   * Retrieves distinct category tags for a specific manufacturer (Super Admin only)
   * @param req - The request object with manufacturerId parameter
   * @param res - The response object
   */
  public async getCategoryTags(req: Request, res: Response): Promise<Response> {
    try {
      // Authorization check - only super admins
      if (!req.user || req.user.role !== USER_ROLES.SUPER_ADMIN) {
        return sendErrorResponse(
          res,
          "Unauthorized: Access restricted to super admins",
          HttpStatus.FORBIDDEN
        );
      }

      const { manufacturerId } = req.params;

      // Validate manufacturer ID
      if (!manufacturerId) {
        return sendErrorResponse(
          res,
          "Manufacturer ID parameter is required",
          HttpStatus.BAD_REQUEST
        );
      }

      const parsedManufacturerId = parseInt(manufacturerId, 10);

      if (isNaN(parsedManufacturerId) || parsedManufacturerId < 1) {
        return sendErrorResponse(
          res,
          "Manufacturer ID must be a positive integer",
          HttpStatus.BAD_REQUEST
        );
      }

      const categoryTags =
        await DistributorAdminService.getCategoryTags(parsedManufacturerId);

      return sendSuccessResponse(res, categoryTags);
    } catch (error) {
      console.error(
        "Error in DistributorAdminController.getCategoryTags:",
        error
      );

      if (error instanceof ApiError) {
        return sendErrorResponse(res, error.message, error.statusCode);
      } else {
        return sendErrorResponse(
          res,
          "Internal server error while retrieving category tags",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }
}

export default new DistributorAdminController();
