"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the column already exists before adding
    const table = "products";
    const column = "demo_internal_code";
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}'
    `);
    if (results.length === 0) {
      await queryInterface.addColumn(table, column, {
        type: Sequelize.TEXT,
        allowNull: true,
        after: "pitco_internal_code"
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove the column if it exists
    const table = "products";
    const column = "demo_internal_code";
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}'
    `);
    if (results.length > 0) {
      await queryInterface.removeColumn(table, column);
    }
  }
};
