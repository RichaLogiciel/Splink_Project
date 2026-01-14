/**
 * Custom error class for worker-specific errors
 * Distinguishes between retryable and non-retryable errors
 */
export class WorkerError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "WorkerError";
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Error for invalid message format or structure
   * Non-retryable - message should be deleted
   */
  static invalidMessage(message: string): WorkerError {
    return new WorkerError("INVALID_MESSAGE", message, false);
  }

  /**
   * Error for message processing failures
   * Can be retryable or non-retryable depending on the cause
   */
  static processingFailed(
    message: string,
    retryable: boolean = true
  ): WorkerError {
    return new WorkerError("PROCESSING_FAILED", message, retryable);
  }

  /**
   * Error when no handler is found for the job type
   * Non-retryable - indicates a configuration issue
   */
  static handlerNotFound(jobType: string): WorkerError {
    return new WorkerError(
      "HANDLER_NOT_FOUND",
      `No handler registered for job type: ${jobType}`,
      false
    );
  }

  /**
   * Error for validation failures in payload
   * Non-retryable - indicates bad data
   */
  static validationFailed(message: string): WorkerError {
    return new WorkerError("VALIDATION_FAILED", message, false);
  }

  /**
   * Error for database-related failures
   * Retryable by default
   */
  static databaseError(
    message: string,
    retryable: boolean = true
  ): WorkerError {
    return new WorkerError("DATABASE_ERROR", message, retryable);
  }

  /**
   * Error for Redis/cache-related failures
   * Retryable by default
   */
  static cacheError(message: string, retryable: boolean = true): WorkerError {
    return new WorkerError("CACHE_ERROR", message, retryable);
  }
}
