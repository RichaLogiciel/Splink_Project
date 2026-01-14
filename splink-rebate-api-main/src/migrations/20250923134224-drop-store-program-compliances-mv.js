"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliances_mv_buyer_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliances_mv_seller_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliances_mv_manufacturer_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliances_mv_program_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliances_mv_program_detail_id;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_program_compliances_mv_compliance_percentage;
    `);

    // Drop the materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.store_program_compliances_mv;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Recreate the materialized view (same as the original migration)
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW store_program_compliances_mv AS
      WITH earning_opportunities AS (
         SELECT DISTINCT pc.entity_id AS buyer_id,
            pc.program_id,
            pc.program_detail_id,
            COALESCE(seos.rebate_opportunity, 0::numeric) AS earning_opportunity
           FROM program_compliances pc
             LEFT JOIN store_earning_opportunity_summary seos ON seos.store_id = pc.entity_id AND seos.program_id = pc.program_id AND seos.program_detail_id = pc.program_detail_id AND seos.transaction_year = EXTRACT(year FROM CURRENT_DATE)
          WHERE pc.entity_type::text = 'STORE'::text AND pc.is_qualified <> true
        ), product_category_assignments AS (
         SELECT pc.entity_id AS buyer_id,
            li.seller_id,
            p.manufacturer_id,
            pc.program_id,
            pc.program_detail_id,
            pd.products_tags,
            pd.products_tags_qty AS required_count_by_tag,
            prod.id AS product_id,
            prod.category_tags_json,
            tag.tag_name AS category_tag,
            tag.tag_position,
            tag.required_qty
           FROM program_compliances pc
             JOIN program_details pd ON pd.id = pc.program_detail_id
             JOIN programs p ON p.id = pc.program_id
             JOIN manufacturers m ON m.id = p.manufacturer_id
             JOIN stores s ON s.id = pc.entity_id
             JOIN line_items li ON li.buyer_id = pc.entity_id AND li.quantity > 0::numeric AND li.deleted_at IS NULL AND li.seller_type::text = 'DISTRIBUTOR'::text AND li.buyer_type::text = 'STORE'::text AND date(li.transaction_date) >= date(p.start_date)
             JOIN products prod ON (li.product_id = prod.unit_skus_id AND prod.primary_variant = true OR li.product_id = prod.case_skus_id OR li.product_id = prod.box_skus_id) AND prod.manufacturer_id = p.manufacturer_id AND prod.deleted_at IS NULL
             CROSS JOIN LATERAL ( SELECT tag_1.tag_name,
                    tag_1."position" AS tag_position,
                    (string_to_array(pd.products_tags_qty::text, ','::text))[tag_1."position"]::numeric AS required_qty
                   FROM unnest(string_to_array(pd.products_tags::text, ','::text)) WITH ORDINALITY tag_1(tag_name, "position")) tag
          WHERE pc.entity_type::text = 'STORE'::text AND pc.is_qualified <> true AND p.participant_type::text = 'STORE'::text AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE AND pd.deleted_at IS NULL AND p.deleted_at IS NULL AND m.deleted_at IS NULL AND s.deleted_at IS NULL AND prod.category_tags_json @> jsonb_build_array(TRIM(BOTH FROM tag.tag_name))
        ), category_counts AS (
         SELECT product_category_assignments.buyer_id,
            product_category_assignments.seller_id,
            product_category_assignments.manufacturer_id,
            product_category_assignments.program_id,
            product_category_assignments.program_detail_id,
            product_category_assignments.products_tags,
            product_category_assignments.required_count_by_tag,
            product_category_assignments.category_tag,
            product_category_assignments.required_qty,
            count(DISTINCT product_category_assignments.product_id) AS purchased_count,
            LEAST(count(DISTINCT product_category_assignments.product_id)::numeric, product_category_assignments.required_qty) AS counted_products
           FROM product_category_assignments
          GROUP BY product_category_assignments.buyer_id, product_category_assignments.seller_id, product_category_assignments.manufacturer_id, product_category_assignments.program_id, product_category_assignments.program_detail_id, product_category_assignments.products_tags, product_category_assignments.required_count_by_tag, product_category_assignments.category_tag, product_category_assignments.required_qty
        ), flat_product_ids AS (
         SELECT product_category_assignments.buyer_id,
            product_category_assignments.seller_id,
            product_category_assignments.manufacturer_id,
            product_category_assignments.program_id,
            product_category_assignments.program_detail_id,
            product_category_assignments.products_tags,
            product_category_assignments.required_count_by_tag,
            jsonb_agg(DISTINCT product_category_assignments.product_id) AS purchased_distinct_product_ids
           FROM product_category_assignments
          GROUP BY product_category_assignments.buyer_id, product_category_assignments.seller_id, product_category_assignments.manufacturer_id, product_category_assignments.program_id, product_category_assignments.program_detail_id, product_category_assignments.products_tags, product_category_assignments.required_count_by_tag
        )
      SELECT cc.buyer_id,
        cc.seller_id,
        cc.manufacturer_id,
        cc.program_id,
        cc.program_detail_id,
        cc.products_tags,
        cc.required_count_by_tag,
        fpi.purchased_distinct_product_ids,
        COALESCE(( SELECT sum(TRIM(BOTH FROM t.qty)::numeric) AS sum
               FROM unnest(string_to_array(cc.required_count_by_tag::text, ','::text)) t(qty)
              WHERE TRIM(BOTH FROM t.qty) ~ '^[0-9.]+$'::text), 0::numeric) AS total_product_tags,
        sum(cc.counted_products) AS total_purchased_distinct_product_ids,
            CASE
                WHEN COALESCE(( SELECT sum(TRIM(BOTH FROM t.qty)::numeric) AS sum
                   FROM unnest(string_to_array(cc.required_count_by_tag::text, ','::text)) t(qty)
                  WHERE TRIM(BOTH FROM t.qty) ~ '^[0-9.]+$'::text), 0::numeric) > 0::numeric THEN round(sum(cc.counted_products) / COALESCE(( SELECT sum(TRIM(BOTH FROM t.qty)::numeric) AS sum
                   FROM unnest(string_to_array(cc.required_count_by_tag::text, ','::text)) t(qty)
                  WHERE TRIM(BOTH FROM t.qty) ~ '^[0-9.]+$'::text), 1::numeric) * 100::numeric, 1)
                ELSE 0::numeric
            END AS compliance_percentage,
        0 AS total_units,
        0 AS total_spend,
        COALESCE(eo.earning_opportunity, 0::numeric) AS earning_opportunity,
        CURRENT_TIMESTAMP AS latest_transaction_date,
        CURRENT_TIMESTAMP AS last_refreshed_at
       FROM category_counts cc
         JOIN flat_product_ids fpi ON fpi.buyer_id = cc.buyer_id AND fpi.program_detail_id = cc.program_detail_id
         LEFT JOIN earning_opportunities eo ON eo.buyer_id = cc.buyer_id AND eo.program_detail_id = cc.program_detail_id
      GROUP BY cc.buyer_id, cc.seller_id, cc.manufacturer_id, cc.program_id, cc.program_detail_id, cc.products_tags, cc.required_count_by_tag, fpi.purchased_distinct_product_ids, eo.earning_opportunity;
    `);

    // Recreate indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliances_mv_buyer_id
      ON store_program_compliances_mv (buyer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliances_mv_seller_id
      ON store_program_compliances_mv (seller_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliances_mv_manufacturer_id
      ON store_program_compliances_mv (manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliances_mv_program_id
      ON store_program_compliances_mv (program_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliances_mv_program_detail_id
      ON store_program_compliances_mv (program_detail_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_program_compliances_mv_compliance_percentage
      ON store_program_compliances_mv (compliance_percentage);
    `);
  }
};
