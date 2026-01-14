import { Request, Response } from "express";
import { HttpStatus } from "../config/HttpStatus";
import { ApiError } from "../lib/errors/APIError";
import { ENTITY_TYPE } from "../config/appConstants";
import logger from "../lib/logger";
import StoreEnrollmentStatusRepository from "../repositories/StoreEnrollmentStatusRepository";
import EnrollmentRequestService from "../services/EnrollmentRequestService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";

class StoreEnrollmentStatusController {
  constructor() {
    this.getByRequestId = this.getByRequestId.bind(this);
    this.getByStoreAgreement = this.getByStoreAgreement.bind(this);
  }

  /**
   * GET /api/v1/enrollment-requests/:requestId/store-statuses
   * Returns per-store/per-agreement statuses for a requestId.
   */
  public async getByRequestId(req: Request, res: Response): Promise<Response> {
    try {
      const { requestId } = req.params;
      const user = (req as any).user;

      if (!requestId) {
        throw ApiError.badRequest("requestId is required");
      }

      const enrollmentRequest =
        await EnrollmentRequestService.getByRequestId(requestId);

      if (!enrollmentRequest) {
        throw ApiError.notFound(`Enrollment request not found: ${requestId}`);
      }

      // Authorization: User can only see their own requests, unless super admin
      const isSuperAdmin = user?.entityType === ENTITY_TYPE.SUPER_ADMIN;
      const isOwnRequest = enrollmentRequest.userId === user?.id;

      if (!isSuperAdmin && !isOwnRequest) {
        throw ApiError.authorizationFailed(
          "You are not authorized to view this enrollment request"
        );
      }

      const statuses =
        await StoreEnrollmentStatusRepository.getByRequestId(requestId);

      return sendSuccessResponse(res, {
        success: true,
        message: "Store enrollment statuses retrieved successfully",
        data: {
          requestId,
          count: statuses.length,
          statuses: statuses.map((s) => ({
            id: s.id,
            storeId: s.storeId,
            agreementId: s.agreementId,
            manufacturerId: s.manufacturerId,
            action: s.action,
            status: s.status,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
          }))
        }
      });
    } catch (error: any) {
      logger.error("Failed to fetch store enrollment statuses by requestId", {
        requestId: req.params.requestId,
        error: error.message,
        stack: error.stack
      });

      return sendErrorResponse(
        res,
        error.message || "Failed to fetch store enrollment statuses",
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/store/:storeId/agreements/:agreementId/enrollment-statuses
   * Returns most recent statuses for a store+agreement.
   * Any authenticated user can access this endpoint.
   */
  public async getByStoreAgreement(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const storeId = Number(req.params.storeId);
      const agreementId = Number(req.params.agreementId);
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      if (!storeId || Number.isNaN(storeId)) {
        throw ApiError.badRequest("storeId must be a number");
      }
      if (!agreementId || Number.isNaN(agreementId)) {
        throw ApiError.badRequest("agreementId must be a number");
      }

      const statuses =
        await StoreEnrollmentStatusRepository.getLatestByStoreAgreement({
          storeId,
          agreementId,
          limit
        });

      return sendSuccessResponse(res, {
        success: true,
        message: "Store agreement enrollment statuses retrieved successfully",
        data: {
          storeId,
          agreementId,
          count: statuses.length,
          statuses
        }
      });
    } catch (error: any) {
      logger.error(
        "Failed to fetch store enrollment statuses by store+agreement",
        {
          storeId: req.params.storeId,
          agreementId: req.params.agreementId,
          error: error.message,
          stack: error.stack
        }
      );

      return sendErrorResponse(
        res,
        error.message || "Failed to fetch store enrollment statuses",
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export default new StoreEnrollmentStatusController();
