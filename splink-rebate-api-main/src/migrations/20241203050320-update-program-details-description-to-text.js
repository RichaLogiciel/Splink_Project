"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("program_details", "description", {
      type: Sequelize.TEXT
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("program_details", "description", {
      type: Sequelize.STRING // Revert to the original type (e.g., STRING or VARCHAR)
    });
  }
};
