"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn("programs", "program_line");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("programs", "program_line", {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
