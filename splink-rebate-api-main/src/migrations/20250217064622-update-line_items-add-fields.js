"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("line_items", "seller_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn("line_items", "seller_type", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("line_items", "buyer_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn("line_items", "buyer_type", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("line_items", "transaction_date", {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addIndex("line_items", ["buyer_id", "buyer_type"], {
      name: "idx_line_items_buyer_id_buyer_type"
    });

    await queryInterface.addIndex("line_items", ["seller_id", "seller_type"], {
      name: "idx_line_items_seller_id_seller_type"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "line_items",
      "idx_line_items_buyer_id_buyer_type"
    );
    await queryInterface.removeIndex(
      "line_items",
      "idx_line_items_seller_id_seller_type"
    );

    await queryInterface.removeColumn("line_items", "seller_id");
    await queryInterface.removeColumn("line_items", "seller_type");
    await queryInterface.removeColumn("line_items", "buyer_id");
    await queryInterface.removeColumn("line_items", "buyer_type");
    await queryInterface.removeColumn("line_items", "transaction_date");
  }
};
