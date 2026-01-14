const { Sequelize } = require("sequelize");
const secretsService = require("./secretsService");

// Connection pool configuration optimized for Lambda
// Reuse connections across Lambda invocations
const poolConfig = {
  max: 5, // Maximum connections in pool (lower for Lambda)
  min: 0, // Minimum connections (0 for Lambda to allow scaling down)
  acquire: 30000, // Maximum time to wait for connection (30 seconds)
  idle: 10000 // Maximum time connection can be idle (10 seconds)
};

// Get database configuration from secrets (with fallback to env vars)
// Note: In Lambda handler, secrets should be loaded first to cache them
// Then getSecretSync will use cached values. For first invocation or local testing, uses env vars.
const getDbConfig = () => {
  return {
    host: secretsService.getSecretSync("DB_HOST"),
    port: parseInt(secretsService.getSecretSync("DB_PORT") || "5432"),
    database: secretsService.getSecretSync("DB_NAME"),
    username: secretsService.getSecretSync("DB_USER"),
    password: secretsService.getSecretSync("DB_PASSWORD"),
    dialect: secretsService.getSecretSync("DB_DIALECT", "postgres"),
    ssl: secretsService.getSecretSync("DB_SSL") === "true"
  };
};

// Initialize Sequelize with secrets (sync for module load, will use env vars if secrets not cached)
// In Lambda, secrets will be cached after first async fetch in handler, so subsequent calls use cached values
const dbConfig = getDbConfig();

// Sequelize configuration for RDS Proxy
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    pool: poolConfig,
    logging: false, // Disable SQL logging in Lambda
    dialectOptions: {
      // SSL configuration for RDS (if needed)
      ssl: dbConfig.ssl
        ? {
            require: true,
            rejectUnauthorized: false
          }
        : false
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

// Test connection (will be reused across Lambda invocations)
let connectionTested = false;

async function testConnection() {
  if (!connectionTested) {
    try {
      await sequelize.authenticate();
      console.log("Database connection established successfully");
      connectionTested = true;
    } catch (error) {
      console.error("Unable to connect to database:", error);
      throw error;
    }
  }
}

// Note: Connection test on module load is disabled to allow secrets to load first in handler
// Connection will be tested in handler after secrets are loaded

module.exports = {
  sequelize,
  testConnection
};
