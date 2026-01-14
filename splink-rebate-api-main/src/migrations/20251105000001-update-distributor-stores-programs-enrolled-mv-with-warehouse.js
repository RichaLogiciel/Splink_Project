"use strict";

/**
 * Migration to update distributor_stores_programs_enrolled_mv materialized view
 * to include warehouse_id for warehouse filtering support
 *
 * This migration updates the materialized view to break down enrolled stores
 * by both distributor_id and warehouse_id, enabling warehouse filtering
 * in the distributor admin dashboard.
 *
 * Key Changes:
 * - Adds warehouse_id column to the materialized view
 * - Groups by both distributor_id and warehouse_id
 * - Handles NULL warehouse_id for stores without warehouse transactions
 * - Updates indexes to support (distributor_id, warehouse_id) lookups
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "🔄 Updating distributor_stores_programs_enrolled_mv materialized view to include warehouse_id..."
    );

    // Drop the old materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS distributor_stores_programs_enrolled_mv CASCADE;
    `);

    console.log("✅ Dropped old materialized view");

    // Create the updated materialized view with warehouse_id
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW distributor_stores_programs_enrolled_mv
      TABLESPACE pg_default
      AS
      SELECT 
          ur.parent_entity_id AS distributor_id,
          s.warehouse_id,
          COUNT(DISTINCT pp.program_id || '-' || pp.entity_id) AS enrolled_stores_count
      FROM program_participants pp
      INNER JOIN user_roles ur
          ON pp.entity_id = ur.associated_user_id
          AND ur.parent_entity_type = 'DISTRIBUTOR'
          AND ur.role = 'STORE'
          AND ur.associated_entity_type = 'STORE'
      LEFT JOIN stores s
          ON pp.entity_id = s.id
          AND s.deleted_at IS NULL
      WHERE pp.entity_type = 'STORE'
          AND pp.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 
              FROM program_store_ineligibility psi
              WHERE psi.program_id = pp.program_id
                  AND psi.store_id = pp.entity_id
                  AND psi.deleted_at IS NULL
          )
      GROUP BY ur.parent_entity_id, s.warehouse_id
      ORDER BY ur.parent_entity_id, s.warehouse_id
      WITH DATA;
    `);

    console.log("✅ Created updated materialized view with warehouse_id");

    // Create composite unique index for fast (distributor_id, warehouse_id) lookups
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX idx_distributor_stores_programs_enrolled_mv_distributor_warehouse 
      ON distributor_stores_programs_enrolled_mv(distributor_id, warehouse_id NULLS LAST);
    `);

    console.log("✅ Created composite unique index");

    // Create index on warehouse_id for warehouse-only lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_distributor_stores_programs_enrolled_mv_warehouse_id 
      ON distributor_stores_programs_enrolled_mv(warehouse_id);
    `);

    console.log("✅ Created warehouse_id index");

    // Ensure supporting indexes exist for refresh performance
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_participants_entity_lookup 
      ON program_participants(entity_type, entity_id, program_id, deleted_at);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_distributor_stores 
      ON user_roles(parent_entity_type, role, associated_entity_type, parent_entity_id, associated_user_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_store_ineligibility_lookup 
      ON program_store_ineligibility(program_id, store_id, deleted_at);
    `);

    // Create index on stores for warehouse lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_stores_warehouse_id 
      ON stores(warehouse_id) 
      WHERE deleted_at IS NULL;
    `);

    console.log("✅ Created supporting indexes");

    // Update refresh function (should already exist, but ensure it's correct)
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION refresh_distributor_stores_programs_enrolled_mv()
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY distributor_stores_programs_enrolled_mv;
      EXCEPTION
          WHEN OTHERS THEN
              -- If CONCURRENTLY fails (e.g., no unique index), fall back to regular refresh
              REFRESH MATERIALIZED VIEW distributor_stores_programs_enrolled_mv;
      END;
      $$;
    `);

    console.log("✅ Updated refresh function");

    console.log(
      "🎉 Successfully updated distributor_stores_programs_enrolled_mv materialized view with warehouse_id"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "🔄 Reverting distributor_stores_programs_enrolled_mv materialized view to original version..."
    );

    // Drop the updated materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS distributor_stores_programs_enrolled_mv CASCADE;
    `);

    // Recreate the original materialized view (without warehouse_id)
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW distributor_stores_programs_enrolled_mv
      TABLESPACE pg_default
      AS
      SELECT 
          ur.parent_entity_id AS distributor_id,
          COUNT(DISTINCT pp.program_id || '-' || pp.entity_id) AS enrolled_stores_count
      FROM program_participants pp
      INNER JOIN user_roles ur
          ON pp.entity_id = ur.associated_user_id
          AND ur.parent_entity_type = 'DISTRIBUTOR'
          AND ur.role = 'STORE'
          AND ur.associated_entity_type = 'STORE'
      WHERE pp.entity_type = 'STORE'
          AND pp.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 
              FROM program_store_ineligibility psi
              WHERE psi.program_id = pp.program_id
                  AND psi.store_id = pp.entity_id
                  AND psi.deleted_at IS NULL
          )
      GROUP BY ur.parent_entity_id
      ORDER BY ur.parent_entity_id
      WITH DATA;
    `);

    // Recreate original index
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX idx_distributor_stores_programs_enrolled_mv_distributor_id 
      ON distributor_stores_programs_enrolled_mv(distributor_id);
    `);

    // Drop warehouse-specific index if it exists
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_distributor_stores_programs_enrolled_mv_warehouse_id;
    `);

    // Drop stores warehouse index if it exists
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_stores_warehouse_id;
    `);

    // Restore original refresh function
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION refresh_distributor_stores_programs_enrolled_mv()
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW distributor_stores_programs_enrolled_mv;
      END;
      $$;
    `);

    console.log(
      "✅ Successfully reverted distributor_stores_programs_enrolled_mv materialized view"
    );
  }
};
