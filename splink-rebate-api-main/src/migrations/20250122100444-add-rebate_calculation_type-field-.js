"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the column
    await queryInterface.addColumn(
      "program_details",
      "rebate_calculation_type",
      {
        type: Sequelize.STRING(30),
        allowNull: true,
        field: "rebate_calculation_type"
      }
    );
    await queryInterface.addColumn(
      "etl_csv_programs_staging",
      "rebate_calculation_type",
      {
        type: Sequelize.STRING(30),
        allowNull: true,
        field: "rebate_calculation_type"
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "program_details",
      "rebate_calculation_type"
    );
    await queryInterface.removeColumn(
      "etl_csv_programs_staging",
      "rebate_calculation_type"
    );
  }
};
