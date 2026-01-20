import { Request, Response } from "express";
import { col, fn } from "sequelize";
import { ENTITY_TYPE } from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { USER_ROLES } from "../config/roles";
import { ApiError } from "../lib/errors/APIError";
import { Product } from "../models/associations";
import {
  default as ManufacturerDashboardService,
  default as ManufacturerService
} from "../services/ManufacturerService";
import { getProductCodeMappingInclude } from "../utils/helpers";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";
import {
  isDistributorAdminOrManagerOrExecutive,
  isDistributorGeneralManager
} from "../utils/roles";

class ManufacturerDashboardController {
  /**
   * Retrieves the key metrics for a manufacturer.
   * The key metrics include:
   * - totalSales: The total sales (earned rebate) for the manufacturer.
   * - totalDistributors: The total number of distributors associated with the manufacturer.
   * - storesCount: The total number of stores associated with the manufacturer.
   * - activeProgramsCount: The total number of active programs associated with the manufacturer.
   * @param {Request} req - The request object, containing the manufacturerId as a query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the key metrics data.
   */
  public async getKeyMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const { distributorId } = req.query;

      const manufacturerId =
        req.user.role == USER_ROLES.MANUFACTURER_EXECUTIVE
          ? req.user.parentEntityId
          : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      const data = await ManufacturerDashboardService.getKeyMetrics(
        Number(manufacturerId),
        Number(distributorId)
      );

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
    try {
      const { distributorId, monthRange, selectedProducts } = req.body;

      const manufacturerId = [
        USER_ROLES.MANUFACTURER_EXECUTIVE,
        USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      const isAccountManager =
        req.user.role == USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER;

      const data = await ManufacturerDashboardService.getProductInsights(
        Number(manufacturerId),
        distributorId ? Number(distributorId) : 0,
        monthRange as string,
        selectedProducts,
        isAccountManager ? Number(req.user.associatedUserId) : undefined
      );

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getKeyMetricsOptimized(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { distributorId, monthRange, selectedProducts, year } = req.query;

      const manufacturerId = [
        USER_ROLES.MANUFACTURER_EXECUTIVE,
        USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const parsedDistributorIds = distributorId
        ? distributorId?.toString().split(",").map(Number)
        : undefined;

      const parsedSelectedProducts = selectedProducts
        ? selectedProducts?.toString().split(",").map(Number)
        : undefined;

      const parsedYear = year ? Number(year) : undefined;

      const data = await ManufacturerDashboardService.getKeyMetricsOptimized({
        manufacturerId: Number(manufacturerId),
        distributorIds: parsedDistributorIds ?? [],
        monthRange: monthRange as string,
        selectedProductIds: parsedSelectedProducts,
        year: parsedYear
      });

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getTopProductsOptimized(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { distributorId, monthRange, selectedProducts, year } = req.query;

      const manufacturerId = [
        USER_ROLES.MANUFACTURER_EXECUTIVE,
        USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const parsedDistributorIds = distributorId
        ? distributorId?.toString().split(",").map(Number)
        : undefined;

      const parsedSelectedProducts = selectedProducts
        ? selectedProducts?.toString().split(",").map(Number)
        : undefined;

      const parsedYear = year ? Number(year) : undefined;

      const data = await ManufacturerDashboardService.getTopProductsOptimized({
        manufacturerId: Number(manufacturerId),
        distributorIds: parsedDistributorIds ?? [],
        monthRange: monthRange as string,
        selectedProductIds: parsedSelectedProducts,
        year: parsedYear
      });

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getDistributorSales(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { distributorId, monthRange, selectedProducts, year } = req.query;

      const manufacturerId = [
        USER_ROLES.MANUFACTURER_EXECUTIVE,
        USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const parsedDistributorIds = distributorId
        ? distributorId?.toString().split(",").map(Number)
        : undefined;

      const parsedSelectedProducts = selectedProducts
        ? selectedProducts?.toString().split(",").map(Number)
        : undefined;

      const parsedYear = year ? Number(year) : undefined;

      const data = await ManufacturerDashboardService.getDistributorSales({
        manufacturerId: Number(manufacturerId),
        distributorIds: parsedDistributorIds ?? [],
        monthRange: monthRange as string,
        selectedProductIds: parsedSelectedProducts,
        year: parsedYear
      });

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getStorePenetration(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { distributorId, monthRange, selectedProducts, year } = req.query;

      const manufacturerId = [
        USER_ROLES.MANUFACTURER_EXECUTIVE,
        USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const parsedDistributorIds = distributorId
        ? distributorId?.toString().split(",").map(Number)
        : undefined;

      const parsedSelectedProducts = selectedProducts
        ? selectedProducts?.toString().split(",").map(Number)
        : undefined;

      const parsedYear = year ? Number(year) : undefined;

      const data = await ManufacturerDashboardService.getStorePenetration({
        manufacturerId: Number(manufacturerId),
        distributorIds: parsedDistributorIds ?? [],
        monthRange: monthRange as string,
        selectedProductIds: parsedSelectedProducts,
        year: parsedYear
      });

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getProductInsightsOptimized(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { distributorId, monthRange, selectedProducts } = req.body;

      const manufacturerId = [
        USER_ROLES.MANUFACTURER_EXECUTIVE,
        USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      const isAccountManager =
        req.user.role == USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER;

      const data =
        await ManufacturerDashboardService.getProductInsightsOptimized(
          Number(manufacturerId),
          distributorId ? Number(distributorId) : 0,
          monthRange as string,
          selectedProducts,
          isAccountManager ? Number(req.user.associatedUserId) : undefined
        );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves a list of distributors associated with a manufacturer.
   *
   * @param {Request} req - The request object, containing the manufacturerId as a query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the list of distributors.
   */
  public async getDistributors(req: Request, res: Response): Promise<Response> {
    try {
      const isAccountManager =
        req.user.role == USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER;
      const manufacturerId =
        req.user.role == USER_ROLES.MANUFACTURER_EXECUTIVE || isAccountManager
          ? req.user.parentEntityId
          : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      const data = await ManufacturerDashboardService.getDistributors(
        Number(manufacturerId),
        isAccountManager ? Number(req.user.associatedUserId) : undefined
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getProducts(req: Request, res: Response): Promise<Response> {
    try {
      let manufacturerId;
      if (req.query.manufacturerId) {
        manufacturerId = req.query.manufacturerId;
      } else if (req.user.role == USER_ROLES.MANUFACTURER) {
        manufacturerId = req.user.associatedUserId;
      } else if (req.user.role == USER_ROLES.MANUFACTURER_EXECUTIVE) {
        manufacturerId = req.user.parentEntityId;
      }

      const data = await ManufacturerDashboardService.getProducts(
        Number(manufacturerId)
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the compliance details for a manufacturer.
   * This function retrieves compliance details for programs associated with
   * a manufacturer. It optionally accepts a distributor ID to filter the
   * compliance details specific to that distributor.
   *
   * @param {Request} req - The request object, containing the manufacturerId and
   * distributorId as query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response
   * containing the compliance details data.
   */
  public async getManufactureProgramCompliance(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { distributorId } = req.query;

      const manufacturerId =
        req.user.role == USER_ROLES.MANUFACTURER_EXECUTIVE
          ? req.user.parentEntityId
          : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const data =
        await ManufacturerDashboardService.getManufactureProgramComplianceDetails(
          Number(manufacturerId),
          Number(distributorId)
        );

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * This method retrieves sales data for a manufacturer.
   * The data includes total sales and bar chart data for the specified number of months.
   * @param {Request} req - The request object, containing the manufacturerId and months as query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the sales data response.
   */
  public async getSales(req: Request, res: Response): Promise<Response> {
    try {
      const { categoryId, distributorId, month } = req.query;

      const manufacturerId =
        req.user.role == USER_ROLES.MANUFACTURER_EXECUTIVE
          ? req.user.parentEntityId
          : req.user.associatedUserId;

      // Check if manufacturerId is provided
      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      const parsedManufacturerId = parseInt(manufacturerId as string);
      const parsedCategoryId = categoryId ? parseInt(categoryId as string) : 0;
      const parsedDistributorId = distributorId
        ? parseInt(distributorId as string)
        : undefined;

      // Pass distributorId to getTotalSales function
      const response = await ManufacturerDashboardService.getTotalSales(
        parsedManufacturerId,
        parsedCategoryId,
        parsedDistributorId,
        true,
        String(month ?? "1")
      );

      // Return the success response
      return sendSuccessResponse(res, response);
    } catch (error: any) {
      // Handle errors and send error response
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves a list of stores associated with a manufacturer.
   * The list includes the store names, distributor names, and total sales.
   * Optionally, the list can be filtered by a distributor ID.
   * The list can also be sorted by the store name or total sales.
   * @param {Request} req - The request object, containing the manufacturerId, distributorId, searchQuery, page, and sort as query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the list of stores.
   */
  public async getStoresListing(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const {
        distributorId,
        searchQuery,
        page,
        sort,
        sortKey,
        programTimeline,
        isExcludeChainStores
      } = req.query;

      const excludeChainStores =
        isExcludeChainStores?.toString()?.toLowerCase() == "true"
          ? true
          : false;

      const manufacturerId = [
        USER_ROLES.MANUFACTURER_EXECUTIVE,
        USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      const accountManagerId =
        req.user.role == USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
          ? req.user.associatedUserId
          : null;

      const data = await ManufacturerDashboardService.getStoresListing(
        Number(manufacturerId),
        distributorId ? Number(distributorId) : null,
        Number(page ?? 1),
        sort as string,
        searchQuery as string,
        sortKey as string,
        accountManagerId ? Number(accountManagerId) : undefined,
        programTimeline as string,
        excludeChainStores
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      console.error(error);
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the purchase details of a store associated with a manufacturer.
   * The purchase details include the purchase amount and program compliance.
   * Optionally, the purchase details can be filtered by a category ID.
   * @param {Request} req - The request object, containing the manufacturerId, storeId, distributorId, and categoryId as route or query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the purchase details.
   */
  public async getStorePurchasesDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { storeId } = req.params;
    const { associatedUserId: manufacturerId } = req.user;
    const { distributorId, categoryId } = req.query;

    try {
      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      if (!distributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      if (!storeId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.STORE_ID);
      }

      const data = await ManufacturerDashboardService.getStorePurchasesDetails(
        Number(manufacturerId),
        Number(storeId),
        Number(distributorId),
        categoryId ? Number(categoryId) : undefined
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the sales overview for a distributor associated with a manufacturer.
   * The sales overview includes the total sales and bar chart data for the distributor.
   * @param {Request} req - The request object, containing the manufacturerId as a query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the sales overview data.
   */
  public async getDistributorSalesOverview(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { distributorId, category, month } = req.query;

      const manufacturerId =
        req.user.role == USER_ROLES.MANUFACTURER_EXECUTIVE
          ? req.user.parentEntityId
          : req.user.associatedUserId;

      // Validate that manufacturerId is provided
      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      // Call the service to get the sales data, including distributor and category filters if provided
      const salesData =
        await ManufacturerDashboardService.getDistributorSalesOverview({
          manufacturerId: parseInt(manufacturerId as string),
          distributorId: distributorId
            ? parseInt(distributorId as string)
            : null,
          categoryId: category ? parseInt(category as string) : null,
          month: Number(month ?? 1)
        });

      // Return the success response with sales data
      return sendSuccessResponse(res, salesData);
    } catch (error: any) {
      // Handle errors and send an error response
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the number of SKUs associated with each store for a given manufacturer.
   * The result is a list of objects, each containing the store ID and the number of associated SKUs.
   * @param {Request} req - The request object, containing the manufacturerId as a query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the list of store SKUs.
   */
  public async getSkusPerStore(req: Request, res: Response): Promise<Response> {
    try {
      const {
        categoryId,
        monthRange,
        warehouseId: selectedWarehouseId
      } = req.query;
      const { user } = req;

      // set distributor id
      let distributorId;
      if (user.role == ENTITY_TYPE.DISTRIBUTOR_ADMIN) {
        distributorId = user.associatedUserId;
      } else if (
        user.role == ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE ||
        isDistributorAdminOrManagerOrExecutive(user.role)
      ) {
        distributorId = user.parentEntityId;
      } else if (
        [
          ENTITY_TYPE.MANUFACTURER,
          ENTITY_TYPE.MANUFACTURER_EXECUTIVE,
          ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER
        ].includes(user.role)
      ) {
        distributorId = req.query.distributorId;
      }

      // set manufacturer id
      let manufacturerId;
      let managerId;
      if (
        [
          ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
        ].includes(user.role)
      ) {
        manufacturerId = req.query.manufacturerId;
      } else if (user.role == ENTITY_TYPE.MANUFACTURER) {
        manufacturerId = user.associatedUserId;
      } else if (user.role == ENTITY_TYPE.MANUFACTURER_EXECUTIVE) {
        manufacturerId = user.parentEntityId;
      } else if (user.role == ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER) {
        manufacturerId = user.parentEntityId;
        managerId = user.associatedUserId;
      }

      let distributorManagerId = undefined;
      let isGeneralManager = undefined;

      if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        distributorManagerId = req.user.associatedUserId;
        isGeneralManager = isDistributorGeneralManager(req.user.role);
      }

      // Call the service to get the sales data, passing in the optional distributorId and categoryId
      const salesData = await ManufacturerService.getMergedSkusPerStoreData(
        parseInt(manufacturerId as string),
        distributorId ? parseInt(distributorId as string) : null,
        categoryId ? (categoryId as string) : null,
        monthRange ? (monthRange as string) : null,
        managerId ? parseInt(managerId) : null,
        Number(distributorManagerId),
        isGeneralManager,
        Number(selectedWarehouseId)
      );

      // Return the success response with sales data
      return sendSuccessResponse(res, salesData);
    } catch (error: any) {
      // Handle errors and send an error response
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the number of SKUs associated with each store for a given manufacturer (optimized version).
   * The result is a list of objects, each containing the store ID and the number of associated SKUs.
   * @param {Request} req - The request object, containing the manufacturerId as a query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the list of store SKUs.
   */
  public async getSkusPerStoreOptimized(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const {
        categoryId,
        monthRange,
        warehouseId: selectedWarehouseId,
        distributorIds,
        year
      } = req.query;

      const { user } = req;

      // set distributor id
      let distributorId;
      if (user.role == ENTITY_TYPE.DISTRIBUTOR_ADMIN) {
        distributorId = user.associatedUserId;
      } else if (
        user.role == ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE ||
        isDistributorAdminOrManagerOrExecutive(user.role)
      ) {
        distributorId = user.parentEntityId;
      } else if (
        [
          ENTITY_TYPE.MANUFACTURER,
          ENTITY_TYPE.MANUFACTURER_EXECUTIVE,
          ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER
        ].includes(user.role)
      ) {
        distributorId = req.query.distributorId;
      }

      // set manufacturer id
      let manufacturerId;
      let managerId;
      if (
        [
          ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
        ].includes(user.role)
      ) {
        manufacturerId = req.query.manufacturerId;
      } else if (user.role == ENTITY_TYPE.MANUFACTURER) {
        manufacturerId = user.associatedUserId;
      } else if (user.role == ENTITY_TYPE.MANUFACTURER_EXECUTIVE) {
        manufacturerId = user.parentEntityId;
      } else if (user.role == ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER) {
        manufacturerId = user.parentEntityId;
        managerId = user.associatedUserId;
      }

      let distributorManagerId = undefined;
      let isGeneralManager = undefined;

      if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        distributorManagerId = req.user.associatedUserId;
        isGeneralManager = isDistributorGeneralManager(req.user.role);
      }

      const parsedDistributorIds = distributorIds
        ? distributorIds?.toString().split(",").map(Number)
        : undefined;

      const parsedYear = year ? Number(year) : undefined;

      // Call the service to get the sales data, passing in the optional distributorId and categoryId
      const salesData =
        await ManufacturerService.getMergedSkusPerStoreDataOptimized({
          manufacturerId: parseInt(manufacturerId as string),
          distributorId: distributorId
            ? parseInt(distributorId as string)
            : null,
          categoryId: categoryId ? (categoryId as string) : null,
          monthRange: monthRange ? (monthRange as string) : null,
          managerId: managerId ? parseInt(managerId) : null,
          distributorManagerId: Number(distributorManagerId),
          isGeneralManager,
          selectedWarehouseId: Number(selectedWarehouseId),
          parsedDistributorIds: parsedDistributorIds,
          year: parsedYear
        });

      // Return the success response with sales data
      return sendSuccessResponse(res, salesData);
    } catch (error: any) {
      // Handle errors and send an error response
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the programs overview for a given manufacturer.
   * The result is an object containing the top and bottom performing programs.
   * @param {Request} req - The request object, containing the manufacturerId as a query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the programs overview.
   */
  public async getProgramsOverview(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { distributorId, programTimeline } = req.query;

      const manufacturerId = [
        USER_ROLES.MANUFACTURER_EXECUTIVE,
        USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      const managerId =
        req.user.role == USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
          ? req.user.associatedUserId
          : undefined;

      // Validate that manufacturerId is provided
      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      // Call the service to get the sales data
      const salesData = await ManufacturerDashboardService.getProgramsOverview(
        parseInt(manufacturerId as string),
        parseInt(distributorId as string),
        parseInt(managerId as string),
        programTimeline as string
      );
      console.log("salesData", salesData);

      // Return the success response with sales data
      return sendSuccessResponse(res, salesData);
    } catch (error: any) {
      // Handle errors and send an error response
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getAuthorized(req: Request, res: Response): Promise<Response> {
    try {
      const distributorId = [
        USER_ROLES.DISTRIBUTOR_EXECUTIVE,
        USER_ROLES.DISTRIBUTOR_SALES_REP
      ].includes(req.user.role)
        ? req.user.parentEntityId
        : req.user.associatedUserId;

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const data = await ManufacturerService.getAuthorized(
        Number(distributorId)
      );

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves products associated with a specific program.
   * @param {Request} req - The request object, containing the programId as a query parameter.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the products.
   */
  public async getCategoriesProducts(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { programId } = req.query;
      const manufacturerId = req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      const data = await ManufacturerService.getCategoriesProducts(
        Number(manufacturerId),
        programId ? Number(programId) : undefined
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getManagerDistributors(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { managerId } = req.query;
      const manufacturerId = req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      if (!managerId) {
        throw ApiError.notFound(
          ERROR_MESSAGES.REQUIRED.MANUFACTURER_ACCOUNT_MANAGER_ID
        );
      }

      const data = await ManufacturerService.getManagerDistributors(
        Number(manufacturerId),
        Number(managerId)
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async updateManagerDistributorRelation(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { managerId, distributorId } = req.params;
      const manufacturerId = req.user.associatedUserId;

      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      if (!managerId) {
        throw ApiError.notFound(
          ERROR_MESSAGES.REQUIRED.MANUFACTURER_ACCOUNT_MANAGER_ID
        );
      }

      if (!distributorId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      const data = await ManufacturerService.updateManagerDistributorRelation(
        Number(manufacturerId),
        Number(managerId),
        Number(distributorId)
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getManufacturerProductTags(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { manufacturerId } = req.params;
      let distributorId;
      if (!manufacturerId) {
        throw ApiError.notFound(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
      }

      // Build attributes array stepwise to avoid linter errors
      const attributes: (string | [any, string])[] = [
        "id",
        "category_tags_json",
        // "category_id",
        "name",
        "unit_skus_id",
        "case_skus_id",
        "box_skus_id"
      ];

      if (req.user.role == USER_ROLES.DISTRIBUTOR_ADMIN) {
        attributes.push([
          fn("MIN", col("ProductCodeMapping.code")),
          "internal_code"
        ]);
        distributorId = req.user.associatedUserId;
      }

      // Get all category_tags_json from products table where manufacturerId matches
      const products = await Product.findAll({
        where: { manufacturerId: manufacturerId },
        attributes: attributes,
        include: getProductCodeMappingInclude(distributorId),
        group: ["Product.id"],
        raw: true
      });

      // Extract, flatten, and deduplicate tags
      const allTags = products
        .map((p: any) =>
          Array.isArray(p.category_tags_json) ? p.category_tags_json : []
        )
        .flat();
      const distinctTags = Array.from(new Set(allTags));

      // Extract, flatten, and deduplicate Products
      const uniqueProducts = products.reduce((acc: any[], product: any) => {
        const skuIds = [
          product.unit_skus_id,
          product.case_skus_id,
          product.box_skus_id
        ].filter(Boolean);

        // Check if any of the product's SKUs already exist in accumulator
        const isDuplicate = acc.some((existingProduct: any) => {
          const existingSkus = [
            existingProduct.unit_skus_id,
            existingProduct.case_skus_id,
            existingProduct.box_skus_id
          ].filter(Boolean);
          return skuIds.some((sku) => existingSkus.includes(sku));
        });

        if (!isDuplicate) {
          acc.push({
            id: product.id,
            name: product.name,
            unit_skus_id: product.unit_skus_id,
            case_skus_id: product.case_skus_id,
            box_skus_id: product.box_skus_id,
            internal_code: product?.internal_code
          });
        }
        return acc;
      }, []);

      // // Get Unique category_id
      // const uniqueCategoryIds = Array.from(
      //   new Set(products.map((p: any) => p.category_id))
      // );

      // // Get all NACS Category Tags
      // const nacsCategoryTags = (
      //   await ProductCategory.findAll({
      //     where: { id: { [Op.in]: uniqueCategoryIds } },
      //     attributes: ["name"],
      //     raw: true
      //   })
      // )?.map((p: any) => p.name);

      return sendSuccessResponse(res, {
        tags: distinctTags,
        products: uniqueProducts
        // nacsCategoryTags: nacsCategoryTags
      });
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves ROI metrics for a manufacturer program.
   * Optionally filters by distributor ID.
   * @param {Request} req - The request object, containing programId and optional distributorId as query parameters.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the response containing the ROI data.
   */
  public async getROI(req: Request, res: Response): Promise<Response> {
    try {
      const { programId, distributorId } = req.query;

      if (!programId) {
        throw ApiError.badRequest("programId is required");
      }

      const data = await ManufacturerDashboardService.getROI(
        Number(programId),
        distributorId ? Number(distributorId) : undefined
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }
}

export default new ManufacturerDashboardController();
