"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable(
      "etl_csv_transactions_staging"
    );

    if (!tableDefinition.warehouse_id) {
      await queryInterface.addColumn(
        "etl_csv_transactions_staging",
        "warehouse_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null
        }
      );
    }
  },

  down: async (queryInterface) => {
    const tableDefinition = await queryInterface.describeTable(
      "etl_csv_transactions_staging"
    );

    if (tableDefinition.warehouse_id) {
      await queryInterface.removeColumn(
        "etl_csv_transactions_staging",
        "warehouse_id"
      );
    }
  }
};
