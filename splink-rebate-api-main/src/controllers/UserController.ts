import { Request, Response } from "express";
import UserService from "../services/UserService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";

import { ENTITY_TYPE } from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import UserMetaRepository from "../repositories/UserMetaRepository";
import { validatePassword } from "../utils/userHelper";

class UserController {
  /**
   * Retrieves profile details for a specific user.
   *
   * @param {Request} req - The incoming HTTP request containing the user ID as a query parameter.
   * @param {Response} res - The outgoing HTTP response <UserType> to be sent back to the client.
   * @returns A promise that resolves with the user's profile details or an error message if the request fails.
   */
  public async getProfileDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id: userId, role } = req.user;

    if (!userId) {
      return sendErrorResponse(res, ERROR_MESSAGES.REQUIRED.USER_ID, 400);
    }

    try {
      const response = await UserService.getProfileDetails(
        Number(userId),
        role
      );

      if (response.status == 200) {
        // Return the key metrics in the response
        return sendSuccessResponse(res, response);
      } else {
        const message = response.data as string;

        // Return an error response if the request fails
        return sendErrorResponse(res, message, response.status);
      }
    } catch {
      // Return an error response if the request fails
      return sendErrorResponse(
        res,
        ERROR_MESSAGES.COMMON.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieves all users related to a specific parent entity ID with pagination.
   * @param {Request} req The incoming HTTP request containing the parent entity ID and pagination parameters.
   * @param {Response} res The outgoing HTTP response containing the list of users.
   * @returns A promise that resolves with the list of users or an error message if the request fails.
   */
  public async getUsers(req: Request, res: Response): Promise<Response> {
    const { currentPage, pageLimit, searchQuery, sort, status, type } =
      req.query;
    const { role } = req.user;

    const page = parseInt(currentPage as string, 10) || 1;
    const limit = parseInt(pageLimit as string, 10) || 10;

    try {
      const { users, totalPages, totalRes } = await UserService.getUsers(
        role,
        req.user,
        page,
        limit,
        sort as string,
        searchQuery as string,
        status as string,
        type as string
      );

      return sendSuccessResponse(res, {
        users,
        currentPage: page,
        totalPages: totalPages || 0,
        totalRes: totalRes || 0
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

      return sendErrorResponse(res, errorMessage, 500);
    }
  }

  // Profile user Profile
  public async updateProfileDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    const postBody = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return sendErrorResponse(res, ERROR_MESSAGES.REQUIRED.USER_ID, 400);
    }

    const role = req.user.role;

    try {
      const response = await UserService.updateProfileDetails(postBody, role);

      if (response) {
        // Return the key metrics in the response
        return sendSuccessResponse(res, response);
      } else {
        // Return an error response if the request fails
        return sendErrorResponse(res, "Unable to update Account details", 500);
      }
    } catch (error: any) {
      // Return an error response if the request fails
      return sendErrorResponse(
        res,
        error?.message || ERROR_MESSAGES.COMMON.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Update User Password
  public async updateUserPassword(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { currentPassword, password, confirmPassword } = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return sendErrorResponse(res, ERROR_MESSAGES.REQUIRED.USER_ID, 400);
    }

    if (!currentPassword || !password || !confirmPassword) {
      return sendErrorResponse(res, ERROR_MESSAGES.COMMON.BAD_REQUEST, 400);
    }

    if (confirmPassword != password) {
      return sendErrorResponse(
        res,
        ERROR_MESSAGES.AUTH.PASSWORD.CONFIRM_PASS_NOT_MATCH,
        400
      );
    }

    // Validate the new password
    const passwordValidationMessage = validatePassword(password);
    if (passwordValidationMessage !== true) {
      return sendErrorResponse(res, passwordValidationMessage as string, 400);
    }

    try {
      const response = await UserService.updateUserPassword(
        userId,
        currentPassword,
        password
      );

      if (response) {
        // Return the key metrics in the response
        return sendSuccessResponse(res, response);
      } else {
        // Return an error response if the request fails
        return sendErrorResponse(res, "Unable to update Account password", 500);
      }
    } catch (error: any) {
      // Return an error response if the request fails
      return sendErrorResponse(
        res,
        error?.message || ERROR_MESSAGES.COMMON.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Logs out a user.
   *
   * @param req - The incoming HTTP request.
   * @param res - The outgoing HTTP response.
   */
  public async logout(req: Request, res: Response): Promise<Response> {
    try {
      const { id: userId } = req.user || {};

      if (!userId) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED,
          400
        );
      }

      // Call the logout method on the AuthService
      await UserService.logout(userId);

      return sendSuccessResponse(res, { message: "Successfully logged out" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Logout failed";

      return sendErrorResponse(res, errorMessage, 401);
    }
  }

  /**
   * Updates the ordering feature preference for the current user.
   * Only available for DISTRIBUTOR_SALES_REP users.
   *
   * @param {Request} req - The incoming HTTP request containing the enabled flag in body.
   * @param {Response} res - The outgoing HTTP response.
   * @returns A promise that resolves with success response or error message.
   */
  public async updateOrderingFeaturePreference(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { associatedUserId, role } = req.user;

      if (!associatedUserId) {
        return sendErrorResponse(res, "Associated user ID is required", 400);
      }

      // Validate user role is DISTRIBUTOR_SALES_REP
      if (role !== ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
        return sendErrorResponse(
          res,
          "Ordering feature preference can only be updated for sales representatives",
          403
        );
      }

      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        return sendErrorResponse(
          res,
          "Invalid request: 'enabled' must be a boolean value",
          400
        );
      }

      // Update user_meta table
      await UserMetaRepository.setUserMeta(
        associatedUserId,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        "ENABLE_ORDER_FEATURE",
        enabled.toString()?.toUpperCase()
      );

      return sendSuccessResponse(res, {
        message: "Ordering feature preference updated successfully",
        enabled
      });
    } catch (error) {
      console.error("Error updating ordering feature preference:", error);
      return sendErrorResponse(
        res,
        ERROR_MESSAGES.COMMON.INTERNAL_SERVER_ERROR,
        500
      );
    }
  }
}

export default new UserController();
