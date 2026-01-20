import crypto from "crypto";
import newrelic from "newrelic";
import { Op, QueryTypes, Sequelize } from "sequelize";
import sequelize from "../db";
import { ApiError } from "../lib/errors/APIError";
import logger from "../lib/logger";
import ProgramAgreement from "../models/ProgramAgreement";
import Program from "../models/Program";
import ProgramApproval from "../models/ProgramApproval";
import ProgramParticipant from "../models/ProgramParticipant";
import Store from "../models/Store";
import { enqueueJob } from "../utils/sqsClient";
import { PROGRAM_APPROVAL_STATUS, ENTITY_TYPE } from "../config/appConstants";
import { getParentDistributorId } from "../utils/roles";
import StoreEnrollmentStatusRepository from "../repositories/StoreEnrollmentStatusRepository";
// import { getCacheKey, redisClient } from "../utils/redis";
// import { useApiCaching, CACHE_TTL_TIME } from "../config/appConstants";
import {
  AgreementResponse,
  EnrollByAgreementParams,
  EnrollByAgreementResult,
  GetAgreementsByManufacturerResult,
  GetStoreAgreementEnrollmentsParams,
  GetStoreAgreementEnrollmentsResult,
  StoreAgreementAvailable,
  StoreAgreementAvailableRaw
} from "../types/AgreementTypes";

class ProgramAgreementService {
  /**
   * Enroll or unenroll stores in programs via agreement IDs
   * Validates inputs and enqueues worker job
   */
  public async enrollStoresByAgreement(
    params: EnrollByAgreementParams
  ): Promise<EnrollByAgreementResult> {
    return newrelic.startSegment(
      "ProgramAgreementService.enrollStoresByAgreement",
      true,
      async () => {
        const { action, agreementIds, storeIds, userId, reason, requestId } =
          params;

        logger.info("Starting agreement-based enrollment validation", {
          action,
          agreementCount: agreementIds.length,
          storeCount: storeIds.length,
          requestId
        });

        // Step 1: Validate agreements exist and get associated program IDs
        const programIds =
          await this.validateAgreementsAndGetPrograms(agreementIds);

        if (programIds.length === 0) {
          throw ApiError.notFound(
            `No programs found for agreement IDs: ${agreementIds.join(", ")}`
          );
        }

        logger.info("Agreements validated", {
          agreementCount: agreementIds.length,
          programCount: programIds.length,
          requestId
        });

        // Step 2: Validate stores exist
        await this.validateStoresExist(storeIds);

        logger.info("Stores validated", {
          storeCount: storeIds.length,
          requestId
        });

        // Step 2.5: Record per-store/per-agreement processing statuses for this request
        if (requestId) {
          await StoreEnrollmentStatusRepository.upsertStatusesForRequest({
            requestId,
            action,
            status: "processing",
            storeIds,
            agreementIds
          });
        }

        // Step 3: Enqueue worker job
        const jobId = await this.enqueueAgreementEnrollmentJob({
          action,
          agreementIds,
          storeIds,
          programIds,
          userId,
          reason,
          requestId
        });

        const expectedEnrollments = storeIds.length * programIds.length;

        logger.info("Agreement enrollment job enqueued", {
          jobId,
          action,
          agreementCount: agreementIds.length,
          storeCount: storeIds.length,
          programCount: programIds.length,
          expectedEnrollments,
          requestId
        });

        return {
          success: true,
          message: `Enrollment job queued for ${storeIds.length} stores across ${agreementIds.length} agreements`,
          data: {
            jobId,
            agreementIds,
            storeIds,
            action,
            programCount: programIds.length,
            expectedEnrollments,
            programIds
          }
        };
      }
    );
  }

  /**
   * Validate agreements exist and retrieve associated program IDs
   */
  private async validateAgreementsAndGetPrograms(
    agreementIds: number[]
  ): Promise<number[]> {
    const agreements = await ProgramAgreement.findAll({
      where: {
        agreementId: agreementIds,
        deletedAt: null
      },
      attributes: ["agreementId", "programId"],
      raw: true
    });

    if (agreements.length === 0) {
      throw ApiError.notFound(
        `No agreements found for IDs: ${agreementIds.join(", ")}`
      );
    }

    // Check if all requested agreement IDs were found
    const foundIds = agreements.map((a: any) => a.agreementId);
    const missingIds = agreementIds.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      throw ApiError.notFound(
        `Agreement IDs not found: ${missingIds.join(", ")}`
      );
    }

    // Extract unique program IDs
    const programIds = [...new Set(agreements.map((a: any) => a.programId))];

    return programIds;
  }

  /**
   * Validate that all store IDs exist
   */
  private async validateStoresExist(storeIds: number[]): Promise<void> {
    const storeCount = await Store.count({
      where: {
        id: storeIds,
        deletedAt: null
      }
    });

    if (storeCount !== storeIds.length) {
      throw ApiError.notFound(
        `Some store IDs not found. Expected ${storeIds.length}, found ${storeCount}`
      );
    }
  }

  /**
   * Generate a deterministic MessageGroupId from agreement IDs.
   * Uses SHA-256 hash to ensure the ID stays under SQS FIFO's 128 character limit.
   */
  private generateMessageGroupId(agreementIds: number[]): string {
    const hash = crypto
      .createHash("sha256")
      .update([...agreementIds].sort((a, b) => a - b).join(","))
      .digest("hex")
      .substring(0, 32);
    return `agreement-enrollment-${hash}`;
  }

  /**
   * Enqueue worker job for agreement-based enrollment
   */
  private async enqueueAgreementEnrollmentJob(params: {
    action: "enroll" | "unenroll";
    agreementIds: number[];
    storeIds: number[];
    programIds: number[];
    userId: number;
    reason?: string;
    requestId?: string;
  }): Promise<string> {
    const {
      action,
      agreementIds,
      storeIds,
      programIds,
      userId,
      reason,
      requestId
    } = params;

    logger.info("Preparing to enqueue agreement enrollment job", {
      action,
      agreementIds,
      storeIds: storeIds.length,
      programIds: programIds.length,
      userId,
      requestId
    });

    try {
      const payload = {
        action,
        agreementIds,
        storeIds,
        programIds,
        userId,
        reason: reason || `Agreement-based ${action}`,
        timestamp: new Date().toISOString(),
        requestId
      };

      const messageGroupId = this.generateMessageGroupId(agreementIds);

      logger.info("Calling enqueueJob", {
        jobType: "AGREEMENT_STORE_ENROLLMENT_CHANGED",
        payloadSize: JSON.stringify(payload).length,
        messageGroupId,
        requestId,
        payloadKeys: Object.keys(payload),
        agreementIdsCount: agreementIds.length,
        storeIdsCount: storeIds.length,
        programIdsCount: programIds.length
      });

      logger.info("📤 [AGREEMENT-ENROLLMENT] About to call enqueueJob", {
        requestId,
        jobType: "AGREEMENT_STORE_ENROLLMENT_CHANGED",
        messageGroupId
      });

      const messageId = await enqueueJob({
        jobType: "AGREEMENT_STORE_ENROLLMENT_CHANGED",
        payload,
        messageGroupId
      });

      logger.info(
        "✅ [AGREEMENT-ENROLLMENT] enqueueJob returned successfully",
        {
          requestId,
          messageId
        }
      );

      logger.info("Agreement enrollment job enqueued successfully", {
        action,
        messageId,
        agreementIds,
        storeCount: storeIds.length,
        programCount: programIds.length,
        requestId
      });

      return messageId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : typeof error;
      const errorCode = (error as any)?.Code || (error as any)?.code;

      logger.error(
        "❌ [AGREEMENT-ENROLLMENT] Failed to enqueue agreement enrollment job",
        {
          requestId,
          action,
          agreementIds,
          storeIds: storeIds.length,
          programIds: programIds.length,
          userId,
          errorMessage,
          errorName,
          errorCode,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  name: error.name,
                  stack: error.stack
                }
              : error,
          fullError: JSON.stringify(
            error,
            Object.getOwnPropertyNames(error),
            2
          ),
          errorDetails: {
            ...((error as any).Code && { awsCode: (error as any).Code }),
            ...((error as any).code && { code: (error as any).code }),
            ...((error as any).statusCode && {
              statusCode: (error as any).statusCode
            }),
            ...((error as any).requestId && {
              awsRequestId: (error as any).requestId
            }),
            ...((error as any).retryable && {
              retryable: (error as any).retryable
            })
          }
        }
      );

      throw ApiError.internal(
        `Failed to queue enrollment job: ${errorMessage}`
      );
    }
  }

  /**
   * Get agreements by manufacturer IDs
   * Retrieves all program agreements for the specified manufacturers
   * @param timeline - Optional filter: "Current" for active programs, "Historical" for expired programs. Defaults to "Current"
   */
  public async getByManufacturerIds(
    manufacturerIds: number[],
    user?: { role: string; parentEntityId: number; associatedUserId: number },
    programTimeline: string = "Current"
  ): Promise<GetAgreementsByManufacturerResult> {
    return newrelic.startSegment(
      "ProgramAgreementService.getByManufacturerIds",
      true,
      async () => {
        // Sort IDs for consistent ordering
        const sortedIds = [...manufacturerIds].sort((a, b) => a - b);

        // Determine distributor ID for approval filtering
        let distributorId: number | null = null;
        if (user) {
          distributorId = getParentDistributorId(user, user.role);
          if (!distributorId) {
            logger.warn(
              "User provided but distributorId could not be determined",
              {
                role: user.role
              }
            );
          }
        }

        logger.info("Fetching agreements from database", {
          manufacturerIds: sortedIds,
          approvalFiltering: !!distributorId,
          distributorId,
          programTimeline
        });

        // Query database from program_agreements table
        // Always include Program to filter by timeline
        const programInclude: any = {
          model: Program,
          as: "program",
          required: true, // INNER JOIN
          attributes: [], // Don't select Program fields
          where: {
            ...Program.getProgramTimelineFilter(programTimeline)
          }
        };

        // Add ProgramApproval include if distributorId is provided
        if (distributorId) {
          programInclude.include = [
            {
              model: ProgramApproval,
              as: "ProgramApproval",
              required: true, // INNER JOIN
              attributes: [], // Don't select ProgramApproval fields
              where: {
                approver_type: ENTITY_TYPE.DISTRIBUTOR,
                approver_id: distributorId,
                status: PROGRAM_APPROVAL_STATUS.APPROVED,
                deleted_at: null
              }
            }
          ];
        }
        const agreements = await ProgramAgreement.findAll({
          attributes: [
            "id",
            "agreementId",
            "agreementName",
            "programId",
            "manufacturerId"
          ],
          include: [programInclude],
          where: {
            manufacturerId: {
              [Op.in]: sortedIds
            },
            deletedAt: null
          },
          raw: true
        });

        // logger.info("Agreements retrieved", {
        //   manufacturerIds: sortedIds,
        //   count: agreements.length,
        //   approvalFilterApplied: !!distributorId,
        //   programTimeline
        // });

        // console.log("agreements", agreements);

        // Map to response format
        const result: GetAgreementsByManufacturerResult = {
          agreements: agreements.map((a: any) => ({
            agreementId: a.agreementId || a.id, // Use agreement_id if available, fallback to id
            agreementName: a.agreementName,
            programId: a.programId,
            manufacturerId: a.manufacturerId
          })),
          count: agreements.length
        };

        return result;
      }
    );
  }

  /**
   * Get available agreements for a specific store (agreements the store should be enrolled in but isn't)
   * Returns agreements where:
   * - Program agreement belongs to manufacturer
   * - Program end_date > NOW() (active/future programs)
   * - Store is NOT currently enrolled (no active enrollment in program_participants)
   * - Optionally filtered by manufacturer
   */
  private async getStoreAvailableAgreements(
    params: GetStoreAgreementEnrollmentsParams,
    user?: { role: string; parentEntityId: number; associatedUserId: number }
  ): Promise<StoreAgreementAvailableRaw[]> {
    return newrelic.startSegment(
      "ProgramAgreementService.getStoreAvailableAgreements",
      true,
      async () => {
        const { storeId, manufacturerIds } = params;

        if (!manufacturerIds || manufacturerIds.length === 0) {
          // If manufacturerIds is not provided, return empty array
          // The query requires manufacturer_id, so we can't fetch all manufacturers
          logger.warn(
            "getStoreAvailableAgreements called without manufacturerIds, returning empty array",
            { storeId }
          );
          return [];
        }

        // Determine distributor ID for approval filtering
        let distributorId: number | null = null;
        if (user) {
          distributorId = getParentDistributorId(user, user.role);
          if (!distributorId) {
            logger.warn(
              "User provided but distributorId could not be determined",
              {
                role: user.role
              }
            );
          }
        }

        logger.info("Fetching store available agreements from database", {
          storeId,
          manufacturerIds,
          approvalFiltering: !!distributorId,
          distributorId
        });

        // Build approval filter JOIN if distributorId exists
        const approvalJoin = distributorId
          ? `JOIN program_approvals papp ON papp.program_id = p.id
               AND papp.approver_type = 'DISTRIBUTOR'
               AND papp.approver_id = :distributorId
               AND papp.status = 'APPROVED'
               AND papp.deleted_at IS NULL`
          : "";

        // Build WHERE clause with IN for multiple manufacturerIds
        const sqlQuery = `
          SELECT
              COALESCE(pa.agreement_id, pa.id) AS "agreementId",
              pa.agreement_name AS "agreementName",
              pa.program_id AS "programId",
              pa.manufacturer_id AS "manufacturerId",
              p.end_date AS "endDate"
          FROM program_agreements pa
          JOIN programs p
              ON p.id = pa.program_id
          ${approvalJoin}
          WHERE pa.manufacturer_id IN (:manufacturerIds)
            AND p.end_date > NOW()
            AND pa.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND NOT EXISTS (
                  SELECT 1
                  FROM program_participants pp
                  WHERE pp.program_id = p.id
                    AND pp.entity_type = 'STORE'
                    AND pp.entity_id = :storeId
                    AND pp.deleted_at IS NULL
              )
        `;

        const replacements: any = {
          storeId: storeId,
          manufacturerIds: manufacturerIds
        };
        if (distributorId) {
          replacements.distributorId = distributorId;
        }

        const agreements = await sequelize.query(sqlQuery, {
          replacements,
          type: QueryTypes.SELECT
        });

        logger.info("Raw SQL query executed for available agreements", {
          storeId,
          manufacturerIds,
          resultCount: agreements.length
        });

        // Map to response format (raw query already returns camelCase from SQL aliases)
        return agreements.map((a: any) => ({
          agreementId: a.agreementId,
          agreementName: a.agreementName,
          programId: a.programId,
          manufacturerId: a.manufacturerId,
          endDate: a.endDate
        }));
      }
    );
  }

  /**
   * Get agreement enrollments for a specific store
   * Returns agreements where:
   * - Store is enrolled (via program_participants with entity_type='STORE' and deleted_at IS NULL)
   * - Program end_date > NOW() (active/future programs)
   * - Optionally filtered by manufacturer
   */
  public async getStoreAgreementEnrollments(
    params: GetStoreAgreementEnrollmentsParams,
    user?: { role: string; parentEntityId: number; associatedUserId: number }
  ): Promise<GetStoreAgreementEnrollmentsResult> {
    return newrelic.startSegment(
      "ProgramAgreementService.getStoreAgreementEnrollments",
      true,
      async () => {
        const { storeId, manufacturerIds } = params;

        // Determine distributor ID for approval filtering
        let distributorId: number | null = null;
        if (user) {
          distributorId = getParentDistributorId(user, user.role);
          if (!distributorId) {
            logger.warn(
              "User provided but distributorId could not be determined",
              {
                role: user.role
              }
            );
          }
        }

        logger.info("Fetching store agreement enrollments from database", {
          storeId,
          manufacturerIds,
          approvalFiltering: !!distributorId,
          distributorId
        });

        // Build WHERE clause conditionally for manufacturerIds
        const manufacturerCondition =
          manufacturerIds && manufacturerIds.length > 0
            ? "AND pa.manufacturer_id IN (:manufacturerIds)"
            : "";

        // Build approval filter JOIN if distributorId exists
        const approvalJoin = distributorId
          ? `JOIN program_approvals papp ON papp.program_id = p.id
               AND papp.approver_type = 'DISTRIBUTOR'
               AND papp.approver_id = :distributorId
               AND papp.status = 'APPROVED'
               AND papp.deleted_at IS NULL`
          : "";

        // Fixed query to properly check pp.deleted_at IS NULL for active enrollments only
        const sqlQuery = `
          SELECT
              COALESCE(pa.agreement_id, pa.id) AS "agreementId",
              pa.agreement_name as "agreementName",
              pa.program_id as "programId",
              pa.manufacturer_id as "manufacturerId",
              p.end_date as "endDate"
          FROM program_agreements pa
          JOIN programs p
              ON p.id = pa.program_id
          ${approvalJoin}
          WHERE p.end_date > NOW()
            ${manufacturerCondition}
            AND pa.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND p.id IN (
                  SELECT pp.program_id
                  FROM program_participants pp
                  WHERE pp.entity_type = 'STORE'
                    AND pp.entity_id = :storeId
                    AND pp.deleted_at IS NULL
              )
        `;

        const replacements: any = {
          storeId: storeId
        };
        if (manufacturerIds && manufacturerIds.length > 0) {
          replacements.manufacturerIds = manufacturerIds;
        }
        if (distributorId) {
          replacements.distributorId = distributorId;
        }

        // Fetch enrollments and available agreements in parallel
        const [enrollments, availableAgreements] = await Promise.all([
          sequelize.query(sqlQuery, {
            replacements,
            type: QueryTypes.SELECT
          }),
          this.getStoreAvailableAgreements(params, user)
        ]);

        logger.info("Raw SQL queries executed", {
          storeId,
          manufacturerIds,
          enrollmentCount: enrollments.length,
          availableCount: availableAgreements.length,
          approvalFilterApplied: !!distributorId
        });

        // Group enrollments by agreementId and collect programIds
        const enrollmentMap = new Map<
          number,
          {
            agreementId: number;
            agreementName: string;
            programIds: number[];
            endDate: string;
            manufacturerId: number;
          }
        >();

        enrollments.forEach((a: any) => {
          const agreementId = a.agreementId;
          if (!enrollmentMap.has(agreementId)) {
            enrollmentMap.set(agreementId, {
              agreementId,
              agreementName: a.agreementName,
              programIds: [],
              endDate: a.endDate,
              manufacturerId: a.manufacturerId
            });
          }
          const enrollment = enrollmentMap.get(agreementId)!;
          enrollment.programIds.push(a.programId);
          // Use the latest endDate if there are multiple
          if (new Date(a.endDate) > new Date(enrollment.endDate)) {
            enrollment.endDate = a.endDate;
          }
        });

        const groupedEnrollments = Array.from(enrollmentMap.values());

        // Group availableAgreements by agreementId and collect programIds
        const availableMap = new Map<
          number,
          {
            agreementId: number;
            agreementName: string;
            programIds: number[];
            endDate: string;
            manufacturerId: number;
          }
        >();

        availableAgreements.forEach((a: any) => {
          const agreementId = a.agreementId;
          if (!availableMap.has(agreementId)) {
            availableMap.set(agreementId, {
              agreementId,
              agreementName: a.agreementName,
              programIds: [],
              endDate: a.endDate,
              manufacturerId: a.manufacturerId
            });
          }
          const available = availableMap.get(agreementId)!;
          available.programIds.push(a.programId);
          // Use the latest endDate if there are multiple
          if (new Date(a.endDate) > new Date(available.endDate)) {
            available.endDate = a.endDate;
          }
        });

        const groupedAvailableAgreements = Array.from(availableMap.values());

        // Map to response format (raw query already returns camelCase from SQL aliases)
        const result: GetStoreAgreementEnrollmentsResult = {
          enrollments: groupedEnrollments,
          count: groupedEnrollments.length,
          availableAgreements: groupedAvailableAgreements,
          availableCount: groupedAvailableAgreements.length,
          storeId,
          manufacturerIds
        };

        return result;
      }
    );
  }
}

export default new ProgramAgreementService();
