"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create materialized view for chain-program aggregations (idempotent)
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS chain_program_aggregations AS
      SELECT
        p.id as program_id,
        p.name as program_name,
        p.program_type as program_type,
        p.program_header as program_header,
        p.participant_type as participant_type,
        p.payment_term as payment_term,
        p.manufacturer_id as manufacturer_id,
        m.name as manufacturer_name,
        m.logo as manufacturer_logo,
        m.authorized as manufacturer_authorized,
        c.id as chain_id,
        c.name as chain_name,
        COUNT(DISTINCT cs.store_id) as total_stores,
        COUNT(DISTINCT CASE WHEN pc.id IS NOT NULL THEN cs.store_id END) as enrolled_stores,
        COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN cs.store_id END) as compliant_stores,
        COALESCE(SUM(pc.total_purchase_volume), 0) as total_purchase_volume,
        COALESCE(SUM(pc.earned_rebate), 0) as total_earned_rebate,
        CASE
          WHEN COUNT(DISTINCT cs.store_id) > 0
          THEN (COUNT(DISTINCT CASE WHEN pc.is_qualified = true THEN cs.store_id END) * 100.0 / COUNT(DISTINCT cs.store_id))
          ELSE 0
        END as compliance_percentage,
        CASE WHEN pp_chain.id IS NOT NULL THEN true ELSE false END as is_chain_enrolled,
        NOW() as last_updated
      FROM programs p
      JOIN manufacturers m ON p.manufacturer_id = m.id
      LEFT JOIN program_details pd ON p.id = pd.program_id
      LEFT JOIN chain_stores cs ON cs.store_id IN (
        SELECT ur.associated_user_id
        FROM user_roles ur
        WHERE ur.parent_entity_type = 'DISTRIBUTOR'
          AND ur.associated_entity_type = 'STORE'
      )
      LEFT JOIN chains c ON cs.chain_id = c.id
      LEFT JOIN program_compliances pc ON (
        pc.program_id = p.id
        AND pc.entity_id = cs.store_id
        AND pc.entity_type = 'STORE'
        AND pc.deleted_at IS NULL
      )
      LEFT JOIN program_participants pp_chain ON (
        pp_chain.program_id = p.id
        AND pp_chain.entity_id = c.id
        AND pp_chain.entity_type = 'CHAIN'
        AND pp_chain.deleted_at IS NULL
      )
      WHERE p.deleted_at IS NULL
        AND pd.deleted_at IS NULL
        AND cs.store_id IS NOT NULL
      GROUP BY
        p.id, p.name, p.program_type, p.program_header, p.participant_type,
        p.payment_term, p.manufacturer_id, m.name, m.logo, m.authorized,
        c.id, c.name, pp_chain.id
      ORDER BY p.id, c.name
    `);

    // Create indexes for better performance (idempotent)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_program_aggregations_program_id ON chain_program_aggregations(program_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_program_aggregations_manufacturer_id ON chain_program_aggregations(manufacturer_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_program_aggregations_chain_id ON chain_program_aggregations(chain_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_program_aggregations_composite ON chain_program_aggregations(program_id, manufacturer_id, chain_id)
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes and materialized view if they exist
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_chain_program_aggregations_program_id;
      DROP INDEX IF EXISTS idx_chain_program_aggregations_manufacturer_id;
      DROP INDEX IF EXISTS idx_chain_program_aggregations_chain_id;
      DROP INDEX IF EXISTS idx_chain_program_aggregations_composite;
      DROP MATERIALIZED VIEW IF EXISTS chain_program_aggregations CASCADE;
    `);
  }
};
