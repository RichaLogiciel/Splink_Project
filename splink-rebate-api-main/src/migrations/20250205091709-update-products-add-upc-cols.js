"use strict";

const tables = [
  "etl_csv_products_staging",
  "products",
  "etl_csv_transactions_staging"
];

const columns = {
  [tables[0]]: ["old_upc_unit", "old_upc_case", "old_upc_box"],
  [tables[1]]: ["old_unit_skus_id", "old_case_skus_id", "old_box_skus_id"],
  [tables[2]]: []
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tableName of tables) {
      const tableInfo = await queryInterface.describeTable(tableName);

      for (const colName of columns[tableName]) {
        if (!tableInfo[colName]) {
          await queryInterface.addColumn(tableName, colName, {
            type: Sequelize.STRING,
            defaultValue: null,
            allowNull: true
          });
        }
      }

      if (
        tableName == "etl_csv_products_staging" ||
        tableName == "etl_csv_transactions_staging"
      ) {
        await queryInterface.addColumn(tableName, "is_upc_changed", {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        });
      }
    }
  },

  async down(queryInterface) {
    for (const tableName of tables) {
      const tableInfo = await queryInterface.describeTable(tableName);

      const colsToRemove = [...columns[tableName], "is_upc_changed"];

      for (const colName of colsToRemove) {
        if (tableInfo[colName]) {
          await queryInterface.removeColumn(tableName, colName);
        }
      }
    }
  }
};
