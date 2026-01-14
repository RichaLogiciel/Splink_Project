import { WorkerError } from "../../../../worker/errors/WorkerError";

describe("WorkerError", () => {
  describe("constructor", () => {
    it("should create error with code, message, and retryable flag", () => {
      const error = new WorkerError("TEST_CODE", "Test message", true);

      expect(error.code).toBe("TEST_CODE");
      expect(error.message).toBe("Test message");
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("WorkerError");
    });

    it("should default retryable to false when not specified", () => {
      const error = new WorkerError("TEST_CODE", "Test message");

      expect(error.retryable).toBe(false);
    });
  });

  describe("static factory methods", () => {
    describe("invalidMessage", () => {
      it("should create non-retryable error with INVALID_MESSAGE code", () => {
        const error = WorkerError.invalidMessage("Invalid JSON");

        expect(error.code).toBe("INVALID_MESSAGE");
        expect(error.message).toBe("Invalid JSON");
        expect(error.retryable).toBe(false);
      });
    });

    describe("processingFailed", () => {
      it("should create retryable error by default", () => {
        const error = WorkerError.processingFailed("Processing failed");

        expect(error.code).toBe("PROCESSING_FAILED");
        expect(error.message).toBe("Processing failed");
        expect(error.retryable).toBe(true);
      });

      it("should create non-retryable error when specified", () => {
        const error = WorkerError.processingFailed("Processing failed", false);

        expect(error.retryable).toBe(false);
      });
    });

    describe("handlerNotFound", () => {
      it("should create non-retryable error with handler details", () => {
        const error = WorkerError.handlerNotFound("UNKNOWN_JOB");

        expect(error.code).toBe("HANDLER_NOT_FOUND");
        expect(error.message).toBe(
          "No handler registered for job type: UNKNOWN_JOB"
        );
        expect(error.retryable).toBe(false);
      });
    });

    describe("validationFailed", () => {
      it("should create non-retryable error", () => {
        const error = WorkerError.validationFailed("namespace is required");

        expect(error.code).toBe("VALIDATION_FAILED");
        expect(error.message).toBe("namespace is required");
        expect(error.retryable).toBe(false);
      });
    });

    describe("databaseError", () => {
      it("should create retryable error by default", () => {
        const error = WorkerError.databaseError("Connection timeout");

        expect(error.code).toBe("DATABASE_ERROR");
        expect(error.message).toBe("Connection timeout");
        expect(error.retryable).toBe(true);
      });

      it("should create non-retryable error when specified", () => {
        const error = WorkerError.databaseError("Table does not exist", false);

        expect(error.retryable).toBe(false);
      });
    });

    describe("cacheError", () => {
      it("should create retryable error by default", () => {
        const error = WorkerError.cacheError("Redis connection failed");

        expect(error.code).toBe("CACHE_ERROR");
        expect(error.message).toBe("Redis connection failed");
        expect(error.retryable).toBe(true);
      });

      it("should create non-retryable error when specified", () => {
        const error = WorkerError.cacheError("Invalid cache key", false);

        expect(error.retryable).toBe(false);
      });
    });
  });
});
