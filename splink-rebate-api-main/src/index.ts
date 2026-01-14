// Load environment variables FIRST
import dotenv from "dotenv";
dotenv.config();

// CRITICAL: New Relic must be imported AFTER environment variables are loaded
import "newrelic";

import logger from "./lib/logger";

/**
 * Dual-mode application entry point
 * Runs as either API server or SQS worker based on SQS_QUEUE_URL environment variable
 */

// Check if running in worker mode
// FORCE_API_MODE can be set to "true" to override SQS_QUEUE_URL and run in API mode
// FORCE_WORKER_MODE can be set to "true" to override and run in worker mode
const forceApiMode = process.env.FORCE_API_MODE === "true";
const forceWorkerMode = process.env.FORCE_WORKER_MODE === "true";
const hasSqsQueueUrl =
  process.env.SQS_QUEUE_URL && process.env.SQS_QUEUE_URL.trim() !== "";

if ((hasSqsQueueUrl && !forceApiMode) || forceWorkerMode) {
  logger.info("Starting in WORKER mode", {
    queueUrl: process.env.SQS_QUEUE_URL,
    forced: forceWorkerMode
  });

  // Import and start worker
  import("./worker")
    .then((workerModule) => workerModule.startWorker())
    .catch((error) => {
      logger.error("Failed to start worker", {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
                ...(error as any)
              }
            : String(error)
      });
      console.error("Worker startup error:", error); // Add console.error for immediate visibility
      process.exit(1);
    });
} else {
  if (forceApiMode) {
    logger.info("Starting in API mode (FORCE_API_MODE=true)");
  } else {
    logger.info("Starting in API mode");
  }

  // Import and start API
  import("./api")
    .then((apiModule) => apiModule.startAPI())
    .catch((error) => {
      logger.error("Failed to start API", {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
                ...(error as any)
              }
            : String(error)
      });
      console.error("API startup error:", error); // Add console.error for immediate visibility
      process.exit(1);
    });
}
