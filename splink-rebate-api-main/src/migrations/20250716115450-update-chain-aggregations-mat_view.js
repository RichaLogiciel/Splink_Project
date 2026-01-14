"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create store_earning_opportunity_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.chain_aggregations;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS chain_aggregations AS 
    
      WITH store_purchase_volumes AS (
        SELECT 
          store_id,
          SUM(total_purchase) AS total_purchase
        FROM combined_store_summary
        WHERE transaction_year = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY store_id
      ),
      store_rebates AS (
        SELECT 
          entity_id AS store_id,
          SUM(earned_rebate) AS total_earned_rebate
        FROM program_compliances
        WHERE entity_type = 'STORE'
        GROUP BY entity_id
      ),
      enrolled_stores AS (
        SELECT DISTINCT entity_id AS store_id
        FROM program_participants
        WHERE entity_type = 'STORE' AND deleted_at IS NULL
      ),
      compliant_stores AS (
        SELECT DISTINCT entity_id AS store_id
        FROM program_compliances
        WHERE entity_type = 'STORE' AND is_qualified = TRUE
      )

      SELECT 
        c.id AS chain_id,
        c.name AS chain_name,
        COUNT(DISTINCT cs.store_id) AS total_stores,
        COUNT(DISTINCT es.store_id) AS enrolled_stores,
        COUNT(DISTINCT co.store_id) AS compliant_stores,
        COALESCE(SUM(spv.total_purchase), 0) AS total_purchase_volume,
        COALESCE(SUM(sr.total_earned_rebate), 0) AS total_earned_rebate,
        CASE
          WHEN COUNT(DISTINCT cs.store_id) > 0 THEN
            COUNT(DISTINCT co.store_id)::NUMERIC * 100.0 / COUNT(DISTINCT cs.store_id)
          ELSE 0
        END AS compliance_percentage,
        NOW() AS last_updated
      FROM chains c
      LEFT JOIN chain_stores cs ON cs.chain_id = c.id
      LEFT JOIN store_purchase_volumes spv ON spv.store_id = cs.store_id
      LEFT JOIN store_rebates sr ON sr.store_id = cs.store_id
      LEFT JOIN enrolled_stores es ON es.store_id = cs.store_id
      LEFT JOIN compliant_stores co ON co.store_id = cs.store_id
      GROUP BY c.id, c.name;
    `);
  },

  async down(queryInterface) {
    // Create store_earning_opportunity_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.chain_aggregations;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS chain_aggregations AS
      SELECT
        c.id as chain_id,
        c.name as chain_name,
        COUNT(DISTINCT cs.store_id) as total_stores,
        COUNT(DISTINCT CASE WHEN pp.id IS NOT NULL THEN cs.store_id END) as enrolled_stores,
        COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN cs.store_id END) as compliant_stores,
        COALESCE(SUM(css.total_purchase), 0) as total_purchase_volume,
        COALESCE(SUM(pc.earned_rebate), 0) as total_earned_rebate,
        CASE
          WHEN COUNT(DISTINCT cs.store_id) > 0
          THEN (COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN cs.store_id END) * 100.0 / COUNT(DISTINCT cs.store_id))
          ELSE 0
        END as compliance_percentage,
        NOW() as last_updated
      FROM chains c
      LEFT JOIN chain_stores cs ON cs.chain_id = c.id
      LEFT JOIN user_roles ur ON ur.associated_user_id = cs.store_id
        AND ur.associated_entity_type = 'STORE'
      LEFT JOIN program_participants pp ON pp.entity_id = cs.store_id
        AND pp.entity_type = 'STORE'
        AND pp.deleted_at IS NULL
      LEFT JOIN program_compliances pc ON pc.entity_id = cs.store_id
        AND pc.entity_type = 'STORE'
      LEFT JOIN combined_store_summary css ON css.store_id = cs.store_id
      GROUP BY c.id, c.name
    `);
  }
};
