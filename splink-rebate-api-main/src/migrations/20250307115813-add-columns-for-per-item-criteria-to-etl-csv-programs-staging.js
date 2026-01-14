"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable(
      "etl_csv_programs_staging"
    );

    if (!tableDescription.products_tags_qty_max) {
      await queryInterface.addColumn(
        "etl_csv_programs_staging",
        "products_tags_qty_max",
        {
          type: Sequelize.STRING(255),
          allowNull: true
        }
      );
    }

    if (!tableDescription.points_per_sku) {
      await queryInterface.addColumn(
        "etl_csv_programs_staging",
        "points_per_sku",
        {
          type: Sequelize.STRING(255),
          allowNull: true
        }
      );
    }

    if (!tableDescription.percentage_per_point) {
      await queryInterface.addColumn(
        "etl_csv_programs_staging",
        "percentage_per_point",
        {
          type: Sequelize.STRING(255),
          allowNull: true
        }
      );
    }

    if (!tableDescription.max_points) {
      await queryInterface.addColumn("etl_csv_programs_staging", "max_points", {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable(
      "etl_csv_programs_staging"
    );

    if (tableDescription.products_tags_qty_max) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "products_tags_qty_max"
      );
    }
    if (tableDescription.points_per_sku) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "points_per_sku"
      );
    }
    if (tableDescription.percentage_per_point) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "percentage_per_point"
      );
    }
    if (tableDescription.max_points) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "max_points"
      );
    }
  }
};
