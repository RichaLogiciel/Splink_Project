import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Sequelize, SequelizeOptions } from "sequelize-typescript";
import logger from "./lib/logger";

dotenv.config();

const {
  DB_DIALECT,
  DB_HOST,
  APP_ENV,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  NODE_ENV,
  USE_SSH_TUNNEL,
  DB_SSH_LOCAL_PORT,
  // Pool configuration with defaults
   DB_POOL_MAX = "10",
  DB_POOL_MIN = "1",
  DB_POOL_ACQUIRE_TIMEOUT = "60000",
  DB_POOL_IDLE_TIMEOUT = "20000",
  DB_POOL_EVICT_INTERVAL = "1000"
} = process.env;

const useSshTunnel = (USE_SSH_TUNNEL ?? "").toLowerCase() === "true";

// Check if the provided dialect is valid
const getDialect = (): "mysql" | "postgres" | "sqlite" | "mssql" => {
  const dialect = DB_DIALECT as "mysql" | "postgres" | "sqlite" | "mssql";

  if (!["mysql", "postgres", "sqlite", "mssql"].includes(dialect)) {
    throw new Error(`Invalid dialect: ${dialect}`);
  }
  return dialect;
};

// Certificate path helper
const getCertificatePath = () => {
  if (APP_ENV == "local") return;
  // Check if we're using RDS and need SSL
  const isRDS = DB_HOST?.includes("rds.amazonaws.com");
  logger.info(`Is RDS connection: ${isRDS}`);

  if (!isRDS) return null;
  let certPath = null;

  if (APP_ENV === "prod") {
    certPath = path.join(__dirname, "config", "us-west-2-bundle.pem");
  } else {
    certPath = path.join(__dirname, "config", "us-east-2-bundle.pem");
  }

  logger.info(`Looking for certificate at: ${certPath}`);

  // Verify certificate exists
  if (!fs.existsSync(certPath)) {
    logger.error("RDS certificate not found at: " + certPath);

    throw new Error("RDS certificate not found at: " + certPath);
  }

  logger.info("Certificate found successfully");
  return certPath;
};

const config: SequelizeOptions = {
  dialect: getDialect(),
  host: useSshTunnel ? "127.0.0.1" : DB_HOST,
  port: useSshTunnel ? Number(DB_SSH_LOCAL_PORT ?? 5433) : Number(DB_PORT),
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  models: [path.join(__dirname, "..", "models")],
  // eslint-disable-next-line no-console
  logging: NODE_ENV === "development" ? console.log : false,
  pool: {
    max: Number(DB_POOL_MAX),
    min: Number(DB_POOL_MIN),
    acquire: Number(DB_POOL_ACQUIRE_TIMEOUT),
    idle: Number(DB_POOL_IDLE_TIMEOUT),
    evict: Number(DB_POOL_EVICT_INTERVAL)
  },
  define: {
    timestamps: true,
    underscored: true
  }
};

// Add SSL configuration if using RDS
const certPath = getCertificatePath();
if (certPath && !useSshTunnel) {
  config.dialectOptions = {
    ssl: {
      ca: fs.readFileSync(certPath).toString(),
      rejectUnauthorized: true,
      require: true,
      sslmode: "require"
    }
  };

  // Add this logging to debug
  logger.info("SSL Configuration:", JSON.stringify(config.dialectOptions));
}

const sequelize = new Sequelize(config);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info(
      "Connection to the database has been established successfully."
    );
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
    process.exit(1);
  }
};

testConnection();

export default sequelize;
