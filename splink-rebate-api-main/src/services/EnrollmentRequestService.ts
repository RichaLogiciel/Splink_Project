import newrelic from "newrelic";
import logger from "../lib/logger";
import EnrollmentRequest from "../models/EnrollmentRequest";
import sequelize from "../db";
import { QueryTypes } from "sequelize";

interface CreateRequestParams {
  requestId: string;
  action: "enroll" | "unenroll";
  agreementIds: number[];
  storeIds: number[];
  userId: number;
  reason?: string;
  status: string;
}

interface UpdateAfterSqsSendParams {
  sqsMessageId: string;
  programIds: number[];
  status: string;
}

interface UpdateDbOperationCompletedParams {
  programParticipantsAffected: number;
  storeListingAggregatesAffected: number;
}

interface MarkCompletedParams {
  materializedViewsRefreshed: boolean;
  cachesInvalidated: boolean;
}

class EnrollmentRequestService {
  /**
   * Create initial enrollment request record
   */
  public async createRequest(
    params: CreateRequestParams
  ): Promise<EnrollmentRequest> {
    return newrelic.startSegment(
      "EnrollmentRequestService.createRequest",
      true,
      async () => {
        console.log("[DEBUG] createRequest called with:", {
          requestId: params.requestId,
          action: params.action,
          status: params.status,
          storeCount: params.storeIds.length,
          agreementCount: params.agreementIds.length
        });

        const record = await EnrollmentRequest.create({
          requestId: params.requestId,
          action: params.action,
          agreementIds: params.agreementIds,
          storeIds: params.storeIds,
          userId: params.userId,
          reason: params.reason,
          status: params.status,
          apiRequestAt: new Date()
        });

        console.log("[DEBUG] EnrollmentRequest.create returned:", {
          id: record.id,
          requestId: record.requestId,
          status: record.status,
          createdAt: record.createdAt?.toISOString()
        });

        // Immediately verify it exists in DB
        const verification: any = await sequelize.query(
          "SELECT id, request_id, status, deleted_at FROM enrollment_requests WHERE request_id = :requestId",
          {
            replacements: { requestId: params.requestId },
            type: QueryTypes.SELECT
          }
        );

        console.log("[DEBUG] Immediate DB verification after create:", {
          requestId: params.requestId,
          found: verification?.length > 0,
          record: verification?.[0] || null
        });

        return record;
      }
    );
  }

  /**
   * Update after successful SQS send
   */
  public async updateAfterSqsSend(
    requestId: string,
    params: UpdateAfterSqsSendParams
  ): Promise<void> {
    return newrelic.startSegment(
      "EnrollmentRequestService.updateAfterSqsSend",
      true,
      async () => {
        logger.info("Updating enrollment request after SQS send", {
          requestId,
          sqsMessageId: params.sqsMessageId
        });

        await EnrollmentRequest.update(
          {
            sqsMessageId: params.sqsMessageId,
            programIds: params.programIds,
            status: params.status,
            sqsSentAt: new Date()
          },
          {
            where: { requestId }
          }
        );

        logger.info("Enrollment request updated after SQS send", {
          requestId
        });
      }
    );
  }

  /**
   * Update when SQS send fails
   */
  public async updateSqsSendFailed(
    requestId: string,
    error: any
  ): Promise<void> {
    return newrelic.startSegment(
      "EnrollmentRequestService.updateSqsSendFailed",
      true,
      async () => {
        logger.error("Updating enrollment request after SQS send failure", {
          requestId,
          error: error.message
        });

        await EnrollmentRequest.update(
          {
            status: "SQS_SEND_FAILED",
            failedAt: new Date(),
            errorMessage: error.message,
            errorStack: error.stack,
            errorStage: "SQS_SEND"
          },
          {
            where: { requestId }
          }
        );

        logger.info("Enrollment request marked as SQS send failed", {
          requestId
        });
      }
    );
  }

  /**
   * Update when worker receives message
   */
  public async updateWorkerReceived(requestId: string): Promise<void> {
    return newrelic.startSegment(
      "EnrollmentRequestService.updateWorkerReceived",
      true,
      async () => {
        const timestamp = new Date();
        console.log("[DEBUG] updateWorkerReceived called with:", {
          requestId,
          requestIdType: typeof requestId,
          requestIdLength: requestId?.length,
          timestamp: timestamp.toISOString()
        });

        // Retry logic: Wait for record to be available (handles transaction timing)
        let nonDeletedRecords: any = [];
        let attempts = 0;
        const maxAttempts = 5;
        const delayMs = 1000; // Wait 1000ms between attempts

        while (attempts < maxAttempts) {
          attempts++;
          // Use raw SQL query to check if record exists in enrollment_requests
          nonDeletedRecords = await sequelize.query(
            "SELECT id, request_id, status, deleted_at FROM enrollment_requests WHERE request_id = :requestId AND deleted_at IS NULL",
            {
              replacements: { requestId },
              type: QueryTypes.SELECT,
              raw: true,
              logging: (sql) => {
                console.log("[DEBUG] Sequelize SELECT SQL:", sql);
              }
            }
          );

          if (nonDeletedRecords?.length > 0) {
            console.log("[DEBUG] Record found on attempt " + attempts, {
              requestId,
              recordId: nonDeletedRecords[0].id,
              status: nonDeletedRecords[0].status
            });
            break;
          }

          if (attempts < maxAttempts) {
            console.log(
              `[DEBUG] Record not found, waiting ${delayMs}ms before retry (attempt ${attempts}/${maxAttempts})`,
              { requestId }
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }

        console.log("[DEBUG] Record search completed:", {
          requestId,
          found: nonDeletedRecords?.length > 0,
          attempts,
          totalWaitTimeMs: (attempts - 1) * delayMs
        });

        const [affectedCount] = await EnrollmentRequest.update(
          {
            status: "WORKER_PROCESSING",
            workerReceivedAt: timestamp
          },
          {
            where: { requestId },
            logging: (sql) => {
              console.log("[DEBUG] Sequelize UPDATE SQL:", sql);
            }
          }
        );

        console.log("[DEBUG] Update result:", {
          requestId,
          affectedCount,
          success: affectedCount > 0
        });

        if (affectedCount === 0) {
          console.log(
            "[DEBUG] UPDATE FAILED - No rows affected after retries!",
            {
              requestId,
              recordFound: nonDeletedRecords?.length > 0,
              attemptsUsed: attempts,
              record: nonDeletedRecords?.[0] || null
            }
          );
        }

        // Verify the update
        const updated = await EnrollmentRequest.findOne({
          where: { requestId },
          logging: (sql) => {
            console.log("[DEBUG] Sequelize SELECT SQL:", sql);
          }
        });

        console.log("[DEBUG] Verification query result:", {
          requestId,
          found: !!updated,
          status: updated?.status,
          workerReceivedAt: updated?.workerReceivedAt?.toISOString() || null,
          sqsSentAt: updated?.sqsSentAt?.toISOString() || null
        });
      }
    );
  }

  /**
   * Update when DB operation starts
   */
  public async updateDbOperationStarted(requestId: string): Promise<void> {
    return newrelic.startSegment(
      "EnrollmentRequestService.updateDbOperationStarted",
      true,
      async () => {
        logger.info("Marking enrollment request DB operation started", {
          requestId
        });

        await EnrollmentRequest.update(
          {
            status: "DB_OPERATION_IN_PROGRESS",
            dbOperationStartedAt: new Date()
          },
          {
            where: { requestId }
          }
        );
      }
    );
  }

  /**
   * Update when DB operation completes
   */
  public async updateDbOperationCompleted(
    requestId: string,
    params: UpdateDbOperationCompletedParams
  ): Promise<void> {
    return newrelic.startSegment(
      "EnrollmentRequestService.updateDbOperationCompleted",
      true,
      async () => {
        logger.info("Marking enrollment request DB operation completed", {
          requestId,
          ...params
        });

        await EnrollmentRequest.update(
          {
            status: "CACHE_CLEAR_IN_PROGRESS",
            dbOperationCompletedAt: new Date(),
            programParticipantsAffected: params.programParticipantsAffected,
            storeListingAggregatesAffected:
              params.storeListingAggregatesAffected
          },
          {
            where: { requestId }
          }
        );

        logger.info("Enrollment request DB operation marked complete", {
          requestId
        });
      }
    );
  }

  /**
   * Update when cache clearing starts
   */
  public async updateCacheClearStarted(requestId: string): Promise<void> {
    return newrelic.startSegment(
      "EnrollmentRequestService.updateCacheClearStarted",
      true,
      async () => {
        logger.info("Marking enrollment request cache clear started", {
          requestId
        });

        await EnrollmentRequest.update(
          {
            cacheClearStartedAt: new Date()
          },
          {
            where: { requestId }
          }
        );

        logger.info("Enrollment request cache clear marked as started", {
          requestId
        });
      }
    );
  }

  /**
   * Mark enrollment request as completed
   */
  public async markCompleted(
    requestId: string,
    params: MarkCompletedParams
  ): Promise<void> {
    return newrelic.startSegment(
      "EnrollmentRequestService.markCompleted",
      true,
      async () => {
        logger.info("Marking enrollment request as completed", {
          requestId,
          ...params
        });

        await EnrollmentRequest.update(
          {
            status: "COMPLETED",
            cacheClearCompletedAt: new Date(),
            completedAt: new Date(),
            materializedViewsRefreshed: params.materializedViewsRefreshed,
            cachesInvalidated: params.cachesInvalidated
          },
          {
            where: { requestId }
          }
        );

        logger.info("Enrollment request marked as completed", {
          requestId
        });
      }
    );
  }

  /**
   * Mark enrollment request as failed
   */
  public async markFailed(
    requestId: string,
    error: any,
    stage: string
  ): Promise<void> {
    return newrelic.startSegment(
      "EnrollmentRequestService.markFailed",
      true,
      async () => {
        logger.error("Marking enrollment request as failed", {
          requestId,
          stage,
          error: error.message
        });

        const status =
          stage === "DB_OPERATION"
            ? "DB_OPERATION_FAILED"
            : stage === "CACHE_CLEAR"
              ? "CACHE_CLEAR_FAILED"
              : "FAILED";

        await EnrollmentRequest.update(
          {
            status,
            failedAt: new Date(),
            errorMessage: error.message,
            errorStack: error.stack,
            errorStage: stage
          },
          {
            where: { requestId }
          }
        );

        logger.info("Enrollment request marked as failed", {
          requestId,
          status,
          stage
        });
      }
    );
  }

  /**
   * Get enrollment request by request ID
   */
  public async getByRequestId(
    requestId: string
  ): Promise<EnrollmentRequest | null> {
    return newrelic.startSegment(
      "EnrollmentRequestService.getByRequestId",
      true,
      async () => {
        return await EnrollmentRequest.findOne({
          where: { requestId }
        });
      }
    );
  }

  /**
   * Get enrollment request by SQS message ID
   */
  public async getBySqsMessageId(
    sqsMessageId: string
  ): Promise<EnrollmentRequest | null> {
    return newrelic.startSegment(
      "EnrollmentRequestService.getBySqsMessageId",
      true,
      async () => {
        return await EnrollmentRequest.findOne({
          where: { sqsMessageId }
        });
      }
    );
  }
}

export default new EnrollmentRequestService();
