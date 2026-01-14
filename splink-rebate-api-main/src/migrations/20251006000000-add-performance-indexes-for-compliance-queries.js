"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Creating performance indexes for compliance and user role queries..."
    );

    // ========================================
    // USER ROLES TABLE INDEXES
    // ========================================

    // Composite index for getRetailersIdByDistributorIdAndRole queries
    // Covers: WHERE role IN (...) AND parent_entity_id = ? AND parent_entity_type = ?
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_parent_lookup
      ON user_roles(parent_entity_id, parent_entity_type, role, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // Index for associated user lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_associated_user
      ON user_roles(associated_user_id, role, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // ========================================
    // STORE SALES REPS TABLE INDEXES
    // ========================================

    // Index for getRetailersIdBySalesRepIdAndRole queries
    // Covers: WHERE sales_rep_id = ? AND deleted_at IS NULL
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_sales_reps_sales_rep_lookup
      ON store_sales_reps(sales_rep_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // Reverse lookup for stores by sales rep
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_sales_reps_store_lookup
      ON store_sales_reps(store_id, sales_rep_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // ========================================
    // PROGRAM COMPLIANCES TABLE INDEXES
    // ========================================

    // Composite index for findComplianceByEntityIdAndEntityType queries
    // Covers: WHERE entity_type IN (...) AND entity_id IN (...) AND program_id IN (...)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_compliances_entity_program_lookup
      ON program_compliances(entity_type, entity_id, program_id, status, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // Index for entity and status filtering (used in many queries)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_compliances_entity_status
      ON program_compliances(entity_id, entity_type, status, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // Index for program-based lookups with compliance date filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_compliances_program_date
      ON program_compliances(program_id, compliance_date, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // ========================================
    // PROGRAM PARTICIPANTS TABLE INDEXES
    // ========================================

    // Composite index for participant lookups in compliance queries
    // Used in JOIN conditions: entity_id = entity_id AND program_id = program_id
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_participants_entity_program
      ON program_participants(entity_id, program_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // ========================================
    // PROGRAM STORE INELIGIBILITY TABLE INDEXES
    // ========================================

    // Composite index for ineligibility checks
    // Used in JOIN conditions: store_id = entity_id AND program_id = program_id
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_store_ineligibility_lookup
      ON program_store_ineligibility(store_id, program_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    console.log(
      "Successfully created all compliance query performance indexes"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log("Dropping compliance query performance indexes...");

    const indexesToDrop = [
      // Program store ineligibility
      "idx_program_store_ineligibility_lookup",

      // Program participants
      "idx_program_participants_entity_program",

      // Program compliances
      "idx_program_compliances_program_date",
      "idx_program_compliances_entity_status",
      "idx_program_compliances_entity_program_lookup",

      // Store sales reps
      "idx_store_sales_reps_store_lookup",
      "idx_store_sales_reps_sales_rep_lookup",

      // User roles
      "idx_user_roles_associated_user",
      "idx_user_roles_parent_lookup"
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

    console.log("Finished dropping compliance query performance indexes");
  }
};
