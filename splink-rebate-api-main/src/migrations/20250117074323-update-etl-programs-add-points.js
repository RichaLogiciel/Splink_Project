"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(
      "etl_csv_programs_staging"
    );

    if (!tableInfo["points"]) {
      await queryInterface.addColumn("etl_csv_programs_staging", "points", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable(
      "etl_csv_programs_staging"
    );

    if (tableInfo["points"]) {
      await queryInterface.removeColumn("etl_csv_programs_staging", "points");
    }
  }
};
