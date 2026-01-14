"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "parent_product_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "products",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("products", "parent_product_id");
  }
};
