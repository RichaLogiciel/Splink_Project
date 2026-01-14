import { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { ApiError } from "../../lib/errors/APIError";
import LoginRelatedAccountsRepository from "../../repositories/LoginRelatedAccountsRepository";
import UserRepository from "../../repositories/UserRepository";
import AuthService from "../../services/AuthService";
import { validateEmail } from "../../utils/helpers";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../../utils/responseHandler";

export const getLoginRateLimiterKey = (req: Request): string => {
  return req.body.email || req.ip;
};

export const loginRateLimiter: any = rateLimit({
  windowMs: 15, // 15 seconds
  max: 5, // Limit each IP or user (customizable) to 5 requests per window
  message: {
    status: 429,
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getLoginRateLimiterKey
});

export class AuthController {
  /**
   * Logs in a user.
   *
   * @param req - The incoming HTTP request.
   * @param res - The outgoing HTTP response.
   */
  public async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH.EMAIL_PASSWORD_REQUIRED,
          400
        );
      }

      // Call the login method on the AuthService
      const result = await AuthService.login(email, password, rememberMe);

      // Reset failed attempts to 0 after successful attempt
      if (loginRateLimiter.resetKey) {
        loginRateLimiter.resetKey(getLoginRateLimiterKey(req));
      }

      // Check if the user data is valid
      if (!result?.user?.id) {
        throw ApiError.internal("Invalid user data in login result");
      }

      try {
        const relatedUsers = await UserRepository.getRelatedUsersDetails(
          result.user.id
        );
        const response = {
          ...result,
          relatedUsers
        };
        return sendSuccessResponse(res, response);
      } catch (error) {
        // Log the error but don't fail the login
        console.error("Failed to fetch related users:", error);
        const response = {
          ...result,
          relatedUsers: []
        };
        return sendSuccessResponse(res, response);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";

      return sendErrorResponse(res, errorMessage, 401);
    }
  }

  /**
   * Logs in a user with UserID.
   *
   * @param req - The incoming HTTP request.
   * @param res - The outgoing HTTP response.
   */
  public async loginWithID(req: Request, res: Response): Promise<Response> {
    try {
      const { user } = req;
      const { userID } = req.params;

      if (!userID || isNaN(Number(userID))) {
        throw ApiError.badRequest(ERROR_MESSAGES.AUTH.USER_ID_REQUIRED);
      }

      if (!user) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      const currentUserID = user.id.toString();

      const relatedAccount =
        await LoginRelatedAccountsRepository.getAllRelatedUserAccounts(
          Number(currentUserID)
        );

      const isRelatedAccountSwitch = relatedAccount.includes(Number(userID));

      if (user.role !== ENTITY_TYPE.SUPER_ADMIN && !isRelatedAccountSwitch) {
        throw ApiError.authorizationFailed(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      }

      // Call the login method on the AuthService
      const result = await AuthService.loginWithID(Number(userID));

      // Check if the user data is valid
      if (!result?.user?.id) {
        throw ApiError.internal("Invalid user data in login result");
      }

      try {
        const relatedUsers = await UserRepository.getRelatedUsersDetails(
          result.user.id
        );
        const response = {
          ...result,
          relatedUsers
        };
        return sendSuccessResponse(res, response);
      } catch (error) {
        // Log the error but don't fail the login
        console.error("Failed to fetch related users:", error);
        const response = {
          ...result,
          relatedUsers: []
        };
        return sendSuccessResponse(res, response);
      }
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      return sendErrorResponse(res, errorMessage, error?.statusCode || 401);
    }
  }

  /**
   * Refreshes an access token using a refresh token.
   *
   * @param req - The incoming HTTP request.
   * @param res - The outgoing HTTP response.
   */
  public async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      // Check if the refresh token is missing
      if (!refreshToken) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH.REFRESH_TOKEN_REQUIRED,
          400
        );
      }

      const result = await AuthService.refreshToken(refreshToken);

      return sendSuccessResponse(res, result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Token refresh failed";

      return sendErrorResponse(res, errorMessage, 401);
    }
  }

  public async inviteUsers(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED,
          401
        );
      }

      // Extract the email addresses from the request body
      const { emails: inviteUsersList } = req.body;

      const invitationPermissionErr = AuthService.validateInvitationRoles(
        req.user.role,
        inviteUsersList
      );

      if (invitationPermissionErr) {
        return sendErrorResponse(res, invitationPermissionErr, 422);
      }

      // Call the service function to invite users
      await AuthService.inviteUsers(inviteUsersList, req.user);

      // Respond with a success message
      return sendSuccessResponse(res, {
        message: "Invitations sent successfully"
      });
    } catch (error: any) {
      // Handle any errors that occur during the process
      const errorMessage =
        error instanceof Error ? error.message : "Send invitation failed";

      return sendErrorResponse(res, errorMessage, 422);
    }
  }

  public async inviteExistingUser(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { role } = req.body;

      if (!role) {
        throw new Error("Role is required");
      }
      console.log("req.body", req.body);

      await AuthService.inviteExistingUser(req);

      return sendSuccessResponse(res, {
        message: "Invitations sent successfully"
      });
    } catch (error: any) {
      // Handle any errors that occur during the process
      const errorMessage =
        error instanceof Error ? error.message : "Send invitation failed";

      return sendErrorResponse(res, errorMessage, 401);
    }
  }

  public async cancelUserInvitation(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { userId, chainId } = req.body;
      const { id } = req.user;
      await AuthService.cancelUserInvite(userId, id, chainId);

      return sendSuccessResponse(res, {
        message: "Invitations have been successfully canceled"
      });
    } catch (error: any) {
      // Handle any errors that occur during the process
      const errorMessage =
        error instanceof Error
          ? error.message
          : "We were unable to process your request to cancel the invitation. Please try again later or contact support if the issue persists.";

      return sendErrorResponse(res, errorMessage, 412);
    }
  }

  /**
   * Handles user signup by extracting user details from the request body,
   * creating a new user via the AuthService, and sending a success response.
   * If an error occurs, sends an error response with the appropriate status code.
   *
   * @param req - The incoming HTTP request containing user signup details.
   * @param res - The outgoing HTTP response.
   * @returns A promise that resolves to an HTTP response.
   */
  public async signup(req: Request, res: Response): Promise<Response> {
    try {
      const {
        token = "",
        email,
        firstName,
        lastName,
        phones,
        password,
        address,
        city,
        state,
        zip,
        logo,
        title,
        orgName,
        storeName
      } = req.body;

      const params: any = {
        token,
        firstName,
        lastName,
        phones,
        password
      };
      if (address) params.address = address;
      if (city) params.city = city;
      if (state) params.state = state;
      if (zip) params.zip = zip;
      if (logo) params.logo = logo;
      if (email) params.email = email.toLowerCase();
      if (title) params.title = title;
      if (orgName) params.orgName = orgName;
      if (storeName) params.storeName = storeName;

      // Call the service function to create User
      await AuthService.signup(params);

      // // Respond with a success message
      // return sendSuccessResponse(res, {
      //   message: "Signup successful"
      // });

      // Call the login method on the AuthService
      const result = await AuthService.login(email, password, false);

      try {
        const relatedUsers = await UserRepository.getRelatedUsersDetails(
          result.user.id
        );
        const response = {
          ...result,
          relatedUsers
        };
        return sendSuccessResponse(res, response);
      } catch (error) {
        // Log the error but don't fail the login
        console.error("Failed to fetch related users:", error);
        const response = {
          ...result,
          relatedUsers: []
        };
        return sendSuccessResponse(res, response);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Signup failed";

      return sendErrorResponse(res, errorMessage, 422);
    }
  }

  public async getInvitedExistingUser(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { token } = req.query as { token: string };

      const invitation = await AuthService.getInvitation(token);

      let user = null;

      switch (invitation.role) {
        case ENTITY_TYPE.STORE:
          user = await AuthService.getInvitedStore(invitation.email);
          break;

        case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
          user = await AuthService.getInvitedSalesRep(invitation.invited_user);
          break;

        case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
          user = await AuthService.getInvitedGeneralManager(
            invitation.invited_user
          );
          break;

        case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
          user = await AuthService.getInvitedSalesManager(
            invitation.invited_user
          );
          break;

        case ENTITY_TYPE.CHAIN_ADMIN:
          user = await AuthService.getInvitedChain(invitation.invited_user);
          break;
      }

      return sendSuccessResponse(res, { invitation, user });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Cannot fetch User";

      return sendErrorResponse(res, errorMessage, 422);
    }
  }
  /**
   * Retrieves an invitation using a token from the request body.
   * Calls the AuthService to fetch the invitation details and sends a success response.
   * If an error occurs, sends an error response with a status code of 422.
   *
   * @param req - The incoming HTTP request containing the token.
   * @param res - The outgoing HTTP response.
   * @returns A promise that resolves to an HTTP response.
   */
  public async getInvitation(req: Request, res: Response): Promise<Response> {
    try {
      // Extract the token from the request body
      const { token } = req.query as { token: string };

      // Call the service function to get invitation object
      const invitation = await AuthService.getInvitation(token);

      // Respond with a success message
      return sendSuccessResponse(res, {
        data: invitation
      });
    } catch (error: any) {
      // Handle any errors that occur during the process
      const errorMessage =
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

      return sendErrorResponse(res, errorMessage, 422);
    }
  }

  /**
   * Sends a reset password email to the user.
   *
   * @param req - The incoming HTTP request.
   * @param res - The outgoing HTTP response.
   * @returns A promise that resolves to an HTTP response.
   */
  public async sendForgetPasswordEmail(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email || !validateEmail(email)) {
        return sendErrorResponse(res, ERROR_MESSAGES.AUTH.INVALID_EMAIL, 400);
      }

      // Send reset password email
      await AuthService.sendResetPasswordEmail(email);

      return sendSuccessResponse(res, {
        message: "Email sent! Follow the link to reset your password."
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send reset password email. Please try again later.";

      return sendErrorResponse(res, errorMessage, 500);
    }
  }

  /**
   * Validates the reset password token.
   *
   * @param req - The incoming HTTP request.
   * @param res - The outgoing HTTP response.
   * @returns A promise that resolves to an HTTP response.
   */
  public async validatePasswordResetToken(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      // Extract the token from the request body
      const { token } = req.query as { token: string };

      if (!token) {
        return sendErrorResponse(res, ERROR_MESSAGES.AUTH.INVALID_TOKEN, 400);
      }

      // Call the validatePasswordResetToken method on the AuthService
      const isValid = await AuthService.validatePasswordResetToken(token);

      if (isValid) {
        return sendSuccessResponse(res, { message: "Token is valid" });
      } else {
        return sendErrorResponse(res, ERROR_MESSAGES.AUTH.INVALID_TOKEN, 401);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.AUTH.INVALID_TOKEN;

      return sendErrorResponse(res, errorMessage, 401);
    }
  }

  /**
   * Resets the user's password.
   *
   * @param req - The incoming HTTP request.
   * @param res - The outgoing HTTP response.
   * @returns A promise that resolves to an HTTP response.
   */
  public async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.AUTH.TOKEN_PASSWORD_REQUIRED,
          400
        );
      }

      // Call the resetPassword method on the AuthService
      await AuthService.resetPassword(token, newPassword);

      return sendSuccessResponse(res, { message: "Password reset successful" });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.AUTH.PASSWORD_UPDATE;

      return sendErrorResponse(res, errorMessage, 401);
    }
  }

  /**
   * Replaces the email invite for a user.
   *
   * @param req - The incoming HTTP request.
   * @param res - The outgoing HTTP response.
   * @returns A promise that resolves to an HTTP response.
   */
  public async replaceEmailInvite(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { oldEmail, newEmail } = req.body;

      if (!oldEmail || !newEmail) {
        return sendErrorResponse(res, ERROR_MESSAGES.AUTH.REPLACE_EMAIL, 400);
      }

      // Call the resetPassword method on the AuthService
      await AuthService.replaceEmailInvite(oldEmail, newEmail.toLowerCase());

      return sendSuccessResponse(res, { message: "Update email successful" });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.AUTH.REPLACE_EMAIL_UPDATE;

      return sendErrorResponse(res, errorMessage, 401);
    }
  }
}

export default new AuthController();
