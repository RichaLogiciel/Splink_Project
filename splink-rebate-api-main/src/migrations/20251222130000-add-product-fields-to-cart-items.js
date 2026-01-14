"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Function to check if a column exists in a table
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch (error) {
        console.error(
          `Error checking if column ${columnName} exists in ${tableName}:`,
          error
        );
        return false;
      }
    };

    // Add dist_product_id column to cart_items table if it doesn't exist
    const distProductIdExists = await columnExists(
      "cart_items",
      "dist_product_id"
    );
    if (!distProductIdExists) {
      console.log("Adding dist_product_id column to cart_items table");
      await queryInterface.addColumn("cart_items", "dist_product_id", {
        type: Sequelize.STRING(60),
        allowNull: true
      });
    } else {
      console.log("dist_product_id column already exists in cart_items table");
    }

    // Add warehouse_id column to cart_items table if it doesn't exist
    const warehouseIdExists = await columnExists("cart_items", "warehouse_id");
    if (!warehouseIdExists) {
      console.log("Adding warehouse_id column to cart_items table");
      await queryInterface.addColumn("cart_items", "warehouse_id", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    } else {
      console.log("warehouse_id column already exists in cart_items table");
    }

    // Add splink_product_id column to cart_items table if it doesn't exist
    const splinkProductIdExists = await columnExists(
      "cart_items",
      "splink_product_id"
    );
    if (!splinkProductIdExists) {
      console.log("Adding splink_product_id column to cart_items table");
      await queryInterface.addColumn("cart_items", "splink_product_id", {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: "products",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
    } else {
      console.log(
        "splink_product_id column already exists in cart_items table"
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Function to check if a column exists in a table
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch (error) {
        console.error(
          `Error checking if column ${columnName} exists in ${tableName}:`,
          error
        );
        return false;
      }
    };

    // Remove splink_product_id column from cart_items table if it exists
    const splinkProductIdExists = await columnExists(
      "cart_items",
      "splink_product_id"
    );
    if (splinkProductIdExists) {
      console.log("Removing splink_product_id column from cart_items table");
      await queryInterface.removeColumn("cart_items", "splink_product_id");
    }

    // Remove warehouse_id column from cart_items table if it exists
    const warehouseIdExists = await columnExists("cart_items", "warehouse_id");
    if (warehouseIdExists) {
      console.log("Removing warehouse_id column from cart_items table");
      await queryInterface.removeColumn("cart_items", "warehouse_id");
    }

    // Remove dist_product_id column from cart_items table if it exists
    const distProductIdExists = await columnExists(
      "cart_items",
      "dist_product_id"
    );
    if (distProductIdExists) {
      console.log("Removing dist_product_id column from cart_items table");
      await queryInterface.removeColumn("cart_items", "dist_product_id");
    }
  }
};
