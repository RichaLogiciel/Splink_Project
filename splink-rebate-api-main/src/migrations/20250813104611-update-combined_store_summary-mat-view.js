"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
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

    // Create combined_store_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS combined_store_summary;
      CREATE MATERIALIZED VIEW combined_store_summary AS
      SELECT 
          COALESCE(q1.distributor_id, q2.distributor_id) AS distributor_id,
          COALESCE(q1.manufacturer_id, q2.manufacturer_id) AS manufacturer_id,
          COALESCE(q1.store_id, q2.store_id) AS store_id,
          COALESCE(q1.total_price_sum, 0) AS total_purchase,
          COALESCE(q2.total_rebate_sum, 0) AS earned_rebate,
          COALESCE(q1.transaction_year, q2.transaction_year) AS transaction_year,
          COALESCE(q1.warehouse_id, null) AS warehouse_id
      FROM 
          (
              With store_combined_items AS (
                  SELECT 
                    dt.id AS distributor_id, 
                    p.manufacturer_id, 
                    li.buyer_id AS store_id,
                    SUM(li.total_price) AS total_price_sum,
                    EXTRACT(YEAR FROM li.transaction_date) AS transaction_year,
                    li.warehouse_id
                  FROM 
                    distributors AS dt
                  JOIN 
                    line_items AS li 
                    ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
                  JOIN 
                    products AS p 
                    ON (
                      (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                      OR li.product_id IN (p.case_skus_id, p.box_skus_id)
                    )
                  WHERE 
                    li.deleted_at IS NULL 
                    AND p.deleted_at IS NULL 
                    AND dt.deleted_at IS NULL 
                  GROUP BY 
                    p.id,
                    dt.id, 
                    li.buyer_id,
                    p.manufacturer_id,
                    EXTRACT(YEAR FROM li.transaction_date),
                    li.warehouse_id
                  Having sum(li.total_price) > 0
              )
              SELECT 
                distributor_id,
                store_id,
                manufacturer_id,
                SUM(total_price_sum) AS total_price_sum,
                transaction_year,
                warehouse_id 
              FROM store_combined_items 
              GROUP BY 
                distributor_id,
                store_id,
                manufacturer_id,
                transaction_year,
                warehouse_id
          ) AS q1
      FULL OUTER JOIN 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  pro.manufacturer_id, 
                  ur.associated_user_id AS store_id,
                  SUM(pc.earned_rebate) AS total_rebate_sum,
                  EXTRACT(YEAR FROM pro.end_date) AS transaction_year
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
              LEFT JOIN program_visibility pv 
                ON pv.program_id = pro.id 
                AND (pv.entity_id = pc.entity_id OR pv.entity_id IS NULL) AND pv.deleted_at IS NULL
              LEFT JOIN program_store_ineligibility psi on psi.program_id = pro.id AND psi.store_id = pc.entity_id AND psi.deleted_at IS NULL
              WHERE 
                (pv.id IS NULL
                OR pv.entity_id = pc.entity_id)
                AND psi.id IS NULL
                AND dt.deleted_at IS NULL
                AND ur.deleted_at IS NULL
                AND pc.deleted_at IS NULL
                AND pro.deleted_at IS NULL
              GROUP BY 
                  dt.id, 
                  ur.associated_user_id,
                  pro.manufacturer_id,
                  EXTRACT(YEAR FROM pro.end_date)
          ) AS q2
      ON 
          q1.distributor_id = q2.distributor_id 
          AND q1.manufacturer_id = q2.manufacturer_id 
          AND q1.store_id = q2.store_id
          AND q1.transaction_year = q2.transaction_year;
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
  },

  async down(queryInterface) {
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

    // Create combined_store_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS combined_store_summary;
      CREATE MATERIALIZED VIEW combined_store_summary AS
      SELECT 
          COALESCE(q1.distributor_id, q2.distributor_id) AS distributor_id,
          COALESCE(q1.manufacturer_id, q2.manufacturer_id) AS manufacturer_id,
          COALESCE(q1.store_id, q2.store_id) AS store_id,
          COALESCE(q1.total_price_sum, 0) AS total_purchase,
          COALESCE(q2.total_rebate_sum, 0) AS earned_rebate,
          COALESCE(q1.transaction_year, q2.transaction_year) AS transaction_year,
          COALESCE(q1.warehouse_id, null) AS warehouse_id
      FROM 
          (
              With store_combined_items AS (
                  SELECT 
                    dt.id AS distributor_id, 
                    p.manufacturer_id, 
                    li.buyer_id AS store_id,
                    SUM(li.total_price) AS total_price_sum,
                    EXTRACT(YEAR FROM li.transaction_date) AS transaction_year,
                    li.warehouse_id
                  FROM 
                    distributors AS dt
                  JOIN 
                    line_items AS li 
                    ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
                  JOIN 
                    products AS p 
                    ON (
                      (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                      OR li.product_id IN (p.case_skus_id, p.box_skus_id)
                    )
                  WHERE 
                    li.deleted_at IS NULL 
                    AND p.deleted_at IS NULL 
                    AND dt.deleted_at IS NULL 
                  GROUP BY 
                    p.id,
                    dt.id, 
                    li.buyer_id,
                    p.manufacturer_id,
                    EXTRACT(YEAR FROM li.transaction_date),
                    li.warehouse_id
                  Having sum(li.total_price) > 0
              )
              SELECT 
                distributor_id,
                store_id,
                manufacturer_id,
                SUM(total_price_sum) AS total_price_sum,
                transaction_year,
                warehouse_id 
              FROM store_combined_items 
              GROUP BY 
                distributor_id,
                store_id,
                manufacturer_id,
                transaction_year,
                warehouse_id
          ) AS q1
      FULL OUTER JOIN 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  pro.manufacturer_id, 
                  ur.associated_user_id AS store_id,
                  SUM(pc.earned_rebate) AS total_rebate_sum,
                  EXTRACT(YEAR FROM pro.end_date) AS transaction_year
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
              LEFT JOIN program_visibility pv 
                ON pv.program_id = pro.id 
                AND (pv.entity_id = pc.entity_id OR pv.entity_id IS NULL) AND pv.deleted_at IS NULL
              WHERE 
                (pv.id IS NULL
                OR pv.entity_id = pc.entity_id)
                AND dt.deleted_at IS NULL
                AND ur.deleted_at IS NULL
                AND pc.deleted_at IS NULL
                AND pro.deleted_at IS NULL
              GROUP BY 
                  dt.id, 
                  ur.associated_user_id,
                  pro.manufacturer_id,
                  EXTRACT(YEAR FROM pro.end_date)
          ) AS q2
      ON 
          q1.distributor_id = q2.distributor_id 
          AND q1.manufacturer_id = q2.manufacturer_id 
          AND q1.store_id = q2.store_id
          AND q1.transaction_year = q2.transaction_year;
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
