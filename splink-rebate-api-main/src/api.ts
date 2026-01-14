import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import logger from "./lib/logger";
import routes from "./routes";
import v2Routes from "./routes/v2";
import setupSwagger from "./swagger";
import swaggerDocs from "./swagger";
import { sendErrorResponse } from "./utils/responseHandler";
import { newRelicMiddleware } from "./middleware/newRelicMiddleware";
import { syncDatabase } from "./syncDatabase";
import "./utils/redis"; // Import Redis but don't need the client directly here

/**
 * Start the Express API server
 * This is the main API mode of the application
 */
export async function startAPI(): Promise<void> {
  await syncDatabase();

  const app = express();
  const PORT = process.env.PORT || 3000;

  /*
   * Rate Limited is temporally disabled due to the fact
   * that it's not working properly with the current setup.
   */
  // Rate limit for the API
  // const limiterConfig = createRateLimitConfig(15, 100);
  // const limiter = rateLimit(limiterConfig);
  // Apply rate limiter middleware to all routes
  // app.use(limiter);

  // Use CORS with default settings
  app.use(cors());

  // Middleware to parse JSON request bodies
  app.use(express.json());

  // Middleware to parse URL-encoded request bodies
  app.use(express.urlencoded({ extended: true }));

  // Add New Relic middleware before other routes
  app.use(newRelicMiddleware);

  // Health check endpoint for ECS/ALB
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "api"
    });
  });

  app.use("/api/v1", routes);

  // Register v2 routes
  app.use("/api/v2", v2Routes);

  // uncomment this to create postman collection with req to /api/v1/swagger.json
  app.get("/api/v1/swagger.json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDocs);
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (!err) {
      return next();
    }

    sendErrorResponse(res, err.message || "Internal server error", 500);
  });

  // Use Swagger
  setupSwagger(app);

  // Start the server
  app.listen(PORT, () => {
    logger.info(`Server running at http://localhost:${PORT}/`);
  });
}
