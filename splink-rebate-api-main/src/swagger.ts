import swaggerJsDoc, { Options } from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Define the Swagger options
const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Splink",
      version: "1.0.0",
      description: "API documentation for Splink"
    },
    servers: [
      {
        url: `${process.env.BASE_URL}:${process.env.PORT || 3000}/api/v1` // server URL
      }
    ]
  },
  apis: ["./src/routes/*.ts"] // Path to API docs
};

let swaggerDocs: any;
try {
  swaggerDocs = swaggerJsDoc(swaggerOptions);
} catch (error) {
  console.error("Failed to generate Swagger documentation:", error);
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  }
  // Create a minimal swagger doc to prevent app crash
  swaggerDocs = {
    openapi: "3.0.0",
    info: {
      title: "Splink",
      version: "1.0.0",
      description: "API documentation for Splink (Swagger generation failed)"
    },
    paths: {}
  };
}

const setupSwagger = (app: Express): void => {
  app.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};

export default setupSwagger;
