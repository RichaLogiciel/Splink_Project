"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist before adding them
    const tableInfo = await queryInterface.describeTable("line_items");

    // Add total_units column if it doesn't exist
    if (!tableInfo.total_units) {
      await queryInterface.addColumn("line_items", "total_units", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    // Add upc_type column if it doesn't exist
    if (!tableInfo.upc_type) {
      await queryInterface.addColumn("line_items", "upc_type", {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add units_per_upc column if it doesn't exist
    if (!tableInfo.units_per_upc) {
      await queryInterface.addColumn("line_items", "units_per_upc", {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    // Check if columns exist before removing them
    const tableInfo = await queryInterface.describeTable("line_items");

    if (tableInfo.total_units) {
      await queryInterface.removeColumn("line_items", "total_units");
    }

    if (tableInfo.upc_type) {
      await queryInterface.removeColumn("line_items", "upc_type");
    }

    if (tableInfo.units_per_upc) {
      await queryInterface.removeColumn("line_items", "units_per_upc");
    }
  }
};
