"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the materialized view and all indexes if they exist
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_mv_buyer_type_id_date;
      DROP INDEX IF EXISTS idx_mv_seller_type_id_date;
      DROP INDEX IF EXISTS idx_mv_warehouse_date;
      DROP INDEX IF EXISTS idx_mv_product_date;
      DROP INDEX IF EXISTS idx_mv_manufacturer_date;
      DROP MATERIALIZED VIEW IF EXISTS line_items_products_joined_materialized_view;
    `);

    // Check if the column already exists before adding
    const table = "product_code_mappings";
    const column = "category_tags_json";
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}'
    `);
    if (results.length === 0) {
      await queryInterface.addColumn(table, column, {
        type: Sequelize.JSONB,
        allowNull: true
      });
    }
    const [codeCol] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${table}' 
      AND column_name = 'code'
    `);
    if (codeCol.length > 0) {
      await queryInterface.changeColumn(table, "code", {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Create materialized view for chain-level aggregations (idempotent)
    await queryInterface.sequelize.query(`
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
      LEFT JOIN product_code_mappings as pcm on pcm.product_id = p.id and pcm.warehouse_id = li.warehouse_id
        WHERE p.id is not null
      AND li.deleted_at is null
      AND p.deleted_at is null
      ORDER BY p.id DESC
      WITH DATA;

      -- 1. Composite index for buyer-side queries
      CREATE INDEX idx_mv_buyer_type_id_date
      ON line_items_products_joined_materialized_view (
          buyer_type,
          buyer_id,
          transaction_date
      );

      -- 2. Composite index for seller-side queries
      CREATE INDEX idx_mv_seller_type_id_date
      ON line_items_products_joined_materialized_view (
          seller_type,
          seller_id,
          transaction_date
      );

      -- 3. Index for warehouse filters
      CREATE INDEX idx_mv_warehouse_date
      ON line_items_products_joined_materialized_view (
          warehouse_id,
          transaction_date
      );

      -- 4. Index for product lookups (SKU filtering)
      CREATE INDEX idx_mv_product_date
      ON line_items_products_joined_materialized_view (
          product_id,
          transaction_date
      );

      -- 5. Manufacturer + date (for manufacturer-specific reports)
      CREATE INDEX idx_mv_manufacturer_date
      ON line_items_products_joined_materialized_view (
          manufacturer_id,
          transaction_date
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop the materialized view and all indexes if they exist
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_mv_buyer_type_id_date;
      DROP INDEX IF EXISTS idx_mv_seller_type_id_date;
      DROP INDEX IF EXISTS idx_mv_warehouse_date;
      DROP INDEX IF EXISTS idx_mv_product_date;
      DROP INDEX IF EXISTS idx_mv_manufacturer_date;
      DROP MATERIALIZED VIEW IF EXISTS line_items_products_joined_materialized_view;
    `);

    // Remove the column if it exists
    const table = "product_code_mappings";
    const column = "category_tags_json";
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}'
    `);
    if (results.length > 0) {
      await queryInterface.removeColumn(table, column);
    }

    // Create materialized view for chain-level aggregations (idempotent)
    await queryInterface.sequelize.query(`
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
      LEFT JOIN product_code_mappings as pcm on pcm.product_id = p.id and pcm.warehouse_id = li.warehouse_id
        WHERE p.id is not null
      AND li.deleted_at is null
      AND p.deleted_at is null
      ORDER BY p.id DESC
      WITH DATA;

      -- 1. Composite index for buyer-side queries
      CREATE INDEX idx_mv_buyer_type_id_date
      ON line_items_products_joined_materialized_view (
          buyer_type,
          buyer_id,
          transaction_date
      );

      -- 2. Composite index for seller-side queries
      CREATE INDEX idx_mv_seller_type_id_date
      ON line_items_products_joined_materialized_view (
          seller_type,
          seller_id,
          transaction_date
      );

      -- 3. Index for warehouse filters
      CREATE INDEX idx_mv_warehouse_date
      ON line_items_products_joined_materialized_view (
          warehouse_id,
          transaction_date
      );

      -- 4. Index for product lookups (SKU filtering)
      CREATE INDEX idx_mv_product_date
      ON line_items_products_joined_materialized_view (
          product_id,
          transaction_date
      );

      -- 5. Manufacturer + date (for manufacturer-specific reports)
      CREATE INDEX idx_mv_manufacturer_date
      ON line_items_products_joined_materialized_view (
          manufacturer_id,
          transaction_date
      );
    `);
  }
};
