import pino from "pino";
import fs from "fs";
import path from "path";
import pretty from "pino-pretty";

/**
 * Detect if running in CloudWatch/ECS environment
 * CloudWatch automatically captures stdout/stderr, so we output JSON there
 * Only check for actual AWS execution environments, not just AWS_REGION (which might be set locally)
 */
const isCloudWatch = !!(
  (
    process.env.AWS_EXECUTION_ENV || // ECS Fargate
    process.env.ECS_CONTAINER_METADATA_URI || // ECS container
    process.env.AWS_LAMBDA_FUNCTION_NAME || // Lambda
    (process.env.AWS_REGION && process.env.NODE_ENV === "production")
  ) // Only in production with AWS_REGION
);

/**
 * Check if stdout is a TTY (terminal)
 * When false, we're in a container/CloudWatch and should output JSON
 */
const isTTY = process.stdout.isTTY;

/**
 * Determine if we should use pretty printing
 * Use pretty printing when:
 * - We have a TTY (terminal) AND we're not in CloudWatch, OR
 * - NODE_ENV is explicitly set to something other than "production"
 */
const usePrettyPrint =
  (isTTY && !isCloudWatch) || process.env.NODE_ENV !== "production";

// Pino logger configuration
const pinoConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  base: null, // Remove pid and hostname from logs
  timestamp: pino.stdTimeFunctions.isoTime // ISO 8601 timestamps for CloudWatch
};

// Configure streams based on environment
let logger: pino.Logger;

if (usePrettyPrint) {
  // Local development: Use pretty printing for terminal + file logging
  const logsDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFilePath = path.join(logsDir, "app.log");
  const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

  const prettyStream = pretty({
    colorize: true,
    translateTime: "SYS:standard",
    ignore: "pid,hostname"
  });

  logger = pino(
    pinoConfig,
    pino.multistream([
      { stream: prettyStream, level: process.env.LOG_LEVEL || "info" },
      { stream: logStream, level: process.env.LOG_LEVEL || "info" }
    ])
  );
} else {
  // CloudWatch/Production: Output JSON directly to stdout
  // CloudWatch automatically captures stdout/stderr, so structured JSON logs
  // will be fully captured with all metadata
  logger = pino(pinoConfig, process.stdout);
}

export default logger;
