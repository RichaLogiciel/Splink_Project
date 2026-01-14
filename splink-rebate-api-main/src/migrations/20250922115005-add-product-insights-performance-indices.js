"use strict";

module.exports = {
  async up(queryInterface) {
    console.log(
      "🚀 Adding performance optimization indices for product_insights_aggregated_view..."
    );

    // =====================================================
    // PERFORMANCE OPTIMIZATION INDICES
    // =====================================================

    // PRIMARY INDEX: Most critical for query pattern
    // Covers: manufacturer_id + distributor_id filtering + week_start range + includes aggregation columns
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_piav_manufacturer_distributor_week_covering
      ON product_insights_aggregated_view(manufacturer_id, distributor_id, week_start)
      INCLUDE (product_id, product_name, total_sales, total_units, store_id, year);
    `);

    // ALTERNATIVE: If PostgreSQL version doesn't support INCLUDE (pre-11)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_piav_manufacturer_distributor_week_all
      ON product_insights_aggregated_view(
        manufacturer_id, distributor_id, week_start, 
        product_id, product_name, total_sales, total_units, store_id, year
      );
    `);

    // For product filtering queries
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_piav_manufacturer_product_distributor_week
      ON product_insights_aggregated_view(manufacturer_id, product_id, distributor_id, week_start)
      INCLUDE (product_name, total_sales, total_units, store_id);
    `);

    // For JOIN operations with top_current_products CTE
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_piav_product_manufacturer_week
      ON product_insights_aggregated_view(product_id, manufacturer_id, week_start)
      INCLUDE (distributor_id, total_units, total_sales, store_id, product_name);
    `);

    // For sorting by sales (used in top_current_products CTE)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_piav_sales_sorting_optimized
      ON product_insights_aggregated_view(manufacturer_id, distributor_id)
      INCLUDE (product_id, product_name, week_start, year, total_sales, total_units, store_id)
      WHERE total_sales > 0;
    `);

    // For year boundary handling (week_start + year combo)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_piav_year_boundary_filter
      ON product_insights_aggregated_view(manufacturer_id, distributor_id, week_start, year)
      INCLUDE (product_id, product_name, total_sales, total_units, store_id);
    `);

    console.log("✅ Performance optimization indices added successfully!");
  },

  async down(queryInterface) {
    console.log("🗑️ Removing performance optimization indices...");

    // Drop performance optimization indices
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_piav_manufacturer_distributor_week_covering;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_piav_manufacturer_distributor_week_all;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_piav_manufacturer_product_distributor_week;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_piav_product_manufacturer_week;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_piav_sales_sorting_optimized;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_piav_year_boundary_filter;
    `);

    console.log("✅ Performance optimization indices removed successfully!");
  }
};
