"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "program_details";
    const columns = ["fixed_rebate_amount"];

    for (const column of columns) {
      const tableDescription = await queryInterface.describeTable(table);
      if (tableDescription[column]) {
        await queryInterface.changeColumn(table, column, {
          type: Sequelize.STRING(255),
          allowNull: true
        });
      } else {
        console.log(`${column} column not exit in ${table}`);
        await queryInterface.addColumn(table, column, {
          type: Sequelize.STRING(255),
          allowNull: true
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const table = "program_details";
    const columns = ["fixed_rebate_amount"];

    for (const column of columns) {
      const tableDescription = await queryInterface.describeTable(table);
      if (tableDescription[column]) {
        await queryInterface.changeColumn(table, column, {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        });
      } else {
        await queryInterface.removeColumn(table, column);
      }
    }
  }
};
