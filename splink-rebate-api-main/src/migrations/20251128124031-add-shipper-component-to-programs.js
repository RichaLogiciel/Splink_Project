"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Check if column exists
    const programsTableInfo = await queryInterface.describeTable("programs");

    if (!programsTableInfo.shipper_component) {
      await queryInterface.addColumn("programs", "shipper_component", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
        field: "shipper_component"
      });
    }
  },

  async down(queryInterface) {
    // Check if column exists before removing
    const programsTableInfo = await queryInterface.describeTable("programs");

    if (programsTableInfo.shipper_component) {
      await queryInterface.removeColumn("programs", "shipper_component");
    }
  }
};
