import { Request, Response } from "express";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { ApiError } from "../../lib/errors/APIError";
import ProgramApprovalService from "../../services/ProgramApproval/ProgramApprovalService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../../utils/responseHandler";
import { getDistributorIdAsRole } from "../../utils/roles";

class ProgramApprovalController {
  /**
   * Get all programs pending approval for a distributor
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */
  public async getPendingApprovalPrograms(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Get the distributor ID from the user
      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      if (!distributorId || isNaN(Number(distributorId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      // Get pagination parameters from query
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      // Get the pending approval programs
      const result = await ProgramApprovalService.getPendingApprovalPrograms({
        distributorId: Number(distributorId),
        page,
        limit
      });

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Get program details for approval
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */
  public async getProgramDetailsForApproval(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Get the distributor ID from the user
      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      if (!distributorId || isNaN(Number(distributorId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      // Get the program ID from the request parameters
      const { programId } = req.params;

      if (!programId || isNaN(Number(programId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.PROGRAM_ID);
      }

      // Get the program details for approval
      const programDetails =
        await ProgramApprovalService.getProgramDetailsForApproval({
          distributorId: Number(distributorId),
          programId: Number(programId)
        });

      return sendSuccessResponse(res, programDetails);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Approve a program or enroll a store in a program
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */
  public async approveProgram(req: Request, res: Response): Promise<Response> {
    try {
      const { programId, programDetailId, notes } = req.body;

      if (!programId || isNaN(Number(programId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.PROGRAM_ID);
      }

      if (programDetailId && isNaN(Number(programDetailId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.PROGRAM_DETAIL_ID);
      }

      // Use the service method with role-based logic
      const result = await ProgramApprovalService.handleProgramAction({
        user: req.user,
        role: req.user.role,
        programId: Number(programId),
        programDetailId: programDetailId ? Number(programDetailId) : undefined,
        notes
      });

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Opt out of a program for a store
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */
  public async optOutProgram(req: Request, res: Response): Promise<Response> {
    try {
      const { programId, notes } = req.body;
      const storeId = req.user.associatedUserId;

      if (!programId || isNaN(Number(programId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.PROGRAM_ID);
      }

      if (!storeId || isNaN(Number(storeId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.STORE_ID);
      }

      // Ensure user is a store
      if (req.user.role !== ENTITY_TYPE.STORE) {
        throw ApiError.badRequest("Only stores can opt out of programs");
      }

      const result = await ProgramApprovalService.optOutProgram({
        storeId: Number(storeId),
        programId: Number(programId),
        notes
      });

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Reject a program
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */
  public async rejectProgram(req: Request, res: Response): Promise<Response> {
    try {
      // Get the distributor ID from the user
      const distributorId = getDistributorIdAsRole(req.user, req.user.role);

      if (!distributorId) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
      }

      // Get the program ID and notes from the request body
      const { programId, programDetailId, notes } = req.body;

      if (!programId || isNaN(Number(programId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.PROGRAM_ID);
      }

      if (programDetailId && isNaN(Number(programDetailId))) {
        throw ApiError.badRequest(ERROR_MESSAGES.REQUIRED.PROGRAM_DETAIL_ID);
      }

      // Reject the program
      const result = await ProgramApprovalService.rejectProgram({
        distributorId: Number(distributorId),
        programId: Number(programId),
        programDetailId: programDetailId ? Number(programDetailId) : undefined,
        notes
      });

      return sendSuccessResponse(res, result);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }
}

export default new ProgramApprovalController();
