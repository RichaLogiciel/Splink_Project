"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_store_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_distributor_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_manufacturer_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_transaction_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_store_distributor;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_manufacturer_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_distributor_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_covering;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_covering;
    `);

    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
      TABLESPACE pg_default
      AS
        WITH highest_program_tiers AS (
          SELECT pd.id
            FROM program_details pd
              JOIN ( SELECT program_details.program_id,
                      max(program_details.tier) AS max_tier
                    FROM program_details
                    WHERE program_details.deleted_at IS NULL
                    GROUP BY program_details.program_id) mx ON pd.program_id = mx.program_id AND pd.tier = mx.max_tier
            WHERE pd.deleted_at IS NULL
          ),
          rebate_mapping AS (
              SELECT pro_d.id AS program_detail_id,
                    TRIM(ft.category) AS category,
                    (string_to_array(pro_d.fixed_rebate_amount, ','))[ft.idx]::numeric AS rebate_val
              FROM program_details pro_d
              CROSS JOIN LATERAL unnest(string_to_array(pro_d.fixed_rebate_category, ',')) 
                  WITH ORDINALITY AS ft(category, idx)
          ),
          product_categories AS (
              SELECT p.id AS product_id,
                    tag.tag_value AS category
              FROM products p
              CROSS JOIN LATERAL jsonb_array_elements_text(p.category_tags_json) AS tag(tag_value)
          )
          SELECT min(li.seller_id) AS distributor_id,
              pro.manufacturer_id,
              pro_d.program_id,
              pro_d.id AS program_detail_id,
              li.buyer_id AS store_id,
              sum(COALESCE(
                  CASE
                      WHEN pro_d.rebate_calculation_type::text = 'list_value'::text THEN
                      CASE
                          WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity::double precision
                          WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity::double precision
                          WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity::double precision
                          ELSE 0::double precision
                      END
                      ELSE li.total_price::double precision
                  END, 0::double precision)) AS total_purchase,
                  CASE
                WHEN pro_d.rebate_type = 'per_category_item' THEN
                      SUM(
                          CASE 
                              WHEN pro_d.quantity_type = 'unit'
                                  THEN li.total_units::numeric
                                  ELSE li.quantity::numeric
                          END * rm.rebate_val
                      )::double precision
                
                      WHEN pro_d.rebate_type::text = 'percentage'::text THEN sum(COALESCE(
                      CASE
                          WHEN pro_d.rebate_calculation_type::text = 'list_value'::text THEN
                          CASE
                              WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity::double precision
                              WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity::double precision
                              WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity::double precision
                              ELSE 0::double precision
                          END
                          ELSE li.total_price::double precision
                      END * pro_d.rebate_percentage::double precision / 100::double precision, 0::double precision))
                      WHEN pro_d.rebate_type::text = 'fixed'::text THEN sum(
                      CASE
                          WHEN pro_d.quantity_type IS NOT NULL THEN
                          CASE
                              WHEN (pro_d.quantity_type::text = 'unit'::text AND li.product_id = p.unit_skus_id OR pro_d.quantity_type::text = 'case'::text AND li.product_id = p.case_skus_id OR pro_d.quantity_type::text = 'box'::text AND li.product_id = p.box_skus_id) AND (pro_d.min_qty > 0::numeric OR pro_d.max_qty > 0::numeric) THEN pro_d.rebate_amount * li.quantity
                              ELSE 0::numeric
                          END
                          ELSE
                          CASE
                              WHEN pro_d.min_qty > 0::numeric OR pro_d.max_qty > 0::numeric THEN pro_d.rebate_amount * li.quantity
                              ELSE 0::numeric
                          END
                      END::double precision) +
                      CASE
                          WHEN pro_d.quantity_type IS NULL AND (pro_d.min_qty = 0::numeric OR pro_d.min_qty IS NULL) AND (pro_d.max_qty = 0::numeric OR pro_d.max_qty IS NULL) THEN pro_d.rebate_amount
                          ELSE 0::numeric
                      END::double precision
                      ELSE 0::double precision
                  END AS rebate_opportunity,
              bool_or((pro_d.id IN ( SELECT highest_program_tiers.id
                    FROM highest_program_tiers))) AS highest_tier,
              EXTRACT(year FROM li.transaction_date) AS transaction_year
            FROM line_items_products_joined_materialized_view li
              JOIN products p ON li.internal_product_id = p.id
              JOIN programs pro ON li.manufacturer_id = pro.manufacturer_id AND (pro.participant_type::text = 'STORE'::text OR pro.participant_type::text = 'CHAIN'::text)
              JOIN program_details pro_d ON pro.id = pro_d.program_id
              JOIN rebate_mapping rm ON rm.program_detail_id = pro_d.id
            WHERE li.transaction_date >= date(pro.start_date) AND li.transaction_date <= date(pro.end_date) AND pro_d.deleted_at IS NULL AND pro.deleted_at IS NULL AND li.buyer_type::text = 'STORE'::text AND li.seller_type::text = 'DISTRIBUTOR'::text
            GROUP BY pro.manufacturer_id, pro.id, pro_d.id, li.buyer_id, (EXTRACT(year FROM li.transaction_date))
      WITH DATA;
    `);

    // Individual column indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_store_id
      ON store_earning_opportunity_summary(store_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_distributor_id
      ON store_earning_opportunity_summary(distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_manufacturer_id
      ON store_earning_opportunity_summary(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_transaction_year
      ON store_earning_opportunity_summary(transaction_year);
    `);

    // Composite indexes for common query patterns
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_store_distributor
      ON store_earning_opportunity_summary(store_id, distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_manufacturer_year
      ON store_earning_opportunity_summary(manufacturer_id, transaction_year);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_distributor_year
      ON store_earning_opportunity_summary(distributor_id, transaction_year);
    `);

    // Covering index for most common query pattern (store filtering with other conditions)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_covering
      ON store_earning_opportunity_summary(store_id, distributor_id, manufacturer_id, transaction_year);
    `);
  },

  async down(queryInterface) {
    // Create store_earning_opportunity_summary materialized view
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_store_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_distributor_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_manufacturer_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_transaction_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_store_distributor;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_manufacturer_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_distributor_year;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_covering;
    `);

    // Create store_earning_opportunity_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
      TABLESPACE pg_default
      AS
        WITH highest_program_tiers AS (
          SELECT pd.id
            FROM program_details pd
              JOIN ( SELECT program_details.program_id,
                      max(program_details.tier) AS max_tier
                    FROM program_details
                    WHERE program_details.deleted_at IS NULL
                    GROUP BY program_details.program_id) mx ON pd.program_id = mx.program_id AND pd.tier = mx.max_tier
            WHERE pd.deleted_at IS NULL
          ),
          rebate_mapping AS (
              SELECT pro_d.id AS program_detail_id,
                    TRIM(ft.category) AS category,
                    (string_to_array(pro_d.fixed_rebate_amount, ','))[ft.idx]::numeric AS rebate_val
              FROM program_details pro_d
              CROSS JOIN LATERAL unnest(string_to_array(pro_d.fixed_rebate_category, ',')) 
                  WITH ORDINALITY AS ft(category, idx)
          ),
          product_categories AS (
              SELECT p.id AS product_id,
                    tag.tag_value AS category
              FROM products p
              CROSS JOIN LATERAL jsonb_array_elements_text(p.category_tags_json) AS tag(tag_value)
          )
          SELECT min(li.seller_id) AS distributor_id,
              pro.manufacturer_id,
              pro_d.program_id,
              pro_d.id AS program_detail_id,
              li.buyer_id AS store_id,
              sum(COALESCE(
                  CASE
                      WHEN pro_d.rebate_calculation_type::text = 'list_value'::text THEN
                      CASE
                          WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity::double precision
                          WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity::double precision
                          WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity::double precision
                          ELSE 0::double precision
                      END
                      ELSE li.total_price::double precision
                  END, 0::double precision)) AS total_purchase,
                  CASE
                WHEN pro_d.rebate_type = 'per_category_item' THEN
                      SUM(
                          CASE 
                              WHEN pro_d.quantity_type = 'unit'
                                  THEN li.total_units::numeric
                                  ELSE li.quantity::numeric
                          END * rm.rebate_val
                      )::double precision
                
                      WHEN pro_d.rebate_type::text = 'percentage'::text THEN sum(COALESCE(
                      CASE
                          WHEN pro_d.rebate_calculation_type::text = 'list_value'::text THEN
                          CASE
                              WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity::double precision
                              WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity::double precision
                              WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity::double precision
                              ELSE 0::double precision
                          END
                          ELSE li.total_price::double precision
                      END * pro_d.rebate_percentage::double precision / 100::double precision, 0::double precision))
                      WHEN pro_d.rebate_type::text = 'fixed'::text THEN sum(
                      CASE
                          WHEN pro_d.quantity_type IS NOT NULL THEN
                          CASE
                              WHEN (pro_d.quantity_type::text = 'unit'::text AND li.product_id = p.unit_skus_id OR pro_d.quantity_type::text = 'case'::text AND li.product_id = p.case_skus_id OR pro_d.quantity_type::text = 'box'::text AND li.product_id = p.box_skus_id) AND (pro_d.min_qty > 0::numeric OR pro_d.max_qty > 0::numeric) THEN pro_d.rebate_amount * li.quantity
                              ELSE 0::numeric
                          END
                          ELSE
                          CASE
                              WHEN pro_d.min_qty > 0::numeric OR pro_d.max_qty > 0::numeric THEN pro_d.rebate_amount * li.quantity
                              ELSE 0::numeric
                          END
                      END::double precision) +
                      CASE
                          WHEN pro_d.quantity_type IS NULL AND (pro_d.min_qty = 0::numeric OR pro_d.min_qty IS NULL) AND (pro_d.max_qty = 0::numeric OR pro_d.max_qty IS NULL) THEN pro_d.rebate_amount
                          ELSE 0::numeric
                      END::double precision
                      ELSE 0::double precision
                  END AS rebate_opportunity,
              bool_or((pro_d.id IN ( SELECT highest_program_tiers.id
                    FROM highest_program_tiers))) AS highest_tier,
              EXTRACT(year FROM li.transaction_date) AS transaction_year
            FROM line_items_products_joined_materialized_view li
              JOIN products p ON li.internal_product_id = p.id
              JOIN programs pro ON li.manufacturer_id = pro.manufacturer_id AND (pro.participant_type::text = 'STORE'::text OR pro.participant_type::text = 'CHAIN'::text)
              JOIN program_details pro_d ON pro.id = pro_d.program_id
              JOIN rebate_mapping rm ON rm.program_detail_id = pro_d.id
            WHERE li.transaction_date >= date(pro.start_date) AND li.transaction_date <= date(pro.end_date) AND pro_d.deleted_at IS NULL AND pro.deleted_at IS NULL AND li.buyer_type::text = 'STORE'::text AND li.seller_type::text = 'DISTRIBUTOR'::text
            GROUP BY pro.manufacturer_id, pro.id, pro_d.id, li.buyer_id, (EXTRACT(year FROM li.transaction_date))
      WITH DATA;
    `);

    // Individual column indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_store_id
      ON store_earning_opportunity_summary(store_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_distributor_id
      ON store_earning_opportunity_summary(distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_manufacturer_id
      ON store_earning_opportunity_summary(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_transaction_year
      ON store_earning_opportunity_summary(transaction_year);
    `);

    // Composite indexes for common query patterns
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_store_distributor
      ON store_earning_opportunity_summary(store_id, distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_manufacturer_year
      ON store_earning_opportunity_summary(manufacturer_id, transaction_year);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_distributor_year
      ON store_earning_opportunity_summary(distributor_id, transaction_year);
    `);

    // Covering index for most common query pattern (store filtering with other conditions)
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_covering
      ON store_earning_opportunity_summary(store_id, distributor_id, manufacturer_id, transaction_year);
    `);
  }
};
