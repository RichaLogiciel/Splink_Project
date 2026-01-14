"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Create products table indexes with JSON to JSONB casting
      await queryInterface.sequelize.query(
        "CREATE INDEX IF NOT EXISTS idx_products_category_tags_json ON products USING GIN ((category_tags_json::jsonb))"
      );

      await queryInterface.sequelize.query(
        "CREATE INDEX IF NOT EXISTS idx_products_primary_variant ON products (primary_variant)"
      );

      // Create staging table indexes with JSON to JSONB casting
      await queryInterface.sequelize.query(
        "CREATE INDEX IF NOT EXISTS idx_etl_csv_products_staging_category_tags_json ON etl_csv_products_staging USING GIN ((category_tags_json::jsonb))"
      );

      await queryInterface.sequelize.query(
        "CREATE INDEX IF NOT EXISTS idx_etl_csv_products_staging_primary_variant ON etl_csv_products_staging (primary_variant)"
      );
    } catch (error) {
      console.error("Migration error:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Drop indexes
      await queryInterface.sequelize.query(
        "DROP INDEX IF EXISTS idx_products_category_tags_json"
      );
      await queryInterface.sequelize.query(
        "DROP INDEX IF EXISTS idx_products_primary_variant"
      );
      await queryInterface.sequelize.query(
        "DROP INDEX IF EXISTS idx_etl_csv_products_staging_category_tags_json"
      );
      await queryInterface.sequelize.query(
        "DROP INDEX IF EXISTS idx_etl_csv_products_staging_primary_variant"
      );
    } catch (error) {
      console.error("Migration rollback error:", error);
      throw error;
    }
  }
};
