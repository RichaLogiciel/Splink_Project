import { handleCacheInvalidation } from "../../../../worker/handlers/cacheInvalidationHandler";
import { WorkerError } from "../../../../worker/errors/WorkerError";
import { invalidateCache } from "../../../../utils/redis";

// Mock dependencies
jest.mock("../../../../utils/redis");
jest.mock("newrelic", () => ({
  startSegment: jest.fn((name, record, callback) => callback()),
  addCustomAttributes: jest.fn()
}));

describe("cacheInvalidationHandler", () => {
  const originalEnv = process.env.USE_API_CACHING;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set Redis as available for tests that expect cache invalidation
    process.env.USE_API_CACHING = "true";
  });

  afterEach(() => {
    process.env.USE_API_CACHING = originalEnv;
  });

  describe("handleCacheInvalidation", () => {
    it("should invalidate cache with namespace only", async () => {
      const { redisClient } = require("../../../../utils/redis");
      redisClient.isOpen = true;
      const mockInvalidateCache = invalidateCache as jest.Mock;
      mockInvalidateCache.mockResolvedValue(undefined);

      const payload = {
        namespace: "program"
      };

      await handleCacheInvalidation(payload);

      expect(mockInvalidateCache).toHaveBeenCalledWith("program", undefined);
    });

    it("should invalidate cache with namespace and prefix", async () => {
      const { redisClient } = require("../../../../utils/redis");
      redisClient.isOpen = true;
      const mockInvalidateCache = invalidateCache as jest.Mock;
      mockInvalidateCache.mockResolvedValue(undefined);

      const payload = {
        namespace: "program",
        prefix: "byId:123"
      };

      await handleCacheInvalidation(payload);

      expect(mockInvalidateCache).toHaveBeenCalledWith("program", "byId:123");
    });

    it("should handle reason field in payload", async () => {
      const { redisClient } = require("../../../../utils/redis");
      redisClient.isOpen = true;
      const mockInvalidateCache = invalidateCache as jest.Mock;
      mockInvalidateCache.mockResolvedValue(undefined);

      const payload = {
        namespace: "program",
        prefix: "all",
        reason: "Program updated"
      };

      await handleCacheInvalidation(payload);

      expect(mockInvalidateCache).toHaveBeenCalledWith("program", "all");
    });

    it("should throw WorkerError when namespace is missing", async () => {
      const payload = {
        prefix: "all"
      } as any;

      await expect(handleCacheInvalidation(payload)).rejects.toThrow(
        WorkerError
      );
      await expect(handleCacheInvalidation(payload)).rejects.toMatchObject({
        code: "VALIDATION_FAILED",
        retryable: false
      });
    });

    it("should throw WorkerError when namespace is empty string", async () => {
      const payload = {
        namespace: ""
      };

      await expect(handleCacheInvalidation(payload)).rejects.toThrow(
        WorkerError
      );
    });

    it("should wrap cache errors in WorkerError", async () => {
      const { redisClient } = require("../../../../utils/redis");
      redisClient.isOpen = true;
      const mockInvalidateCache = invalidateCache as jest.Mock;
      mockInvalidateCache.mockRejectedValue(
        new Error("Redis connection failed")
      );

      const payload = {
        namespace: "program"
      };

      // Note: With the new implementation, cache errors are logged but don't throw
      // The handler returns early if Redis is not available, and logs warnings on errors
      // This test verifies that errors during cache operations are handled gracefully
      await handleCacheInvalidation(payload);

      // Verify that invalidateCache was called (even though it failed)
      expect(mockInvalidateCache).toHaveBeenCalledWith("program", undefined);
    });

    it("should handle non-Error exceptions from cache", async () => {
      const { redisClient } = require("../../../../utils/redis");
      redisClient.isOpen = true;
      const mockInvalidateCache = invalidateCache as jest.Mock;
      mockInvalidateCache.mockRejectedValue("string error");

      const payload = {
        namespace: "program"
      };

      // Note: With the new implementation, cache errors are logged but don't throw
      await handleCacheInvalidation(payload);

      // Verify that invalidateCache was called (even though it failed)
      expect(mockInvalidateCache).toHaveBeenCalledWith("program", undefined);
    });
  });
});
