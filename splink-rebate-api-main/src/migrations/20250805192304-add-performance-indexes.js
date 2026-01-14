"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Adding composite indexes for getTransactionsByManufacturerId performance..."
    );

    // Primary filtering index for line_items (buyer transactions)
    try {
      await queryInterface.addIndex("line_items", {
        fields: ["buyer_type", "buyer_id", "product_id", "created_at"],
        name: "idx_line_items_buyer_filtering"
      });
    } catch (error) {
      console.log(
        "Index idx_line_items_buyer_filtering already exists, skipping..."
      );
    }

    // Primary filtering index for line_items (seller transactions)
    try {
      await queryInterface.addIndex("line_items", {
        fields: ["seller_type", "seller_id", "product_id", "created_at"],
        name: "idx_line_items_seller_filtering"
      });
    } catch (error) {
      console.log(
        "Index idx_line_items_seller_filtering already exists, skipping..."
      );
    }

    // Covering index for aggregation queries (most important for performance)
    try {
      await queryInterface.addIndex("line_items", {
        fields: [
          "seller_id",
          "buyer_id",
          "product_id",
          "quantity",
          "total_price"
        ],
        name: "idx_line_items_aggregation_covering"
      });
    } catch (error) {
      console.log(
        "Index idx_line_items_aggregation_covering already exists, skipping..."
      );
    }

    // Index for warehouse filtering
    try {
      await queryInterface.addIndex("line_items", {
        fields: ["warehouse_id", "product_id", "created_at"],
        name: "idx_line_items_warehouse_product"
      });
    } catch (error) {
      console.log(
        "Index idx_line_items_warehouse_product already exists, skipping..."
      );
    }

    // Product SKU indexes for faster JOIN operations
    try {
      await queryInterface.addIndex("products", {
        fields: [
          "manufacturer_id",
          "case_skus_id",
          "box_skus_id",
          "unit_skus_id"
        ],
        name: "idx_products_manufacturer_skus"
      });
    } catch (error) {
      console.log(
        "Index idx_products_manufacturer_skus already exists, skipping..."
      );
    }

    // Index for primary variant filtering (add only if not exists)
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_products_primary_variant ON products (primary_variant, unit_skus_id, manufacturer_id)`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "line_items",
      "idx_line_items_buyer_filtering"
    );
    await queryInterface.removeIndex(
      "line_items",
      "idx_line_items_seller_filtering"
    );
    await queryInterface.removeIndex(
      "line_items",
      "idx_line_items_aggregation_covering"
    );
    await queryInterface.removeIndex(
      "line_items",
      "idx_line_items_warehouse_product"
    );
    await queryInterface.removeIndex(
      "products",
      "idx_products_manufacturer_skus"
    );
    await queryInterface.removeIndex(
      "products",
      "idx_products_primary_variant"
    );
  }
};
