#!/usr/bin/env node

const { Sequelize } = require("sequelize");
const config = require("../src/config/config.js");

/**
 * Dynamic date migration script
 * This script:
 * 1. Gets current materialized view definitions from database
 * 2. Drops dependent materialized views
 * 3. Converts date columns to DATEONLY format
 * 4. Recreates materialized views using their exact current definitions
 */

async function dynamicDateMigration() {
  let sequelize;

  try {
    console.log(
      "🚀 [Dynamic Migration] Starting dynamic date migration process..."
    );

    // Get database config based on environment
    const env = process.env.NODE_ENV || "development";
    const dbConfig = config[env];

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
    console.log("✅ [Dynamic Migration] Database connection established");

    // Step 1: Get current materialized view definitions that depend on date columns
    console.log(
      "📋 [Dynamic Migration] Step 1: Getting current materialized view definitions..."
    );

    const dependentViewsQuery = `
      SELECT DISTINCT
        v.schemaname,
        v.matviewname,
        v.definition
      FROM pg_matviews v
      WHERE (v.definition LIKE '%transaction_date%' 
        OR v.definition LIKE '%start_date%' 
        OR v.definition LIKE '%end_date%')
        AND v.schemaname = 'public'
      ORDER BY v.matviewname;
    `;

    const [dependentViews] = await sequelize.query(dependentViewsQuery);
    console.log(
      `✅ [Dynamic Migration] Found ${dependentViews.length} dependent materialized views:`
    );
    dependentViews.forEach((view) => {
      console.log(`   - ${view.matviewname}`);
    });

    // Step 2: Drop dependent materialized views
    console.log(
      "📋 [Dynamic Migration] Step 2: Dropping dependent materialized views..."
    );

    for (const view of dependentViews) {
      try {
        await sequelize.query(
          `DROP MATERIALIZED VIEW IF EXISTS ${view.matviewname} CASCADE;`
        );
        console.log(`✅ [Dynamic Migration] Dropped ${view.matviewname}`);
      } catch (error) {
        console.log(
          `⚠️  [Dynamic Migration] ${view.matviewname} may not exist: ${error.message}`
        );
      }
    }

    // Step 3: Convert date columns to DATEONLY
    console.log(
      "📋 [Dynamic Migration] Step 3: Converting date columns to DATEONLY..."
    );

    try {
      await sequelize.query(`
        ALTER TABLE line_items 
        ALTER COLUMN transaction_date TYPE DATE;
      `);
      console.log(
        "✅ [Dynamic Migration] Converted line_items.transaction_date to DATE"
      );
    } catch (error) {
      console.log(
        `⚠️  [Dynamic Migration] Error converting line_items.transaction_date: ${error.message}`
      );
    }

    try {
      await sequelize.query(`
        ALTER TABLE programs 
        ALTER COLUMN start_date TYPE DATE;
      `);
      console.log(
        "✅ [Dynamic Migration] Converted programs.start_date to DATE"
      );
    } catch (error) {
      console.log(
        `⚠️  [Dynamic Migration] Error converting programs.start_date: ${error.message}`
      );
    }

    try {
      await sequelize.query(`
        ALTER TABLE programs 
        ALTER COLUMN end_date TYPE DATE;
      `);
      console.log("✅ [Dynamic Migration] Converted programs.end_date to DATE");
    } catch (error) {
      console.log(
        `⚠️  [Dynamic Migration] Error converting programs.end_date: ${error.message}`
      );
    }

    // Step 4: Recreate materialized views using their exact current definitions
    console.log(
      "📋 [Dynamic Migration] Step 4: Recreating materialized views with exact definitions..."
    );

    // Define the order for recreation (dependencies first)
    const recreationOrder = [
      "sales_summary_materialized_view",
      "line_items_products_joined_materialized_view",
      "combined_store_summary",
      "combined_store_enrolled_summary",
      "product_insights_aggregated_view",
      "sales_rep_spiff_earning_summary"
    ];

    for (const viewName of recreationOrder) {
      const view = dependentViews.find((v) => v.matviewname === viewName);
      if (view) {
        try {
          console.log(`🔄 [Dynamic Migration] Recreating ${viewName}...`);

          // Create the materialized view with its exact definition
          // Remove trailing semicolon from definition if it exists
          const cleanDefinition = view.definition.replace(/;\s*$/, "");

          await sequelize.query(`
            CREATE MATERIALIZED VIEW ${viewName}
            AS ${cleanDefinition}
            WITH DATA;
          `);

          console.log(
            `✅ [Dynamic Migration] Successfully recreated ${viewName}`
          );
        } catch (error) {
          console.log(
            `❌ [Dynamic Migration] Error recreating ${viewName}: ${error.message}`
          );
          throw error;
        }
      } else {
        console.log(
          `⚠️  [Dynamic Migration] View ${viewName} not found in dependent views list`
        );
      }
    }

    console.log(
      "🎉 [Dynamic Migration] Dynamic date migration completed successfully!"
    );
    console.log(
      "✅ [Dynamic Migration] All materialized views have been recreated with exact definitions!"
    );
  } catch (error) {
    console.error(
      "❌ [Dynamic Migration] Error during dynamic date migration:",
      error.message
    );
    throw error;
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

// Run the script
dynamicDateMigration();
