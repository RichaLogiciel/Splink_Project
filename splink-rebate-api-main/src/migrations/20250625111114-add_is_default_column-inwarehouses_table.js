"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "warehouses";
    const column = "is_default";

    const tableDescription = await queryInterface.describeTable(table);
    if (!tableDescription[column]) {
      await queryInterface.addColumn(table, column, {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }
  },

  async down(queryInterface) {
    const table = "warehouses";
    const column = "is_default";

    const tableDescription = await queryInterface.describeTable(table);
    if (tableDescription[column]) {
      await queryInterface.removeColumn(table, column);
    }
  }
};
