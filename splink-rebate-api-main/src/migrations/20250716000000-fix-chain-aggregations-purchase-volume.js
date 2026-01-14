"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing materialized view if it exists
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS chain_aggregations CASCADE
    `);

    // Recreate the materialized view using combined_store_summary for purchase volume (much more efficient)
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS chain_aggregations AS
      SELECT
        c.id as chain_id,
        c.name as chain_name,
        COUNT(DISTINCT cs.store_id) as total_stores,
        COUNT(DISTINCT CASE WHEN pp.id IS NOT NULL THEN cs.store_id END) as enrolled_stores,
        COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN cs.store_id END) as compliant_stores,
        COALESCE(SUM(store_purchase_volumes.total_purchase), 0) as total_purchase_volume,
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
      LEFT JOIN (
        -- Subquery to get total purchase volume per store (avoiding double-counting)
        SELECT
          store_id,
          SUM(total_purchase) as total_purchase
        FROM combined_store_summary
        WHERE transaction_year = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY store_id
      ) store_purchase_volumes ON store_purchase_volumes.store_id = cs.store_id
      GROUP BY c.id, c.name
    `);

    // Recreate indexes idempotently
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_chain_id ON chain_aggregations(chain_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_chain_name ON chain_aggregations(chain_name)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_purchase_volume ON chain_aggregations(total_purchase_volume)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_earned_rebate ON chain_aggregations(total_earned_rebate)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_compliance_percentage ON chain_aggregations(compliance_percentage)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_total_stores ON chain_aggregations(total_stores)
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop the materialized view and all indexes if they exist
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_chain_aggregations_chain_id;
      DROP INDEX IF EXISTS idx_chain_aggregations_chain_name;
      DROP INDEX IF EXISTS idx_chain_aggregations_purchase_volume;
      DROP INDEX IF EXISTS idx_chain_aggregations_earned_rebate;
      DROP INDEX IF EXISTS idx_chain_aggregations_compliance_percentage;
      DROP INDEX IF EXISTS idx_chain_aggregations_total_stores;
      DROP MATERIALIZED VIEW IF EXISTS chain_aggregations CASCADE;
    `);
  }
};
