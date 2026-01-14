"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the column
    await queryInterface.addColumn("manufacturers", "external_id", {
      type: Sequelize.STRING,
      allowNull: true,
      field: "external_id"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("manufacturers", "external_id");
  }
};
