import { NextFunction, Request, RequestHandler, Response } from "express";
import { HLA_REPORT_DEFAULT_ALLOWED_IPS } from "../config/appConstants";
import { HttpStatus } from "../config/HttpStatus";
import {
  OptionalAuthenticatedRequest,
  optionalAuthenticate
} from "./optionalAuth";

/**
 * Get allowed IPs from environment variable or fallback to constant
 * @returns Array of allowed IP addresses
 */
function getAllowedIPs(): string[] {
  const envIPs = process.env.HLA_REPORT_ALLOWED_IPS;

  if (envIPs) {
    // Parse comma-separated IPs from environment variable
    return envIPs
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);
  }

  // Fallback to constant
  return HLA_REPORT_DEFAULT_ALLOWED_IPS;
}

/**
 * Extract client IP from request
 * Handles various proxy headers and connection info
 * @param req Express request object
 * @returns Client IP address
 */
function getClientIP(req: Request): string {
  // Check various headers that proxies might set
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(",")[0].trim();
    return ips;
  }

  const realIP = req.headers["x-real-ip"];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  // Fallback to connection remote address
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Combined middleware that supports both JWT authentication and IP whitelist
 *
 * Behavior:
 * 1. First attempts optional JWT authentication
 * 2. If authentication succeeds (valid JWT), bypasses IP check and proceeds
 * 3. If authentication fails or no token provided, checks IP whitelist
 * 4. If IP is whitelisted, proceeds
 * 5. If both fail (no valid JWT AND IP not whitelisted), returns 403 Forbidden
 *
 * This allows:
 * - Authenticated users to access from any IP
 * - Unauthenticated requests from whitelisted IPs (cron jobs)
 * - Blocks unauthenticated requests from non-whitelisted IPs
 *
 * @returns Array of middleware functions (optional auth + IP check)
 */
export const authOrIpWhitelist = (): RequestHandler[] => {
  const ipCheckMiddleware: RequestHandler = (
    req: OptionalAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    // If authenticated via JWT, bypass IP check
    if (req.authenticated) {
      next();
      return;
    }

    // Otherwise, check IP whitelist
    const allowedIPs = getAllowedIPs();
    const clientIP = getClientIP(req);

    // If whitelist is empty, allow all (for development/testing)
    // if (
    //   allowedIPs.length === 0 ||
    //   (allowedIPs.length === 1 && allowedIPs[0] === "")
    // ) {
    //   next();
    //   return;
    // }

    // Check for wildcard (allow all)
    if (allowedIPs.includes("*")) {
      next();
      return;
    }

    // Check if client IP is in whitelist
    if (allowedIPs.includes(clientIP)) {
      next();
      return;
    }

    console.log("allowedIPs: ", allowedIPs);
    console.log("clientIP: ", clientIP);
    console.log("req.authenticated: ", req.authenticated);

    // Both authentication and IP check failed - return 403 Forbidden
    res.status(HttpStatus.FORBIDDEN).json({
      status: "error",
      message: "Access denied: IP address not allowed",
      error: "Forbidden"
    });
    return;
  };

  return [
    // First: Attempt optional JWT authentication
    optionalAuthenticate() as RequestHandler,
    // Second: Check IP whitelist if not authenticated
    ipCheckMiddleware
  ];
};
