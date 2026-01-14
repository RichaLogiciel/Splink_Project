"use strict";

module.exports = {
  async up(queryInterface) {
    // Step 1: Drop product_insights_aggregated_view first (it depends on line_items_products_joined_materialized_view)
    // await queryInterface.sequelize.query(`
    //   DROP MATERIALIZED VIEW IF EXISTS product_insights_aggregated_view;
    // `);
    // // Step 2: Drop and recreate the materialized view with the simplified JOIN using splink_product_id
    // await queryInterface.sequelize.query(`
    //   DROP MATERIALIZED VIEW IF EXISTS line_items_products_joined_materialized_view;
    //   CREATE MATERIALIZED VIEW public.line_items_products_joined_materialized_view
    //   TABLESPACE pg_default
    //   AS
    //     SELECT
    //         p.manufacturer_id AS manufacturer_id,
    //         p.id AS internal_product_id,
    //         li.product_id,
    //         li.seller_id,
    //         li.buyer_id,
    //         li.transaction_date,
    //         li.total_units,
    //         li.quantity,
    //         li.total_price,
    //         li.buyer_type,
    //         li.seller_type,
    //         li.warehouse_id,
    //         pcm.code as internal_code,
    //         p.unit_skus_id,
    //         p.case_skus_id,
    //         p.box_skus_id
    //     FROM
    //         line_items AS li
    //     JOIN
    //         products AS p ON li.splink_product_id = p.id
    //     LEFT JOIN
    //         product_code_mappings as pcm ON pcm.product_id = p.id AND pcm.warehouse_id = li.warehouse_id
    //     WHERE
    //         li.deleted_at IS NULL
    //         AND p.deleted_at IS NULL
    //     ORDER BY p.id DESC
    //   WITH DATA;
    //   -- Recreate all indexes
    //   -- 1. Composite index for buyer-side queries
    //   CREATE INDEX idx_mv_buyer_type_id_date
    //   ON line_items_products_joined_materialized_view (
    //       buyer_type,
    //       buyer_id,
    //       transaction_date
    //   );
    //   -- 2. Composite index for seller-side queries
    //   CREATE INDEX idx_mv_seller_type_id_date
    //   ON line_items_products_joined_materialized_view (
    //       seller_type,
    //       seller_id,
    //       transaction_date
    //   );
    //   -- 3. Index for warehouse filters
    //   CREATE INDEX idx_mv_warehouse_date
    //   ON line_items_products_joined_materialized_view (
    //       warehouse_id,
    //       transaction_date
    //   );
    //   -- 4. Index for product lookups (SKU filtering)
    //   CREATE INDEX idx_mv_product_date
    //   ON line_items_products_joined_materialized_view (
    //       product_id,
    //       transaction_date
    //   );
    //   -- 5. Manufacturer + date (for manufacturer-specific reports)
    //   CREATE INDEX idx_mv_manufacturer_date
    //   ON line_items_products_joined_materialized_view (
    //       manufacturer_id,
    //       transaction_date
    //   );
    // `);
    // // Step 3: Recreate product_insights_aggregated_view now that line_items_products_joined_materialized_view is updated
    // await queryInterface.sequelize.query(`
    //   CREATE MATERIALIZED VIEW IF NOT EXISTS product_insights_aggregated_view
    //   TABLESPACE pg_default
    //   AS
    //   SELECT
    //       p.manufacturer_id,
    //       p.id AS product_id,
    //       p.name AS product_name,
    //       li.seller_id AS distributor_id,
    //       li.warehouse_id,
    //       li.buyer_id AS store_id,
    //       DATE_TRUNC('week', li.transaction_date) AS week_start,
    //       EXTRACT(year FROM li.transaction_date) AS year,
    //       EXTRACT(week FROM li.transaction_date) AS week,
    //       SUM(li.total_units) AS total_units,
    //       SUM(li.total_price) AS total_sales,
    //       COUNT(*) AS transaction_count
    //   FROM line_items_products_joined_materialized_view li
    //   JOIN products p ON li.internal_product_id = p.id
    //   WHERE li.seller_type = 'DISTRIBUTOR'
    //     AND li.buyer_type = 'STORE'
    //     AND p.deleted_at IS NULL
    //   GROUP BY
    //       p.manufacturer_id, p.id, p.name,
    //       li.seller_id, li.warehouse_id, li.buyer_id,
    //       DATE_TRUNC('week', li.transaction_date),
    //       EXTRACT(year FROM li.transaction_date),
    //       EXTRACT(week FROM li.transaction_date)
    //   ORDER BY p.manufacturer_id, p.id, week_start
    //   WITH DATA;
    // `);
    // // Step 4: Recreate all indexes for product_insights_aggregated_view
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_manufacturer_id
    //   ON product_insights_aggregated_view(manufacturer_id);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_product_id
    //   ON product_insights_aggregated_view(product_id);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_distributor_id
    //   ON product_insights_aggregated_view(distributor_id);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_store_id
    //   ON product_insights_aggregated_view(store_id);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_week_start
    //   ON product_insights_aggregated_view(week_start);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_year_week
    //   ON product_insights_aggregated_view(year, week);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_manufacturer_distributor_week
    //   ON product_insights_aggregated_view(manufacturer_id, distributor_id, week_start);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_manufacturer_product_week
    //   ON product_insights_aggregated_view(manufacturer_id, product_id, week_start);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_distributor_product_week
    //   ON product_insights_aggregated_view(distributor_id, product_id, week_start);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_store_product_week
    //   ON product_insights_aggregated_view(store_id, product_id, week_start);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_warehouse_week
    //   ON product_insights_aggregated_view(warehouse_id, week_start);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_total_sales
    //   ON product_insights_aggregated_view(total_sales DESC);
    // `);
    // await queryInterface.sequelize.query(`
    //   CREATE INDEX IF NOT EXISTS idx_product_insights_total_units
    //   ON product_insights_aggregated_view(total_units DESC);
    // `);
  },

  async down(queryInterface) {
    // Step 1: Drop product_insights_aggregated_view first (it depends on line_items_products_joined_materialized_view)
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS product_insights_aggregated_view;
    `);

    // Step 2: Revert to the old version with the complex JOIN condition
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS line_items_products_joined_materialized_view;

      CREATE MATERIALIZED VIEW public.line_items_products_joined_materialized_view
      TABLESPACE pg_default
      AS
        SELECT
            p.manufacturer_id AS manufacturer_id,
            p.id AS internal_product_id,
            li.product_id,
            li.seller_id,
            li.buyer_id,
            li.transaction_date,
            li.total_units,
            li.quantity,
            li.total_price,
            li.buyer_type,
            li.seller_type,
            li.warehouse_id,
            pcm.code as internal_code,
            p.unit_skus_id,
            p.case_skus_id,
            p.box_skus_id
        FROM
            line_items AS li
        JOIN
            products AS p
            ON (
                (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                OR li.product_id IN (p.case_skus_id, p.box_skus_id)
            )
        LEFT JOIN
            product_code_mappings as pcm ON pcm.product_id = p.id AND pcm.warehouse_id = li.warehouse_id
        WHERE
            p.id IS NOT NULL
            AND li.deleted_at IS NULL
            AND p.deleted_at IS NULL
        ORDER BY p.id DESC
      WITH DATA;

      -- Recreate all indexes
      CREATE INDEX idx_mv_buyer_type_id_date
      ON line_items_products_joined_materialized_view (buyer_type, buyer_id, transaction_date);

      CREATE INDEX idx_mv_seller_type_id_date
      ON line_items_products_joined_materialized_view (seller_type, seller_id, transaction_date);

      CREATE INDEX idx_mv_warehouse_date
      ON line_items_products_joined_materialized_view (warehouse_id, transaction_date);

      CREATE INDEX idx_mv_product_date
      ON line_items_products_joined_materialized_view (product_id, transaction_date);

      CREATE INDEX idx_mv_manufacturer_date
      ON line_items_products_joined_materialized_view (manufacturer_id, transaction_date);
    `);

    // Step 3: Recreate product_insights_aggregated_view with the old line_items view
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

    // Step 4: Recreate all indexes for product_insights_aggregated_view
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
  }
};
