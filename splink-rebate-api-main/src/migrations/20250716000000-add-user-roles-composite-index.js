"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Add composite index for the specific query pattern used in getStoreIdsByDistributorId (idempotent)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_distributor_stores ON user_roles(parent_entity_id, parent_entity_type, role, associated_entity_type)
    `);
  },

  async down(queryInterface) {
    // Drop the composite index if it exists
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_user_roles_distributor_stores
    `);
  }
};
