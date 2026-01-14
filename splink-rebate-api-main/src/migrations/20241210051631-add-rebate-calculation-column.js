"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the column already exists
    const tableDescription =
      await queryInterface.describeTable("program_details");

    if (tableDescription.rebate_calculation) {
      // Drop the column if it exists
      await queryInterface.removeColumn(
        "program_details",
        "rebate_calculation"
      );
    }

    // Add the column
    await queryInterface.addColumn("program_details", "rebate_calculation", {
      type: Sequelize.STRING(30),
      allowNull: true,
      field: "rebate_calculation"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("program_details", "rebate_calculation");
  }
};
