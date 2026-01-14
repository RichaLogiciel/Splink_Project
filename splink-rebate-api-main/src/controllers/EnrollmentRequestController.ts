import { Request, Response } from "express";
import { HttpStatus } from "../config/HttpStatus";
import { ApiError } from "../lib/errors/APIError";
import EnrollmentRequestService from "../services/EnrollmentRequestService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";
import logger from "../lib/logger";
import { ENTITY_TYPE } from "../config/appConstants";

class EnrollmentRequestController {
  constructor() {
    this.getEnrollmentRequestStatus =
      this.getEnrollmentRequestStatus.bind(this);
  }

  /**
   * Get enrollment request status by requestId
   * Route: GET /api/v1/enrollment-requests/:requestId
   */
  public async getEnrollmentRequestStatus(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { requestId } = req.params;
      const user = (req as any).user;

      if (!requestId) {
        throw ApiError.badRequest("requestId is required");
      }

      logger.info("Fetching enrollment request status", {
        requestId,
        userId: user?.id
      });

      // Fetch the enrollment request
      const enrollmentRequest =
        await EnrollmentRequestService.getByRequestId(requestId);

      if (!enrollmentRequest) {
        throw ApiError.notFound(`Enrollment request not found: ${requestId}`);
      }

      // Authorization: User can only see their own requests, unless they are admin/super admin
      const isSuperAdmin = user?.entityType === ENTITY_TYPE.SUPER_ADMIN;
      const isOwnRequest = enrollmentRequest.userId === user?.id;

      if (!isSuperAdmin && !isOwnRequest) {
        throw ApiError.authorizationFailed(
          "You are not authorized to view this enrollment request"
        );
      }

      logger.info("Enrollment request found", {
        requestId,
        status: enrollmentRequest.status,
        action: enrollmentRequest.action
      });

      return sendSuccessResponse(res, {
        success: true,
        message: "Enrollment request retrieved successfully",
        data: {
          requestId: enrollmentRequest.requestId,
          sqsMessageId: enrollmentRequest.sqsMessageId,
          action: enrollmentRequest.action,
          status: enrollmentRequest.status,
          agreementIds: enrollmentRequest.agreementIds,
          storeIds: enrollmentRequest.storeIds,
          programIds: enrollmentRequest.programIds,
          userId: enrollmentRequest.userId,
          reason: enrollmentRequest.reason,
          timestamps: {
            apiRequestAt: enrollmentRequest.apiRequestAt,
            sqsSentAt: enrollmentRequest.sqsSentAt,
            workerReceivedAt: enrollmentRequest.workerReceivedAt,
            dbOperationStartedAt: enrollmentRequest.dbOperationStartedAt,
            dbOperationCompletedAt: enrollmentRequest.dbOperationCompletedAt,
            cacheClearCompletedAt: enrollmentRequest.cacheClearCompletedAt,
            completedAt: enrollmentRequest.completedAt,
            failedAt: enrollmentRequest.failedAt
          },
          results: {
            programParticipantsAffected:
              enrollmentRequest.programParticipantsAffected,
            storeListingAggregatesAffected:
              enrollmentRequest.storeListingAggregatesAffected,
            materializedViewsRefreshed:
              enrollmentRequest.materializedViewsRefreshed,
            cachesInvalidated: enrollmentRequest.cachesInvalidated
          },
          error: enrollmentRequest.errorMessage
            ? {
                message: enrollmentRequest.errorMessage,
                stage: enrollmentRequest.errorStage
              }
            : null,
          createdAt: enrollmentRequest.createdAt,
          updatedAt: enrollmentRequest.updatedAt
        }
      });
    } catch (error: any) {
      logger.error("Failed to fetch enrollment request status", {
        requestId: req.params.requestId,
        error: error.message,
        stack: error.stack
      });

      return sendErrorResponse(
        res,
        error.message || "Failed to fetch enrollment request status",
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export default new EnrollmentRequestController();
