"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add distributor_id column if it doesn't exist
    const tableDescription = await queryInterface.describeTable("chains");
    if (!tableDescription.distributor_id) {
      await queryInterface.addColumn("chains", "distributor_id", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    // 2. Backfill distributor_id based on store-user-role mapping
    await queryInterface.sequelize.query(`
      WITH chain_distributor_map AS (
        SELECT
          chains.id AS chain_id,
          user_roles.parent_entity_id AS distributor_id
        FROM chain_stores
        JOIN chains ON chains.id = chain_stores.chain_id
        JOIN stores ON stores.id = chain_stores.store_id
        JOIN user_roles ON stores.id = user_roles.associated_user_id
        WHERE user_roles.parent_entity_type = 'DISTRIBUTOR'
          AND user_roles.role = 'STORE'
      )
      UPDATE chains
      SET distributor_id = chain_distributor_map.distributor_id
      FROM chain_distributor_map
      WHERE chains.id = chain_distributor_map.chain_id
        AND chains.distributor_id IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove the distributor_id column
    const tableDescription = await queryInterface.describeTable("chains");
    if (tableDescription.distributor_id) {
      await queryInterface.removeColumn("chains", "distributor_id");
    }
  }
};
