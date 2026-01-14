"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "etl_csv_programs_staging",
      "program_products_tags",
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
    await queryInterface.addColumn(
      "etl_csv_programs_staging",
      "program_products_tags_qty",
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "etl_csv_programs_staging",
      "program_products_tags"
    );
    await queryInterface.removeColumn(
      "etl_csv_programs_staging",
      "program_products_tags_qty"
    );
  }
};
