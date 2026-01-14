#!/usr/bin/env node

const { Sequelize } = require("sequelize");
const config = require("../src/config/config.js");

/**
 * Pre-migration script to ensure store_program_compliances_mv materialized view is dropped
 * This runs automatically before every yarn run migrate command
 */

async function preMigrateDropMV() {
  let sequelize;

  try {
    console.log(
      "🔍 [Pre-Migration] Checking for store_program_compliances_mv materialized view..."
    );

    // Get database config based on environment
    const env = process.env.NODE_ENV || "development";

    // Map environment aliases to valid config keys
    const envMapping = {
      development: "development",
      dev: "development",
      test: "test",
      production: "production",
      prod: "production"
    };

    // Ensure we have a valid config key (development, test, or production)
    const configKey = envMapping[env] || "development";
    const dbConfig = config[configKey];

    if (!dbConfig) {
      throw new Error(
        `Database config not found for environment: ${env}. Available configs: ${Object.keys(config).join(", ")}`
      );
    }

    if (!dbConfig.database) {
      throw new Error(
        `Database name not configured. Please set DB_NAME environment variable.`
      );
    }

    // Create sequelize instance
    sequelize = new Sequelize(
      dbConfig.database,
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        dialectOptions: dbConfig.dialectOptions,
        logging: false // Disable SQL logging for this script
      }
    );

    // Test connection
    await sequelize.authenticate();

    // Check if materialized view exists
    const checkMVQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM pg_matviews 
        WHERE matviewname = 'store_program_compliances_mv'
      ) as mv_exists;
    `;

    const result = await sequelize.query(checkMVQuery, {
      type: Sequelize.QueryTypes.SELECT
    });

    if (result && result[0] && result[0].mv_exists) {
      console.log(
        "🔄 [Pre-Migration] Materialized view store_program_compliances_mv exists, dropping it..."
      );
      await sequelize.query(`
        DROP MATERIALIZED VIEW store_program_compliances_mv CASCADE;
      `);
      console.log(
        "✅ [Pre-Migration] Successfully dropped store_program_compliances_mv materialized view"
      );
    } else {
      console.log(
        "ℹ️  [Pre-Migration] Materialized view store_program_compliances_mv does not exist, nothing to drop"
      );
    }
  } catch (error) {
    console.error(
      "⚠️  [Pre-Migration] Error checking/dropping materialized view:",
      error.message
    );
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    // Don't exit with error, just log and continue with migration
    // This allows migrations to proceed even if the materialized view drop fails
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

// Run the script
preMigrateDropMV();
