"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable(
      "etl_csv_programs_staging"
    );

    if (!tableDescription.exclude_distributor_ids) {
      await queryInterface.addColumn(
        "etl_csv_programs_staging",
        "exclude_distributor_ids",
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

    if (tableDescription.exclude_distributor_ids) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "exclude_distributor_ids"
      );
    }
  }
};
