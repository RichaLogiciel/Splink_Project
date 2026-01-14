"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("program_compliances");

    // Add unique_products column if it doesn't exist
    if (!tableInfo.unique_products) {
      await queryInterface.addColumn("program_compliances", "unique_products", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
    }

    // Add total_quantity column if it doesn't exist
    if (!tableInfo.total_quantity) {
      await queryInterface.addColumn("program_compliances", "total_quantity", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("program_compliances");

    // Remove unique_products column if it exists
    if (tableInfo.unique_products) {
      await queryInterface.removeColumn(
        "program_compliances",
        "unique_products"
      );
    }

    // Remove total_quantity column if it exists
    if (tableInfo.total_quantity) {
      await queryInterface.removeColumn(
        "program_compliances",
        "total_quantity"
      );
    }
  }
};
