import { execSync } from "child_process";
import dotenv from "dotenv";
import { Client } from "pg";
import logger from "./lib/logger";

dotenv.config();

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

// Function to drop and create the database
async function setupDatabase() {
  // Connect to PostgreSQL as an admin user without specifying a database
  const client = new Client({
    user: DB_USER,
    host: DB_HOST,
    port: Number(DB_PORT),
    password: DB_PASSWORD
  });

  try {
    await client.connect();

    // Terminate active connections to the database
    await client.query(
      `SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${DB_NAME}'
      AND pid <> pg_backend_pid();`
    );
    logger.info(`Terminated active connections to the database "${DB_NAME}".`);

    // Drop the database if it already exists
    await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);
    logger.info(`Database "${DB_NAME}" dropped successfully.`);

    // Create the database again
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
    logger.info(`Database "${DB_NAME}" created successfully.`);
  } catch (error) {
    logger.error("Error creating or dropping the database:", error);
    process.exit(1);
  } finally {
    // Close the client connection
    await client.end();
  }

  // Run migrations
  try {
    execSync("yarn migrate", { stdio: "inherit" });
    logger.info("Migrations applied successfully.");
  } catch (error) {
    logger.error("Error running migrations:", error);
    process.exit(1);
  }

  // Run seeders
  try {
    execSync("yarn seed", { stdio: "inherit" });
    logger.info("Seeding completed successfully.");
  } catch (error) {
    logger.error("Error running seeders:", error);
    process.exit(1);
  }
}

setupDatabase();
