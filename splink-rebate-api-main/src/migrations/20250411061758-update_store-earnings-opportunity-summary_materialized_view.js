"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
      TABLESPACE pg_default
      AS
      SELECT dt.id AS distributor_id,
          pro.manufacturer_id,
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
		                ELSE pro_d.rebate_amount * 1::numeric
					END
            END::double precision
			)
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
      JOIN programs as pro ON p.manufacturer_id = pro.manufacturer_id AND pro.participant_type::text = ur.role::text
      JOIN program_details as pro_d ON pro.id = pro_d.program_id
      GROUP BY dt.id, pro.manufacturer_id, pro.id,  pro_d.id, ur.associated_user_id, EXTRACT(YEAR FROM li.transaction_date)
      WITH DATA;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
      TABLESPACE pg_default
      AS
      SELECT dt.id AS distributor_id,
          pro.manufacturer_id,
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
		                ELSE pro_d.rebate_amount * 1::numeric
					END
            END::double precision
			)
            ELSE 0::double precision
        END AS rebate_opportunity,
      CASE 
            WHEN (SELECT COUNT(*) FROM program_details pd WHERE pd.program_id = pro.id) = 1 THEN true
            WHEN pro_d.tier = (SELECT MAX(pd.tier) FROM program_details pd WHERE pd.program_id = pro.id) THEN true
            ELSE false
        END AS highest_tier
      FROM distributors dt
        JOIN user_roles ur ON ur.parent_entity_id = dt.id AND ur.parent_entity_type = 'DISTRIBUTOR'::enum_user_roles_parent_entity_type AND ur.role::text = 'STORE'::text
        JOIN line_items as li on li.buyer_id = ur.associated_user_id and li.buyer_type = 'STORE' and li.seller_id = dt.id and li.seller_type = 'DISTRIBUTOR'
      JOIN products as p ON (li.product_id in (p.case_skus_id, p.box_skus_id) OR (li.product_id = p.unit_skus_id AND p.primary_variant = true)) 
      JOIN programs as pro ON p.manufacturer_id = pro.manufacturer_id AND pro.participant_type::text = ur.role::text
      JOIN program_details as pro_d ON pro.id = pro_d.program_id
      GROUP BY dt.id, pro.manufacturer_id, pro.id,  pro_d.id, ur.associated_user_id
      WITH DATA;
    `);
  }
};
