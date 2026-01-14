"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing materialized view
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_chain_aggregations_chain_id;
      DROP INDEX IF EXISTS idx_chain_aggregations_chain_name;
      DROP INDEX IF EXISTS idx_chain_aggregations_distributor_id;
      DROP INDEX IF EXISTS idx_chain_aggregations_purchase_volume;
      DROP INDEX IF EXISTS idx_chain_aggregations_earned_rebate;
      DROP INDEX IF EXISTS idx_chain_aggregations_compliance_percentage;
      DROP INDEX IF EXISTS idx_chain_aggregations_total_stores;
      DROP MATERIALIZED VIEW IF EXISTS chain_aggregations CASCADE;
    `);

    // Recreate the materialized view with CTEs and distributor_id
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS chain_aggregations AS

      WITH chain_programs AS (
        SELECT programs.id as program_id, manufacturer_id
          FROM programs
        WHERE participant_type::text = 'CHAIN'::text
        ANd deleted_at IS NULL
      ),
      ineligible_stores_with_manufacturer_id AS (
        SELECT 
          pro.manufacturer_id,
          ARRAY_AGG(psi.store_id) AS excluded_store_ids
        FROM program_store_ineligibility psi
        JOIN programs AS pro
            ON pro.id = psi.program_id
        JOIN user_roles ur
            ON ur.associated_entity_type = 'STORE'
            AND ur.parent_entity_type = 'DISTRIBUTOR'
            AND ur.associated_user_id = psi.store_id
        JOIN chain_stores cs ON cs.store_id = psi.store_id
        WHERE pro.id IN (SELECT program_id FROM chain_programs)
          AND psi.deleted_at is null
        GROUP BY pro.manufacturer_id, psi.store_id
        HAVING COUNT(DISTINCT pro.id) = (
          SELECT COUNT(DISTINCT pd.program_id)
          FROM chain_programs pd
          WHERE pd.manufacturer_id = pro.manufacturer_id
          )
      ),
      store_purchase_volumes AS (
        SELECT
          css.store_id,
          SUM(css.total_purchase) AS total_purchase
        FROM combined_store_summary as css
        LEFT JOIN ineligible_stores_with_manufacturer_id iswm on css.store_id = ANY(iswm.excluded_store_ids) and iswm.manufacturer_id = css.manufacturer_id
        WHERE css.transaction_year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND css.manufacturer_id in (SELECT DISTINCT manufacturer_id FROM chain_programs)
          AND iswm.manufacturer_id IS NULL
        GROUP BY css.store_id
      ),
      store_rebates AS (
        SELECT
          pc.entity_id AS store_id,
          SUM(pc.earned_rebate) AS total_earned_rebate
        FROM program_compliances as pc
        LEFT JOIN program_store_ineligibility AS psi on psi.program_id = pc.program_id AND pc.entity_id = psi.store_id AND psi.deleted_at IS NULL
        WHERE pc.entity_type = 'STORE'
          AND pc.program_id in (select program_id from chain_programs)
          AND pc.status = 'active'
          AND pc.deleted_at IS NULL
          AND psi.id IS NULL
        GROUP BY entity_id
      ),
      enrolled_stores AS (
        SELECT DISTINCT pp.entity_id AS store_id
        FROM program_participants as pp
        LEFT JOIN program_store_ineligibility AS psi on psi.program_id = pp.program_id AND pp.entity_id = psi.store_id AND psi.deleted_at IS NULL
        WHERE pp.entity_type = 'STORE' AND pp.deleted_at IS NULL
        AND pp.program_id in (select program_id from chain_programs)
        AND psi.id IS NULL
      ),
      compliant_stores AS (
        SELECT DISTINCT pc.entity_id AS store_id
        FROM program_compliances as pc
        LEFT JOIN program_store_ineligibility AS psi on psi.program_id = pc.program_id AND pc.entity_id = psi.store_id AND psi.deleted_at IS NULL
        WHERE pc.entity_type = 'STORE' 
          AND pc.is_qualified = TRUE
          AND pc.program_id in (select program_id from chain_programs)
		      AND pc.deleted_at IS NULL
          AND psi.id IS NULL
      )

      SELECT
        c.id AS chain_id,
        c.name AS chain_name,
        c.distributor_id,
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
      GROUP BY c.id, c.name, c.distributor_id
    `);

    // Recreate indexes idempotently
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_chain_id ON chain_aggregations(chain_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_chain_name ON chain_aggregations(chain_name)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_distributor_id ON chain_aggregations(distributor_id)
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
    // Drop the existing materialized view
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_chain_aggregations_chain_id;
      DROP INDEX IF EXISTS idx_chain_aggregations_chain_name;
      DROP INDEX IF EXISTS idx_chain_aggregations_distributor_id;
      DROP INDEX IF EXISTS idx_chain_aggregations_purchase_volume;
      DROP INDEX IF EXISTS idx_chain_aggregations_earned_rebate;
      DROP INDEX IF EXISTS idx_chain_aggregations_compliance_percentage;
      DROP INDEX IF EXISTS idx_chain_aggregations_total_stores;
      DROP MATERIALIZED VIEW IF EXISTS chain_aggregations CASCADE;
    `);

    // Recreate the materialized view with CTEs and distributor_id
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS chain_aggregations AS

      WITH chain_programs AS (
        SELECT programs.id as program_id, manufacturer_id
          FROM programs
        WHERE participant_type::text = 'CHAIN'::text
        ANd deleted_at IS NULL
      ),
      store_purchase_volumes AS (
        SELECT
          store_id,
          SUM(total_purchase) AS total_purchase
        FROM combined_store_summary
        WHERE transaction_year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND manufacturer_id in (SELECT DISTINCT manufacturer_id FROM chain_programs)
        GROUP BY store_id
      ),
      store_rebates AS (
        SELECT
          entity_id AS store_id,
          SUM(earned_rebate) AS total_earned_rebate
        FROM program_compliances
        WHERE entity_type = 'STORE'
          AND program_id in (select program_id from chain_programs)
          AND status = 'active'
          AND program_compliances.deleted_at IS NULL
        GROUP BY entity_id
      ),
      enrolled_stores AS (
        SELECT DISTINCT entity_id AS store_id
        FROM program_participants
        WHERE entity_type = 'STORE' AND deleted_at IS NULL
        AND program_id in (select program_id from chain_programs)
      ),
      compliant_stores AS (
        SELECT DISTINCT entity_id AS store_id
        FROM program_compliances
        WHERE entity_type = 'STORE' 
          AND is_qualified = TRUE
          AND program_id in (select program_id from chain_programs)
		      AND program_compliances.deleted_at IS NULL
      )

      SELECT
        c.id AS chain_id,
        c.name AS chain_name,
        c.distributor_id,
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
      GROUP BY c.id, c.name, c.distributor_id
    `);

    // Recreate indexes idempotently
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_chain_id ON chain_aggregations(chain_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_chain_name ON chain_aggregations(chain_name)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chain_aggregations_distributor_id ON chain_aggregations(distributor_id)
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
  }
};
