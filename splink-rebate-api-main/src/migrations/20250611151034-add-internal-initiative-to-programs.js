"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("programs");
    if (!tableInfo.internal_initiative) {
      await queryInterface.addColumn("programs", "internal_initiative", {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("programs");
    if (tableInfo.internal_initiative) {
      await queryInterface.removeColumn("programs", "internal_initiative");
    }
  }
};
