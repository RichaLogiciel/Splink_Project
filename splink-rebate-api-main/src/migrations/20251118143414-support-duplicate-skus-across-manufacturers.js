"use strict";

/**
 * Migration to support duplicate SKUs across multiple manufacturers
 *
 * This migration updates line_items_products_joined_materialized_view to allow
 * the same line_item to appear multiple times when its SKU matches products from
 * different manufacturers. This fixes issues where SKUs shared by multiple manufacturers
 * (e.g., Hardware Wholesalers & Energizer) were only showing one manufacturer.
 *
 * Changes:
 * - Change DISTINCT ON (li.id) to DISTINCT ON (li.id, p.manufacturer_id)
 * - Update ORDER BY to include manufacturer_id as first ordering column
 * - This ensures one record per line_item per manufacturer
 */
module.exports = {
  async up(queryInterface) {
    console.log(
      "Step 1: Dropping dependent materialized view (product_insights_aggregated_view)..."
    );

    // Step 1: Drop product_insights_aggregated_view first (it depends on line_items_products_joined_materialized_view)
    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS product_insights_aggregated_view CASCADE;`
    );

    console.log(
      "Step 2: Dropping existing line_items_products_joined_materialized_view..."
    );

    // Step 2: Drop the existing view
    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS line_items_products_joined_materialized_view CASCADE;`
    );

    console.log(
      "Step 3: Creating new materialized view with DISTINCT ON (li.id, p.manufacturer_id)..."
    );

    // Step 3: Create the new view with DISTINCT ON (li.id, p.manufacturer_id) to support multiple manufacturers
    await queryInterface.sequelize.query(
      `
      CREATE MATERIALIZED VIEW line_items_products_joined_materialized_view AS
      SELECT DISTINCT ON (li.id, p.manufacturer_id)
        li.id,
        li.product_id,
        li.seller_id,
        li.seller_type,
        li.total_units,
        li.buyer_id,
        li.buyer_type,
        li.quantity,
        li.total_price,
        li.transaction_date,
        li.warehouse_id,
        li.sales_rep_id,
        p.id AS internal_product_id,
        p.manufacturer_id,
        pcm.code AS internal_code
      FROM
        line_items AS li
        JOIN
            products AS p
            ON (
                li.product_id = p.case_skus_id
                OR li.product_id = p.box_skus_id
                OR (li.product_id = p.unit_skus_id AND p.primary_variant = true)
            )
        LEFT JOIN LATERAL (
          SELECT pcm.code
          FROM product_code_mappings pcm
          WHERE pcm.product_id = p.id
            AND pcm.distributor_id = li.seller_id
            AND (pcm.warehouse_id = li.warehouse_id OR pcm.warehouse_id IS NULL)
            AND pcm.deleted_at IS NULL
          ORDER BY (pcm.warehouse_id = li.warehouse_id) DESC, pcm.id DESC
          LIMIT 1
        ) pcm ON TRUE
        WHERE
            li.deleted_at IS NULL
            AND p.deleted_at IS NULL
        ORDER BY
            li.id,
            p.manufacturer_id,
            CASE
              WHEN p.primary_variant = true THEN 1
              ELSE 2
            END,
            p.id DESC
      WITH DATA;
      `
    );

    console.log(
      "Step 4: Creating indexes on line_items_products_joined_materialized_view..."
    );

    // Step 4: Create indexes
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_buyer_type_id_date
       ON line_items_products_joined_materialized_view (buyer_type, buyer_id, transaction_date);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_seller_type_id_date
       ON line_items_products_joined_materialized_view (seller_type, seller_id, transaction_date);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_manufacturer_date
       ON line_items_products_joined_materialized_view (manufacturer_id, transaction_date);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_internal_product_id
       ON line_items_products_joined_materialized_view (internal_product_id);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_warehouse_id
       ON line_items_products_joined_materialized_view (warehouse_id);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_sales_rep_id
       ON line_items_products_joined_materialized_view (sales_rep_id);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_composite_buyer_seller_date
       ON line_items_products_joined_materialized_view (buyer_type, buyer_id, seller_type, seller_id, transaction_date);`
    );

    console.log("Step 5: Recreating product_insights_aggregated_view...");

    // Step 5: Recreate product_insights_aggregated_view using the current definition from database
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS product_insights_aggregated_view
      TABLESPACE pg_default
      AS
      WITH weekly_data AS (
          SELECT p.manufacturer_id,
             p.id AS product_id,
             p.name AS product_name,
             li.seller_id AS distributor_id,
             li.warehouse_id,
             li.buyer_id AS store_id,
             li.transaction_date,
             li.total_units,
             li.total_price,
             (date_trunc('week'::text, li.transaction_date))::date AS week_start,
             EXTRACT(year FROM li.transaction_date) AS year,
             EXTRACT(week FROM li.transaction_date) AS week
            FROM (line_items_products_joined_materialized_view li
              JOIN products p ON ((li.internal_product_id = p.id)))
           WHERE (((li.seller_type)::text = 'DISTRIBUTOR'::text) AND ((li.buyer_type)::text = 'STORE'::text) AND (p.deleted_at IS NULL))
         ), weeks_with_january AS (
          SELECT DISTINCT weekly_data.week_start
            FROM weekly_data
           WHERE ((EXTRACT(month FROM weekly_data.transaction_date) = (1)::numeric) AND (EXTRACT(day FROM weekly_data.transaction_date) = (1)::numeric))
         ), filtered_weekly_data AS (
          SELECT weekly_data.manufacturer_id,
             weekly_data.product_id,
             weekly_data.product_name,
             weekly_data.distributor_id,
             weekly_data.warehouse_id,
             weekly_data.store_id,
             weekly_data.transaction_date,
             weekly_data.total_units,
             weekly_data.total_price,
             weekly_data.week_start,
             weekly_data.year,
             weekly_data.week,
                 CASE
                     WHEN ((EXTRACT(year FROM weekly_data.week_start) < EXTRACT(year FROM weekly_data.transaction_date)) AND (EXTRACT(month FROM weekly_data.transaction_date) = (1)::numeric) AND (EXTRACT(day FROM weekly_data.transaction_date) <= (7)::numeric)) THEN EXTRACT(year FROM weekly_data.transaction_date)
                     ELSE EXTRACT(year FROM weekly_data.week_start)
                 END AS effective_year,
                 CASE
                     WHEN ((EXTRACT(year FROM weekly_data.week_start) < EXTRACT(year FROM weekly_data.transaction_date)) AND (EXTRACT(month FROM weekly_data.transaction_date) = (1)::numeric) AND (EXTRACT(day FROM weekly_data.transaction_date) <= (7)::numeric)) THEN (1)::numeric
                     ELSE weekly_data.week
                 END AS effective_week
            FROM weekly_data
           WHERE (NOT ((EXTRACT(month FROM weekly_data.transaction_date) = (12)::numeric) AND (EXTRACT(day FROM weekly_data.transaction_date) = ANY (ARRAY[(30)::numeric, (31)::numeric])) AND (weekly_data.week_start IN ( SELECT weeks_with_january.week_start
                    FROM weeks_with_january))))
         )
  SELECT manufacturer_id,
     product_id,
     product_name,
     distributor_id,
     warehouse_id,
     store_id,
     week_start,
     effective_year AS year,
     effective_week AS week,
     sum(total_units) AS total_units,
     sum(total_price) AS total_sales,
     count(*) AS transaction_count
    FROM filtered_weekly_data
   GROUP BY manufacturer_id, product_id, product_name, distributor_id, warehouse_id, store_id, week_start, effective_year, effective_week
   ORDER BY manufacturer_id, product_id, week_start
      WITH DATA;
    `);

    console.log(
      "Step 6: Creating indexes on product_insights_aggregated_view..."
    );

    // Step 6: Recreate all indexes for product_insights_aggregated_view
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

    console.log(
      "✓ Migration completed successfully - materialized views support duplicate SKUs across manufacturers"
    );
  },

  async down(queryInterface) {
    console.log("Reverting migration: Dropping materialized views...");

    // Drop product_insights_aggregated_view first
    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS product_insights_aggregated_view CASCADE;`
    );

    // Drop line_items_products_joined_materialized_view
    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS line_items_products_joined_materialized_view CASCADE;`
    );

    console.log(
      "Reverting: Recreating materialized views with original DISTINCT ON (li.id)..."
    );

    // Recreate line_items_products_joined_materialized_view with original DISTINCT ON (li.id)
    await queryInterface.sequelize.query(
      `
      CREATE MATERIALIZED VIEW line_items_products_joined_materialized_view AS
      SELECT DISTINCT ON (li.id)
        li.id,
        li.product_id,
        li.seller_id,
        li.seller_type,
        li.total_units,
        li.buyer_id,
        li.buyer_type,
        li.quantity,
        li.total_price,
        li.transaction_date,
        li.warehouse_id,
        li.sales_rep_id,
        p.id AS internal_product_id,
        p.manufacturer_id,
        pcm.code AS internal_code
      FROM
        line_items AS li
        JOIN
            products AS p
            ON (
                li.product_id = p.case_skus_id
                OR li.product_id = p.box_skus_id
                OR (li.product_id = p.unit_skus_id AND p.primary_variant = true)
            )
        LEFT JOIN LATERAL (
          SELECT pcm.code
          FROM product_code_mappings pcm
          WHERE pcm.product_id = p.id
            AND pcm.distributor_id = li.seller_id
            AND (pcm.warehouse_id = li.warehouse_id OR pcm.warehouse_id IS NULL)
            AND pcm.deleted_at IS NULL
          ORDER BY (pcm.warehouse_id = li.warehouse_id) DESC, pcm.id DESC
          LIMIT 1
        ) pcm ON TRUE
        WHERE
            li.deleted_at IS NULL
            AND p.deleted_at IS NULL
        ORDER BY
            li.id,
            CASE
              WHEN p.primary_variant = true THEN 1
              ELSE 2
            END,
            p.id DESC
      WITH DATA;
      `
    );

    // Recreate indexes
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_buyer_type_id_date
       ON line_items_products_joined_materialized_view (buyer_type, buyer_id, transaction_date);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_seller_type_id_date
       ON line_items_products_joined_materialized_view (seller_type, seller_id, transaction_date);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_manufacturer_date
       ON line_items_products_joined_materialized_view (manufacturer_id, transaction_date);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_internal_product_id
       ON line_items_products_joined_materialized_view (internal_product_id);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_warehouse_id
       ON line_items_products_joined_materialized_view (warehouse_id);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_sales_rep_id
       ON line_items_products_joined_materialized_view (sales_rep_id);`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_mv_composite_buyer_seller_date
       ON line_items_products_joined_materialized_view (buyer_type, buyer_id, seller_type, seller_id, transaction_date);`
    );

    // Recreate product_insights_aggregated_view
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS product_insights_aggregated_view
      TABLESPACE pg_default
      AS
      WITH weekly_data AS (
          SELECT p.manufacturer_id,
             p.id AS product_id,
             p.name AS product_name,
             li.seller_id AS distributor_id,
             li.warehouse_id,
             li.buyer_id AS store_id,
             li.transaction_date,
             li.total_units,
             li.total_price,
             (date_trunc('week'::text, li.transaction_date))::date AS week_start,
             EXTRACT(year FROM li.transaction_date) AS year,
             EXTRACT(week FROM li.transaction_date) AS week
            FROM (line_items_products_joined_materialized_view li
              JOIN products p ON ((li.internal_product_id = p.id)))
           WHERE (((li.seller_type)::text = 'DISTRIBUTOR'::text) AND ((li.buyer_type)::text = 'STORE'::text) AND (p.deleted_at IS NULL))
         ), weeks_with_january AS (
          SELECT DISTINCT weekly_data.week_start
            FROM weekly_data
           WHERE ((EXTRACT(month FROM weekly_data.transaction_date) = (1)::numeric) AND (EXTRACT(day FROM weekly_data.transaction_date) = (1)::numeric))
         ), filtered_weekly_data AS (
          SELECT weekly_data.manufacturer_id,
             weekly_data.product_id,
             weekly_data.product_name,
             weekly_data.distributor_id,
             weekly_data.warehouse_id,
             weekly_data.store_id,
             weekly_data.transaction_date,
             weekly_data.total_units,
             weekly_data.total_price,
             weekly_data.week_start,
             weekly_data.year,
             weekly_data.week,
                 CASE
                     WHEN ((EXTRACT(year FROM weekly_data.week_start) < EXTRACT(year FROM weekly_data.transaction_date)) AND (EXTRACT(month FROM weekly_data.transaction_date) = (1)::numeric) AND (EXTRACT(day FROM weekly_data.transaction_date) <= (7)::numeric)) THEN EXTRACT(year FROM weekly_data.transaction_date)
                     ELSE EXTRACT(year FROM weekly_data.week_start)
                 END AS effective_year,
                 CASE
                     WHEN ((EXTRACT(year FROM weekly_data.week_start) < EXTRACT(year FROM weekly_data.transaction_date)) AND (EXTRACT(month FROM weekly_data.transaction_date) = (1)::numeric) AND (EXTRACT(day FROM weekly_data.transaction_date) <= (7)::numeric)) THEN (1)::numeric
                     ELSE weekly_data.week
                 END AS effective_week
            FROM weekly_data
           WHERE (NOT ((EXTRACT(month FROM weekly_data.transaction_date) = (12)::numeric) AND (EXTRACT(day FROM weekly_data.transaction_date) = ANY (ARRAY[(30)::numeric, (31)::numeric])) AND (weekly_data.week_start IN ( SELECT weeks_with_january.week_start
                    FROM weeks_with_january))))
         )
  SELECT manufacturer_id,
     product_id,
     product_name,
     distributor_id,
     warehouse_id,
     store_id,
     week_start,
     effective_year AS year,
     effective_week AS week,
     sum(total_units) AS total_units,
     sum(total_price) AS total_sales,
     count(*) AS transaction_count
    FROM filtered_weekly_data
   GROUP BY manufacturer_id, product_id, product_name, distributor_id, warehouse_id, store_id, week_start, effective_year, effective_week
   ORDER BY manufacturer_id, product_id, week_start
      WITH DATA;
    `);

    // Recreate indexes for product_insights_aggregated_view
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

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_store_product_week 
      ON product_insights_aggregated_view(store_id, product_id, week_start);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_warehouse_week 
      ON product_insights_aggregated_view(warehouse_id, week_start);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_total_sales 
      ON product_insights_aggregated_view(total_sales DESC);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_insights_total_units 
      ON product_insights_aggregated_view(total_units DESC);
    `);

    console.log("✓ Migration reverted successfully");
  }
};
