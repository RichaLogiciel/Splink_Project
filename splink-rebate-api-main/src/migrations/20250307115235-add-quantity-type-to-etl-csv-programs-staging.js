"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable(
      "etl_csv_programs_staging"
    );

    if (!tableDescription.quantity_type) {
      await queryInterface.addColumn(
        "etl_csv_programs_staging",
        "quantity_type",
        {
          type: Sequelize.STRING(255),
          allowNull: true
        }
      );
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable(
      "etl_csv_programs_staging"
    );

    if (tableDescription.quantity_type) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "quantity_type"
      );
    }
  }
};
