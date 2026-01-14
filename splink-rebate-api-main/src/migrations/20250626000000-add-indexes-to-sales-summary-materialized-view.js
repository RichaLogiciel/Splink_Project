"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Add indexes to improve query performance on sales_summary_materialized_view
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_summary_distributor_id 
      ON sales_summary_materialized_view(distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_summary_manufacturer_id 
      ON sales_summary_materialized_view(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_summary_transaction_date 
      ON sales_summary_materialized_view(transaction_date);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_summary_warehouse_id 
      ON sales_summary_materialized_view(warehouse_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_summary_distributor_manufacturer 
      ON sales_summary_materialized_view(distributor_id, manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_summary_distributor_date 
      ON sales_summary_materialized_view(distributor_id, transaction_date);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_summary_manufacturer_date 
      ON sales_summary_materialized_view(manufacturer_id, transaction_date);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_summary_distributor_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_summary_manufacturer_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_summary_transaction_date;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_summary_warehouse_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_summary_distributor_manufacturer;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_summary_distributor_date;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_summary_manufacturer_date;
    `);
  }
};
