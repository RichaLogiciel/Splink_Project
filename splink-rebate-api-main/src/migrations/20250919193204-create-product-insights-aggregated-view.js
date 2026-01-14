"use strict";

module.exports = {
  async up(queryInterface) {
    // Create materialized view for product insights aggregated data
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS product_insights_aggregated_view;
      CREATE MATERIALIZED VIEW IF NOT EXISTS product_insights_aggregated_view
      TABLESPACE pg_default
      AS
      SELECT 
          p.manufacturer_id,
          p.id AS product_id,
          p.name AS product_name,
          li.seller_id AS distributor_id,
          li.warehouse_id,
          li.buyer_id AS store_id,
          DATE_TRUNC('week', li.transaction_date) AS week_start,
          EXTRACT(year FROM li.transaction_date) AS year,
          EXTRACT(week FROM li.transaction_date) AS week,
          SUM(li.total_units) AS total_units,
          SUM(li.total_price) AS total_sales,
          COUNT(*) AS transaction_count
      FROM line_items_products_joined_materialized_view li
      JOIN products p ON li.internal_product_id = p.id
      WHERE li.seller_type = 'DISTRIBUTOR' 
        AND li.buyer_type = 'STORE'
        AND p.deleted_at IS NULL
      GROUP BY 
          p.manufacturer_id, p.id, p.name, 
          li.seller_id, li.warehouse_id, li.buyer_id,
          DATE_TRUNC('week', li.transaction_date),
          EXTRACT(year FROM li.transaction_date),
          EXTRACT(week FROM li.transaction_date)
      ORDER BY p.manufacturer_id, p.id, week_start
      WITH DATA;
    `);

    // Create performance indexes for the materialized view
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_manufacturer_id 
      ON product_insights_aggregated_view(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_product_id 
      ON product_insights_aggregated_view(product_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_distributor_id 
      ON product_insights_aggregated_view(distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_store_id 
      ON product_insights_aggregated_view(store_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_week_start 
      ON product_insights_aggregated_view(week_start);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_year_week 
      ON product_insights_aggregated_view(year, week);
    `);

    // Composite indexes for common query patterns
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_manufacturer_distributor_week 
      ON product_insights_aggregated_view(manufacturer_id, distributor_id, week_start);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_manufacturer_product_week 
      ON product_insights_aggregated_view(manufacturer_id, product_id, week_start);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_distributor_product_week 
      ON product_insights_aggregated_view(distributor_id, product_id, week_start);
    `);

    // Index for store-level aggregations
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_store_product_week 
      ON product_insights_aggregated_view(store_id, product_id, week_start);
    `);

    // Index for warehouse filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_warehouse_week 
      ON product_insights_aggregated_view(warehouse_id, week_start);
    `);

    // Index for sales and units sorting
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_total_sales 
      ON product_insights_aggregated_view(total_sales DESC);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_total_units 
      ON product_insights_aggregated_view(total_units DESC);
    `);

    // Create refresh function for the materialized view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.refresh_product_insights_aggregated_view()
          RETURNS trigger
          LANGUAGE 'plpgsql'
          COST 100
          VOLATILE NOT LEAKPROOF
      AS $BODY$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY product_insights_aggregated_view;
          RETURN NULL;
      END;
      $BODY$;
    `);

    // Create triggers to refresh the materialized view when underlying data changes
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'line_items_product_insights_refresh_trigger'
          ) THEN
              CREATE TRIGGER line_items_product_insights_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON line_items
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_product_insights_aggregated_view();
          END IF;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'products_product_insights_refresh_trigger'
          ) THEN
              CREATE TRIGGER products_product_insights_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON products
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_product_insights_aggregated_view();
          END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    // Drop triggers
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS line_items_product_insights_refresh_trigger ON line_items;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS products_product_insights_refresh_trigger ON products;
    `);

    // Drop the refresh function
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS refresh_product_insights_aggregated_view;
    `);

    // Drop all indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_product_insights_manufacturer_id;
      DROP INDEX IF EXISTS idx_product_insights_product_id;
      DROP INDEX IF EXISTS idx_product_insights_distributor_id;
      DROP INDEX IF EXISTS idx_product_insights_store_id;
      DROP INDEX IF EXISTS idx_product_insights_week_start;
      DROP INDEX IF EXISTS idx_product_insights_year_week;
      DROP INDEX IF EXISTS idx_product_insights_manufacturer_distributor_week;
      DROP INDEX IF EXISTS idx_product_insights_manufacturer_product_week;
      DROP INDEX IF EXISTS idx_product_insights_distributor_product_week;
      DROP INDEX IF EXISTS idx_product_insights_store_product_week;
      DROP INDEX IF EXISTS idx_product_insights_warehouse_week;
      DROP INDEX IF EXISTS idx_product_insights_total_sales;
      DROP INDEX IF EXISTS idx_product_insights_total_units;
    `);

    // Drop the materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS product_insights_aggregated_view;
    `);
  }
};
