"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn("program_details", "rebate_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      field: "rebate_amount",
      comment: "e.g., 0.25, 1.00, 1.50"
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn("program_details", "rebate_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      field: "rebate_amount",
      comment: "e.g., 0.25, 1.00, 1.50"
    });
  }
};
