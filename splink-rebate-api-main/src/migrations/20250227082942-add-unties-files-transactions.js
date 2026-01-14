"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("transactions", "total_units", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn("transactions", "upc_type", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("transactions", "units_per_upc", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("transactions", "total_units");
    await queryInterface.removeColumn("transactions", "upc_type");
    await queryInterface.removeColumn("transactions", "units_per_upc");
  }
};
