"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log(
      "Recreating store_earning_opportunity_summary materialized view to use rebate_opportunity column..."
    );

    try {
      // Drop the existing materialized view if it exists
      await queryInterface.sequelize.query(`
        DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
      `);

      // Create the updated materialized view with total_purchase and rebate_opportunity from program_compliances table
      await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
        TABLESPACE pg_default
        AS
        -- Pull total_purchase and rebate_opportunity from the HIGHEST TIER program compliance
        -- for better performance and correct opportunity calculation
        SELECT dt.id AS distributor_id,
            pro.manufacturer_id,
            pro.id as program_id,
            highest_tier_pc.program_detail_id,
            ur.associated_user_id AS store_id,
        COALESCE(highest_tier_pc.total_purchase_volume, 0.00) AS total_purchase,
        COALESCE(highest_tier_pc.rebate_opportunity, 0.00) AS rebate_opportunity,
        true AS highest_tier,
        EXTRACT(YEAR FROM CURRENT_DATE) AS transaction_year
        FROM distributors dt
          JOIN user_roles ur ON ur.parent_entity_id = dt.id AND ur.parent_entity_type = 'DISTRIBUTOR'::enum_user_roles_parent_entity_type AND ur.role::text = 'STORE'::text
        JOIN programs as pro ON 1=1  -- We'll filter by manufacturer in WHERE clause
        -- Get the highest tier program compliance for each store and program
        JOIN LATERAL (
          SELECT
            pc.program_detail_id,
            pc.total_purchase_volume,
            pc.rebate_opportunity,
            pd.tier
          FROM program_compliances pc
          JOIN program_details pd ON pd.id = pc.program_detail_id
          WHERE pc.entity_id = ur.associated_user_id
            AND pc.entity_type = 'STORE'
            AND pc.program_id = pro.id
            AND pc.deleted_at IS NULL
            AND pd.deleted_at IS NULL
          ORDER BY pd.tier DESC
          LIMIT 1
        ) highest_tier_pc ON true
        WHERE
          dt.deleted_at IS NULL
          AND ur.deleted_at IS NULL
          AND pro.deleted_at IS NULL
          AND (pro.participant_type::text = ur.role::text or pro.participant_type::text = 'CHAIN')
        GROUP BY dt.id, pro.manufacturer_id, pro.id, highest_tier_pc.program_detail_id, ur.associated_user_id, highest_tier_pc.total_purchase_volume, highest_tier_pc.rebate_opportunity
        WITH DATA;
      `);

      console.log("Materialized view recreated successfully!");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  },

  async down(queryInterface) {
    console.log("Rolling back materialized view recreation...");

    try {
      // Drop the recreated materialized view
      await queryInterface.sequelize.query(`
        DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
      `);

      // Recreate the original materialized view with calculated rebate_opportunity
      await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
        TABLESPACE pg_default
        AS
        SELECT dt.id AS distributor_id,
            pro.manufacturer_id,
            pro_d.program_id as program_id,
            pro_d.id as program_detail_id,
            ur.associated_user_id AS store_id,
        SUM(COALESCE(
                CASE
                    WHEN pro_d.rebate_calculation_type = 'list_value' THEN
                        CASE
                            WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity
                            WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity
                            WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity
                            ELSE 0
                        END
                    ELSE li.total_price
                END,
                0
            )) AS total_purchase,
        CASE
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
              WHEN pro_d.rebate_type::text = 'fixed'::text THEN
              SUM(CASE
        WHEN pro_d.quantity_type IS NOT NULL THEN
                CASE
                  WHEN
                    (
                      (pro_d.quantity_type = 'unit' AND li.product_id = p.unit_skus_id)
                      OR (pro_d.quantity_type = 'case' AND li.product_id = p.case_skus_id)
                      OR (pro_d.quantity_type = 'box' AND li.product_id = p.box_skus_id)
                    )
                    AND (pro_d.min_qty > 0 OR pro_d.max_qty > 0)
                  THEN pro_d.rebate_amount * li.quantity
                  ELSE 0
            END
        ELSE
          CASE
                      WHEN pro_d.min_qty > 0::numeric OR pro_d.max_qty > 0::numeric THEN pro_d.rebate_amount * li.quantity
                      ELSE 0
          END
              END::double precision
        ) +
            CASE
                WHEN pro_d.quantity_type IS NULL AND ((pro_d.min_qty = 0 OR pro_d.min_qty is null) AND (pro_d.max_qty = 0 OR pro_d.max_qty is null))
                THEN pro_d.rebate_amount
                ELSE 0
            END
        WHEN pro_d.rebate_type::text = 'per_category_item'::text THEN sum(COALESCE(( SELECT sum(
                      CASE
                          WHEN pro_d.quantity_type::text = 'unit'::text THEN li.total_units::numeric
                          ELSE li.quantity::numeric
                      END * matched.rebate_val::numeric) AS sum
                 FROM jsonb_array_elements_text(p.category_tags_json) tag(tag_value)
                   JOIN LATERAL ( SELECT TRIM(BOTH FROM ft.category) AS category,
                          ft.idx,
                          (string_to_array(pro_d.fixed_rebate_amount::text, ','::text))[ft.idx] AS rebate_val
                         FROM unnest(string_to_array(pro_d.fixed_rebate_category::text, ','::text)) WITH ORDINALITY ft(category, idx)) matched ON matched.category = tag.tag_value), 0::numeric))::double precision

              ELSE 0::double precision
          END AS rebate_opportunity,
        CASE
              WHEN (SELECT COUNT(*) FROM program_details pd WHERE pd.program_id = pro.id) = 1 THEN true
              WHEN pro_d.tier = (SELECT MAX(pd.tier) FROM program_details pd WHERE pd.program_id = pro.id) THEN true
              ELSE false
          END AS highest_tier,
        EXTRACT(YEAR FROM li.transaction_date) AS transaction_year
        FROM distributors dt
          JOIN user_roles ur ON ur.parent_entity_id = dt.id AND ur.parent_entity_type = 'DISTRIBUTOR'::enum_user_roles_parent_entity_type AND ur.role::text = 'STORE'::text
          JOIN line_items as li on li.buyer_id = ur.associated_user_id and li.buyer_type = 'STORE' and li.seller_id = dt.id and li.seller_type = 'DISTRIBUTOR'
        JOIN products as p ON (li.product_id in (p.case_skus_id, p.box_skus_id) OR (li.product_id = p.unit_skus_id AND p.primary_variant = true))
        JOIN programs as pro ON p.manufacturer_id = pro.manufacturer_id AND (pro.participant_type::text = ur.role::text or pro.participant_type::text = 'CHAIN')
        JOIN program_details as pro_d ON pro.id = pro_d.program_id
        WHERE
          li.transaction_date BETWEEN Date(pro.start_date) AND Date(pro.end_date)
          AND li.deleted_at IS NULL
          AND pro_d.deleted_at IS NULL
          AND pro.deleted_at IS NULL
          AND ur.deleted_at IS NULL
          AND dt.deleted_at IS NULL
          AND p.deleted_at IS NULL
        GROUP BY dt.id, pro.manufacturer_id, pro.id, pro_d.id, ur.associated_user_id, EXTRACT(YEAR FROM li.transaction_date)
        WITH DATA;
      `);

      console.log("Original materialized view restored successfully!");
    } catch (error) {
      console.error("Rollback failed:", error);
      throw error;
    }
  }
};
