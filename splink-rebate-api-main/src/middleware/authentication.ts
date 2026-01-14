import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpStatus } from "../config/HttpStatus";
import { ENTITY_TYPE } from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";

export interface JWTPayload {
  id: string;
  role: ENTITY_TYPE;
  distributorId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware to authenticate incoming requests.
 *
 * This middleware verifies the JWT token in the Authorization header and
 * extracts the user data from the token. If the token is invalid or missing,
 * an error response is returned.
 *
 * @returns A middleware function for authentication.
 */
export const authenticate = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract the Authorization header from the request
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        // Return an error response if the Authorization header is missing
        res.status(HttpStatus.UNAUTHORIZED).json({
          message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
        });
        return;
      }

      // Extract the token from the Authorization header
      const token = authHeader.split(" ")[1];

      if (!token) {
        // Return an error response if the token is missing
        res.status(HttpStatus.UNAUTHORIZED).json({
          message: "No token provided"
        });
        return;
      }

      try {
        // Verify the token and extract the user data
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET!
        ) as JWTPayload;

        req.user = decoded;
        next();
      } catch (error) {
        // Handle invalid tokens
        if (error instanceof jwt.JsonWebTokenError) {
          res.status(HttpStatus.UNAUTHORIZED).json({
            message: "Invalid token"
          });
          return;
        }

        // Handle expired tokens
        if (error instanceof jwt.TokenExpiredError) {
          res.status(HttpStatus.UNAUTHORIZED).json({
            message: "Token expired"
          });
          return;
        }

        // Rethrow other errors
        throw error;
      }
    } catch (error) {
      // Catch any other errors and pass to the next middleware
      next(error);
    }
  };
};
