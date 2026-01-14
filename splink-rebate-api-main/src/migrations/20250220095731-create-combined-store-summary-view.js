"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create materialized view
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS combined_store_summary AS
      SELECT 
          COALESCE(q1.distributor_id, q2.distributor_id) AS distributor_id,
          COALESCE(q1.manufacturer_id, q2.manufacturer_id) AS manufacturer_id,
          COALESCE(q1.store_id, q2.store_id) AS store_id,
          COALESCE(q1.total_price_sum, 0) AS total_purchase,
          COALESCE(q2.total_rebate_sum, 0) AS earned_rebate
      FROM 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  p.manufacturer_id, 
                  li.buyer_id AS store_id,
                  SUM(li.total_price) AS total_price_sum
              FROM 
                  distributors AS dt
              JOIN 
                  line_items AS li 
                  ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
              JOIN 
                  products AS p 
                  ON li.product_id IN (p.case_skus_id, p.unit_skus_id, p.box_skus_id)
              GROUP BY 
                  dt.id, 
                  li.buyer_id,
                  p.manufacturer_id
          ) AS q1
      FULL OUTER JOIN 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  pro.manufacturer_id, 
                  ur.associated_user_id AS store_id,
                  SUM(pc.earned_rebate) AS total_rebate_sum
              FROM 
                  distributors AS dt
              JOIN 
                  user_roles AS ur 
                  ON ur.parent_entity_id = dt.id 
                  AND ur.parent_entity_type = 'DISTRIBUTOR' 
                  AND ur.role = 'STORE'
              JOIN 
                  program_compliances AS pc 
                  ON pc.entity_id = ur.associated_user_id 
                  AND pc.entity_type = ur.role 
                  AND pc.status = 'active'
              JOIN 
                  programs AS pro 
                  ON pro.id = pc.program_id 
                  AND pro.participant_type = ur.role
              GROUP BY 
                  dt.id, 
                  ur.associated_user_id,
                  pro.manufacturer_id
          ) AS q2
      ON 
          q1.distributor_id = q2.distributor_id 
          AND q1.manufacturer_id = q2.manufacturer_id 
          AND q1.store_id = q2.store_id;
    `);

    // Create the trigger function
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION refresh_combined_store_summary()
      RETURNS TRIGGER AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW combined_store_summary;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for line_items if not exists
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'line_items_stores_refresh_trigger'
          ) THEN
              CREATE TRIGGER line_items_stores_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON line_items
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_combined_store_summary();
          END IF;
      END $$;
    `);

    // Create trigger for program_compliances if not exists
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'program_compliances_stores_refresh_trigger'
          ) THEN
              CREATE TRIGGER program_compliances_stores_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON program_compliances
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_combined_store_summary();
          END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    // Drop the triggers
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS line_items_stores_refresh_trigger ON line_items;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS program_compliances_stores_refresh_trigger ON program_compliances;
    `);

    // Drop the trigger function
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS refresh_combined_store_summary;
    `);

    // Drop the materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS combined_store_summary;
    `);
  }
};
