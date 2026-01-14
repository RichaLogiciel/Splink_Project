"use strict";

module.exports = {
  async up(queryInterface) {
    // Drop and recreate the materialized view with final December exclusion
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS product_insights_aggregated_view;
      CREATE MATERIALIZED VIEW IF NOT EXISTS product_insights_aggregated_view
      TABLESPACE pg_default
      AS
      WITH weekly_data AS (
        SELECT 
            p.manufacturer_id,
            p.id AS product_id,
            p.name AS product_name,
            li.seller_id AS distributor_id,
            li.warehouse_id,
            li.buyer_id AS store_id,
            li.transaction_date,
            li.total_units,
            li.total_price,
            -- Calculate week start with timezone handling
            DATE_TRUNC('week', li.transaction_date AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata' AS week_start,
            EXTRACT(year FROM li.transaction_date) AS year,
            EXTRACT(week FROM li.transaction_date) AS week
        FROM line_items_products_joined_materialized_view li
        JOIN products p ON li.internal_product_id = p.id
        WHERE li.seller_type = 'DISTRIBUTOR' 
          AND li.buyer_type = 'STORE'
          AND p.deleted_at IS NULL
      ),
      weeks_with_january AS (
        -- Find all weeks that contain January 1st of any year
        SELECT DISTINCT week_start
        FROM weekly_data
        WHERE EXTRACT(month FROM transaction_date) = 1 
          AND EXTRACT(day FROM transaction_date) = 1
      ),
      filtered_weekly_data AS (
        SELECT 
            manufacturer_id,
            product_id,
            product_name,
            distributor_id,
            warehouse_id,
            store_id,
            transaction_date,
            total_units,
            total_price,
            week_start,
            year,
            week,
            -- Create a dynamic week identifier that handles year boundaries
            CASE 
              -- If the week starts in previous year but contains current year dates, 
              -- use the current year for grouping
              WHEN EXTRACT(year FROM week_start) < EXTRACT(year FROM transaction_date) 
                AND EXTRACT(month FROM transaction_date) = 1 
                AND EXTRACT(day FROM transaction_date) <= 7
              THEN EXTRACT(year FROM transaction_date)
              ELSE EXTRACT(year FROM week_start)
            END AS effective_year,
            -- Create a week identifier that's consistent across year boundaries
            CASE 
              -- For weeks that start in previous year but contain current year dates,
              -- use week 1 of the current year
              WHEN EXTRACT(year FROM week_start) < EXTRACT(year FROM transaction_date) 
                AND EXTRACT(month FROM transaction_date) = 1 
                AND EXTRACT(day FROM transaction_date) <= 7
              THEN 1
              ELSE week
            END AS effective_week
        FROM weekly_data
        -- Exclude December 30-31 transactions from weeks that contain January 1st
        WHERE NOT (
          EXTRACT(month FROM transaction_date) = 12 
          AND EXTRACT(day FROM transaction_date) IN (30, 31)
          AND week_start IN (SELECT week_start FROM weeks_with_january)
        )
      )
      SELECT 
          manufacturer_id,
          product_id,
          product_name,
          distributor_id,
          warehouse_id,
          store_id,
          week_start,
          effective_year AS year,
          effective_week AS week,
          SUM(total_units) AS total_units,
          SUM(total_price) AS total_sales,
          COUNT(*) AS transaction_count
      FROM filtered_weekly_data
      GROUP BY 
          manufacturer_id, product_id, product_name, 
          distributor_id, warehouse_id, store_id,
          week_start, effective_year, effective_week
      ORDER BY manufacturer_id, product_id, week_start
      WITH DATA;
    `);

    // Recreate all the indexes
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
  },

  async down(queryInterface) {
    // Drop the materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS product_insights_aggregated_view;
    `);

    // Recreate the original materialized view
    await queryInterface.sequelize.query(`
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

    // Recreate all indexes
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
  }
};
