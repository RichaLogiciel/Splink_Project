"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(
      "etl_csv_transactions_staging"
    );

    if (!tableInfo["uuid"]) {
      await queryInterface.addColumn("etl_csv_transactions_staging", "uuid", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable(
      "etl_csv_transactions_staging"
    );

    if (tableInfo["uuid"]) {
      await queryInterface.removeColumn("etl_csv_transactions_staging", "uuid");
    }
  }
};
