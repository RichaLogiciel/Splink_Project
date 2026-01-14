"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = ["products", "etl_csv_products_staging"];
    const columnsToRemove = [
      "is_core_product",
      "is_essential",
      "is_flex",
      "is_innovation",
      "is_core_display",
      "is_carousel",
      "is_bakeshop",
      "is_tic_tac_display",
      "is_kinder_display",
      "is_bf_display",
      "is_10oz",
      "is_4oz",
      "is_15oz",
      "is_80ct",
      "is_cold_crafted",
      "is_core_retail",
      "is_core_wholesale",
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
      "is_air_fresh",
      "is_skin_care",
      "is_feminine_care",
      "is_shave_prep",
      "is_sun_care"
    ];

    for (const table of tables) {
      const tableDescription = await queryInterface.describeTable(table);
      for (const column of columnsToRemove) {
        if (tableDescription[column]) {
          await queryInterface.removeColumn(table, column);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = ["products", "etl_csv_products_staging"];

    const columnsToAdd = [
      "is_core_product",
      "is_essential",
      "is_flex",
      "is_innovation",
      "is_core_display",
      "is_carousel",
      "is_bakeshop",
      "is_tic_tac_display",
      "is_kinder_display",
      "is_bf_display",
      "is_10oz",
      "is_4oz",
      "is_15oz",
      "is_80ct",
      "is_cold_crafted",
      "is_core_retail",
      "is_core_wholesale",
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
      "is_air_fresh",
      "is_skin_care",
      "is_feminine_care",
      "is_shave_prep",
      "is_sun_care"
    ];

    for (const table of tables) {
      const tableDescription = await queryInterface.describeTable(table);
      for (const column of columnsToAdd) {
        if (!tableDescription[column]) {
          await queryInterface.addColumn(table, column, {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: false
          });
        }
      }
    }
  }
};
