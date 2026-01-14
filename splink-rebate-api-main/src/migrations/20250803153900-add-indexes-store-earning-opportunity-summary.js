"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add indexes for common filter columns on store_earning_opportunity_summary materialized view
    // These indexes will significantly improve query performance for the getStoresEarningOpportunity method

    // Individual column indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_store_id
      ON store_earning_opportunity_summary(store_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_distributor_id
      ON store_earning_opportunity_summary(distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_manufacturer_id
      ON store_earning_opportunity_summary(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_transaction_year
      ON store_earning_opportunity_summary(transaction_year);
    `);

    // Composite indexes for common query patterns
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_store_distributor
      ON store_earning_opportunity_summary(store_id, distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_manufacturer_year
      ON store_earning_opportunity_summary(manufacturer_id, transaction_year);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_distributor_year
      ON store_earning_opportunity_summary(distributor_id, transaction_year);
    `);

    // Covering index for most common query pattern (store filtering with other conditions)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_covering
      ON store_earning_opportunity_summary(store_id, distributor_id, manufacturer_id, transaction_year);
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop all indexes created in the up migration
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_store_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_distributor_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_manufacturer_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_transaction_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_store_distributor;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_manufacturer_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_distributor_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_covering;
    `);
  }
};
