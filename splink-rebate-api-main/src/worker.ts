import logger from "./lib/logger";
import "./utils/redis"; // Initialize Redis if enabled
import { SQSWorker } from "./worker/index";

/**
 * Start the SQS worker
 * This is the worker mode of the application
 */
export async function startWorker(): Promise<void> {
  logger.info("Initializing SQS worker");

  // Skip database migrations in worker mode
  // API service is responsible for running migrations
  logger.info("Skipping database migrations in worker mode");

  // Create and start worker
  const worker = new SQSWorker();
  await worker.start();
}
