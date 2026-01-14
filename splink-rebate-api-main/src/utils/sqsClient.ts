import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { v4 as uuidv4 } from "uuid";
import logger from "../lib/logger";

/**
 * Singleton SQS client instance
 */
let sqsClient: SQSClient | null = null;

/**
 * Initialize and return SQS client
 * Client is created lazily and reused for all operations
 */
export function initializeSQSClient(): SQSClient {
  if (!sqsClient) {
    const region = process.env.AWS_REGION || "us-west-2";
    const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
    const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;

    logger.info("Initializing SQS client", {
      region,
      hasAccessKey,
      hasSecretKey,
      credentialsSource:
        hasAccessKey && hasSecretKey ? "environment" : "IAM/default"
    });

    try {
      sqsClient = new SQSClient({
        region
        // Credentials are automatically loaded from:
        // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
        // 2. IAM role (when running on ECS)
      });
      logger.info("SQS client initialized successfully", {
        region
      });
    } catch (initError) {
      logger.error("Failed to initialize SQS client", {
        region,
        error:
          initError instanceof Error ? initError.message : String(initError),
        errorName:
          initError instanceof Error ? initError.name : typeof initError
      });
      throw initError;
    }
  }
  return sqsClient;
}

/**
 * Parameters for enqueueing a job
 */
export interface EnqueueJobParams {
  /** Type of job to enqueue (e.g., 'INVALIDATE_CACHE') */
  jobType: string;

  /** Job payload data */
  payload: Record<string, any>;

  /** FIFO message group ID for ordering (default: 'default') */
  messageGroupId?: string;

  /** Deduplication ID for FIFO queue (auto-generated if not provided) */
  deduplicationId?: string;
}

/**
 * Enqueue a job to the SQS queue
 * Returns the message ID if successful, empty string if queue not configured
 */
export async function enqueueJob(params: EnqueueJobParams): Promise<string> {
  const queueUrl = process.env.SQS_QUEUE_URL;
  const region = process.env.AWS_REGION || "us-west-2";

  logger.info(
    `Attempting to enqueue job - QueueURL: ${queueUrl || "NOT SET"}, Region: ${region}`,
    {
      jobType: params.jobType,
      queueUrl: queueUrl || "NOT SET", // Log FULL URL, not truncated
      region,
      hasMessageGroupId: !!params.messageGroupId,
      hasDeduplicationId: !!params.deduplicationId,
      envQueueUrl: process.env.SQS_QUEUE_URL // Verify env var directly
    }
  );

  // If queue URL not configured, log warning and skip
  if (!queueUrl) {
    logger.warn("SQS_QUEUE_URL not configured, job not enqueued", {
      jobType: params.jobType,
      region
    });
    return "";
  }

  try {
    logger.info("Initializing SQS client for job", {
      region,
      jobType: params.jobType
    });
    const client = initializeSQSClient();
    logger.info("SQS client ready for job", { jobType: params.jobType });

    // Build message body
    let messageBody: string;
    try {
      messageBody = JSON.stringify({
        jobType: params.jobType,
        payload: params.payload,
        timestamp: new Date().toISOString()
      });
      logger.info("Message body created", {
        jobType: params.jobType,
        messageBodySize: messageBody.length
      });
    } catch (stringifyError) {
      logger.error("Failed to stringify message body", {
        jobType: params.jobType,
        error:
          stringifyError instanceof Error
            ? stringifyError.message
            : String(stringifyError),
        payloadType: typeof params.payload
      });
      throw new Error(
        `Failed to serialize message: ${stringifyError instanceof Error ? stringifyError.message : String(stringifyError)}`
      );
    }

    const messageGroupId = params.messageGroupId || "default";
    const messageDeduplicationId = params.deduplicationId || uuidv4();

    logger.info("Creating SQS SendMessageCommand", {
      jobType: params.jobType,
      queueUrl: `${queueUrl.substring(0, 50)}...`,
      messageGroupId,
      messageDeduplicationId: messageDeduplicationId.substring(0, 20) + "...",
      messageBodySize: messageBody.length
    });

    // Send message to FIFO queue
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageGroupId: messageGroupId,
      MessageDeduplicationId: messageDeduplicationId
    });

    logger.info("Sending message to SQS", {
      jobType: params.jobType,
      queueUrl: `${queueUrl.substring(0, 50)}...`
    });

    const response = await client.send(command);

    // Log FULL response details - include critical info in message for visibility
    const messageId = response.MessageId || "NO_MESSAGE_ID";
    const sequenceNumber = response.SequenceNumber || "NO_SEQUENCE";
    const httpStatusCode = response.$metadata?.httpStatusCode || "NO_STATUS";
    const requestId = response.$metadata?.requestId || "NO_REQUEST_ID";

    logger.info(
      `SQS SendMessageCommand response received - MessageId: ${messageId}, SequenceNumber: ${sequenceNumber}, HTTP: ${httpStatusCode}, RequestId: ${requestId}`,
      {
        jobType: params.jobType,
        messageId: response.MessageId,
        sequenceNumber: response.SequenceNumber,
        responseMetadata: response.$metadata,
        fullResponse: JSON.stringify(response, null, 2),
        queueUrl: queueUrl // Log full URL for verification
      }
    );

    // Verify we got a messageId (required for success)
    if (!response.MessageId) {
      logger.error("SQS send returned success but no MessageId!", {
        jobType: params.jobType,
        response: JSON.stringify(response, null, 2),
        queueUrl
      });
      throw new Error("SQS send succeeded but no MessageId returned");
    }

    logger.info(
      `Job enqueued to SQS successfully - MessageId: ${response.MessageId}, QueueURL: ${queueUrl}`,
      {
        jobType: params.jobType,
        messageId: response.MessageId,
        messageGroupId,
        queueUrl: queueUrl // Log full URL
      }
    );

    return response.MessageId || "";
  } catch (error) {
    logger.error("❌ [SQS] Error in enqueueJob", {
      jobType: params.jobType,
      queueUrl: queueUrl || "NOT SET",
      region,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode: (error as any)?.Code || (error as any)?.code,
      awsRequestId: (error as any)?.$metadata?.requestId,
      awsHttpStatusCode: (error as any)?.$metadata?.httpStatusCode,
      errorDetails: {
        ...((error as any).Code && { awsCode: (error as any).Code }),
        ...((error as any).code && { code: (error as any).code }),
        ...((error as any).statusCode && {
          statusCode: (error as any).statusCode
        }),
        ...((error as any).requestId && {
          awsRequestId: (error as any).requestId
        }),
        ...((error as any).retryable && {
          retryable: (error as any).retryable
        }),
        ...((error as any).$metadata && { metadata: (error as any).$metadata })
      },
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });
    // Extract error details for better visibility
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : typeof error;
    const errorCode = (error as any)?.Code || (error as any)?.code;
    const statusCode = (error as any)?.$metadata?.httpStatusCode;
    const requestId = (error as any)?.$metadata?.requestId;
    const awsRequestId = (error as any)?.$metadata?.requestId;
    const awsRegion = (error as any)?.$metadata?.extendedRequestId;

    // Try to stringify error, but handle circular references
    let fullErrorString = "Unable to stringify error";
    try {
      fullErrorString = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error),
        2
      );
    } catch (stringifyErr) {
      fullErrorString = `Error stringification failed: ${stringifyErr instanceof Error ? stringifyErr.message : String(stringifyErr)}. Original error: ${errorMessage}`;
    }

    logger.error(`Failed to enqueue job to SQS: ${errorMessage}`, {
      jobType: params.jobType,
      errorMessage,
      errorName,
      errorCode,
      statusCode,
      requestId,
      awsRequestId,
      awsRegion,
      queueUrl: queueUrl ? `${queueUrl.substring(0, 50)}...` : "NOT SET",
      region,
      messageGroupId: params.messageGroupId || "default",
      fullError: fullErrorString,
      errorStack: error instanceof Error ? error.stack : undefined,
      // Log all error properties
      errorKeys: error && typeof error === "object" ? Object.keys(error) : [],
      // AWS SDK specific error details
      awsErrorDetails: (error as any)?.$metadata
        ? {
            httpStatusCode: (error as any).$metadata.httpStatusCode,
            requestId: (error as any).$metadata.requestId,
            extendedRequestId: (error as any).$metadata.extendedRequestId,
            cfId: (error as any).$metadata.cfId,
            attempts: (error as any).$metadata.attempts,
            totalRetryDelay: (error as any).$metadata.totalRetryDelay
          }
        : undefined
    });

    // Also log the raw error for debugging
    logger.error("Raw error object", {
      error,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorPrototype: Object.getPrototypeOf(error)?.constructor?.name
    });

    throw error;
  }
}

/**
 * Helper function to enqueue cache invalidation job
 */
export async function enqueueCacheInvalidation(
  namespace: string,
  prefix?: string,
  reason?: string
): Promise<string> {
  return enqueueJob({
    jobType: "INVALIDATE_CACHE",
    payload: { namespace, prefix, reason },
    messageGroupId: `cache-${namespace}`
  });
}

/**
 * Helper function to enqueue materialized view refresh job
 */
export async function enqueueMaterializedViewRefresh(
  viewName: string,
  concurrently: boolean = false
): Promise<string> {
  return enqueueJob({
    jobType: "UPDATE_MATERIALIZED_VIEW",
    payload: { viewName, concurrently },
    messageGroupId: "materialized-views"
  });
}

/**
 * Helper function to enqueue data sync job
 */
export async function enqueueDataSync(
  syncType: "stores" | "programs" | "distributors" | "manufacturers",
  entityIds?: number[],
  fullSync: boolean = false
): Promise<string> {
  return enqueueJob({
    jobType: "SYNC_DATA",
    payload: { syncType, entityIds, fullSync },
    messageGroupId: `sync-${syncType}`
  });
}

/**
 * Helper function to enqueue program enrollment job
 */
export async function enqueueProgramEnrollment(
  storeId: number,
  programId: number,
  userId: number,
  reason?: string
): Promise<string> {
  return enqueueJob({
    jobType: "ENROLL_STORE",
    payload: { storeId, programId, userId, reason },
    messageGroupId: `enrollment-${programId}`
  });
}

/**
 * Helper function to enqueue program unenrollment job
 */
export async function enqueueProgramUnenrollment(
  storeId: number,
  programId: number,
  userId: number,
  reason?: string
): Promise<string> {
  return enqueueJob({
    jobType: "UNENROLL_STORE",
    payload: { storeId, programId, userId, reason },
    messageGroupId: `enrollment-${programId}`
  });
}

/**
 * Helper function to enqueue store program enrollment changed event
 * This consolidates enrollment and unenrollment into a single orchestrated event
 */
export async function enqueueStoreProgramEnrollmentChanged(
  storeId: number,
  programIds: number[],
  action: "enroll" | "unenroll",
  userId: number,
  manufacturerId: number,
  options?: {
    reason?: string;
    warehouseId?: number;
    distributorId?: number;
  }
): Promise<string> {
  return enqueueJob({
    jobType: "STORE_PROGRAM_ENROLLMENT_CHANGED",
    payload: {
      storeId,
      programIds,
      action,
      userId,
      manufacturerId,
      reason: options?.reason,
      warehouseId: options?.warehouseId,
      distributorId: options?.distributorId
    },
    messageGroupId: `enrollment-store-${storeId}`
  });
}
