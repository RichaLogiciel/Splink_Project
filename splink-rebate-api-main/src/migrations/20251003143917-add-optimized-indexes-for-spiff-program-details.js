"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Indexes to optimize getSpiffProgramDetailsWithEarnings query
    // These indexes address the main join conditions, filtering predicates, and subquery lookups

    // 1. Programs table indexes
    // Composite index for main WHERE clause filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_participant_mfg_deleted
      ON programs(participant_type, manufacturer_id, deleted_at)
      WHERE deleted_at IS NULL
    `);

    // Index for timeline filtering (date range queries)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_dates
      ON programs(start_date, end_date)
    `);

    // Index for internal_initiative filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_internal_initiative
      ON programs(internal_initiative)
      WHERE internal_initiative IS NOT NULL
    `);

    // Index for visibility scope lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_visibility_scope
      ON programs(visibility_scope)
    `);

    // 2. Program_approvals table indexes
    // Composite index for join + filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_approvals_lookup
      ON program_approvals(program_id, approver_id, approver_type, status, deleted_at)
      WHERE deleted_at IS NULL
    `);

    // 3. Authorized_distributor_manufacturers table indexes
    // Composite index for manufacturer authorization check
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_adm_dist_mfg_deleted
      ON authorized_distributor_manufacturers(distributor_id, manufacturer_id, deleted_at)
      WHERE deleted_at IS NULL
    `);

    // 4. Program_compliances table indexes (critical for earnings subquery)
    // Composite index covering the earnings subquery filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_compliances_earnings
      ON program_compliances(program_id, entity_id, entity_type, status)
      WHERE status = 'Active'
    `);

    // Additional index for entity_id lookups in earnings calculation
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_compliances_entity
      ON program_compliances(entity_id, entity_type, program_id, status)
    `);

    // 5. Program_visibility table indexes (for visibility scope subquery)
    // Index for the EXISTS subquery in visibility filtering
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_visibility_lookup
      ON program_visibility(program_id, entity_type, entity_id, deleted_at)
      WHERE deleted_at IS NULL
    `);

    // 6. User_roles table indexes (for sales rep lookups)
    // Index for finding sales reps under a distributor
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_distributor_sales_rep
      ON user_roles(parent_entity_id, role, associated_user_id)
    `);

    // 7. Program_details table indexes
    // Index for LEFT JOIN on program_details
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_details_program_deleted
      ON program_details(program_id, deleted_at)
      WHERE deleted_at IS NULL
    `);

    // 8. Manufacturers table index
    // Index for manufacturer join (if not already primary key)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_manufacturers_id
      ON manufacturers(id)
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop all the indexes in reverse order
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_manufacturers_id
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_details_program_deleted
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_user_roles_distributor_sales_rep
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_visibility_lookup
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_compliances_entity
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_compliances_earnings
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_adm_dist_mfg_deleted
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_approvals_lookup
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_programs_visibility_scope
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_programs_internal_initiative
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_programs_dates
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_programs_participant_mfg_deleted
    `);
  }
};
