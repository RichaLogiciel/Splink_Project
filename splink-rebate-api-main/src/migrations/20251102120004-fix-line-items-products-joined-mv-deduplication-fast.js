"use strict";

/**
 * Fast migration to fix duplicate total_price issue in line_items_products_joined_materialized_view
 * Skips diagnostic checks to avoid timeout on large datasets
 */

module.exports = {
  async up(queryInterface) {
    console.log("Dropping existing materialized view...");

    // Drop the existing view
    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS line_items_products_joined_materialized_view CASCADE;`
    );

    console.log("Creating new deduped materialized view...");

    // Create the new view with DISTINCT ON deduplication
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
                 (li.splink_product_id IS NOT NULL AND p.id = li.splink_product_id)
                 OR
                 (li.splink_product_id IS NULL AND (
                    (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                    OR li.product_id IN (p.case_skus_id, p.box_skus_id)
                 ))
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
              WHEN li.splink_product_id IS NOT NULL AND p.id = li.splink_product_id THEN 1
              WHEN p.primary_variant = true THEN 2
              ELSE 3
            END,
            p.id DESC
      WITH DATA;
      `
    );

    console.log("Creating indexes on materialized view...");

    // Create indexes
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

    console.log(
      "✓ Materialized view recreated successfully with deduplication"
    );
  },

  async down(queryInterface) {
    console.log("Dropping deduped materialized view...");

    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS line_items_products_joined_materialized_view CASCADE;`
    );

    console.log("✓ Materialized view dropped");
  }
};
