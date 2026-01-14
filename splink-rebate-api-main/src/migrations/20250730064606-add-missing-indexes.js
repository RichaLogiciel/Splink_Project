"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_line_items_warehouse_id 
      ON line_items(warehouse_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_line_items_dist_internal_product_id 
      ON line_items(dist_internal_product_id) 
      WHERE dist_internal_product_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_line_items_product_warehouse 
      ON line_items(product_id, warehouse_id) 
      WHERE dist_internal_product_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_line_items_product_id 
      ON line_items(product_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_staging_product_file 
      ON etl_csv_transactions_staging(product_code, import_file_id) 
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_staging_import_file 
      ON etl_csv_transactions_staging(import_file_id)
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_products_primary_variant_unit 
      ON products(unit_skus_id, primary_variant) 
      WHERE unit_skus_id IS NOT NULL AND primary_variant = TRUE;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_staging_product_file_covering 
      ON etl_csv_transactions_staging(product_code, import_file_id, is_enrichment_error) 
      WHERE is_enrichment_error = FALSE;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_line_items_covering 
      ON line_items(product_id, warehouse_id, dist_internal_product_id) 
      WHERE dist_internal_product_id IS NOT NULL AND warehouse_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX mv_sales_summary_query_idx 
      ON sales_summary_materialized_view 
      (distributor_id, manufacturer_id, warehouse_id, transaction_date);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_line_items_warehouse_id;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_line_items_dist_internal_product_id;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_line_items_product_warehouse;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_line_items_product_id;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_staging_product_file;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_staging_import_file;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_products_primary_variant_unit;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_staging_product_file_covering;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_line_items_covering;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS mv_sales_summary_query_idx;`
    );
  }
};
