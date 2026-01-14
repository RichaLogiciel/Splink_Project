"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("program_details", "is_other", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn("program_details", "products_tags_qty_max", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("program_details", "points_per_sku", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("program_details", "percentage_per_point", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("program_details", "max_points", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("program_details", "is_other");
    await queryInterface.removeColumn(
      "program_details",
      "products_tags_qty_max"
    );
    await queryInterface.removeColumn("program_details", "points_per_sku");
    await queryInterface.removeColumn(
      "program_details",
      "percentage_per_point"
    );
    await queryInterface.removeColumn("program_details", "max_points");
  }
};
