"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Creating performance indexes for ETL and query optimization..."
    );

    // ========================================
    // ETL CSV TRANSACTIONS STAGING INDEXES
    // ========================================

    // Index for product code lookups during enrichment
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_product_code_file_id
      ON etl_csv_transactions_staging(product_code, import_file_id)
      WHERE enrichment_status IS NULL;
    `);

    // Index for transaction type filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_transaction_type_file_id
      ON etl_csv_transactions_staging(LOWER(TRIM(transaction_type)), import_file_id)
      WHERE processing_status = 'PENDING';
    `);

    // Index for enrichment status tracking
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_enrichment_status_file_id
      ON etl_csv_transactions_staging(enrichment_status, import_file_id)
      WHERE enrichment_status IS NOT NULL;
    `);

    // Index for processing status tracking
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_processing_status_file_id
      ON etl_csv_transactions_staging(processing_status, import_file_id)
      WHERE NOT is_enrichment_error;
    `);

    // Index for trading partner lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_trading_partner_file_id
      ON etl_csv_transactions_staging(trading_partner_id, import_file_id)
      WHERE seller_id IS NULL OR buyer_id IS NULL;
    `);

    // Composite index for transformation queries
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_transform_ready
      ON etl_csv_transactions_staging(import_file_id, LOWER(TRIM(transaction_type)), processing_status)
      WHERE NOT is_enrichment_error
      AND seller_id IS NOT NULL
      AND buyer_id IS NOT NULL;
    `);

    // ========================================
    // REFERENCE TABLE PERFORMANCE INDEXES
    // ========================================

    // Index for warehouse name lookups (active warehouses only)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warehouses_name_active
      ON warehouses(name)
      WHERE deleted_at IS NULL;
    `);

    // Index for distributor warehouse lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warehouses_distributor_active
      ON warehouses(distributor_id, name)
      WHERE deleted_at IS NULL;
    `);

    // Index for product SKU lookups (unit, case, box)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_unit_skus_active
      ON products(unit_skus_id)
      WHERE deleted_at IS NULL AND unit_skus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_case_skus_active
      ON products(case_skus_id)
      WHERE deleted_at IS NULL AND case_skus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_box_skus_active
      ON products(box_skus_id)
      WHERE deleted_at IS NULL AND box_skus_id IS NOT NULL;
    `);

    // Index for old SKU migrations
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_old_unit_skus
      ON products(old_unit_skus_id)
      WHERE deleted_at IS NULL AND old_unit_skus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_old_case_skus
      ON products(old_case_skus_id)
      WHERE deleted_at IS NULL AND old_case_skus_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_old_box_skus
      ON products(old_box_skus_id)
      WHERE deleted_at IS NULL AND old_box_skus_id IS NOT NULL;
    `);

    // ========================================
    // LINE ITEMS TABLE PERFORMANCE INDEXES
    // ========================================

    // Index for product authorization checks
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_line_items_product_buyer_seller
      ON line_items(product_id, buyer_id, seller_id, buyer_type, seller_type)
      WHERE deleted_at IS NULL;
    `);

    // Index for warehouse and distributor filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_line_items_warehouse_distributor
      ON line_items(warehouse_id, seller_id)
      WHERE deleted_at IS NULL;
    `);

    // Index for transaction date range queries
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_line_items_transaction_date
      ON line_items(transaction_date)
      WHERE deleted_at IS NULL;
    `);

    // ========================================
    // PRODUCT CODE MAPPINGS OPTIMIZATION
    // ========================================

    // Ensure unique constraint exists for product code mappings
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_product_code_mappings_unique
      ON product_code_mappings(product_id, distributor_id, warehouse_id)
      WHERE deleted_at IS NULL;
    `);

    // Index for code lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_code_mappings_code
      ON product_code_mappings(code, distributor_id)
      WHERE deleted_at IS NULL;
    `);

    console.log("Successfully created all performance indexes");
  },

  async down(queryInterface, Sequelize) {
    console.log("Dropping performance indexes...");

    // Drop all indexes in reverse order
    const indexesToDrop = [
      // Product code mappings
      "idx_product_code_mappings_code",
      "idx_product_code_mappings_unique",

      // Line items
      "idx_line_items_transaction_date",
      "idx_line_items_warehouse_distributor",
      "idx_line_items_product_buyer_seller",

      // Products old SKUs
      "idx_products_old_box_skus",
      "idx_products_old_case_skus",
      "idx_products_old_unit_skus",

      // Products SKUs
      "idx_products_box_skus_active",
      "idx_products_case_skus_active",
      "idx_products_unit_skus_active",

      // Warehouses
      "idx_warehouses_distributor_active",
      "idx_warehouses_name_active",

      // Staging
      "idx_staging_transform_ready",
      "idx_staging_trading_partner_file_id",
      "idx_staging_processing_status_file_id",
      "idx_staging_enrichment_status_file_id",
      "idx_staging_transaction_type_file_id",
      "idx_staging_product_code_file_id"
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

    console.log("Finished dropping performance indexes");
  }
};
