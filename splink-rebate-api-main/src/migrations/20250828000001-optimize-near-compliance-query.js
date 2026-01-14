"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Add optimized indexes for near compliance queries
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliance_mv_buyer_compliance
      ON store_program_compliance_mv (buyer_id, compliance_percentage DESC);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliance_mv_manufacturer_compliance
      ON store_program_compliance_mv (manufacturer_id, compliance_percentage DESC);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliance_mv_program_compliance
      ON store_program_compliance_mv (program_id, compliance_percentage DESC);
    `);

    // Composite index for the most common query pattern
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliance_mv_buyer_manufacturer_program_compliance
      ON store_program_compliance_mv (buyer_id, manufacturer_id, program_id, compliance_percentage DESC);
    `);
  },

  async down(queryInterface) {
    // Drop indexes in reverse order
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliance_mv_buyer_manufacturer_program_compliance;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliance_mv_program_compliance;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliance_mv_manufacturer_compliance;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliance_mv_buyer_compliance;
    `);
  }
};
