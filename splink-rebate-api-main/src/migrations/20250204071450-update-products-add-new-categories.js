"use strict";

const tables = ["etl_csv_products_staging", "products"];

const columns = [
  "is_skin_care",
  "is_feminine_care",
  "is_shave_prep",
  "is_sun_care"
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tableName of tables) {
      const tableInfo = await queryInterface.describeTable(tableName);

      for (const colName of columns) {
        if (!tableInfo[colName]) {
          await queryInterface.addColumn(tableName, colName, {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false
          });
        }
      }
    }
  },

  async down(queryInterface) {
    for (const tableName of tables) {
      const tableInfo = await queryInterface.describeTable(tableName);

      for (const colName of columns) {
        if (tableInfo[colName]) {
          await queryInterface.removeColumn(tableName, colName);
        }
      }
    }
  }
};
