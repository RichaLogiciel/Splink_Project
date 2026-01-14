"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the columns already exist before adding
    const table = "program_details";
    const columns = ["fixed_rebate_amount", "fixed_rebate_category"];

    for (const column of columns) {
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}'
      `);

      if (results.length === 0) {
        if (column === "fixed_rebate_amount") {
          await queryInterface.addColumn(table, column, {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null
          });
        } else if (column === "fixed_rebate_category") {
          await queryInterface.addColumn(table, column, {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null
          });
        }
      }
    }
  },

  async down(queryInterface) {
    // Remove the columns if they exist
    const table = "program_details";
    const columns = ["fixed_rebate_amount", "fixed_rebate_category"];

    for (const column of columns) {
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}'
      `);

      if (results.length > 0) {
        await queryInterface.removeColumn(table, column);
      }
    }
  }
};
