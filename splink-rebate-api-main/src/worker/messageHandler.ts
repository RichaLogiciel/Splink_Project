import logger from "../lib/logger";
import { WorkerError } from "./errors/WorkerError";
import {
  handleAgreementStoreEnrollmentChanged,
  handleCacheInvalidation,
  handleDataSync,
  handleMaterializedViewUpdate,
  handleProgramEnrollment,
  handleProgramUnenrollment,
  handleStoreProgramEnrollmentChanged
} from "./handlers";

/**
 * Standard SQS message structure expected by the worker
 */
export interface SQSMessage {
  jobType: string;
  payload: Record<string, any>;
  timestamp: string;
}

/**
 * Type definition for handler functions
 */
type HandlerFunction = (payload: any) => Promise<void>;

/**
 * Registry of job handlers mapped by jobType
 * Add new handlers here when implementing new job types
 */
const handlerRegistry: Record<string, HandlerFunction> = {
  INVALIDATE_CACHE: handleCacheInvalidation,
  UPDATE_MATERIALIZED_VIEW: handleMaterializedViewUpdate,
  SYNC_DATA: handleDataSync,
  ENROLL_STORE: handleProgramEnrollment, // Backward compat (will phase out)
  UNENROLL_STORE: handleProgramUnenrollment, // Backward compat (will phase out)
  STORE_PROGRAM_ENROLLMENT_CHANGED: handleStoreProgramEnrollmentChanged,
  AGREEMENT_STORE_ENROLLMENT_CHANGED: handleAgreementStoreEnrollmentChanged
};

/**
 * Parse and validate SQS message body
 */
function parseMessage(messageBody: string): SQSMessage {
  try {
    const parsed = JSON.parse(messageBody);

    // Validate message structure
    if (!parsed.jobType || typeof parsed.jobType !== "string") {
      throw WorkerError.invalidMessage(
        "Message must contain a valid jobType field"
      );
    }

    if (!parsed.payload || typeof parsed.payload !== "object") {
      throw WorkerError.invalidMessage(
        "Message must contain a valid payload object"
      );
    }

    return {
      jobType: parsed.jobType,
      payload: parsed.payload,
      timestamp: parsed.timestamp || new Date().toISOString()
    };
  } catch (error) {
    if (error instanceof WorkerError) {
      throw error;
    }

    // JSON parse error
    logger.error("Failed to parse message body", { error, messageBody });
    throw WorkerError.invalidMessage("Message body is not valid JSON");
  }
}

/**
 * Main message handler - routes messages to appropriate handlers
 * @param messageBody - Raw message body from SQS
 */
export async function handleMessage(messageBody: string): Promise<void> {
  // Parse and validate message
  const message = parseMessage(messageBody);

  logger.info("Routing message to handler", {
    jobType: message.jobType,
    timestamp: message.timestamp
  });

  // Find handler for this job type
  const handler = handlerRegistry[message.jobType];

  if (!handler) {
    logger.error("No handler found for job type", {
      jobType: message.jobType,
      availableHandlers: Object.keys(handlerRegistry)
    });
    throw WorkerError.handlerNotFound(message.jobType);
  }

  // Execute handler
  try {
    await handler(message.payload);
    logger.info("Message processed successfully", { jobType: message.jobType });
  } catch (error) {
    // Handler errors are propagated up to the worker
    // WorkerError instances contain retry information
    if (error instanceof WorkerError) {
      throw error;
    }

    // Wrap unexpected errors
    logger.error("Unexpected error in handler", {
      jobType: message.jobType,
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: (error as any)?.code,
      errorStack: error instanceof Error ? error.stack : undefined,
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
    throw WorkerError.processingFailed(
      `Unexpected error processing ${message.jobType}: ${error instanceof Error ? error.message : String(error)}`,
      true // Retryable by default
    );
  }
}

/**
 * Get list of registered job types
 * Useful for debugging and monitoring
 */
export function getRegisteredJobTypes(): string[] {
  return Object.keys(handlerRegistry);
}
