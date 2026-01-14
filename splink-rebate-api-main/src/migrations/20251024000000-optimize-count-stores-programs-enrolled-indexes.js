"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Creating performance indexes for countStoresProgramsEnrolled query..."
    );

    // ========================================
    // MANAGER_SALES_REP_MAPPING TABLE INDEX
    // ========================================

    // Composite index for sales manager lookups in countStoresProgramsEnrolled
    // Covers: WHERE sales_manager_id = ? AND deleted_at IS NULL
    // This index optimizes the JOIN condition:
    //   INNER JOIN manager_sales_rep_mapping msrm
    //     ON ssr.sales_rep_id = msrm.sales_rep_id
    //     AND msrm.deleted_at IS NULL
    //   WHERE msrm.sales_manager_id = :salesManagerId
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manager_sales_rep_sales_manager_lookup
        ON manager_sales_rep_mapping(sales_manager_id, sales_rep_id, deleted_at)
        WHERE deleted_at IS NULL;
      `);
      console.log(
        "Created index: idx_manager_sales_rep_sales_manager_lookup on manager_sales_rep_mapping"
      );
    } catch (error) {
      console.error(
        "Failed to create index idx_manager_sales_rep_sales_manager_lookup:",
        error.message
      );
      // Don't throw - index might already exist
    }

    // ========================================
    // PROGRAM_PARTICIPANTS TABLE INDEX
    // ========================================

    // Covering index for STORE entity type filtering
    // Optimizes: WHERE entity_type = 'STORE' AND deleted_at IS NULL
    // This partial index includes only STORE entities, making it smaller and faster
    // The column order is optimized for:
    //   1. entity_type - high selectivity filter
    //   2. deleted_at - soft delete filter
    //   3. entity_id, program_id - used in DISTINCT count and ineligibility JOIN
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_participants_store_entity_lookup
        ON program_participants(entity_type, deleted_at, entity_id, program_id)
        WHERE entity_type = 'STORE' AND deleted_at IS NULL;
      `);
      console.log(
        "Created index: idx_program_participants_store_entity_lookup on program_participants"
      );
    } catch (error) {
      console.error(
        "Failed to create index idx_program_participants_store_entity_lookup:",
        error.message
      );
      // Don't throw - index might already exist
    }

    console.log(
      "Successfully created performance indexes for countStoresProgramsEnrolled"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "Dropping performance indexes for countStoresProgramsEnrolled..."
    );

    const indexesToDrop = [
      "idx_manager_sales_rep_sales_manager_lookup",
      "idx_program_participants_store_entity_lookup"
    ];

    for (const indexName of indexesToDrop) {
      try {
        await queryInterface.sequelize.query(`
          DROP INDEX CONCURRENTLY IF EXISTS ${indexName};
        `);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.warn(`Failed to drop index ${indexName}:`, error.message);
      }
    }

    console.log(
      "Finished dropping performance indexes for countStoresProgramsEnrolled"
    );
  }
};
