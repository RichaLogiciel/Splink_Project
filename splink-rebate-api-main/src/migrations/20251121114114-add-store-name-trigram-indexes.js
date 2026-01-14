"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Disable transactions for this migration because CREATE INDEX CONCURRENTLY
  // cannot run inside a transaction block in PostgreSQL
  transaction: false,

  async up(queryInterface, Sequelize) {
    console.log(
      "Adding trigram indexes for stores.name column optimization..."
    );

    // Enable pg_trgm extension if not already enabled
    console.log("Ensuring pg_trgm extension is enabled...");
    try {
      await queryInterface.sequelize.query(`
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
      `);
    } catch (error) {
      console.error("❌ Failed to enable pg_trgm extension:", error.message);
      throw error;
    }

    // Create GIN trigram index for fast ILIKE queries with wildcards on name column
    // This index supports pattern matching like '%query%' efficiently
    console.log("Creating GIN trigram index for stores.name...");
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stores_name_trgm
        ON stores USING gin(name gin_trgm_ops)
        WHERE deleted_at IS NULL;
      `);
      console.log("✅ Created idx_stores_name_trgm");
    } catch (error) {
      console.error("❌ Failed to create idx_stores_name_trgm:", error.message);
      throw error;
    }

    // Also create a regular B-tree index for prefix searches (query%)
    // This is more efficient for prefix searches than trigram indexes
    console.log("Creating B-tree index for prefix search on stores.name...");
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stores_name_prefix
        ON stores(name text_pattern_ops)
        WHERE deleted_at IS NULL;
      `);
      console.log("✅ Created idx_stores_name_prefix");
    } catch (error) {
      console.error(
        "❌ Failed to create idx_stores_name_prefix:",
        error.message
      );
      throw error;
    }

    console.log("✅ Store name text search indexes created successfully!");
    console.log("   - GIN trigram index on name (for %query% searches)");
    console.log("   - B-tree prefix index on name (for query% searches)");
  },

  async down(queryInterface, Sequelize) {
    console.log("Dropping store name text search indexes...");

    console.log("Dropping idx_stores_name_prefix...");
    try {
      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_stores_name_prefix;
      `);
      console.log("✅ Dropped idx_stores_name_prefix");
    } catch (error) {
      console.error("❌ Failed to drop idx_stores_name_prefix:", error.message);
      throw error;
    }

    console.log("Dropping idx_stores_name_trgm...");
    try {
      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_stores_name_trgm;
      `);
      console.log("✅ Dropped idx_stores_name_trgm");
    } catch (error) {
      console.error("❌ Failed to drop idx_stores_name_trgm:", error.message);
      throw error;
    }

    // Note: We don't drop the pg_trgm extension as it might be used elsewhere
    console.log("✅ Store name text search indexes dropped successfully!");
  }
};
