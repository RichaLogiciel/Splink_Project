"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("products", "dist_recommended", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "dist_recommended"
    });

    await queryInterface.addColumn("products", "store_recommended", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "store_recommended"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("products", "dist_recommended");
    await queryInterface.removeColumn("products", "store_recommended");
  }
};
