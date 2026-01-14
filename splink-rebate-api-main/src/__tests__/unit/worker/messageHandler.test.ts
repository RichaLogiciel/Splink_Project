import {
  handleMessage,
  getRegisteredJobTypes
} from "../../../worker/messageHandler";
import { WorkerError } from "../../../worker/errors/WorkerError";
import * as handlers from "../../../worker/handlers";

// Mock all handlers
jest.mock("../../../worker/handlers", () => ({
  handleCacheInvalidation: jest.fn(),
  handleMaterializedViewUpdate: jest.fn(),
  handleDataSync: jest.fn(),
  handleProgramEnrollment: jest.fn(),
  handleProgramUnenrollment: jest.fn()
}));

describe("messageHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRegisteredJobTypes", () => {
    it("should return list of registered job types", () => {
      const jobTypes = getRegisteredJobTypes();

      expect(jobTypes).toContain("INVALIDATE_CACHE");
      expect(jobTypes).toContain("UPDATE_MATERIALIZED_VIEW");
      expect(jobTypes).toContain("SYNC_DATA");
      expect(jobTypes).toContain("ENROLL_STORE");
      expect(jobTypes).toContain("UNENROLL_STORE");
    });
  });

  describe("handleMessage", () => {
    describe("message parsing", () => {
      it("should parse valid JSON message", async () => {
        const mockHandler = handlers.handleCacheInvalidation as jest.Mock;
        mockHandler.mockResolvedValue(undefined);

        const messageBody = JSON.stringify({
          jobType: "INVALIDATE_CACHE",
          payload: { namespace: "program", prefix: "all" },
          timestamp: "2025-12-04T10:00:00.000Z"
        });

        await handleMessage(messageBody);

        expect(mockHandler).toHaveBeenCalledWith({
          namespace: "program",
          prefix: "all"
        });
      });

      it("should throw WorkerError for invalid JSON", async () => {
        const invalidJson = "not valid json {";

        await expect(handleMessage(invalidJson)).rejects.toThrow(WorkerError);
        await expect(handleMessage(invalidJson)).rejects.toMatchObject({
          code: "INVALID_MESSAGE",
          retryable: false
        });
      });

      it("should throw WorkerError for missing jobType", async () => {
        const messageBody = JSON.stringify({
          payload: { namespace: "program" }
        });

        await expect(handleMessage(messageBody)).rejects.toThrow(WorkerError);
        await expect(handleMessage(messageBody)).rejects.toMatchObject({
          code: "INVALID_MESSAGE",
          retryable: false
        });
      });

      it("should throw WorkerError for missing payload", async () => {
        const messageBody = JSON.stringify({
          jobType: "INVALIDATE_CACHE"
        });

        await expect(handleMessage(messageBody)).rejects.toThrow(WorkerError);
        await expect(handleMessage(messageBody)).rejects.toMatchObject({
          code: "INVALID_MESSAGE",
          retryable: false
        });
      });

      it("should add timestamp if not provided", async () => {
        const mockHandler = handlers.handleCacheInvalidation as jest.Mock;
        mockHandler.mockResolvedValue(undefined);

        const messageBody = JSON.stringify({
          jobType: "INVALIDATE_CACHE",
          payload: { namespace: "program" }
        });

        await handleMessage(messageBody);

        expect(mockHandler).toHaveBeenCalled();
      });
    });

    describe("handler routing", () => {
      it("should route INVALIDATE_CACHE to cache invalidation handler", async () => {
        const mockHandler = handlers.handleCacheInvalidation as jest.Mock;
        mockHandler.mockResolvedValue(undefined);

        const messageBody = JSON.stringify({
          jobType: "INVALIDATE_CACHE",
          payload: { namespace: "program" }
        });

        await handleMessage(messageBody);

        expect(mockHandler).toHaveBeenCalledWith({ namespace: "program" });
      });

      it("should route UPDATE_MATERIALIZED_VIEW to view handler", async () => {
        const mockHandler = handlers.handleMaterializedViewUpdate as jest.Mock;
        mockHandler.mockResolvedValue(undefined);

        const messageBody = JSON.stringify({
          jobType: "UPDATE_MATERIALIZED_VIEW",
          payload: { viewName: "test_view" }
        });

        await handleMessage(messageBody);

        expect(mockHandler).toHaveBeenCalledWith({ viewName: "test_view" });
      });

      it("should route SYNC_DATA to data sync handler", async () => {
        const mockHandler = handlers.handleDataSync as jest.Mock;
        mockHandler.mockResolvedValue(undefined);

        const messageBody = JSON.stringify({
          jobType: "SYNC_DATA",
          payload: { syncType: "stores" }
        });

        await handleMessage(messageBody);

        expect(mockHandler).toHaveBeenCalledWith({ syncType: "stores" });
      });

      it("should route ENROLL_STORE to enrollment handler", async () => {
        const mockHandler = handlers.handleProgramEnrollment as jest.Mock;
        mockHandler.mockResolvedValue(undefined);

        const messageBody = JSON.stringify({
          jobType: "ENROLL_STORE",
          payload: { storeId: 1, programId: 2, userId: 3 }
        });

        await handleMessage(messageBody);

        expect(mockHandler).toHaveBeenCalledWith({
          storeId: 1,
          programId: 2,
          userId: 3
        });
      });

      it("should route UNENROLL_STORE to unenrollment handler", async () => {
        const mockHandler = handlers.handleProgramUnenrollment as jest.Mock;
        mockHandler.mockResolvedValue(undefined);

        const messageBody = JSON.stringify({
          jobType: "UNENROLL_STORE",
          payload: { storeId: 1, programId: 2, userId: 3 }
        });

        await handleMessage(messageBody);

        expect(mockHandler).toHaveBeenCalledWith({
          storeId: 1,
          programId: 2,
          userId: 3
        });
      });

      it("should throw WorkerError for unknown job type", async () => {
        const messageBody = JSON.stringify({
          jobType: "UNKNOWN_JOB",
          payload: {}
        });

        await expect(handleMessage(messageBody)).rejects.toThrow(WorkerError);
        await expect(handleMessage(messageBody)).rejects.toMatchObject({
          code: "HANDLER_NOT_FOUND",
          retryable: false
        });
      });
    });

    describe("error handling", () => {
      it("should propagate WorkerError from handler", async () => {
        const mockHandler = handlers.handleCacheInvalidation as jest.Mock;
        const workerError = WorkerError.validationFailed("namespace required");
        mockHandler.mockRejectedValue(workerError);

        const messageBody = JSON.stringify({
          jobType: "INVALIDATE_CACHE",
          payload: {}
        });

        await expect(handleMessage(messageBody)).rejects.toThrow(workerError);
      });

      it("should wrap unexpected errors in WorkerError", async () => {
        const mockHandler = handlers.handleCacheInvalidation as jest.Mock;
        mockHandler.mockRejectedValue(new Error("Unexpected error"));

        const messageBody = JSON.stringify({
          jobType: "INVALIDATE_CACHE",
          payload: { namespace: "program" }
        });

        await expect(handleMessage(messageBody)).rejects.toThrow(WorkerError);
        await expect(handleMessage(messageBody)).rejects.toMatchObject({
          code: "PROCESSING_FAILED",
          retryable: true
        });
      });

      it("should handle non-Error exceptions", async () => {
        const mockHandler = handlers.handleCacheInvalidation as jest.Mock;
        mockHandler.mockRejectedValue("string error");

        const messageBody = JSON.stringify({
          jobType: "INVALIDATE_CACHE",
          payload: { namespace: "program" }
        });

        await expect(handleMessage(messageBody)).rejects.toThrow(WorkerError);
      });
    });
  });
});
