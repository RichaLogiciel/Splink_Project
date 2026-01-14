import { Request, Response } from "express";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { ApiError } from "../../lib/errors/APIError";
import ListProgramsService from "../../services/Programs/ListProgramsService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../../utils/responseHandler";
import {
  getParentDistributorId,
  isDistributorSalesRep,
  isStore
} from "../../utils/roles";

class ListProgramsController {
  /**
   * Handles the listing of approved programs
   * @param req Express request object
   * @param res Express response object
   * @returns Response with approved program data or error
   */
  public listStorePrograms = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      if (
        !isStore(req?.user?.role) &&
        !isDistributorSalesRep(req?.user?.role)
      ) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const distributorId = getParentDistributorId(req?.user, req?.user?.role);
      const storeId = isDistributorSalesRep(req?.user?.role)
        ? req?.query.storeId
        : req?.user?.associatedUserId;
      if (
        !distributorId ||
        isNaN(distributorId) ||
        !storeId ||
        isNaN(storeId)
      ) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const programs = await ListProgramsService.getStorePrograms({
        distributorId,
        storeId
      });

      return sendSuccessResponse(res, programs);
    } catch (error: any) {
      return sendErrorResponse(
        res,
        error?.message || "Internal server error",
        error?.statusCode || 500
      );
    }
  };

  /**
   * Handles the retrieval of a program
   * @param req Express request object
   * @param res Express response object
   * @returns Response with program data or error
   */
  public getProgram = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const { program_id, program_detail_id } = req.query;
      if (!program_id || isNaN(Number(program_id))) {
        throw ApiError.badRequest("Program ID is required");
      }

      const program = await ListProgramsService.getProgram(
        Number(program_id),
        program_detail_id ? Number(program_detail_id) : undefined
      );
      return sendSuccessResponse(res, program);
    } catch (error: any) {
      console.error("Error getting program:", error);
      return sendErrorResponse(
        res,
        error?.message || "Internal server error",
        error?.statusCode || 500
      );
    }
  };
}

export default new ListProgramsController();
