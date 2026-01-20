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

// Sequelize instance (lazy initialization)
let sequelize = null;

/**
 * Get or create Sequelize instance (lazy initialization)
 * Uses secrets from Secrets Manager (cached) or falls back to environment variables
 * @returns {Promise<Sequelize>} Sequelize instance
 */
async function getSequelize() {
  // Return existing instance if already initialized
  if (sequelize) {
    return sequelize;
  }

  // Fetch secrets (will use cached if already fetched)
  const dbHost = await secretsService.getSecret("DB_HOST");
  const dbPort = parseInt(
    (await secretsService.getSecret("DB_PORT")) || "5432"
  );
  const dbName = await secretsService.getSecret("DB_NAME");
  const dbUser = await secretsService.getSecret("DB_USER");
  const dbPassword = await secretsService.getSecret("DB_PASSWORD");
  const dbDialect =
    (await secretsService.getSecret("DB_DIALECT")) || "postgres";
  const dbSsl = (await secretsService.getSecret("DB_SSL")) === "true";

  if (!dbHost || !dbName || !dbUser || !dbPassword) {
    throw new Error(
      "Database credentials are missing. Please configure DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in Secrets Manager or environment variables."
    );
  }

  // Create Sequelize instance with secrets
  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: dbDialect,
    pool: poolConfig,
    logging: false, // Disable SQL logging in Lambda
    dialectOptions: {
      // SSL configuration for RDS (if needed)
      ssl: dbSsl
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
  });

  return sequelize;
}

// Test connection (will be reused across Lambda invocations)
let connectionTested = false;

async function testConnection() {
  // Ensure sequelize is initialized with secrets
  const seq = await getSequelize();

  if (!connectionTested) {
    try {
      await seq.authenticate();
      console.log("Database connection established successfully");
      connectionTested = true;
    } catch (error) {
      console.error("Unable to connect to database:", error);
      throw error;
    }
  }
}

module.exports = {
  getSequelize,
  testConnection
};
