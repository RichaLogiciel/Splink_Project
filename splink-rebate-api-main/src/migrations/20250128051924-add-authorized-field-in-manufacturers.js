"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the column
    await queryInterface.addColumn("manufacturers", "authorized", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "authorized"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("manufacturers", "authorized");
  }
};
