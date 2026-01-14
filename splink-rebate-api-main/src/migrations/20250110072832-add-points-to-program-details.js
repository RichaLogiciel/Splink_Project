"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.addColumn("program_details", "points", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down(queryInterface) {
    return queryInterface.removeColumn("program_details", "points");
  }
};
