import { ApiError } from "../lib/errors/APIError";

/**
 * Validates enrollment parameters for store enrollment/unenrollment
 * @param action - The enrollment action ("enroll" or "unenroll")
 * @param storeId - The store ID
 * @param manufacturerId - The manufacturer ID
 * @param programIds - The program IDs array (optional for unenroll)
 * @throws ApiError if validation fails
 */
export const validateEnrollmentParameters = (
  action: "enroll" | "unenroll",
  storeId: number,
  manufacturerId: number,
  programIds?: number[]
): void => {
  if (!action || !["enroll", "unenroll"].includes(action)) {
    throw ApiError.badRequest(`Invalid action: ${action}`);
  }

  if (!storeId || isNaN(storeId) || storeId <= 0) {
    throw ApiError.badRequest("Invalid store ID");
  }

  if (!manufacturerId || isNaN(manufacturerId) || manufacturerId <= 0) {
    throw ApiError.badRequest("Invalid manufacturer ID");
  }

  if (action === "enroll" && (!programIds || programIds.length === 0)) {
    throw ApiError.badRequest("Program IDs are required for enrollment");
  }
};
