"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("program_visibility");

    if (!tableInfo.deleted_at) {
      await queryInterface.addColumn("program_visibility", "deleted_at", {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("program_visibility", "deleted_at");
  }
};
