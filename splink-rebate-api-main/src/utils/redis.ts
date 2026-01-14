import crypto from "crypto";
import { createClient } from "redis";
import logger from "../lib/logger";

const redisClient = createClient({
  url:
    process.env.REDIS_URL ??
    "rediss://api-cache-dev-7jvs7x.serverless.use2.cache.amazonaws.com:6379",
  socket: {
    tls: process.env.REDIS_URL?.includes("localhost") ? false : true,
    rejectUnauthorized: false,
    reconnectStrategy: (retries) => {
      logger.info(`Redis reconnection attempt ${retries}`);
      if (retries > 10) {
        logger.error("Redis connection failed after 10 retries");
        return new Error("Redis max retries reached");
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

redisClient.on("error", (err) => {
  logger.error("Redis Client Error Details:", {
    message: err.message,
    stack: err.stack,
    code: err.code,
    timestamp: new Date().toISOString()
  });
});

redisClient.on("connect", () => {
  logger.info("Redis Client Connected Successfully");
});

redisClient.on("reconnecting", () => {
  logger.info("Redis Client Attempting to Reconnect");
});

redisClient.on("end", () => {
  logger.info("Redis Client Connection Closed");
});

// Log Redis configuration on startup
logger.info("Redis Configuration Check", {
  useApiCaching: process.env.USE_API_CACHING,
  redisUrl: process.env.REDIS_URL ? "SET" : "NOT SET",
  redisUrlPreview: process.env.REDIS_URL
    ? process.env.REDIS_URL.substring(0, 20) + "..."
    : "NOT SET",
  timestamp: new Date().toISOString()
});

if (process.env.USE_API_CACHING === "true") {
  logger.info("Redis caching is ENABLED - attempting to connect");

  (async () => {
    try {
      await redisClient.connect();
      logger.info("Redis connection established successfully");

      // Test Redis connection with a ping
      const pingResult = await redisClient.ping();
      logger.info("Redis ping test successful", { pingResult });
    } catch (err) {
      if (err instanceof Error) {
        logger.error("Failed to connect to Redis:", {
          message: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.error("Failed to connect to Redis with unknown error", {
          error: err
        });
      }
    }
  })();
} else {
  logger.warn("Redis caching is DISABLED", {
    useApiCaching: process.env.USE_API_CACHING,
    timestamp: new Date().toISOString()
  });
}

// Graceful shutdown handler
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing Redis connection...");
  await redisClient.quit();
});

// Helper function to generate cache keys
// example usage: getCacheKey("program", "byManufacturerId", 1)
export const getCacheKey = (
  namespace: string,
  prefix: string,
  ...args: any[]
): string => {
  const rawKey = `${namespace}:${prefix}:${args.join(":")}`;

  if (Buffer.byteLength(rawKey) <= 4096) {
    return rawKey;
  }

  // If the key is too long, hash everything after namespace to compress it
  const hashedPart = crypto
    .createHash("sha256")
    .update(`${prefix}:${args.join(":")}`)
    .digest("hex");

  const safeKey = `${namespace}:${hashedPart}`;

  // Final sanity check
  if (Buffer.byteLength(safeKey) > 4096) {
    // If still too long (very rare), hash the entire thing
    return crypto.createHash("sha256").update(rawKey).digest("hex");
  }

  return safeKey;
};

/**
 * Scan Redis keys matching a pattern using SCAN command (non-blocking alternative to KEYS)
 * This is required for managed Redis instances that disable the KEYS command
 * @param pattern - Redis key pattern (e.g., "program:*", "store:123:*")
 * @returns Array of matching keys
 */
export const scanKeys = async (pattern: string): Promise<string[]> => {
  if (!redisClient.isOpen) {
    throw new Error("Redis client is not connected");
  }

  const keys: string[] = [];
  let cursor = 0;
  const batchSize = 1000; // Increased COUNT hint to reduce iterations
  let iterations = 0;
  const maxIterations = 5000; // Safety limit to prevent infinite loops
  const maxKeys = 100000; // Maximum keys to collect as safety limit

  logger.debug("[CACHE] Starting SCAN for keys", { pattern, batchSize });

  do {
    iterations++;
    if (iterations > maxIterations) {
      console.log(
        "[CACHE] SCAN exceeded maximum iterations, returning partial results",
        JSON.stringify({
          pattern,
          iterations,
          keysFound: keys.length,
          maxIterations
        })
      );
      // Return partial results instead of throwing
      return keys;
    }

    if (keys.length >= maxKeys) {
      console.log(
        "[CACHE] SCAN reached maximum keys limit, returning partial results",
        JSON.stringify({
          pattern,
          iterations,
          keysFound: keys.length,
          maxKeys
        })
      );
      return keys;
    }

    try {
      logger.debug("[CACHE] Executing SCAN iteration", {
        pattern,
        cursor,
        iteration: iterations,
        keysFoundSoFar: keys.length
      });

      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: batchSize
      });

      // Handle cursor - it can be a number or string depending on Redis version
      // Redis returns "0" as string when done, or a number/string cursor
      const nextCursor: number =
        typeof result.cursor === "string"
          ? result.cursor === "0"
            ? 0
            : parseInt(result.cursor, 10)
          : result.cursor;

      // Safety check: if cursor didn't change and we got no keys, we're stuck
      if (nextCursor === cursor && result.keys.length === 0 && iterations > 1) {
        console.log(
          "[CACHE] SCAN cursor not progressing, breaking loop",
          JSON.stringify({
            pattern,
            cursor,
            nextCursor,
            iterations,
            keysFound: keys.length
          })
        );
        break;
      }

      cursor = nextCursor;
      keys.push(...result.keys);

      logger.debug("[CACHE] SCAN iteration completed", {
        pattern,
        cursor,
        iteration: iterations,
        keysInThisIteration: result.keys.length,
        totalKeysFound: keys.length
      });
    } catch (scanError) {
      logger.error("[CACHE] Error during SCAN iteration", {
        pattern,
        cursor,
        iteration: iterations,
        error:
          scanError instanceof Error
            ? {
                message: scanError.message,
                stack: scanError.stack,
                name: scanError.name
              }
            : scanError
      });
      throw scanError;
    }
  } while (cursor !== 0);

  console.log(
    "[CACHE] SCAN completed",
    JSON.stringify({
      pattern,
      totalIterations: iterations,
      totalKeysFound: keys.length
    })
  );

  return keys;
};

/**
 * Generates the Redis key for a user's cache index
 * The index is a Redis SET containing all cache keys for that user
 * @param userId - The user ID (can be number or string)
 * @returns Redis key for the user's cache index set
 */
export const getUserCacheIndexKey = (userId: number | string): string => {
  return `user-cache-index:${userId}`;
};

/**
 * Adds a cache key to a user's cache index
 * This is a best-effort operation - failures are logged but not thrown
 * to prevent cache indexing from breaking API responses
 *
 * @param userId - The user ID
 * @param cacheKey - The cache key to add to the index
 * @returns Promise<void>
 */
export const addUserCacheKey = async (
  userId: number,
  cacheKey: string
): Promise<void> => {
  try {
    // Check if Redis is connected and caching is enabled
    if (!redisClient.isOpen || process.env.USE_API_CACHING !== "true") {
      logger.debug(
        "[CACHE] Skipping cache index update - Redis not available",
        {
          userId,
          cacheKey,
          redisOpen: redisClient.isOpen,
          useApiCaching: process.env.USE_API_CACHING
        }
      );
      return;
    }

    const indexKey = getUserCacheIndexKey(userId);

    // Add cache key to user's index set
    // SADD is O(1) operation and is idempotent (safe to call multiple times)
    await redisClient.sAdd(indexKey, cacheKey);

    logger.debug("[CACHE] Added key to user cache index", {
      userId,
      indexKey,
      cacheKey
    });
  } catch (error) {
    // Best-effort: Log error but don't throw
    // Cache indexing failures should not break API responses
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
      "[CACHE] Failed to add key to user cache index (non-critical)",
      {
        userId,
        cacheKey,
        error: errorDetails
      }
    );
  }
};

/**
 * Clears all cache entries for a specific user using the cache index
 * This replaces pattern-based SCAN operations with direct SET reads
 *
 * @param userId - The user ID whose cache should be cleared
 * @returns Promise with statistics about cleared keys
 * @throws Error if Redis operations fail (retryable error for workers)
 */
export const clearUserCache = async (
  userId: number
): Promise<{ keysFound: number; keysDeleted: number }> => {
  const startTime = Date.now();
  const indexKey = getUserCacheIndexKey(userId);

  console.log(
    "[CACHE] Starting user cache clear",
    JSON.stringify({
      userId,
      indexKey,
      timestamp: new Date().toISOString()
    })
  );

  try {
    // Check Redis connection status
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

        logger.error("[CACHE] Failed to connect Redis client for cache clear", {
          userId,
          indexKey,
          error: errorDetails
        });
        throw new Error(
          `Redis client not connected for user cache clear: ${connectError}`
        );
      }
    }

    // Step 1: Get all cache keys from user's index set
    // SMEMBERS is O(n) where n = number of keys in the set
    console.log(
      "[CACHE] About to retrieve cache keys from index",
      JSON.stringify({
        userId,
        indexKey,
        redisConnected: redisClient.isOpen,
        sMembersMethodType: typeof redisClient.sMembers
      })
    );

    let cacheKeys: string[];
    try {
      cacheKeys = await redisClient.sMembers(indexKey);
      console.log(
        "[CACHE] Retrieved cache keys from index - SUCCESS",
        JSON.stringify({
          userId,
          indexKey,
          keysRetrieved: cacheKeys.length,
          cacheKeysType: Array.isArray(cacheKeys) ? "array" : typeof cacheKeys
        })
      );
    } catch (sMembersError) {
      console.error(
        "[CACHE] Error retrieving cache keys from index",
        JSON.stringify({
          userId,
          indexKey,
          error:
            sMembersError instanceof Error
              ? {
                  message: sMembersError.message,
                  stack: sMembersError.stack,
                  name: sMembersError.name,
                  code: (sMembersError as any).code
                }
              : String(sMembersError)
        })
      );
      throw sMembersError;
    }

    const keysFound = cacheKeys.length;

    console.log(
      "[CACHE] Retrieved cache keys from user index",
      JSON.stringify({
        userId,
        indexKey,
        keysFound,
        sampleKeys: cacheKeys.slice(0, 5) // Log first 5 keys for debugging
      })
    );

    let keysDeleted = 0;

    if (keysFound > 0) {
      // Step 2: Delete all cache keys
      // In Redis Cluster mode, we must delete keys individually
      // because keys may hash to different slots (CROSSSLOT error)
      console.log(
        "[CACHE] About to delete cache keys (one at a time for cluster mode)",
        JSON.stringify({
          userId,
          indexKey,
          keyCount: cacheKeys.length,
          keysToDelete: cacheKeys,
          redisConnected: redisClient.isOpen
        })
      );

      keysDeleted = 0;
      const deletionResults: Array<{
        key: string;
        deleted: number;
        error?: string;
      }> = [];

      for (const key of cacheKeys) {
        try {
          const deleted = await redisClient.del(key);
          keysDeleted += deleted;
          deletionResults.push({ key, deleted });
        } catch (keyError) {
          const errorMsg =
            keyError instanceof Error ? keyError.message : String(keyError);
          console.error(
            "[CACHE] Error deleting individual cache key",
            JSON.stringify({
              userId,
              key,
              error: errorMsg
            })
          );
          deletionResults.push({
            key,
            deleted: 0,
            error: errorMsg
          });
          // Continue with other keys even if one fails
        }
      }

      console.log(
        "[CACHE] Cache keys deletion completed",
        JSON.stringify({
          userId,
          keysDeleted,
          keysFound,
          expectedDeleted: cacheKeys.length,
          allKeysDeleted: keysDeleted === cacheKeys.length,
          deletionResults: deletionResults.slice(0, 10) // Log first 10 for debugging
        })
      );

      // Step 3: Delete the index set itself (cleanup)
      // This keeps Redis clean - the index will be recreated on next cache write
      console.log(
        "[CACHE] About to delete user cache index",
        JSON.stringify({
          userId,
          indexKey,
          redisConnected: redisClient.isOpen
        })
      );

      try {
        const indexDeleted = await redisClient.del(indexKey);
        console.log(
          "[CACHE] User cache index deletion completed",
          JSON.stringify({
            userId,
            indexKey,
            indexDeleted,
            indexWasDeleted: indexDeleted > 0
          })
        );
      } catch (indexDelError) {
        console.error(
          "[CACHE] Error deleting user cache index",
          JSON.stringify({
            userId,
            indexKey,
            error:
              indexDelError instanceof Error
                ? {
                    message: indexDelError.message,
                    stack: indexDelError.stack,
                    name: indexDelError.name,
                    code: (indexDelError as any).code
                  }
                : String(indexDelError)
          })
        );
        // Don't throw here - keys are already deleted, index cleanup is less critical
        logger.warn("[CACHE] Failed to delete index but keys were deleted", {
          userId,
          indexKey
        });
      }
    } else {
      logger.debug("[CACHE] No cache keys found in user index", {
        userId,
        indexKey
      });

      // Even if no keys found, try to delete the index set (cleanup)
      // This handles edge case where index exists but is empty
      console.log(
        "[CACHE] No keys found, deleting empty index",
        JSON.stringify({
          userId,
          indexKey
        })
      );
      try {
        const indexDeleted = await redisClient.del(indexKey);
        console.log(
          "[CACHE] Empty index deletion completed",
          JSON.stringify({
            userId,
            indexKey,
            indexDeleted
          })
        );
      } catch (indexDelError) {
        console.error(
          "[CACHE] Error deleting empty index",
          JSON.stringify({
            userId,
            indexKey,
            error:
              indexDelError instanceof Error
                ? {
                    message: indexDelError.message,
                    stack: indexDelError.stack,
                    name: indexDelError.name
                  }
                : String(indexDelError)
          })
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      "[CACHE] User cache clear completed",
      JSON.stringify({
        userId,
        keysFound,
        keysDeleted,
        durationMs: duration
      })
    );

    return { keysFound, keysDeleted };
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

    console.error(
      "[CACHE] Failed to clear user cache - ERROR DETAILS",
      JSON.stringify({
        userId,
        indexKey,
        durationMs: duration,
        error: errorDetails,
        redisConnected: redisClient.isOpen,
        useApiCaching: process.env.USE_API_CACHING,
        redisClientType: typeof redisClient,
        redisClientMethods: Object.getOwnPropertyNames(
          Object.getPrototypeOf(redisClient)
        ).filter(
          (m) =>
            m.toLowerCase().includes("del") ||
            m.toLowerCase().includes("member")
        )
      })
    );

    logger.error("[CACHE] Failed to clear user cache", {
      userId,
      indexKey,
      durationMs: duration,
      error: errorDetails,
      redisConnected: redisClient.isOpen,
      useApiCaching: process.env.USE_API_CACHING
    });

    // Re-throw error for worker retry logic
    // Workers should retry cache invalidation failures
    throw new Error(`Failed to clear user cache: ${error}`);
  }
};

// Helper function to invalidate cache
// example usage: invalidateCache("program", "byManufacturerId", 1)
export const invalidateCache = async (
  namespace: string,
  prefix?: string
): Promise<void> => {
  const startTime = Date.now();
  const cacheKey = prefix ? getCacheKey(namespace, prefix) : null;
  const pattern = prefix ? null : `${namespace}:*`;

  console.log(
    "[CACHE] Starting cache invalidation",
    JSON.stringify({
      namespace,
      prefix,
      cacheKey,
      pattern,
      redisConnected: redisClient.isOpen,
      useApiCaching: process.env.USE_API_CACHING
    })
  );

  try {
    // Check Redis connection status
    if (!redisClient.isOpen) {
      logger.warn("[CACHE] Redis client not connected, attempting to connect", {
        namespace,
        prefix
      });
      try {
        await redisClient.connect();
        console.log(
          "[CACHE] Redis client connected successfully for cache invalidation"
        );
      } catch (connectError) {
        logger.error(
          "[CACHE] Failed to connect Redis client for cache invalidation",
          {
            namespace,
            prefix,
            error:
              connectError instanceof Error
                ? {
                    message: connectError.message,
                    stack: connectError.stack,
                    name: connectError.name
                  }
                : connectError
          }
        );
        throw new Error(`Redis client not connected: ${connectError}`);
      }
    }

    if (prefix) {
      // Invalidate specific prefix cache
      logger.debug("[CACHE] Invalidating specific cache key", {
        namespace,
        prefix,
        cacheKey
      });
      const result = await redisClient.del(cacheKey!);
      console.log(
        "[CACHE] Cache key deleted",
        JSON.stringify({
          namespace,
          prefix,
          cacheKey,
          deleted: result > 0,
          result
        })
      );
    } else {
      // Invalidate all caches for namespace
      logger.debug("[CACHE] Finding cache keys for namespace", {
        namespace,
        pattern
      });
      const keys = await scanKeys(pattern!);
      console.log(
        "[CACHE] Found cache keys for namespace",
        JSON.stringify({
          namespace,
          pattern,
          keyCount: keys.length,
          keys: keys.slice(0, 10) // Log first 10 keys for debugging
        })
      );

      if (keys.length > 0) {
        const deleteResult = await redisClient.del(keys);
        console.log(
          "[CACHE] Cache keys deleted for namespace",
          JSON.stringify({
            namespace,
            pattern,
            keysDeleted: deleteResult,
            totalKeysFound: keys.length
          })
        );
      } else {
        logger.debug("[CACHE] No cache keys found for namespace", {
          namespace,
          pattern
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      "[CACHE] Cache invalidation completed successfully",
      JSON.stringify({
        namespace,
        prefix,
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

    logger.error("[CACHE] Failed to invalidate cache", {
      namespace,
      prefix,
      cacheKey,
      pattern,
      redisConnected: redisClient.isOpen,
      durationMs: duration,
      error: errorDetails
    });

    throw new Error(`Failed to invalidate cache: ${error}`);
  }
};

export { redisClient };
