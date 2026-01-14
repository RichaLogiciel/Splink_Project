"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("program_compliances", "status", {
      type: Sequelize.STRING,
      defaultValue: null,
      allowNull: true
    });

    await queryInterface.addColumn(
      "etl_csv_products_staging",
      "is_core_retail",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    );
    await queryInterface.addColumn(
      "etl_csv_products_staging",
      "is_core_wholesale",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    );

    await queryInterface.addColumn("products", "is_core_retail", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    await queryInterface.addColumn("products", "is_core_wholesale", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("program_compliances", "status");

    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_core_retail"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_core_wholesale"
    );

    await queryInterface.removeColumn("products", "is_core_retail");
    await queryInterface.removeColumn("products", "is_core_wholesale");
  }
};
