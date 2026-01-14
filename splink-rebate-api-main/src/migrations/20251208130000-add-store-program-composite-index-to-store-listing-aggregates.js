"use strict";

/**
 * Migration: Add composite index on (store_id, program_id) to store_listing_aggregates
 *
 * Purpose: Optimize query performance for agreement-based enrollment operations
 * that need to look up records by store_id and program_id combinations.
 *
 * This index will be used when updating program_enrolled flags during
 * bulk enrollment/unenrollment operations.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Disable transactions for concurrent index creation
  // PostgreSQL requires this for CREATE INDEX CONCURRENTLY
  transaction: false,

  async up(queryInterface) {
    const tableName = "store_listing_aggregates";
    const indexName = "idx_store_listing_aggregates_store_program";

    console.log(
      `Creating composite index ${indexName} on ${tableName}(store_id, program_id)...`
    );

    try {
      // Create composite index CONCURRENTLY to avoid table locking in production
      // This allows reads and writes to continue while the index is being built
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
        ON ${tableName} (store_id, program_id);
      `);

      console.log(`✓ Index ${indexName} created successfully on ${tableName}`);
    } catch (error) {
      // Log warning if index already exists or other non-critical error
      // Migration should not fail if index already exists
      console.warn(
        `Warning during index creation (may already exist): ${error.message}`
      );

      // Re-throw if it's a critical error (not a "already exists" error)
      if (!error.message.includes("already exists")) {
        throw error;
      }
    }
  },

  async down(queryInterface) {
    const indexName = "idx_store_listing_aggregates_store_program";

    console.log(`Dropping index ${indexName}...`);

    try {
      // Drop index CONCURRENTLY to avoid table locking
      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS ${indexName};
      `);

      console.log(`✓ Index ${indexName} dropped successfully`);
    } catch (error) {
      // Log warning if index doesn't exist
      console.warn(
        `Warning during index drop (may not exist): ${error.message}`
      );

      // Don't throw error if index doesn't exist
      if (!error.message.includes("does not exist")) {
        throw error;
      }
    }
  }
};
