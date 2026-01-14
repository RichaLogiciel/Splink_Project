"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      "etl_csv_programs_staging",
      "rebate_calculation",
      {
        type: Sequelize.STRING(255),
        allowNull: true
      }
    );

    await queryInterface.changeColumn("program_details", "rebate_calculation", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      "etl_csv_programs_staging",
      "rebate_calculation",
      {
        type: Sequelize.STRING(30),
        allowNull: true // Reverting to original state
      }
    );

    await queryInterface.changeColumn("program_details", "rebate_calculation", {
      type: Sequelize.STRING(30),
      allowNull: true // Reverting to original state
    });
  }
};
