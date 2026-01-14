import { Request, Response } from "express";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { ApiError } from "../../lib/errors/APIError";
import createProgramService from "../../services/Programs/CreateProgramService";
import updateProgramService from "../../services/Programs/UpdateProgramService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../../utils/responseHandler";
import {
  isDistributorAdmin,
  isManufacturerAdmin,
  isManufacturerAdminAndExecutive
} from "../../utils/roles";
import {
  validateCreateProgram,
  validateUpdateProgram
} from "../../validators/programValidator";

class CreateProgramController {
  /**
   * Handles the creation of a new program
   * @param req Express request object
   * @param res Express response object
   * @returns Response with created program data or error
   */
  public handle = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { error, value } = validateCreateProgram(req.body);
      if (error) {
        throw ApiError.badRequest(
          error.details
            .map((detail) => detail?.context?.message || detail?.message)
            .join(", ")
        );
      }

      if (
        !isManufacturerAdmin(req?.user?.role) &&
        !isDistributorAdmin(req?.user?.role)
      ) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      if (isDistributorAdmin(req?.user?.role)) {
        if (!value.manufacturer_id || isNaN(value.manufacturer_id)) {
          throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID);
        }
      }

      const creatorId = req.user?.associatedUserId;
      if (!creatorId || isNaN(creatorId)) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const program = await createProgramService.execute({
        ...value,
        creator_id: creatorId,
        manufacturer_id: isManufacturerAdmin(req?.user?.role)
          ? creatorId
          : value.manufacturer_id,
        creator_type: isManufacturerAdmin(req?.user?.role)
          ? ENTITY_TYPE.MANUFACTURER
          : ENTITY_TYPE.DISTRIBUTOR
      });

      return sendSuccessResponse(res, program);
    } catch (error: any) {
      console.log("Error creating program:", error);
      return sendErrorResponse(
        res,
        error?.message || "Internal server error",
        error?.statusCode || 500
      );
    }
  };

  /**
   * Handles the update of an existing program
   * @param req Express request object
   * @param res Express response object
   * @returns Response with updated program data or error
   */
  public updateProgram = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      if (!req.body.program_id) {
        throw ApiError.badRequest("Program ID is required");
      }

      const { error, value } = validateUpdateProgram(req.body);
      if (error) {
        throw ApiError.badRequest(error.details[0].message);
      }

      if (!isManufacturerAdminAndExecutive(req?.user?.role)) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const manufacturerId =
        req?.user?.role == ENTITY_TYPE.MANUFACTURER
          ? req.user?.associatedUserId
          : req.user?.parentEntityId;
      if (!manufacturerId || isNaN(manufacturerId)) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const program = await updateProgramService.execute({
        ...value,
        creator_id: manufacturerId,
        creator_type: "MANUFACTURER"
      });

      return sendSuccessResponse(res, program);
    } catch (error: any) {
      console.error("Error updating program:", error);
      return sendErrorResponse(
        res,
        error?.message || "Internal server error",
        error?.statusCode || 500
      );
    }
  };
}

export default new CreateProgramController();
