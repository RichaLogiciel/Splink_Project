"use strict";

/**
 * Migration to create distributor_stores_programs_enrolled_mv materialized view
 *
 * This materialized view pre-aggregates the count of stores enrolled in programs per distributor,
 * optimizing the countStoresProgramsEnrolled query for distributor admin dashboard.
 *
 * Key Benefits:
 * - Eliminates complex JOINs across program_participants, user_roles, and program_store_ineligibility
 * - Provides sub-millisecond lookup times for distributor key metrics
 * - Manual refresh control (no triggers) for better performance management
 * - Focused on distributor admin use case only
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "🔄 Creating distributor_stores_programs_enrolled_mv materialized view..."
    );

    // Create the materialized view
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

    console.log("✅ Created materialized view");

    // Create primary index for fast distributor lookups
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX idx_distributor_stores_programs_enrolled_mv_distributor_id 
      ON distributor_stores_programs_enrolled_mv(distributor_id);
    `);

    console.log("✅ Created primary index");

    // Create supporting indexes for refresh performance
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

    console.log("✅ Created supporting indexes");

    // Create manual refresh function
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

    console.log("✅ Created refresh function");

    console.log(
      "🎉 Successfully created distributor_stores_programs_enrolled_mv materialized view"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "🔄 Dropping distributor_stores_programs_enrolled_mv materialized view..."
    );

    // Drop refresh function
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS refresh_distributor_stores_programs_enrolled_mv();
    `);

    // Drop materialized view (this will also drop the indexes)
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS distributor_stores_programs_enrolled_mv CASCADE;
    `);

    // Drop supporting indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_participants_entity_lookup;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_user_roles_distributor_stores;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_store_ineligibility_lookup;
    `);

    console.log(
      "✅ Successfully dropped distributor_stores_programs_enrolled_mv materialized view"
    );
  }
};
