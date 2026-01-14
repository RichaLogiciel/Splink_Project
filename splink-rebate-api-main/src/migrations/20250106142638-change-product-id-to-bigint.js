"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("line_items", "product_id", {
      type: Sequelize.BIGINT,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("line_items", "product_id", {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
