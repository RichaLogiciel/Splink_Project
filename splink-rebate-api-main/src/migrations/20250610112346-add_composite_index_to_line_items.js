"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex(
      "line_items",
      ["buyer_id", "product_id", "transaction_date"],
      {
        name: "idx_line_items_buyer_product_date"
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex(
      "line_items",
      "idx_line_items_buyer_product_date"
    );
  }
};
