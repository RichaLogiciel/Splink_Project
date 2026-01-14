"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ["products", "etl_csv_products_staging"];
    const columnsToRemove = [
      "is_beverage",
      "is_other",
      "is_turtles_core",
      "is_milk_choc",
      "is_white_fudge"
    ];

    for (const table of tables) {
      const tableDescription = await queryInterface.describeTable(table);
      for (const tableColumn of columnsToRemove) {
        if (tableDescription[tableColumn]) {
          await queryInterface.removeColumn(table, tableColumn);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = ["products", "etl_csv_products_staging"];
    const columnsToAdd = [
      "is_beverage",
      "is_other",
      "is_turtles_core",
      "is_milk_choc",
      "is_white_fudge"
    ];

    for (const table of tables) {
      const tableDescription = await queryInterface.describeTable(table);
      for (const tableColumn of columnsToAdd) {
        if (!tableDescription[tableColumn]) {
          await queryInterface.addColumn(table, tableColumn, {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: false
          });
        }
      }
    }
  }
};
