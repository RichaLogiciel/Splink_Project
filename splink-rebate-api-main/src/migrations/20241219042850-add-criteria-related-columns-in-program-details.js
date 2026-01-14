"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "program_details",
      "min_purchase",
      "min_qty"
    );
    await queryInterface.renameColumn(
      "program_details",
      "max_purchase",
      "max_qty"
    );

    await queryInterface.addColumn("program_details", "rebatable_products", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("program_details", "dependecy", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("program_details", "min_spend", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    });

    await queryInterface.addColumn("program_details", "max_rebate", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    });

    await queryInterface.addColumn("program_details", "products_tags", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("program_details", "products_tags_qty", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("program_details", "criteria", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.renameColumn(
      "program_details",
      "min_qty",
      "min_purchase"
    );
    await queryInterface.renameColumn(
      "program_details",
      "max_qty",
      "max_purchase"
    );

    await queryInterface.removeColumn("program_details", "rebatable_products");
    await queryInterface.removeColumn("program_details", "dependecy");
    await queryInterface.removeColumn("program_details", "min_spend");
    await queryInterface.removeColumn("program_details", "max_rebate");
    await queryInterface.removeColumn("program_details", "products_tags");
    await queryInterface.removeColumn("program_details", "products_tags_qty");
    await queryInterface.removeColumn("program_details", "criteria");
  }
};
