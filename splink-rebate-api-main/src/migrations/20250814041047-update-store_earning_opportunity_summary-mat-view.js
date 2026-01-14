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
          JOIN (
              SELECT program_id, MAX(tier) AS max_tier
              FROM program_details
              WHERE deleted_at IS NULL
              GROUP BY program_id
          ) mx
            ON pd.program_id = mx.program_id
          AND pd.tier = mx.max_tier
          WHERE pd.deleted_at IS NULL
      )
      SELECT 
          MIN(li.seller_id) AS distributor_id,
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
              BOOL_OR(pro_d.id in (select id from highest_program_tiers)) AS highest_tier,
          EXTRACT(year FROM li.transaction_date) AS transaction_year
        FROM line_items_products_joined_materialized_view li
          JOIN products p ON li.internal_product_id = p.id
          JOIN programs pro ON li.manufacturer_id = pro.manufacturer_id AND (pro.participant_type::text = 'STORE'::text OR pro.participant_type::text = 'CHAIN'::text)
          JOIN program_details pro_d ON pro.id = pro_d.program_id
        WHERE li.transaction_date >= date(pro.start_date) AND li.transaction_date <= date(pro.end_date) AND pro_d.deleted_at IS NULL AND pro.deleted_at IS NULL
        AND li.buyer_type::text = 'STORE'::text
		AND li.seller_type::text = 'DISTRIBUTOR'::text
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
          JOIN (
              SELECT program_id, MAX(tier) AS max_tier
              FROM program_details
              WHERE deleted_at IS NULL
              GROUP BY program_id
          ) mx
            ON pd.program_id = mx.program_id
          AND pd.tier = mx.max_tier
          WHERE pd.deleted_at IS NULL
      )
      SELECT 
          MIN(li.seller_id) AS distributor_id,
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
            ELSE 0::double precision
        END AS rebate_opportunity,
              BOOL_OR(pro_d.id in (select id from highest_program_tiers)) AS highest_tier,
          EXTRACT(year FROM li.transaction_date) AS transaction_year
        FROM line_items_products_joined_materialized_view li
          JOIN products p ON li.internal_product_id = p.id
          JOIN programs pro ON li.manufacturer_id = pro.manufacturer_id AND (pro.participant_type::text = 'STORE'::text OR pro.participant_type::text = 'CHAIN'::text)
          JOIN program_details pro_d ON pro.id = pro_d.program_id
        WHERE li.transaction_date >= date(pro.start_date) AND li.transaction_date <= date(pro.end_date) AND pro_d.deleted_at IS NULL AND pro.deleted_at IS NULL
        AND li.buyer_type::text = 'STORE'::text
		AND li.seller_type::text = 'DISTRIBUTOR'::text
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
