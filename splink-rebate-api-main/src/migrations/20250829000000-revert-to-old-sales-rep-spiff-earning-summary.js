"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Drop the existing materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.sales_rep_spiff_earning_summary;
    `);

    // Restore the old complex calculation version
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW sales_rep_spiff_earning_summary AS
      WITH store_transactions AS (
          SELECT
              li.buyer_id AS store_id,
              p.manufacturer_id,
              li.seller_id AS distributor_id,
              min(li.product_id) AS product_id,
              sum(li.quantity) AS quantity,
              sum(li.total_price) AS total_price,
              p.case_skus_id,
              p.box_skus_id,
              p.unit_skus_id,
              p.category_tags_json AS category_tags,
              pro.id AS program_id,
              pro.start_date AS program_start_date,
              pro.end_date AS program_end_date,
              sum(
                  CASE
                      WHEN (li.product_id = p.case_skus_id) THEN li.quantity
                      ELSE (0)::numeric
                  END) AS case_sku_quantity,
              sum(
                  CASE
                      WHEN (li.product_id = p.box_skus_id) THEN li.quantity
                      ELSE (0)::numeric
                  END) AS box_sku_quantity
          FROM ((line_items li
              JOIN products p ON (((li.product_id = p.case_skus_id) OR (li.product_id = p.box_skus_id) OR ((li.product_id = p.unit_skus_id) AND (p.primary_variant = true)))))
              JOIN programs pro ON (((pro.manufacturer_id = p.manufacturer_id) AND ((pro.participant_type)::text = 'SALES_REP'::text))))
          WHERE (((li.buyer_type)::text = 'STORE'::text)
              AND ((li.seller_type)::text = 'DISTRIBUTOR'::text)
              AND ((li.transaction_date >= pro.start_date) AND (li.transaction_date <= pro.end_date))
              AND (li.deleted_at IS NULL)
              AND (pro.deleted_at IS NULL)
              AND (p.deleted_at IS NULL))
          GROUP BY p.id, li.seller_id, li.buyer_id, li.buyer_type, li.seller_type, pro.id
          HAVING (sum(li.total_price) > (0)::numeric)
      ),
      store_compliance_stats AS (
          SELECT
              st.store_id,
              st.manufacturer_id,
              st.distributor_id,
              pd.id AS program_detail_id,
              pd.program_id,
              pd.rebate_calculation,
              pd.rebate_amount,
              pd.max_qty,
              pd.products_tags,
              CASE
                  WHEN ((pd.rebate_calculation)::text = 'Fixed $ amount Per Store Compliance'::text) THEN
                      CASE
                          WHEN (EXISTS (
                              SELECT 1
                              FROM program_compliances pc
                              WHERE ((pc.entity_id = st.store_id) AND ((pc.entity_type)::text = 'STORE'::text) AND (pc.is_qualified = true) AND ((pc.status)::text = 'active'::text) AND (pc.program_detail_id IN (
                                  SELECT program_details.id
                                  FROM program_details
                                  WHERE ((program_details.program_id IN (
                                      SELECT programs.id
                                      FROM programs
                                      WHERE (((programs.participant_type)::text = 'STORE'::text) AND (programs.manufacturer_id = st.manufacturer_id)))) AND (program_details.tier = pd.tier))
                                  LIMIT 1)) AND ((date(pc.compliance_date) >= date(st.program_start_date)) AND (date(pc.compliance_date) <= date(st.program_end_date))))
                          )) THEN pd.rebate_amount
                          ELSE (0)::numeric
                      END
                  WHEN ((pd.rebate_calculation)::text = 'Fixed $ amount Per Item Per Store (Per POD)'::text) THEN
                      (LEAST((count(DISTINCT st.product_id))::numeric, COALESCE(pd.max_qty, (count(DISTINCT st.product_id))::numeric)) * pd.rebate_amount)
                  WHEN ((pd.rebate_calculation)::text = 'Fixed $ amount Per Category Item Per Store'::text) THEN
                      (sum(
                          CASE
                              WHEN (pd.products_tags IS NULL OR pd.products_tags = '') THEN st.quantity
                              WHEN (pd.products_tags LIKE '%,%') THEN
                                  CASE
                                      WHEN EXISTS (
                                          SELECT 1
                                          FROM unnest(string_to_array(pd.products_tags, ',')) AS tag
                                          WHERE st.category_tags @> CONCAT('["', trim(tag), '"]')::jsonb
                                      ) THEN st.quantity
                                      ELSE (0)::numeric
                                  END
                              ELSE
                                  CASE
                                      WHEN (st.category_tags @> CONCAT('["', pd.products_tags, '"]')::jsonb) THEN st.quantity
                                      ELSE (0)::numeric
                                  END
                          END) * pd.rebate_amount)
                  WHEN ((pd.rebate_calculation)::text = 'Fixed $ amount Per Quantity'::text) THEN
                      (LEAST(sum(
                          CASE
                              WHEN ((pd.quantity_type)::text = 'box'::text) THEN st.box_sku_quantity
                              WHEN ((pd.quantity_type)::text = 'unit'::text) THEN st.quantity
                              ELSE st.case_sku_quantity
                          END), COALESCE(pd.max_qty, sum(
                          CASE
                              WHEN ((pd.quantity_type)::text = 'box'::text) THEN st.box_sku_quantity
                              WHEN ((pd.quantity_type)::text = 'unit'::text) THEN st.quantity
                              ELSE st.case_sku_quantity
                          END))) * pd.rebate_amount)
                  WHEN ((pd.rebate_calculation)::text = 'Fixed $ amount Per Item'::text) THEN
                      (LEAST((count(DISTINCT st.product_id))::numeric, COALESCE(pd.max_qty, (count(DISTINCT st.product_id))::numeric)) * pd.rebate_amount)
                  ELSE (0)::numeric
              END AS earning,
              count(DISTINCT st.product_id) AS unique_products,
              sum(
                  CASE
                      WHEN ((pd.rebate_calculation)::text = 'Fixed $ amount Per Quantity'::text) THEN
                          CASE
                              WHEN ((pd.quantity_type)::text = 'box'::text) THEN st.box_sku_quantity
                              WHEN ((pd.quantity_type)::text = 'unit'::text) THEN st.quantity
                              ELSE st.case_sku_quantity
                          END
                      WHEN ((pd.rebate_calculation)::text = 'Fixed $ amount Per Category Item Per Store'::text) THEN
                          CASE
                              WHEN (pd.products_tags IS NULL OR pd.products_tags = '') THEN st.quantity
                              WHEN (pd.products_tags LIKE '%,%') THEN
                                  CASE
                                      WHEN EXISTS (
                                          SELECT 1
                                          FROM unnest(string_to_array(pd.products_tags, ',')) AS tag
                                          WHERE st.category_tags @> CONCAT('["', trim(tag), '"]')::jsonb
                                      ) THEN st.quantity
                                      ELSE (0)::numeric
                                  END
                              ELSE
                                  CASE
                                      WHEN (st.category_tags @> CONCAT('["', pd.products_tags, '"]')::jsonb) THEN st.quantity
                                      ELSE (0)::numeric
                                  END
                          END
                      ELSE st.quantity
                  END) AS total_quantity,
              sum(st.total_price) AS total_purchase
          FROM (store_transactions st
              JOIN program_details pd ON ((st.program_id = pd.program_id)))
          WHERE (pd.deleted_at IS NULL)
          GROUP BY st.store_id, st.manufacturer_id, st.distributor_id, st.program_start_date, st.program_end_date, pd.id, pd.program_id, pd.rebate_calculation, pd.rebate_amount, pd.max_qty, pd.products_tags
      )
      SELECT
          store_id,
          manufacturer_id,
          distributor_id,
          program_detail_id,
          program_id,
          rebate_calculation,
          unique_products,
          total_quantity,
          total_purchase,
          CASE
              WHEN program_id IN (82,83) THEN 0
              ELSE earning
          END AS earning
      FROM store_compliance_stats
      WHERE (earning > (0)::numeric OR program_id IN (82,83))
      ORDER BY manufacturer_id;
    `);

    // Create indexes for better performance
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_rep_spiff_earning_summary_store_id
      ON sales_rep_spiff_earning_summary (store_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_rep_spiff_earning_summary_manufacturer_id
      ON sales_rep_spiff_earning_summary (manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_rep_spiff_earning_summary_distributor_id
      ON sales_rep_spiff_earning_summary (distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_rep_spiff_earning_summary_program_detail_id
      ON sales_rep_spiff_earning_summary (program_detail_id);
    `);
  },

  async down(queryInterface) {
    // Drop indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_rep_spiff_earning_summary_store_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_rep_spiff_earning_summary_manufacturer_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_rep_spiff_earning_summary_distributor_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_rep_spiff_earning_summary_program_detail_id;
    `);

    // Drop the materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.sales_rep_spiff_earning_summary;
    `);

    // Restore the simplified version from 20250827000000
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW sales_rep_spiff_earning_summary AS
      SELECT DISTINCT
          s.id AS store_id,
          p.manufacturer_id,
          ur.parent_entity_id AS distributor_id,
          pd.id AS program_detail_id,
          p.id AS program_id,
          pd.rebate_calculation,
          pc.unique_products,
          pc.total_quantity,
          pc.total_purchase_volume AS total_purchase,
          CASE
              WHEN p.id IN (82, 83) THEN 0
              ELSE pc.earned_rebate
          END AS earning
      FROM stores s
      INNER JOIN user_roles ur ON ur.associated_user_id = s.id
          AND ur.associated_entity_type = 'STORE'
          AND ur.role = 'STORE'
          AND ur.deleted_at IS NULL
      INNER JOIN program_compliances pc ON pc.entity_id = s.id
          AND pc.entity_type = 'STORE'
          AND pc.deleted_at IS NULL
      INNER JOIN program_details pd ON pd.id = pc.program_detail_id
          AND pd.deleted_at IS NULL
      INNER JOIN programs p ON p.id = pd.program_id
          AND p.participant_type = 'SALES_REP'
          AND p.deleted_at IS NULL
      WHERE s.deleted_at IS NULL
          AND (pc.earned_rebate > 0 OR p.id IN (82, 83))
      ORDER BY p.manufacturer_id, s.id;
    `);
  }
};
