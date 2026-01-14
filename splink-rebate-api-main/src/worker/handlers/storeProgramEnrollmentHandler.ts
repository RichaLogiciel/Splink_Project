import newrelic from "newrelic";
import logger from "../../lib/logger";
import sequelize from "../../db";
import { WorkerError } from "../errors/WorkerError";

export interface StoreProgramEnrollmentChangedPayload {
  storeId: number;
  programIds: number[];
  action: "enroll" | "unenroll";
  userId: number;
  manufacturerId: number;
  reason?: string;
  warehouseId?: number;
  distributorId?: number;
}

interface EnrichmentContext {
  warehouseId: number | null;
  distributorId: number | null;
}

interface DbUpdateResult {
  processedCount: number;
  skippedCount: number;
}

/**
 * Handles store program enrollment/unenrollment with complete downstream orchestration
 *
 * Flow:
 * 1. Validate payload and fetch missing context (warehouse/distributor if needed)
 * 2. Perform database updates (create/delete ProgramParticipant records)
 * 3. Refresh materialized views concurrently
 * 4. Invalidate targeted Redis caches
 * 5. (Future) Trigger Next.js revalidation
 */
export async function handleStoreProgramEnrollmentChanged(
  payload: StoreProgramEnrollmentChangedPayload
): Promise<void> {
  return newrelic.startSegment(
    "StoreProgramEnrollmentChangedJob",
    true,
    async () => {
      const startTime = Date.now();

      logger.info("Processing store program enrollment change", {
        storeId: payload.storeId,
        programIds: payload.programIds,
        action: payload.action,
        programCount: payload.programIds.length,
        userId: payload.userId,
        manufacturerId: payload.manufacturerId
      });

      // Step 1: Validate payload
      logger.info("Step 1: Validating payload");
      validatePayload(payload);

      // Step 2: Fetch missing context (warehouse/distributor) if needed
      logger.info("Step 2: Enriching context for store", {
        storeId: payload.storeId,
        hasWarehouseId: payload.warehouseId !== undefined,
        hasDistributorId: payload.distributorId !== undefined
      });
      let context: EnrichmentContext;
      try {
        context = await enrichContext(payload);
        logger.info("Context enriched successfully", {
          context,
          warehouseId: context.warehouseId,
          distributorId: context.distributorId
        });
      } catch (error) {
        logger.error("Failed to enrich context", {
          storeId: payload.storeId,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        throw error;
      }

      try {
        // Step 3: Perform database updates within transaction
        logger.info("Step 3: Updating program participants");
        const dbResult = await updateProgramParticipants(payload);
        logger.info("Database updates completed", { dbResult });

        // Step 4: Refresh materialized views (parallel execution)
        await refreshMaterializedViews(context);

        // Step 5: Invalidate Redis caches (targeted patterns)
        await invalidateRelatedCaches(payload, context);

        // Step 6: (Future) Trigger Next.js revalidation
        // await triggerNextJsRevalidation(payload, context);

        const duration = Date.now() - startTime;

        logger.info("Store program enrollment change completed successfully", {
          storeId: payload.storeId,
          action: payload.action,
          programCount: payload.programIds.length,
          enrolledCount: dbResult.processedCount,
          alreadyProcessedCount: dbResult.skippedCount,
          durationMs: duration
        });

        // Add custom attributes to New Relic
        newrelic.addCustomAttributes({
          jobType: "STORE_PROGRAM_ENROLLMENT_CHANGED",
          storeId: payload.storeId,
          action: payload.action,
          programCount: payload.programIds.length,
          userId: payload.userId,
          manufacturerId: payload.manufacturerId,
          durationMs: duration
        });
      } catch (error) {
        if (error instanceof WorkerError) {
          throw error;
        }

        logger.error("Store program enrollment change failed", {
          storeId: payload.storeId,
          programIds: payload.programIds,
          action: payload.action,
          error
        });

        throw WorkerError.processingFailed(
          `Failed to process enrollment change for store ${payload.storeId}`,
          true // Retryable
        );
      }
    }
  );
}

/**
 * Validates the payload structure and required fields
 */
function validatePayload(payload: StoreProgramEnrollmentChangedPayload): void {
  if (!payload.storeId || !Number.isInteger(payload.storeId)) {
    throw WorkerError.validationFailed(
      "storeId is required and must be an integer"
    );
  }

  if (
    !payload.programIds ||
    !Array.isArray(payload.programIds) ||
    payload.programIds.length === 0
  ) {
    throw WorkerError.validationFailed(
      "programIds is required and must be a non-empty array"
    );
  }

  if (!payload.action || !["enroll", "unenroll"].includes(payload.action)) {
    throw WorkerError.validationFailed("action must be 'enroll' or 'unenroll'");
  }

  if (!payload.userId || !Number.isInteger(payload.userId)) {
    throw WorkerError.validationFailed(
      "userId is required and must be an integer"
    );
  }

  if (!payload.manufacturerId || !Number.isInteger(payload.manufacturerId)) {
    throw WorkerError.validationFailed(
      "manufacturerId is required and must be an integer"
    );
  }

  // Validate all programIds are integers
  if (!payload.programIds.every((id) => Number.isInteger(id))) {
    throw WorkerError.validationFailed("All programIds must be integers");
  }
}

/**
 * Enriches payload with missing context (warehouse, distributor)
 */
async function enrichContext(
  payload: StoreProgramEnrollmentChangedPayload
): Promise<EnrichmentContext> {
  logger.info("Starting context enrichment", {
    storeId: payload.storeId,
    warehouseIdProvided: payload.warehouseId !== undefined,
    distributorIdProvided: payload.distributorId !== undefined,
    warehouseId: payload.warehouseId,
    distributorId: payload.distributorId
  });

  // If warehouse and distributor already provided, use them
  if (
    payload.warehouseId !== undefined &&
    payload.distributorId !== undefined
  ) {
    logger.info("Using provided warehouse and distributor IDs", {
      warehouseId: payload.warehouseId,
      distributorId: payload.distributorId
    });
    return {
      warehouseId: payload.warehouseId || null,
      distributorId: payload.distributorId || null
    };
  }

  logger.info("Fetching context from database", { storeId: payload.storeId });

  // Otherwise, fetch from database
  let Store, Warehouse;
  try {
    logger.debug("Importing Store model");
    Store = (await import("../../models/Store")).default;
    logger.debug("Importing Warehouse model");
    Warehouse = (await import("../../models/Warehouse")).default;
    logger.debug("Models imported successfully");
  } catch (importError) {
    logger.error("Failed to import models", {
      error:
        importError instanceof Error
          ? importError.message
          : String(importError),
      stack: importError instanceof Error ? importError.stack : undefined
    });
    throw importError;
  }

  try {
    logger.info("Querying database for store", {
      storeId: payload.storeId,
      storeModel: Store ? "loaded" : "not loaded"
    });
    const store = await Store.findByPk(payload.storeId, {
      attributes: ["id", "warehouseId"]
    });

    logger.debug("Store query completed", {
      storeId: payload.storeId,
      storeFound: !!store,
      warehouseId: store?.warehouseId || null
    });

    if (!store) {
      logger.error("Store not found in database", { storeId: payload.storeId });
      throw WorkerError.validationFailed(`Store ${payload.storeId} not found`);
    }

    let distributorId: number | null = null;

    // If store has a warehouseId, fetch the warehouse to get distributorId
    if (store.warehouseId) {
      logger.debug("Fetching warehouse from database", {
        warehouseId: store.warehouseId
      });
      try {
        const warehouse = await Warehouse.findByPk(store.warehouseId, {
          attributes: ["id", "distributorId"]
        });

        logger.debug("Warehouse query completed", {
          warehouseId: store.warehouseId,
          warehouseFound: !!warehouse,
          distributorId: warehouse?.distributorId || null
        });

        if (warehouse) {
          distributorId = warehouse.distributorId || null;
        } else {
          logger.warn("Warehouse not found", {
            warehouseId: store.warehouseId
          });
        }
      } catch (warehouseError) {
        logger.error("Error fetching warehouse", {
          warehouseId: store.warehouseId,
          error:
            warehouseError instanceof Error
              ? warehouseError.message
              : String(warehouseError),
          stack:
            warehouseError instanceof Error ? warehouseError.stack : undefined
        });
        // Don't throw - just log and continue with null distributorId
      }
    } else {
      logger.debug("Store has no warehouseId", { storeId: payload.storeId });
    }

    const result = {
      warehouseId: store.warehouseId || null,
      distributorId
    };

    logger.debug("Context enrichment result", result);
    return result;
  } catch (error) {
    logger.error("Failed to enrich context - detailed error", {
      storeId: payload.storeId,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined,
      fullError:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          : String(error)
    });
    throw error;
  }
}

/**
 * Updates ProgramParticipant records (create or delete based on action)
 * Uses idempotent operations - safe to retry
 */
async function updateProgramParticipants(
  payload: StoreProgramEnrollmentChangedPayload
): Promise<DbUpdateResult> {
  const ProgramParticipant = (await import("../../models/ProgramParticipant"))
    .default;
  const { ENTITY_TYPE } = await import("../../config/appConstants");

  let processedCount = 0;
  let skippedCount = 0;

  // Process each program individually for better error isolation
  for (const programId of payload.programIds) {
    try {
      if (payload.action === "enroll") {
        logger.info("Processing enrollment", {
          storeId: payload.storeId,
          programId,
          entityType: ENTITY_TYPE.STORE
        });

        // Check if already enrolled (idempotency)
        logger.debug("Checking for existing ProgramParticipant record", {
          storeId: payload.storeId,
          programId,
          entityType: ENTITY_TYPE.STORE
        });

        const existing = await ProgramParticipant.findOne({
          where: {
            programId: programId,
            entityId: payload.storeId,
            entityType: ENTITY_TYPE.STORE,
            deletedAt: null
          }
        });

        if (existing) {
          skippedCount++;
          logger.info("Store already enrolled in program, skipping insert", {
            storeId: payload.storeId,
            programId,
            existingRecordId: existing.id,
            existingCreatedAt: existing.createdAt
          });
          continue;
        }

        // Create enrollment
        logger.info("Creating new ProgramParticipant record", {
          storeId: payload.storeId,
          programId,
          entityType: ENTITY_TYPE.STORE,
          dataToInsert: {
            programId,
            entityId: payload.storeId,
            entityType: ENTITY_TYPE.STORE
          }
        });

        const newParticipant = await ProgramParticipant.create({
          programId: programId,
          entityId: payload.storeId,
          entityType: ENTITY_TYPE.STORE
        });

        logger.info("Successfully created ProgramParticipant record", {
          storeId: payload.storeId,
          programId,
          participantId: newParticipant.id,
          createdAt: newParticipant.createdAt
        });

        processedCount++;
      } else {
        logger.info("Processing unenrollment", {
          storeId: payload.storeId,
          programId,
          entityType: ENTITY_TYPE.STORE
        });

        // Unenroll: find and delete
        logger.debug(
          "Checking for existing ProgramParticipant record to delete",
          {
            storeId: payload.storeId,
            programId,
            entityType: ENTITY_TYPE.STORE
          }
        );

        const existing = await ProgramParticipant.findOne({
          where: {
            programId: programId,
            entityId: payload.storeId,
            entityType: ENTITY_TYPE.STORE,
            deletedAt: null
          }
        });

        if (!existing) {
          skippedCount++;
          logger.info("Store not enrolled in program, skipping deletion", {
            storeId: payload.storeId,
            programId
          });
          continue;
        }

        logger.info("Deleting ProgramParticipant record", {
          storeId: payload.storeId,
          programId,
          participantId: existing.id,
          existingCreatedAt: existing.createdAt
        });

        // Hard delete (force: true bypasses paranoid mode)
        await existing.destroy({ force: true });

        logger.info("Successfully deleted ProgramParticipant record", {
          storeId: payload.storeId,
          programId,
          deletedParticipantId: existing.id
        });

        processedCount++;
      }
    } catch (error) {
      // Log error but continue processing other programs
      logger.error("Failed to process program enrollment", {
        storeId: payload.storeId,
        programId,
        action: payload.action,
        error
      });
      throw error; // Re-throw to trigger retry
    }
  }

  return { processedCount, skippedCount };
}

/**
 * Refreshes materialized views affected by enrollment changes
 * Uses CONCURRENTLY to avoid blocking reads
 */
async function refreshMaterializedViews(
  context: EnrichmentContext
): Promise<void> {
  const viewsToRefresh = [
    "distributor_stores_programs_enrolled_mv",
    "sales_rep_spiff_earning_summary"
  ];

  try {
    logger.info("Starting materialized view refresh", {
      viewCount: viewsToRefresh.length,
      views: viewsToRefresh
    });

    // Refresh both views in parallel for performance
    // Note: Using Promise.allSettled to handle individual view failures gracefully
    // Note: sales_rep_spiff_earning_summary doesn't have a unique index, so we can't use CONCURRENTLY
    const results = await Promise.allSettled(
      viewsToRefresh.map(async (viewName) => {
        const startTime = Date.now();
        // Use CONCURRENTLY only for views with unique indexes
        // distributor_stores_programs_enrolled_mv has a unique index
        // sales_rep_spiff_earning_summary does not, so we refresh it normally
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
          logger.error("Failed to refresh specific materialized view", {
            viewName,
            durationMs: duration,
            error:
              viewError instanceof Error
                ? viewError.message
                : String(viewError),
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
          });
          throw { viewName, error: viewError };
        }
      })
    );

    // Check if any views failed
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      const failedViews = failures.map((f) =>
        f.status === "rejected" ? (f.reason as any).viewName : "unknown"
      );
      const errors = failures.map((f) =>
        f.status === "rejected" ? (f.reason as any).error : null
      );

      logger.error("One or more materialized views failed to refresh", {
        failedViews,
        totalViews: viewsToRefresh.length,
        successCount: results.length - failures.length,
        failureCount: failures.length,
        errors: errors.map((e) => (e instanceof Error ? e.message : String(e)))
      });

      // Determine if retryable based on error messages
      const errorMessages = errors
        .map((e) => (e instanceof Error ? e.message : String(e)))
        .join("; ");

      // If view doesn't exist, it's non-retryable
      // If it's a lock/timeout issue, it's retryable
      const isRetryable =
        !errorMessages.includes("does not exist") &&
        !errorMessages.includes("relation") &&
        !errorMessages.includes("not found");

      throw WorkerError.databaseError(
        `Failed to refresh materialized views: ${failedViews.join(", ")} - ${errorMessages}`,
        isRetryable
      );
    }

    logger.info("All materialized views refreshed successfully");
  } catch (error) {
    logger.error("Failed to refresh materialized views - detailed error", {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
      fullError:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              ...(error as any)
            }
          : String(error)
    });

    // Determine if retryable
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRetryable = !errorMessage.includes("does not exist");

    logger.info("Materialized view refresh error classification", {
      isRetryable,
      errorMessage
    });

    throw WorkerError.databaseError(
      `Failed to refresh materialized views after enrollment change: ${errorMessage}`,
      isRetryable
    );
  }
}

/**
 * Invalidates Redis caches affected by enrollment changes
 * Uses targeted patterns to minimize cache disruption
 */
async function invalidateRelatedCaches(
  payload: StoreProgramEnrollmentChangedPayload,
  context: EnrichmentContext
): Promise<void> {
  const startTime = Date.now();
  console.log(
    "[CACHE] Starting related cache invalidation",
    JSON.stringify({
      storeId: payload.storeId,
      programCount: payload.programIds.length,
      programIds: payload.programIds.slice(0, 10),
      userId: payload.userId,
      distributorId: context.distributorId,
      warehouseId: context.warehouseId
    })
  );

  const { invalidateCache, redisClient, clearUserCache } = await import(
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
      storeId: payload.storeId,
      userId: payload.userId,
      distributorId: context.distributorId,
      warehouseId: context.warehouseId
    });
    return;
  }

  try {
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
            storeId: payload.storeId,
            userId: payload.userId
          }
        );
        return;
      }
    }

    const cacheInvalidations: Array<Promise<any>> = [];
    const invalidationDetails: Array<{ type: string; target: string }> = [];

    // 1. Store-specific caches (broad invalidation for store)
    logger.debug("[CACHE] Adding store cache invalidation", {
      storeId: payload.storeId
    });
    cacheInvalidations.push(
      invalidateCache("store", `byId:${payload.storeId}`)
    );
    invalidationDetails.push({
      type: "store",
      target: `byId:${payload.storeId}`
    });

    // 2. Program-specific caches (for each affected program)
    for (const programId of payload.programIds) {
      logger.debug("[CACHE] Adding program cache invalidation", {
        programId
      });
      cacheInvalidations.push(invalidateCache("program", `byId:${programId}`));
      invalidationDetails.push({
        type: "program",
        target: `byId:${programId}`
      });
    }

    // 3. Program participants cache
    logger.debug("[CACHE] Adding program participants cache invalidation");
    cacheInvalidations.push(invalidateCache("program", "participants"));
    invalidationDetails.push({
      type: "program",
      target: "participants"
    });

    // 4. User-scoped cache invalidation using cache index (replaces SCAN)
    const userId = payload.userId;

    try {
      console.log(
        "[CACHE] Clearing user-scoped caches via index",
        JSON.stringify({
          userId,
          storeId: payload.storeId
        })
      );

      const userCacheResult = await clearUserCache(userId);

      console.log(
        "[CACHE] User-scoped caches cleared",
        JSON.stringify({
          userId,
          storeId: payload.storeId,
          keysFound: userCacheResult.keysFound,
          keysDeleted: userCacheResult.keysDeleted
        })
      );

      // Add to invalidation details for summary logging
      invalidationDetails.push({
        type: "user-scoped-index",
        target: `userId:${userId} (${userCacheResult.keysDeleted} keys deleted)`
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
        storeId: payload.storeId,
        error: errorDetails
      });

      // Add failed invalidation to details
      invalidationDetails.push({
        type: "user-scoped-index-FAILED",
        target: `userId:${userId}`
      });
      // Don't throw - continue with other cache invalidations
    }

    // 5. Distributor-level caches (if distributor known)
    if (context.distributorId) {
      logger.debug("[CACHE] Adding distributor cache invalidations", {
        distributorId: context.distributorId
      });
      cacheInvalidations.push(
        invalidateCache("distributor", `byId:${context.distributorId}`)
      );
      cacheInvalidations.push(
        invalidateCache("distributor", `stores:${context.distributorId}`)
      );
      invalidationDetails.push(
        {
          type: "distributor",
          target: `byId:${context.distributorId}`
        },
        {
          type: "distributor",
          target: `stores:${context.distributorId}`
        }
      );
    }

    // 6. Warehouse-level caches (if warehouse known)
    if (context.warehouseId) {
      logger.debug("[CACHE] Adding warehouse cache invalidation", {
        warehouseId: context.warehouseId
      });
      cacheInvalidations.push(
        invalidateCache("warehouse", `stores:${context.warehouseId}`)
      );
      invalidationDetails.push({
        type: "warehouse",
        target: `stores:${context.warehouseId}`
      });
    }

    console.log(
      "[CACHE] Executing cache invalidations",
      JSON.stringify({
        invalidationCount: cacheInvalidations.length,
        invalidationDetails: invalidationDetails.slice(0, 20)
      })
    );

    // Execute all invalidations in parallel
    const results = await Promise.allSettled(cacheInvalidations);

    // Log results
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      const failures = results
        .map((r, i) => ({
          index: i,
          detail: invalidationDetails[i],
          result: r
        }))
        .filter((r) => r.result.status === "rejected");

      logger.warn("[CACHE] Some cache invalidations failed", {
        successful,
        failed,
        failures: failures.map((f) => ({
          type: f.detail.type,
          target: f.detail.target,
          error:
            f.result.status === "rejected"
              ? f.result.reason instanceof Error
                ? {
                    message: f.result.reason.message,
                    name: f.result.reason.name
                  }
                : String(f.result.reason)
              : null
        }))
      });
    }

    const duration = Date.now() - startTime;
    console.log(
      "[CACHE] Cache invalidation completed",
      JSON.stringify({
        storeId: payload.storeId,
        programCount: payload.programIds.length,
        userId: payload.userId,
        distributorId: context.distributorId,
        warehouseId: context.warehouseId,
        totalInvalidations: cacheInvalidations.length,
        successful,
        failed,
        durationMs: duration
      })
    );
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

    logger.warn(
      "[CACHE] Failed to invalidate caches, but continuing without cache clearing",
      {
        storeId: payload.storeId,
        userId: payload.userId,
        distributorId: context.distributorId,
        warehouseId: context.warehouseId,
        durationMs: duration,
        error: errorDetails,
        useApiCaching: process.env.USE_API_CACHING,
        redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET"
      }
    );

    // Don't throw - cache invalidation failure shouldn't stop processing
    // Just log and continue
  }
}

/**
 * (Future) Triggers Next.js on-demand revalidation
 * This will call Next.js API routes to revalidate affected pages
 */
// async function triggerNextJsRevalidation(
//   payload: StoreProgramEnrollmentChangedPayload,
//   context: EnrichmentContext
// ): Promise<void> {
//   // TODO: Implement when Next.js adds ISR
//   // Will call Next.js API endpoint like:
//   // POST /api/revalidate
//   // Body: { paths: ['/store/[id]', '/programs'], tags: ['store-123', 'program-456'] }

//   logger.debug("Next.js revalidation not yet implemented", {
//     storeId: payload.storeId,
//     programIds: payload.programIds
//   });
// }
