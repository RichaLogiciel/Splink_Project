"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("distributors");

    if (!tableDesc.is_disabled) {
      await queryInterface.addColumn("distributors", "is_disabled", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false // Ensures existing records are not disabled by default
      });
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable("distributors");

    if (tableDesc.is_disabled) {
      await queryInterface.removeColumn("distributors", "is_disabled");
    }
  }
};
