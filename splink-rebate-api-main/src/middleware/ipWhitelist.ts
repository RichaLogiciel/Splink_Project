import { NextFunction, Request, Response } from "express";
import { HLA_REPORT_DEFAULT_ALLOWED_IPS } from "../config/appConstants";
import { HttpStatus } from "../config/HttpStatus";

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
 * Middleware to check if request IP is in whitelist
 *
 * This middleware validates that the incoming request's IP address
 * is in the allowed whitelist. If not, returns 403 Forbidden.
 *
 * Supports:
 * - Environment variable: HLA_REPORT_ALLOWED_IPS (comma-separated)
 * - Fallback constant: HLA_REPORT_DEFAULT_ALLOWED_IPS
 * - Wildcard '*' to allow all IPs (use with caution)
 * - Localhost/127.0.0.1 for local development
 *
 * @returns A middleware function for IP whitelist checking
 */
export const ipWhitelist = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const allowedIPs = getAllowedIPs();
    const clientIP = getClientIP(req);

    // If whitelist is empty, allow all (for development/testing)
    if (allowedIPs.length === 0) {
      return next();
    }

    // Check for wildcard (allow all)
    if (allowedIPs.includes("*")) {
      return next();
    }

    // Check if client IP is in whitelist
    if (allowedIPs.includes(clientIP)) {
      return next();
    }

    // IP not in whitelist - return 403 Forbidden
    return res.status(HttpStatus.FORBIDDEN).json({
      status: "error",
      message: "Access denied: IP address not allowed",
      error: "Forbidden"
    });
  };
};
