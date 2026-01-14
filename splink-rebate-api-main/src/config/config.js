const dotenv = require("dotenv");
const fs = require("fs");

// Load environment variables from .env file
dotenv.config();

const isRDS = process.env.DB_HOST?.includes("rds.amazonaws.com");
let certPath = null;

if (process.env.APP_ENV === "prod") {
  certPath = isRDS ? "/app/dist/config/us-west-2-bundle.pem" : null;
} else {
  certPath = isRDS ? "/app/dist/config/us-east-2-bundle.pem" : null;
}

const baseConfig = {
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || "database",
  host: process.env.DB_HOST || "localhost",
  dialect: process.env.DB_DIALECT || "postgres",
  port: Number(process.env.DB_PORT) || 5432
};

// Add SSL configuration for RDS
if (isRDS && certPath && fs.existsSync(certPath)) {
  baseConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: true,
      ca: fs.readFileSync(certPath).toString()
    }
  };
}

module.exports = {
  development: baseConfig,
  test: baseConfig,
  production: baseConfig
};
