"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("manufacturers", "organization_name", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("manufacturers", "organization_name");
  }
};
