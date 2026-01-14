"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
      TABLESPACE pg_default
      AS
      SELECT dt.id AS distributor_id,
        pro.manufacturer_id,
        pro_d.id as program_detail_id,
        ur.associated_user_id AS store_id,
      sum(li.total_price) as total_purchase,
      CASE 
        WHEN pro_d.rebate_type = 'percentage' THEN SUM(li.total_price * pro_d.rebate_percentage / 100)
        WHEN pro_d.rebate_type = 'fixed' THEN pro_d.rebate_amount * COALESCE(pro_d.max_qty, pro_d.min_qty, 1)
        ELSE 0
      END AS rebate_opportunity,
	    CASE 
        WHEN (SELECT COUNT(*) FROM program_details pd WHERE pd.program_id = pro.id) = 1 THEN true
        WHEN pro_d.tier = (SELECT MAX(pd.tier) FROM program_details pd WHERE pd.program_id = pro.id) THEN true
        ELSE false
      END AS highest_tier
      FROM distributors dt
        JOIN user_roles ur ON ur.parent_entity_id = dt.id AND ur.parent_entity_type = 'DISTRIBUTOR'::enum_user_roles_parent_entity_type AND ur.role::text = 'STORE'::text
        JOIN line_items as li on li.buyer_id = ur.associated_user_id and li.buyer_type = 'STORE' and li.seller_id = dt.id and li.seller_type = 'DISTRIBUTOR'
      JOIN products as p ON (li.product_id IN (p.case_skus_id, p.unit_skus_id, p.box_skus_id) and p.primary_variant = true)
      JOIN programs as pro ON p.manufacturer_id = pro.manufacturer_id AND pro.participant_type::text = ur.role::text
      JOIN program_details as pro_d ON pro.id = pro_d.program_id
      GROUP BY dt.id, pro.manufacturer_id, pro.id, pro_d.id, ur.associated_user_id
      WITH DATA;
    `);

    // Create the trigger function
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.refresh_store_earning_opportunity_summary()
          RETURNS trigger
          LANGUAGE 'plpgsql'
          COST 100
          VOLATILE NOT LEAKPROOF
      AS $BODY$
      BEGIN
          REFRESH MATERIALIZED VIEW store_earning_opportunity_summary;
          RETURN NULL;
      END;
      $BODY$;
    `);

    // Create the trigger function
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'line_items_store_earning_opportunity_refresh_trigger'
          ) THEN
              CREATE TRIGGER line_items_store_earning_opportunity_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON line_items
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_store_earning_opportunity_summary();
          END IF;
      END $$;
    `);

    // Create the trigger function
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'products_store_earning_opportunity_refresh_trigger'
          ) THEN
              CREATE TRIGGER products_store_earning_opportunity_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON products
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_store_earning_opportunity_summary();
          END IF;
      END $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop the triggers
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS line_items_store_earning_opportunity_refresh_trigger ON line_items;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS products_store_earning_opportunity_refresh_trigger ON products;
    `);

    // Drop the trigger function
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS refresh_store_earning_opportunity_summary;
    `);

    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
    `);
  }
};
