import newrelic from "newrelic";
import logger from "../../lib/logger";
import { WorkerError } from "../errors/WorkerError";

export interface EnrollmentPayload {
  storeId: number;
  programId: number;
  userId: number;
  reason?: string;
}

/**
 * Handle program enrollment jobs
 * This is a placeholder implementation that should be expanded
 * to use existing service methods or create new ones
 */
export async function handleProgramEnrollment(
  payload: EnrollmentPayload
): Promise<void> {
  return newrelic.startSegment("ProgramEnrollmentJob", true, async () => {
    logger.info("Processing program enrollment", {
      storeId: payload.storeId,
      programId: payload.programId,
      userId: payload.userId,
      reason: payload.reason
    });

    // Validate required fields
    if (!payload.storeId || !payload.programId || !payload.userId) {
      throw WorkerError.validationFailed(
        "storeId, programId, and userId are required for enrollment"
      );
    }

    try {
      // Import models dynamically to avoid circular dependencies
      const ProgramParticipant = (
        await import("../../models/ProgramParticipant")
      ).default;
      const Store = (await import("../../models/Store")).default;
      const Program = (await import("../../models/Program")).default;
      const { invalidateCache } = await import("../../utils/redis");

      // 1. Validate store exists
      const store = await Store.findByPk(payload.storeId);
      if (!store) {
        throw WorkerError.validationFailed(
          `Store ${payload.storeId} not found`
        );
      }

      // 2. Validate program exists
      const program = await Program.findByPk(payload.programId);
      if (!program) {
        throw WorkerError.validationFailed(
          `Program ${payload.programId} not found`
        );
      }

      // 3. Check if already enrolled
      const existingEnrollment = await ProgramParticipant.findOne({
        where: {
          programId: payload.programId,
          participantId: payload.storeId,
          participantType: "store"
        }
      });

      if (existingEnrollment) {
        logger.info("Store already enrolled in program", {
          storeId: payload.storeId,
          programId: payload.programId
        });
        return; // Idempotent - not an error
      }

      // 4. Create enrollment record
      await ProgramParticipant.create({
        programId: payload.programId,
        participantId: payload.storeId,
        participantType: "store"
      });

      // 5. Invalidate relevant caches
      await invalidateCache("program", `byId:${payload.programId}`);
      await invalidateCache("store", `byId:${payload.storeId}`);
      await invalidateCache("program", "participants");

      logger.info("Program enrollment completed successfully", {
        storeId: payload.storeId,
        programId: payload.programId
      });

      // Add custom attributes to New Relic
      newrelic.addCustomAttributes({
        jobType: "ENROLL_STORE",
        storeId: payload.storeId,
        programId: payload.programId,
        userId: payload.userId
      });
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }

      logger.error("Program enrollment failed", {
        storeId: payload.storeId,
        programId: payload.programId,
        error
      });

      throw WorkerError.processingFailed(
        `Failed to enroll store ${payload.storeId} in program ${payload.programId}`,
        true // Retryable
      );
    }
  });
}

/**
 * Handle program unenrollment jobs
 * This is a placeholder implementation that should be expanded
 */
export async function handleProgramUnenrollment(
  payload: EnrollmentPayload
): Promise<void> {
  return newrelic.startSegment("ProgramUnenrollmentJob", true, async () => {
    logger.info("Processing program unenrollment", {
      storeId: payload.storeId,
      programId: payload.programId,
      userId: payload.userId,
      reason: payload.reason
    });

    // Validate required fields
    if (!payload.storeId || !payload.programId || !payload.userId) {
      throw WorkerError.validationFailed(
        "storeId, programId, and userId are required for unenrollment"
      );
    }

    try {
      // Import models dynamically
      const ProgramParticipant = (
        await import("../../models/ProgramParticipant")
      ).default;
      const { invalidateCache } = await import("../../utils/redis");

      // 1. Find the enrollment
      const enrollment = await ProgramParticipant.findOne({
        where: {
          programId: payload.programId,
          participantId: payload.storeId,
          participantType: "store"
        }
      });

      if (!enrollment) {
        logger.info("Store not enrolled in program - already unenrolled", {
          storeId: payload.storeId,
          programId: payload.programId
        });
        return; // Idempotent - not an error
      }

      // 2. Remove enrollment record
      await enrollment.destroy();

      // 3. Invalidate relevant caches
      await invalidateCache("program", `byId:${payload.programId}`);
      await invalidateCache("store", `byId:${payload.storeId}`);
      await invalidateCache("program", "participants");

      logger.info("Program unenrollment completed successfully", {
        storeId: payload.storeId,
        programId: payload.programId
      });

      // Add custom attributes to New Relic
      newrelic.addCustomAttributes({
        jobType: "UNENROLL_STORE",
        storeId: payload.storeId,
        programId: payload.programId,
        userId: payload.userId
      });
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }

      logger.error("Program unenrollment failed", {
        storeId: payload.storeId,
        programId: payload.programId,
        error
      });

      throw WorkerError.processingFailed(
        `Failed to unenroll store ${payload.storeId} from program ${payload.programId}`,
        true // Retryable
      );
    }
  });
}
