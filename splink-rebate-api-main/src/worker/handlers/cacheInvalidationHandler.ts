import newrelic from "newrelic";
import logger from "../../lib/logger";
import { invalidateCache } from "../../utils/redis";
import { WorkerError } from "../errors/WorkerError";

export interface CacheInvalidationPayload {
  namespace: string;
  prefix?: string;
  reason?: string;
}

/**
 * Handle cache invalidation jobs
 * Uses existing invalidateCache utility from redis.ts
 */
export async function handleCacheInvalidation(
  payload: CacheInvalidationPayload
): Promise<void> {
  const startTime = Date.now();
  return newrelic.startSegment("CacheInvalidationJob", true, async () => {
    console.log(
      "[CACHE] Processing cache invalidation job",
      JSON.stringify({
        namespace: payload.namespace,
        prefix: payload.prefix,
        reason: payload.reason,
        useApiCaching: process.env.USE_API_CACHING,
        redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET"
      })
    );

    // Validate required fields
    if (!payload.namespace) {
      console.error(
        "[CACHE] Cache invalidation job missing required namespace",
        JSON.stringify({
          payload
        })
      );
      throw WorkerError.validationFailed(
        "namespace is required for cache invalidation"
      );
    }

    // Check Redis availability - if not available, log and skip cache clearing
    const { redisClient } = await import("../../utils/redis");
    const isRedisAvailable =
      process.env.USE_API_CACHING === "true" && redisClient.isOpen;

    if (!isRedisAvailable) {
      logger.warn("[CACHE] Redis not available, skipping cache invalidation", {
        useApiCaching: process.env.USE_API_CACHING,
        redisIsOpen: redisClient.isOpen,
        redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET",
        namespace: payload.namespace,
        prefix: payload.prefix,
        reason: payload.reason
      });
      return;
    }

    try {
      // Check Redis connection before attempting invalidation
      console.log(
        "[CACHE] Redis client status before invalidation",
        JSON.stringify({
          isOpen: redisClient.isOpen,
          namespace: payload.namespace,
          prefix: payload.prefix
        })
      );

      // Execute invalidation using existing utility
      console.debug(
        "[CACHE] Calling invalidateCache utility",
        JSON.stringify({
          namespace: payload.namespace,
          prefix: payload.prefix
        })
      );
      await invalidateCache(payload.namespace, payload.prefix);

      const duration = Date.now() - startTime;
      console.log(
        "[CACHE] Cache invalidation completed successfully",
        JSON.stringify({
          namespace: payload.namespace,
          prefix: payload.prefix || "all",
          reason: payload.reason,
          durationMs: duration
        })
      );

      // Add custom attributes to New Relic for monitoring
      newrelic.addCustomAttributes({
        jobType: "INVALIDATE_CACHE",
        namespace: payload.namespace,
        prefix: payload.prefix || "all",
        reason: payload.reason || "none",
        durationMs: duration
      });
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
        "[CACHE] Cache invalidation failed, but continuing without cache clearing",
        {
          namespace: payload.namespace,
          prefix: payload.prefix,
          reason: payload.reason,
          durationMs: duration,
          error: errorDetails,
          useApiCaching: process.env.USE_API_CACHING,
          redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET"
        }
      );

      // Don't throw - cache invalidation failure shouldn't stop processing
      // Just log and continue
    }
  });
}
