import { ERROR_MESSAGES } from "../config/errorMessages";
import { ApiError } from "../lib/errors/APIError";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";
import {
  getDistributorIdAsRole,
  isDistributorAdminOrManagerOrExecutive
} from "../utils/roles";
import { Request, Response } from "express";
import { ENTITY_TYPE, ORDER_STATUS } from "../config/appConstants";
import OrderService from "../services/OrderService";

class OrderController {
  public async createOrder(req: Request, res: Response) {
    try {
      let creatorId = undefined;
      let approverId = undefined;
      const creatorType = ENTITY_TYPE.DISTRIBUTOR_SALES_REP;
      const approverType = ENTITY_TYPE.DISTRIBUTOR;

      // Get the sales rep ID either from the user's own ID if they are a sales rep
      if (
        req.user.role === ENTITY_TYPE.SALES_REP ||
        req.user.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      ) {
        creatorId = req.user.associatedUserId;
        approverId = req.user.parentEntityId;
      } else {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.SALESREP_ID);
      }

      const result = await OrderService.createOrder({
        creatorId,
        creatorType,
        approverId,
        approverType
      });

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async updateOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      let approverId = undefined;
      const approverType = ENTITY_TYPE.DISTRIBUTOR;

      // Get the sales rep ID either from the user's own ID if they are a sales rep
      if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        approverId = getDistributorIdAsRole(req.user, req.user.role);
      } else {
        throw ApiError.badRequest(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      // Validate required fields
      if (!orderId || !status) {
        throw ApiError.badRequest(ERROR_MESSAGES.MISSING_REQUIRED_FILEDS);
      }

      // Validate status
      const validStatuses = Object.values(ORDER_STATUS);
      if (!validStatuses.includes(status)) {
        throw ApiError.badRequest(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      const result = await OrderService.updateOrderStatus({
        orderId: parseInt(orderId),
        status,
        approverId,
        approverType
      });

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      if (error.message === "Order not found") {
        return sendErrorResponse(res, error.message, 404);
      }

      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async deleteOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      // Validate required fields
      if (!orderId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.ORDER_ID);
      }

      const result = await OrderService.deleteOrder(parseInt(orderId));

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      if (error.message === "Order not found") {
        return sendErrorResponse(res, error.message, 404);
      }
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Get orders for the authenticated user
   * @param req Express request object
   * @param res Express response object
   */
  public async getOrders(req: Request, res: Response) {
    try {
      const { entityId, entityType } = req.query;
      let creatorId: number;
      let creatorType: string;
      let isReturnApprovalPending: boolean = false;

      // Determine creator ID and type based on user role
      if (
        req.user.role === ENTITY_TYPE.SALES_REP ||
        req.user.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      ) {
        creatorId = req.user.associatedUserId;
        creatorType = req.user.role;
      } else if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        creatorId = getDistributorIdAsRole(req.user, req.user.role);
        creatorType = ENTITY_TYPE.DISTRIBUTOR;
        isReturnApprovalPending = true;
      } else {
        throw ApiError.badRequest(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const orders = await OrderService.getOrders(
        creatorId,
        creatorType,
        entityId ? Number(entityId) : undefined,
        entityType ? String(entityType) : undefined,
        isReturnApprovalPending
      );

      return sendSuccessResponse(res, orders);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Get detailed information for a specific order
   * @param req Express request object
   * @param res Express response object
   */
  public async getOrderDetails(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      // Validate required fields
      if (!orderId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.ORDER_ID);
      }

      // Get user's creator information
      let creatorId: number;
      let creatorType: string;
      let distributorId: number;

      if (
        req.user.role === ENTITY_TYPE.SALES_REP ||
        req.user.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      ) {
        creatorId = req.user.associatedUserId;
        creatorType = req.user.role;
        distributorId = req.user.parentEntityId;
      } else if (isDistributorAdminOrManagerOrExecutive(req.user.role)) {
        creatorId = getDistributorIdAsRole(req.user, req.user.role);
        creatorType = ENTITY_TYPE.DISTRIBUTOR;
        distributorId = getDistributorIdAsRole(req.user, req.user.role);
      } else {
        throw ApiError.badRequest(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const orderDetails = await OrderService.getOrderDetails(
        parseInt(orderId),
        creatorId,
        creatorType,
        distributorId
      );

      if (!orderDetails) {
        throw ApiError.notFound("Order not found");
      }

      return sendSuccessResponse(res, orderDetails);
    } catch (error: any) {
      if (error.message === "Order not found") {
        return sendErrorResponse(res, error.message, 404);
      }
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }
}

export default new OrderController();
