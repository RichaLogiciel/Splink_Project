"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("transactions", "invoice_reference", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("transactions", "order_reference", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("transactions", "delivery_reference", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("transactions", "invoice_reference");
    await queryInterface.removeColumn("transactions", "order_reference");
    await queryInterface.removeColumn("transactions", "delivery_reference");
  }
};
