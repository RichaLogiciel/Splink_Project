import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, JWTPayload } from "./authentication";

/**
 * Extended request interface to include authentication flag
 */
export interface OptionalAuthenticatedRequest extends AuthenticatedRequest {
  authenticated?: boolean;
}

/**
 * Optional authentication middleware that attempts JWT authentication
 * but doesn't fail if token is missing or invalid.
 *
 * If a valid JWT token is provided, it attaches the user to the request
 * and sets `req.authenticated = true`. If no token or invalid token,
 * continues without error (doesn't set user or authenticated flag).
 *
 * @returns A middleware function for optional authentication
 */
export const optionalAuthenticate = () => {
  return async (
    req: OptionalAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract the Authorization header from the request
      const authHeader = req.headers.authorization;

      // If no authorization header, continue without authentication
      if (!authHeader) {
        return next();
      }

      // Extract the token from the Authorization header
      const token = authHeader.split(" ")[1];

      // If no token in header, continue without authentication
      if (!token) {
        return next();
      }

      try {
        // Verify the token and extract the user data
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET!
        ) as JWTPayload;

        // Token is valid - attach user and set authenticated flag
        req.user = decoded;
        req.authenticated = true;
        next();
      } catch (error) {
        // Token is invalid or expired - continue without authentication
        // Don't throw error, just proceed without setting user
        next();
      }
    } catch (error) {
      // Catch any other errors and continue without authentication
      next();
    }
  };
};
