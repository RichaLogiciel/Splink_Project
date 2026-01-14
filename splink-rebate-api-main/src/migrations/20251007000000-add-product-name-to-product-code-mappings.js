"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Adding product_name column to product_code_mappings table...");

    await queryInterface.addColumn("product_code_mappings", "product_name", {
      type: Sequelize.TEXT,
      allowNull: true,
      field: "product_name"
    });

    console.log("Successfully added product_name column");
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "Removing product_name column from product_code_mappings table..."
    );

    await queryInterface.removeColumn("product_code_mappings", "product_name");

    console.log("Successfully removed product_name column");
  }
};
