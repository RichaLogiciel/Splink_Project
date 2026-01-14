"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Critical indexes for qualified_compliance_summary performance
    console.log(
      "Adding performance indexes for qualified_compliance_summary..."
    );

    // Primary lookup index - MOST CRITICAL
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qualified_compliance_summary_distributor_manufacturer 
      ON qualified_compliance_summary (distributor_id, manufacturer_id);
    `);

    // Detailed lookup with included columns for covering index
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qualified_compliance_summary_full_lookup 
      ON qualified_compliance_summary (distributor_id, manufacturer_id, program_detail_id) 
      INCLUDE (qualified_compliance_count, compliance_year, store_id);
    `);

    // Chain stores lookup index - Already exists from previous migration
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_stores_store_id
    //   ON chain_stores (store_id);
    // `);

    // Program participants optimization - Already exists from previous migration
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_participants_entity_program_type
    //   ON program_participants (entity_id, entity_type, program_id)
    //   WHERE deleted_at IS NULL;
    // `);

    // Program details lookup for subquery optimization
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_details_id_program_id 
      ON program_details (id) 
      INCLUDE (program_id);
    `);

    console.log("Performance indexes added successfully!");
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes in reverse order
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_program_details_id_program_id;`
    );
    // await queryInterface.sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_program_participants_entity_program_type;`); // Already exists from previous migration
    // await queryInterface.sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_chain_stores_store_id;`); // Already exists from previous migration
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_qualified_compliance_summary_full_lookup;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_qualified_compliance_summary_distributor_manufacturer;`
    );
  }
};
