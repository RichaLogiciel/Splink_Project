import express, { Request, Response } from "express";
import logger from "../lib/logger";
import { redisClient } from "../utils/redis";
import sequelize from "../db";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database: boolean;
  redis: boolean;
  lastMessageProcessed?: string;
  uptime: number;
  mode: "worker";
}

// Track last message processed timestamp
let lastMessageTimestamp: Date | null = null;
const startTime = Date.now();

/**
 * Update the last message processed timestamp
 * Called after successfully processing each message
 */
export function updateLastMessageTimestamp(): void {
  lastMessageTimestamp = new Date();
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.error("Database health check failed", { error });
    return false;
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<boolean> {
  try {
    // Only check if Redis caching is enabled
    if (process.env.USE_API_CACHING === "true") {
      await redisClient.ping();
      return true;
    }
    // If caching not enabled, consider it healthy (not required)
    return true;
  } catch (error) {
    logger.error("Redis health check failed", { error });
    return false;
  }
}

/**
 * Start minimal HTTP server for health checks
 * @param port - Port to listen on (default: 3002)
 */
export function startHealthCheckServer(port: number = 3002): void {
  const app = express();

  // Health check endpoint for ECS
  app.get("/health", async (req: Request, res: Response) => {
    const healthStatus: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: false,
      redis: false,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      mode: "worker"
    };

    // Check database connection
    healthStatus.database = await checkDatabase();

    // Check Redis connection
    healthStatus.redis = await checkRedis();

    // Add last message processed timestamp if available
    if (lastMessageTimestamp) {
      healthStatus.lastMessageProcessed = lastMessageTimestamp.toISOString();
    }

    // Determine overall health status
    if (!healthStatus.database || !healthStatus.redis) {
      healthStatus.status = "unhealthy";
    }

    const statusCode = healthStatus.status === "healthy" ? 200 : 503;

    logger.debug("Health check requested", { healthStatus });

    res.status(statusCode).json(healthStatus);
  });

  // Simple ping endpoint
  app.get("/ping", (req: Request, res: Response) => {
    res.status(200).send("pong");
  });

  app.listen(port, () => {
    logger.info(`Health check server listening on port ${port}`);
  });
}
