"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Check if column exists
    const productsTableInfo = await queryInterface.describeTable("products");

    if (!productsTableInfo.is_shipper) {
      await queryInterface.addColumn("products", "is_shipper", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_shipper"
      });
    }
  },

  async down(queryInterface) {
    // Check if column exists before removing
    const productsTableInfo = await queryInterface.describeTable("products");

    if (productsTableInfo.is_shipper) {
      await queryInterface.removeColumn("products", "is_shipper");
    }
  }
};
