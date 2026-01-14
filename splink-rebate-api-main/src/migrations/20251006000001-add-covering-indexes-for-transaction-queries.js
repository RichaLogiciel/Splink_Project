"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Creating covering indexes for transaction query optimization..."
    );

    // ========================================
    // COVERING INDEXES FOR AGGREGATED QUERIES
    // ========================================

    // Index for purchase transactions (buyer-side queries) with aggregation
    // Covers: WHERE manufacturer_id IN (...) AND buyer_id IN (...) AND buyer_type = ... AND warehouse_id IN (...)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_mfr_buyer_warehouse_date_agg
      ON line_items_products_joined_materialized_view (
        manufacturer_id,
        buyer_id,
        buyer_type,
        warehouse_id,
        transaction_date
      )
      WHERE total_price > 0;
    `);

    // Index for sale transactions (seller-side queries) with aggregation
    // Covers: WHERE manufacturer_id IN (...) AND seller_id IN (...) AND seller_type = ... AND warehouse_id IN (...)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_mfr_seller_warehouse_date_agg
      ON line_items_products_joined_materialized_view (
        manufacturer_id,
        seller_id,
        seller_type,
        warehouse_id,
        transaction_date
      )
      WHERE total_price > 0;
    `);

    // ========================================
    // COVERING INDEXES FOR PRODUCT-LEVEL QUERIES
    // ========================================

    // Index for detailed product queries (includeProducts=true, buyer-side)
    // Covers: WHERE manufacturer_id IN (...) AND buyer_id IN (...)
    //         GROUP BY seller_id, buyer_id, internal_product_id
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_mfr_product_buyer_detail
      ON line_items_products_joined_materialized_view (
        manufacturer_id,
        internal_product_id,
        buyer_id,
        seller_id,
        warehouse_id
      )
      WHERE total_price > 0;
    `);

    // Index for detailed product queries (seller-side)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_mfr_product_seller_detail
      ON line_items_products_joined_materialized_view (
        manufacturer_id,
        internal_product_id,
        seller_id,
        buyer_id,
        warehouse_id
      )
      WHERE total_price > 0;
    `);

    // ========================================
    // SPECIALIZED INDEXES FOR DATE RANGE QUERIES
    // ========================================

    // Composite index optimized for manufacturer + date filtering
    // Used when filtering by specific program date ranges per manufacturer
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_mfr_date_buyer_warehouse
      ON line_items_products_joined_materialized_view (
        manufacturer_id,
        transaction_date,
        buyer_id,
        buyer_type,
        warehouse_id
      )
      WHERE total_price > 0;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_mfr_date_seller_warehouse
      ON line_items_products_joined_materialized_view (
        manufacturer_id,
        transaction_date,
        seller_id,
        seller_type,
        warehouse_id
      )
      WHERE total_price > 0;
    `);

    console.log(
      "Successfully created all covering indexes for transaction queries"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log("Dropping covering indexes for transaction queries...");

    const indexesToDrop = [
      "idx_mv_mfr_date_seller_warehouse",
      "idx_mv_mfr_date_buyer_warehouse",
      "idx_mv_mfr_product_seller_detail",
      "idx_mv_mfr_product_buyer_detail",
      "idx_mv_mfr_seller_warehouse_date_agg",
      "idx_mv_mfr_buyer_warehouse_date_agg"
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

    console.log("Finished dropping covering indexes for transaction queries");
  }
};
