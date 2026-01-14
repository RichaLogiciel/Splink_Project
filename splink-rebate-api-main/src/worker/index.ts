import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message
} from "@aws-sdk/client-sqs";
import newrelic from "newrelic";
import logger from "../lib/logger";
import sequelize from "../db";
import { redisClient } from "../utils/redis";
import { handleMessage, getRegisteredJobTypes } from "./messageHandler";
import {
  startHealthCheckServer,
  updateLastMessageTimestamp
} from "./healthCheck";
import { WorkerError } from "./errors/WorkerError";

/**
 * SQS Worker for processing background jobs
 * Implements long polling with graceful shutdown
 */
export class SQSWorker {
  private sqsClient: SQSClient;
  private queueUrl: string;
  private isShuttingDown: boolean = false;
  private currentMessagePromise: Promise<void> | null = null;
  private readonly region: string;
  private readonly healthCheckPort: number;

  constructor() {
    // Validate required configuration
    this.queueUrl = process.env.SQS_QUEUE_URL || "";
    if (!this.queueUrl) {
      throw new Error("SQS_QUEUE_URL environment variable is required");
    }

    this.region = process.env.AWS_REGION || "us-west-2";
    this.healthCheckPort = parseInt(
      process.env.WORKER_HEALTH_CHECK_PORT || "3002",
      10
    );

    // Initialize SQS client
    this.sqsClient = new SQSClient({
      region: this.region
      // AWS credentials are automatically loaded from:
      // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
      // 2. IAM role (when running on ECS)
    });

    logger.info("SQSWorker initialized", {
      queueUrl: this.queueUrl,
      region: this.region,
      healthCheckPort: this.healthCheckPort
    });
  }

  /**
   * Start the worker
   * Begins SQS polling loop and starts health check server
   */
  async start(): Promise<void> {
    logger.info("Starting SQS worker", {
      registeredJobTypes: getRegisteredJobTypes()
    });

    // Start health check server
    startHealthCheckServer(this.healthCheckPort);

    // Register graceful shutdown handlers
    this.registerShutdownHandlers();

    // Begin polling loop
    await this.pollMessages();
  }

  /**
   * Register handlers for graceful shutdown
   */
  private registerShutdownHandlers(): void {
    process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => this.gracefulShutdown("SIGINT"));
  }

  /**
   * Graceful shutdown handler
   * Waits for current message to complete before exiting
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`${signal} received, starting graceful shutdown`);

    this.isShuttingDown = true;

    // Wait for current message to complete
    if (this.currentMessagePromise) {
      logger.info("Waiting for current message to complete processing");
      try {
        await this.currentMessagePromise;
        logger.info("Current message processing completed");
      } catch (error) {
        logger.error("Error waiting for message completion", { error });
      }
    }

    // Close Redis connection if enabled
    try {
      if (process.env.USE_API_CACHING === "true") {
        logger.info("Closing Redis connection");
        await redisClient.quit();
      }
    } catch (error) {
      logger.error("Error closing Redis connection", { error });
    }

    // Close database connection
    try {
      logger.info("Closing database connections");
      await sequelize.close();
    } catch (error) {
      logger.error("Error closing database connections", { error });
    }

    logger.info("Graceful shutdown complete");
    process.exit(0);
  }

  /**
   * Main polling loop
   * Uses long polling to minimize SQS API calls
   */
  private async pollMessages(): Promise<void> {
    logger.info("Starting SQS polling loop");

    while (!this.isShuttingDown) {
      try {
        // Long polling with 20 second wait time
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 1, // Process one at a time for FIFO ordering
          WaitTimeSeconds: 20, // Long polling reduces API calls
          VisibilityTimeout: 900, // Hide message for 15m while processing
          AttributeNames: ["All"],
          MessageAttributeNames: ["All"]
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
          for (const message of response.Messages) {
            // Process message with tracking
            this.currentMessagePromise = this.processMessage(message);
            await this.currentMessagePromise;
            this.currentMessagePromise = null;
          }
        } else {
          // No messages - long polling will wait 20s before returning
          logger.debug("No messages in queue, continuing to poll");
        }
      } catch (error) {
        logger.error("Error polling SQS", { error });

        // Wait 5 seconds before retrying on error
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    logger.info("Polling loop ended");
  }

  /**
   * Process a single SQS message
   * Wraps processing in New Relic background transaction
   */
  private async processMessage(message: Message): Promise<void> {
    const messageId = message.MessageId || "unknown";
    const receiptHandle = message.ReceiptHandle;

    if (!receiptHandle) {
      logger.error("Message missing ReceiptHandle, cannot process", {
        messageId
      });
      return;
    }

    logger.info("Processing message", {
      messageId,
      messageGroupId: message.Attributes?.MessageGroupId
    });

    try {
      // Create New Relic background transaction
      await newrelic.startBackgroundTransaction(
        "SQS Worker",
        "SQS",
        async () => {
          try {
            // Parse message body to get job type for New Relic
            let jobType = "UNKNOWN";
            try {
              const parsed = JSON.parse(message.Body || "{}");
              jobType = parsed.jobType || "UNKNOWN";
            } catch (e) {
              // Ignore parse error here, will be caught by handleMessage
            }

            // Add custom attributes for New Relic
            newrelic.addCustomAttributes({
              messageId,
              messageGroupId: message.Attributes?.MessageGroupId || "none",
              jobType,
              queueUrl: this.queueUrl
            });

            // Process message through handler
            await handleMessage(message.Body || "");

            // Success: Delete message from queue
            await this.deleteMessage(receiptHandle, messageId);

            // Update health check timestamp
            updateLastMessageTimestamp();

            logger.info("Message processed and deleted successfully", {
              messageId,
              jobType
            });
          } catch (error) {
            // Handle processing errors
            await this.handleProcessingError(error, receiptHandle, messageId);
          }
        }
      );
    } catch (error) {
      logger.error("Error in New Relic background transaction", {
        messageId,
        error
      });
    }
  }

  /**
   * Handle errors during message processing
   * Determines whether to delete message or let it retry
   */
  private async handleProcessingError(
    error: unknown,
    receiptHandle: string,
    messageId: string
  ): Promise<void> {
    if (error instanceof WorkerError) {
      if (!error.retryable) {
        // Non-retryable error: Delete message to prevent DLQ pollution
        logger.error("Non-retryable error, deleting message", {
          messageId,
          errorCode: error.code,
          errorMessage: error.message
        });

        await this.deleteMessage(receiptHandle, messageId);
      } else {
        // Retryable error: Don't delete, let visibility timeout expire
        logger.warn("Retryable error, message will retry", {
          messageId,
          errorCode: error.code,
          errorMessage: error.message
        });

        // Report to New Relic
        newrelic.noticeError(error, {
          messageId,
          errorCode: error.code,
          retryable: error.retryable
        });
      }
    } else {
      // Unexpected error: Treat as retryable
      logger.error("Unexpected error, message will retry", {
        messageId,
        error
      });

      newrelic.noticeError(
        error instanceof Error ? error : new Error(String(error)),
        {
          messageId,
          errorType: "unexpected"
        }
      );
    }
  }

  /**
   * Delete message from SQS queue
   */
  private async deleteMessage(
    receiptHandle: string,
    messageId: string
  ): Promise<void> {
    try {
      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle
      });

      await this.sqsClient.send(deleteCommand);

      logger.debug("Message deleted from queue", { messageId });
    } catch (error) {
      logger.error("Failed to delete message from queue", {
        messageId,
        error
      });
      // Don't throw - message will become visible again after timeout
    }
  }
}
