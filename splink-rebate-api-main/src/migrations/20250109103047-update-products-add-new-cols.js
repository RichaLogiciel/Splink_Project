"use strict";

const tables = ["etl_csv_products_staging", "products"];

const columns = [
  "is_salty_snacks",
  "is_take_home",
  "is_prepack_display",
  "is_shipper",
  "is_engb_tier_1",
  "is_engb_tier_2_plus",
  "is_stp_pwrstr",
  "is_stp_brkfl",
  "is_fo_add",
  "is_tire_fix",
  "is_armor_all",
  "is_air_fresh"
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
