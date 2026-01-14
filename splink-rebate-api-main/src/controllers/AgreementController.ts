import { Request, Response } from "express";
import { ApiError } from "../lib/errors/APIError";
import logger from "../lib/logger";
import ProgramAgreementService from "../services/ProgramAgreementService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";

class AgreementController {
  /**
   * Get agreements by manufacturer ID(s)
   *
   * @param req - Express request with manufacturerId query parameter
   * @param res - Express response
   * @returns List of agreements with agreementId, agreementName, programId, manufacturerId
   */
  public async getAgreementsByManufacturer(
    req: Request,
    res: Response
  ): Promise<Response> {
    
    try {
      const { manufacturerId, timeline } = req.query;
      
      // Default to "Current" if timeline is not provided or is null/undefined
      const programTimeline = timeline || "Current";
      // Validate required parameter
      if (!manufacturerId) {
        throw ApiError.badRequest("manufacturerId is required");
      }

      // Normalize and validate timeline parameter (case-insensitive)
      // Default to "Current" if not provided
      // Note: programTimeline is already set above, so we just validate it here
      if (timeline) {
        const timelineStr = timeline.toString().trim();
        const timelineLower = timelineStr.toLowerCase();
        const validTimelines = ["current", "historical", "upcoming"];
        if (!validTimelines.includes(timelineLower)) {
          throw ApiError.badRequest(
            'timeline must be one of: "Current", "Historical", or "Upcoming"'
          );
        }
      }

      // Parse comma-separated IDs
      const manufacturerIdsStr = manufacturerId.toString();
      const manufacturerIdsParsed = manufacturerIdsStr
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      // Validate format
      const manufacturerIds = manufacturerIdsParsed.map((id) => {
        const parsed = parseInt(id, 10);
        if (isNaN(parsed) || parsed <= 0) {
          throw ApiError.badRequest(
            `Invalid manufacturerId format: "${id}". Must be positive integer(s).`
          );
        }
        return parsed;
      });

      if (manufacturerIds.length === 0) {
        throw ApiError.badRequest(
          "At least one valid manufacturerId is required"
        );
      }

      logger.info("Fetching agreements for manufacturers", {
        manufacturerIds,
        userId: req.user?.id
      });

      // Extract user context for approval filtering
      const user = req.user
        ? {
            role: req.user.role,
            parentEntityId: req.user.parentEntityId,
            associatedUserId: req.user.associatedUserId
          }
        : undefined;

      // Call service with user context and timeline
      const result = await ProgramAgreementService.getByManufacturerIds(
        manufacturerIds,
        user,
        programTimeline as string
      );

      logger.info("Successfully retrieved agreements", {
        manufacturerIds,
        count: result.count
      });
      
      return sendSuccessResponse(res, result);
    } catch (error: any) {
      logger.error("Error fetching agreements by manufacturer", {
        error: error.message,
        stack: error.stack,
        manufacturerId: req.query.manufacturerId
      });
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }
}

export default new AgreementController();
