"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Adding missing composite performance indexes...");

    // 1. HIGH PRIORITY: manager_sales_rep_mapping - sales manager lookup optimization
    // This index optimizes queries that filter by sales_manager_id with deleted_at checks
    // Used in DistributorRepository.getSalesRepIdsBySalesRepManagerId and StoreRepository.getStoresBySalesRepManagerId
    console.log(
      "Creating index: idx_manager_sales_rep_mapping_manager_lookup..."
    );
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manager_sales_rep_mapping_manager_lookup
      ON manager_sales_rep_mapping(sales_manager_id, sales_rep_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // NOTE: sales_rep_store_earnings indexes already exist from previous migrations:
    // - idx_sales_rep_store_earnings_dist_store_mfr (distributor_id, store_id, manufacturer_id, program_id)
    // - idx_sales_rep_store_earnings_sales_rep_dist_mfr (sales_rep_id, distributor_id, manufacturer_id)

    // NOTE: stores table doesn't have distributor_id column (relationship is through user_roles)
    // So we skip the stores index

    // 2. MEDIUM PRIORITY: program_participants - reverse lookup optimization
    // This index optimizes queries that start with program_id and need to find participants
    // Complements existing idx_program_participants_entity_program which goes entity -> program
    console.log("Creating index: idx_program_participants_program_entity...");
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_participants_program_entity
      ON program_participants(program_id, entity_type, entity_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // 3. BONUS: program_participants - add deleted_at to existing entity_program index for better filtering
    // This creates a partial index version of the existing idx_program_participants_entity_program
    console.log(
      "Creating index: idx_program_participants_entity_program_active..."
    );
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_participants_entity_program_active
      ON program_participants(entity_type, entity_id, program_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    console.log(
      "All missing composite performance indexes created successfully!"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log("Dropping composite performance indexes...");

    // Drop in reverse order (only the ones we created)
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_program_participants_entity_program_active;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_program_participants_program_entity;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_manager_sales_rep_mapping_manager_lookup;
    `);

    console.log("All composite performance indexes dropped successfully!");
  }
};
