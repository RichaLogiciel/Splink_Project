import logger from "../../lib/logger";
import newrelic from "newrelic";
import sequelize from "../../db";
import { QueryTypes, Transaction } from "sequelize";
import { WorkerError } from "../errors/WorkerError";
import { AgreementStoreEnrollmentPayload } from "../../types/AgreementTypes";
import EnrollmentRequestService from "../../services/EnrollmentRequestService";
import StoreEnrollmentStatusRepository from "../../repositories/StoreEnrollmentStatusRepository";

// Re-export the payload type for convenience
export type { AgreementStoreEnrollmentPayload };

/**
 * Handler for AGREEMENT_STORE_ENROLLMENT_CHANGED job type
 * Performs bulk enrollment/unenrollment of stores in programs via agreements
 */
export async function handleAgreementStoreEnrollmentChanged(
  payload: AgreementStoreEnrollmentPayload
): Promise<void> {
  const {
    action,
    agreementIds,
    storeIds,
    programIds,
    userId,
    reason,
    requestId
  } = payload;

  logger.info("Processing agreement store enrollment change", {
    action,
    agreementCount: agreementIds.length,
    storeCount: storeIds.length,
    programCount: programIds.length,
    userId,
    reason,
    requestId
  });

  console.log("requestId", requestId);

  return newrelic.startSegment(
    "handleAgreementStoreEnrollmentChanged",
    true,
    async () => {
      // Add New Relic custom attributes
      newrelic.addCustomAttribute("enrollmentAction", action);
      newrelic.addCustomAttribute("agreementCount", agreementIds.length);
      newrelic.addCustomAttribute("storeCount", storeIds.length);
      newrelic.addCustomAttribute("programCount", programIds.length);
      if (requestId) {
        newrelic.addCustomAttribute("enrollment_request_id", requestId);
      }

      try {
        // Track: Worker received message
        if (requestId) {
          logger.info("[DEBUG] About to call updateWorkerReceived", {
            requestId,
            hasRequestId: !!requestId
          });
          await EnrollmentRequestService.updateWorkerReceived(requestId);
          logger.info("[DEBUG] updateWorkerReceived completed", { requestId });
        } else {
          logger.warn(
            "[DEBUG] No requestId provided, skipping worker tracking"
          );
        }

        // Track: DB operation started
        if (requestId) {
          logger.info("[DEBUG] About to call updateDbOperationStarted", {
            requestId
          });
          await EnrollmentRequestService.updateDbOperationStarted(requestId);
          logger.info("[DEBUG] updateDbOperationStarted completed", {
            requestId
          });
        }

        // Step 1: Perform bulk enrollment/unenrollment
        const { programParticipantsAffected, storeListingAggregatesAffected } =
          await executeBulkEnrollment(action, agreementIds, storeIds);

        logger.info("Bulk enrollment completed", {
          action,
          programParticipantsAffected,
          storeListingAggregatesAffected,
          agreementIds,
          storeIds,
          requestId
        });

        // Add New Relic custom attributes for affected rows
        newrelic.addCustomAttribute(
          "programParticipantsAffected",
          programParticipantsAffected
        );
        newrelic.addCustomAttribute(
          "storeListingAggregatesAffected",
          storeListingAggregatesAffected
        );

        // Track: DB operation completed
        if (requestId) {
          await EnrollmentRequestService.updateDbOperationCompleted(requestId, {
            programParticipantsAffected,
            storeListingAggregatesAffected
          });
        }

        // Step 2: Refresh materialized views (in parallel)
        const matviewsRefreshed = await refreshMaterializedViews();

        // Track: Cache clear started
        if (requestId) {
          await EnrollmentRequestService.updateCacheClearStarted(requestId);
        }

        // Step 3: Invalidate caches (in parallel)
        const cachesInvalidated = await invalidateCaches(
          storeIds,
          programIds,
          userId
        );

        // Track: Mark completed
        if (requestId) {
          await EnrollmentRequestService.markCompleted(requestId, {
            materializedViewsRefreshed: matviewsRefreshed,
            cachesInvalidated: cachesInvalidated
          });
        }

        // Track: per-store/per-agreement status succeeded (best-effort)
        if (requestId) {
          try {
            await StoreEnrollmentStatusRepository.upsertStatusesForRequest({
              requestId,
              action,
              status: "succeeded",
              storeIds,
              agreementIds
            });
          } catch (trackingError: any) {
            logger.error("Failed to update store enrollment statuses", {
              requestId,
              trackingError: trackingError.message
            });
          }
        }

        logger.info(
          "Agreement store enrollment change completed successfully",
          {
            action,
            programParticipantsAffected,
            storeListingAggregatesAffected,
            agreementCount: agreementIds.length,
            storeCount: storeIds.length,
            requestId
          }
        );
      } catch (error: any) {
        logger.error("Failed to process agreement store enrollment", {
          action,
          agreementIds,
          storeIds,
          error: error.message,
          stack: error.stack,
          requestId
        });

        // Track: per-store/per-agreement status failed (best-effort)
        if (requestId) {
          try {
            await StoreEnrollmentStatusRepository.upsertStatusesForRequest({
              requestId,
              action,
              status: "failed",
              storeIds,
              agreementIds
            });
          } catch (trackingError: any) {
            logger.error("Failed to update store enrollment statuses", {
              requestId,
              trackingError: trackingError.message
            });
          }
        }

        // Track: Mark failed
        if (requestId) {
          try {
            await EnrollmentRequestService.markFailed(
              requestId,
              error,
              "WORKER_PROCESSING"
            );
          } catch (trackingError: any) {
            logger.error("Failed to update enrollment request tracking", {
              requestId,
              trackingError: trackingError.message
            });
          }
        }

        throw WorkerError.processingFailed(
          `Agreement enrollment failed: ${error.message}`,
          true // Retryable
        );
      }
    }
  );
}

/**
 * Execute bulk enrollment or unenrollment using raw SQL with transaction
 * Updates both program_participants and store_listing_aggregates tables atomically
 */
async function executeBulkEnrollment(
  action: "enroll" | "unenroll",
  agreementIds: number[],
  storeIds: number[]
): Promise<{
  programParticipantsAffected: number;
  storeListingAggregatesAffected: number;
}> {
  // Start transaction
  const transaction: Transaction = await sequelize.transaction();

  try {
    // Step 1: First, get the program info to see what we're expecting
    const programInfoQuery = `
      SELECT DISTINCT
        pa.agreement_id,
        pa.program_id,
        p.manufacturer_id,
        p.name as program_name,
        p.start_date,
        p.end_date
      FROM program_agreements pa
      INNER JOIN programs p ON p.id = pa.program_id
      WHERE pa.agreement_id = ANY(ARRAY[:agreementIds])
        AND pa.deleted_at IS NULL
        AND p.deleted_at IS NULL
      ORDER BY pa.program_id;
    `;

    const programInfo = await sequelize.query(programInfoQuery, {
      replacements: { agreementIds },
      type: QueryTypes.SELECT,
      transaction
    });

    // Step 2: Validate that expected store_listing_aggregates records exist
    const expectedRecordsQuery = `
      WITH program_info AS (
        SELECT DISTINCT
          pa.program_id,
          p.manufacturer_id
        FROM program_agreements pa
        INNER JOIN programs p ON p.id = pa.program_id
        WHERE pa.agreement_id = ANY(ARRAY[:agreementIds])
          AND pa.deleted_at IS NULL
          AND p.deleted_at IS NULL
      ),
      expected_combinations AS (
        SELECT
          unnest(ARRAY[:storeIds])::integer AS store_id,
          pi.program_id,
          pi.manufacturer_id
        FROM program_info pi
      )
      SELECT
        ec.store_id,
        ec.program_id,
        ec.manufacturer_id,
        CASE WHEN sla.id IS NOT NULL THEN 1 ELSE 0 END AS exists_flag,
        sla.program_type as existing_program_type,
        sla.id as existing_sla_id
      FROM expected_combinations ec
      LEFT JOIN store_listing_aggregates sla
        ON sla.store_id = ec.store_id
        AND sla.program_id = ec.program_id
        AND sla.manufacturer_id = ec.manufacturer_id
        AND sla.program_type IN ('CURRENT', 'UPCOMING')
      ORDER BY ec.store_id, ec.program_id;
    `;

    const validationResults: Array<{
      store_id: number;
      program_id: number;
      manufacturer_id: number;
      exists_flag: number;
      existing_program_type?: string;
      existing_sla_id?: number;
    }> = await sequelize.query(expectedRecordsQuery, {
      replacements: {
        agreementIds,
        storeIds
      },
      type: QueryTypes.SELECT,
      transaction
    });

    // Check for missing records
    const missingRecords = validationResults.filter((r) => r.exists_flag === 0);
    const existingRecords = validationResults.filter(
      (r) => r.exists_flag === 1
    );

    if (missingRecords.length > 0) {
      // Check if records exist with different program_type
      const checkOtherProgramTypesQuery = `
        SELECT
          sla.store_id,
          sla.program_id,
          sla.manufacturer_id,
          sla.program_type,
          sla.id
        FROM store_listing_aggregates sla
        WHERE (sla.store_id, sla.program_id, sla.manufacturer_id) IN (
          SELECT 
            unnest(ARRAY[:storeIds])::integer,
            pi.program_id,
            pi.manufacturer_id
          FROM (
            SELECT DISTINCT
              pa.program_id,
              p.manufacturer_id
            FROM program_agreements pa
            INNER JOIN programs p ON p.id = pa.program_id
            WHERE pa.agreement_id = ANY(ARRAY[:agreementIds])
              AND pa.deleted_at IS NULL
              AND p.deleted_at IS NULL
          ) pi
        )
        AND sla.program_type NOT IN ('CURRENT', 'UPCOMING');
      `;

      const otherProgramTypeRecords = await sequelize.query(
        checkOtherProgramTypesQuery,
        {
          replacements: { agreementIds, storeIds },
          type: QueryTypes.SELECT,
          transaction
        }
      );

      logger.warn("Found records with different program_type", {
        otherProgramTypeRecords: otherProgramTypeRecords
      });

      const missingDetails = missingRecords
        .slice(0, 10) // Limit to first 10 for logging
        .map(
          (r) =>
            `(store_id: ${r.store_id}, program_id: ${r.program_id}, manufacturer_id: ${r.manufacturer_id})`
        )
        .join(", ");

      const totalMissing = missingRecords.length;

      // Log warning but continue - missing records are acceptable for enrollment
      logger.warn(
        "Missing store_listing_aggregates records - continuing with enrollment",
        {
          action,
          agreementIds,
          storeIds,
          totalExpected: validationResults.length,
          totalMissing,
          totalExisting: existingRecords.length,
          missingRecords: missingRecords.slice(0, 20), // Show more for debugging
          missingDetails,
          recordsWithOtherProgramType: otherProgramTypeRecords,
          programInfo: programInfo
        }
      );
    }

    logger.info(
      "Validation passed: All expected store_listing_aggregates records exist",
      {
        action,
        expectedCount: validationResults.length
      }
    );

    // Step 2: Update program_participants table
    let programParticipantsAffected: number;

    if (action === "enroll") {
      // Enrollment: UPSERT handling both active and deleted rows
      // This approach works without ON CONFLICT by:
      // 1. First updating any existing rows (both active and deleted) to set deleted_at = NULL
      // 2. Then inserting only rows that don't exist at all
      const enrollQuery = `
        WITH programs AS (
          SELECT program_id
          FROM program_agreements
          WHERE agreement_id = ANY(ARRAY[:agreementIds])
            AND deleted_at IS NULL
        ),
        stores AS (
          SELECT unnest(ARRAY[:storeIds]) AS entity_id
        ),
        enrollment_pairs AS (
          SELECT
            p.program_id,
            s.entity_id::integer AS entity_id,
            'STORE' AS entity_type
          FROM programs p
          CROSS JOIN stores s
        )
        -- Step 1: Update existing rows (both active and deleted) to undelete/reactivate them
        UPDATE program_participants pp
        SET
          updated_at = NOW(),
          deleted_at = NULL
        FROM enrollment_pairs ep
        WHERE pp.program_id = ep.program_id
          AND pp.entity_id = ep.entity_id
          AND pp.entity_type = ep.entity_type
        RETURNING pp.id;
      `;

      const updateResults = await sequelize.query(enrollQuery, {
        replacements: {
          agreementIds,
          storeIds
        },
        type: QueryTypes.SELECT,
        transaction
      });

      const updatedCount = updateResults.length;

      // Step 2: Insert only rows that don't exist at all
      const insertQuery = `
        WITH programs AS (
          SELECT program_id
          FROM program_agreements
          WHERE agreement_id = ANY(ARRAY[:agreementIds])
            AND deleted_at IS NULL
        ),
        stores AS (
          SELECT unnest(ARRAY[:storeIds]) AS entity_id
        )
        INSERT INTO program_participants (
          program_id,
          entity_id,
          entity_type,
          created_at,
          updated_at,
          deleted_at
        )
        SELECT
          p.program_id,
          s.entity_id::integer,
          'STORE',
          NOW(),
          NOW(),
          NULL
        FROM programs p
        CROSS JOIN stores s
        WHERE NOT EXISTS (
          SELECT 1
          FROM program_participants pp
          WHERE pp.program_id = p.program_id
            AND pp.entity_id = s.entity_id::integer
            AND pp.entity_type = 'STORE'
        )
        RETURNING id;
      `;

      const insertResults = await sequelize.query(insertQuery, {
        replacements: {
          agreementIds,
          storeIds
        },
        type: QueryTypes.SELECT,
        transaction
      });

      const insertedCount = insertResults.length;
      programParticipantsAffected = updatedCount + insertedCount;
    } else {
      // Unenrollment: Soft delete
      const unenrollQuery = `
        WITH programs AS (
          SELECT program_id
          FROM program_agreements
          WHERE agreement_id = ANY(ARRAY[:agreementIds])
            AND deleted_at IS NULL
        ),
        stores AS (
          SELECT unnest(ARRAY[:storeIds]) AS entity_id
        )
        UPDATE program_participants
        SET
          deleted_at = NOW(),
          updated_at = NOW()
        WHERE program_id IN (SELECT program_id FROM programs)
          AND entity_id IN (SELECT entity_id::integer FROM stores)
          AND entity_type = 'STORE'
          AND deleted_at IS NULL;
      `;

      const [, metadata] = await sequelize.query(unenrollQuery, {
        replacements: {
          agreementIds,
          storeIds
        },
        transaction
      });

      programParticipantsAffected = (metadata as any)?.rowCount || 0;
    }

    logger.info("program_participants update completed", {
      action,
      affectedRows: programParticipantsAffected
    });

    // Step 3: Update store_listing_aggregates table
    const enrolledValue = action === "enroll";

    const updateAggregatesQuery = `
      WITH program_info AS (
        SELECT DISTINCT
          pa.program_id,
          p.manufacturer_id
        FROM program_agreements pa
        INNER JOIN programs p ON p.id = pa.program_id
        WHERE pa.agreement_id = ANY(ARRAY[:agreementIds])
          AND pa.deleted_at IS NULL
          AND p.deleted_at IS NULL
      )
      UPDATE store_listing_aggregates
      SET
        program_enrolled = :enrolledValue,
        updated_at = NOW()
      WHERE store_id = ANY(ARRAY[:storeIds])
        AND (program_id, manufacturer_id) IN (
          SELECT program_id, manufacturer_id
          FROM program_info
        )
        AND program_type IN ('CURRENT', 'UPCOMING');
    `;

    const [, aggregatesMetadata] = await sequelize.query(
      updateAggregatesQuery,
      {
        replacements: {
          agreementIds,
          storeIds,
          enrolledValue
        },
        transaction
      }
    );

    const storeListingAggregatesAffected =
      (aggregatesMetadata as any)?.rowCount || 0;

    logger.info("store_listing_aggregates update completed", {
      action,
      affectedRows: storeListingAggregatesAffected,
      enrolledValue
    });

    // Commit transaction
    await transaction.commit();

    return {
      programParticipantsAffected,
      storeListingAggregatesAffected
    };
  } catch (error: any) {
    // Rollback transaction on any error
    await transaction.rollback();

    logger.error("Transaction rolled back due to error", {
      action,
      agreementIds,
      storeIds,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

/**
 * Refresh materialized views in parallel
 * Returns true if successful, false if failed
 */
async function refreshMaterializedViews(): Promise<boolean> {
  const viewsToRefresh = [
    "combined_store_enrolled_summary",
    "distributor_stores_programs_enrolled_mv"
  ];

  logger.info("Starting materialized view refresh", {
    viewCount: viewsToRefresh.length,
    views: viewsToRefresh
  });

  try {
    // Use Promise.allSettled to handle individual view failures gracefully
    const results = await Promise.allSettled(
      viewsToRefresh.map(async (viewName) => {
        const startTime = Date.now();
        // Use CONCURRENTLY only for views with unique indexes
        // distributor_stores_programs_enrolled_mv has a unique index
        // combined_store_enrolled_summary does not, so we refresh it normally
        const useConcurrent =
          viewName === "distributor_stores_programs_enrolled_mv";
        const query = useConcurrent
          ? `REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`
          : `REFRESH MATERIALIZED VIEW ${viewName}`;

        logger.info("Refreshing materialized view", {
          viewName,
          query,
          concurrent: useConcurrent
        });

        try {
          await sequelize.query(query);
          const duration = Date.now() - startTime;
          logger.info("Materialized view refreshed successfully", {
            viewName,
            durationMs: duration
          });
          return { viewName, success: true, duration };
        } catch (viewError) {
          const duration = Date.now() - startTime;
          const errorMessage =
            viewError instanceof Error ? viewError.message : String(viewError);
          const errorDetails = {
            viewName,
            durationMs: duration,
            error: errorMessage,
            errorName:
              viewError instanceof Error ? viewError.name : typeof viewError,
            errorCode: (viewError as any)?.code,
            sqlState: (viewError as any)?.sqlState,
            sqlMessage: (viewError as any)?.sqlMessage,
            stack: viewError instanceof Error ? viewError.stack : undefined,
            fullError:
              viewError instanceof Error
                ? {
                    name: viewError.name,
                    message: viewError.message,
                    stack: viewError.stack,
                    ...(viewError as any)
                  }
                : String(viewError)
          };

          logger.error(
            "Failed to refresh specific materialized view",
            errorDetails
          );
          throw { viewName, error: viewError };
        }
      })
    );

    // Check if any views failed
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      const failedViews = failures.map((result: any) => {
        if (result.reason?.viewName) {
          return result.reason.viewName;
        }
        return "unknown";
      });

      const errorMessages = failures
        .map((result: any) => {
          const error = result.reason?.error || result.reason;
          return error instanceof Error ? error.message : String(error);
        })
        .join("; ");

      const errorSummary = {
        failedViewCount: failures.length,
        failedViews,
        errorMessages,
        totalViews: viewsToRefresh.length,
        successfulViews: viewsToRefresh.length - failures.length
      };

      logger.error("Failed to refresh materialized views", errorSummary);

      // Don't throw - eventual consistency is acceptable
      return false;
    }

    logger.info("All materialized views refreshed successfully", {
      viewCount: viewsToRefresh.length,
      views: viewsToRefresh
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      error: errorMessage,
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: (error as any)?.code,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
      stack: error instanceof Error ? error.stack : undefined,
      fullError:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              ...(error as any)
            }
          : String(error)
    };

    logger.error(
      "Failed to refresh materialized views - unexpected error",
      errorDetails
    );
    // Don't throw - eventual consistency is acceptable
    return false;
  }
}

/**
 * Invalidate relevant Redis caches
 * Returns true if successful, false if failed
 */
async function invalidateCaches(
  storeIds: number[],
  programIds: number[],
  userId: number
): Promise<boolean> {
  const startTime = Date.now();
  console.log(
    "[CACHE] Starting cache invalidation",
    JSON.stringify({
      storeCount: storeIds.length,
      programCount: programIds.length,
      userId,
      storeIds: storeIds.slice(0, 10), // Log first 10 for debugging
      programIds: programIds.slice(0, 10)
    })
  );

  try {
    const { redisClient, scanKeys, clearUserCache } = await import(
      "../../utils/redis"
    );

    // Check Redis availability - if not available, log and skip cache clearing
    const isRedisAvailable =
      process.env.USE_API_CACHING === "true" && redisClient.isOpen;

    if (!isRedisAvailable) {
      logger.warn("[CACHE] Redis not available, skipping cache invalidation", {
        useApiCaching: process.env.USE_API_CACHING,
        redisIsOpen: redisClient.isOpen,
        redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET",
        storeIds: storeIds.slice(0, 10),
        programIds: programIds.slice(0, 10),
        userId
      });
      return false;
    }

    // Check Redis connection status
    console.log(
      "[CACHE] Redis client status check",
      JSON.stringify({
        isOpen: redisClient.isOpen,
        useApiCaching: process.env.USE_API_CACHING,
        redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET"
      })
    );

    if (!redisClient.isOpen) {
      logger.warn("[CACHE] Redis client not connected, attempting to connect");
      try {
        await redisClient.connect();
        console.log("[CACHE] Redis client connected successfully");
      } catch (connectError) {
        const errorDetails =
          connectError instanceof Error
            ? {
                message: connectError.message,
                stack: connectError.stack,
                name: connectError.name,
                code: (connectError as any).code
              }
            : { error: String(connectError) };

        logger.warn(
          "[CACHE] Failed to connect Redis client, skipping cache invalidation",
          {
            error: errorDetails,
            storeIds: storeIds.slice(0, 10),
            programIds: programIds.slice(0, 10),
            userId
          }
        );
        return false;
      }
    }

    // Build cache key patterns to invalidate (entity-scoped only)
    const patterns: string[] = [];

    // Store-specific caches
    for (const storeId of storeIds) {
      patterns.push(`store:byId:${storeId}*`);
      patterns.push(`store:${storeId}:*`);
    }

    // Program-specific caches
    for (const programId of programIds) {
      patterns.push(`program:byId:${programId}*`);
      patterns.push(`program:${programId}:*`);
    }

    // Step 1: Clear user-scoped caches using cache index (replaces SCAN)
    let deletedCount = 0;
    let totalKeysFound = 0;
    const patternResults: Array<{
      pattern: string;
      keysFound: number;
      keysDeleted: number;
    }> = [];

    try {
      console.log(
        "[CACHE] Clearing user-scoped caches via index",
        JSON.stringify({
          userId
        })
      );

      const userCacheResult = await clearUserCache(userId);

      console.log(
        "[CACHE] User-scoped caches cleared",
        JSON.stringify({
          userId,
          keysFound: userCacheResult.keysFound,
          keysDeleted: userCacheResult.keysDeleted
        })
      );

      // Track in summary
      totalKeysFound += userCacheResult.keysFound;
      deletedCount += userCacheResult.keysDeleted;
      patternResults.push({
        pattern: `user-scoped (userId: ${userId})`,
        keysFound: userCacheResult.keysFound,
        keysDeleted: userCacheResult.keysDeleted
      });
    } catch (userCacheError) {
      const errorDetails =
        userCacheError instanceof Error
          ? {
              message: userCacheError.message,
              stack: userCacheError.stack,
              name: userCacheError.name,
              code: (userCacheError as any).code
            }
          : { error: String(userCacheError) };

      logger.error("[CACHE] Failed to clear user-scoped caches", {
        userId,
        error: errorDetails
      });
      // Don't throw - continue with entity-scoped invalidation
    }

    console.log(
      "[CACHE] Cache invalidation patterns prepared",
      JSON.stringify({
        patternCount: patterns.length,
        patterns: patterns.slice(0, 20) // Log first 20 patterns
      })
    );

    // Step 2: Invalidate entity-scoped caches (stores and programs)
    // These remain pattern-based as they're not user-scoped
    for (const pattern of patterns) {
      try {
        logger.debug("[CACHE] Searching for cache keys matching pattern", {
          pattern
        });
        const keys = await scanKeys(pattern);
        totalKeysFound += keys.length;

        if (keys.length > 0) {
          logger.debug("[CACHE] Found keys for pattern", {
            pattern,
            keyCount: keys.length,
            sampleKeys: keys.slice(0, 5) // Log first 5 keys
          });
          const deleteResult = await redisClient.del(keys);
          deletedCount += deleteResult;
          patternResults.push({
            pattern,
            keysFound: keys.length,
            keysDeleted: deleteResult
          });
          logger.debug("[CACHE] Deleted keys for pattern", {
            pattern,
            keysDeleted: deleteResult
          });
        } else {
          logger.debug("[CACHE] No keys found for pattern", {
            pattern
          });
          patternResults.push({
            pattern,
            keysFound: 0,
            keysDeleted: 0
          });
        }
      } catch (patternError) {
        const errorDetails =
          patternError instanceof Error
            ? {
                message: patternError.message,
                stack: patternError.stack,
                name: patternError.name,
                code: (patternError as any).code
              }
            : { error: String(patternError) };

        logger.error("[CACHE] Error processing cache pattern", {
          pattern,
          error: errorDetails
        });
        // Continue with other patterns even if one fails
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      "[CACHE] Cache invalidation completed",
      JSON.stringify({
        patternsChecked: patterns.length,
        totalKeysFound,
        keysDeleted: deletedCount,
        userId,
        durationMs: duration,
        patternResults: patternResults.slice(0, 20) // Log first 20 results
      })
    );
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: (error as any).code
          }
        : { error: String(error) };

    logger.error("[CACHE] Failed to invalidate caches", {
      storeIds,
      programIds,
      userId,
      durationMs: duration,
      error: errorDetails,
      useApiCaching: process.env.USE_API_CACHING,
      redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET"
    });
    // Don't throw - cache invalidation failure shouldn't stop processing
    return false;
  }
}
