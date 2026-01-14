"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Function to check if a column exists in a table
    const columnExists = async (tableName, columnName) => {
      try {
        // Get the table description which includes column information
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

    // Add manufacturer_id column to cart_items table if it doesn't exist
    const manufacturerIdExistsInCartItems = await columnExists(
      "cart_items",
      "manufacturer_id"
    );
    if (!manufacturerIdExistsInCartItems) {
      console.log("Adding manufacturer_id column to cart_items table");
      await queryInterface.addColumn("cart_items", "manufacturer_id", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    } else {
      console.log("manufacturer_id column already exists in cart_items table");
    }

    // Add manufacturer_id column to order_items table if it doesn't exist
    const manufacturerIdExistsInOrderItems = await columnExists(
      "order_items",
      "manufacturer_id"
    );
    if (!manufacturerIdExistsInOrderItems) {
      console.log("Adding manufacturer_id column to order_items table");
      await queryInterface.addColumn("order_items", "manufacturer_id", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    } else {
      console.log("manufacturer_id column already exists in order_items table");
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

    // Remove manufacturer_id column from cart_items table if it exists
    const manufacturerIdExistsInCartItems = await columnExists(
      "cart_items",
      "manufacturer_id"
    );
    if (manufacturerIdExistsInCartItems) {
      console.log("Removing manufacturer_id column from cart_items table");
      await queryInterface.removeColumn("cart_items", "manufacturer_id");
    }

    // Remove manufacturer_id column from order_items table if it exists
    const manufacturerIdExistsInOrderItems = await columnExists(
      "order_items",
      "manufacturer_id"
    );
    if (manufacturerIdExistsInOrderItems) {
      console.log("Removing manufacturer_id column from order_items table");
      await queryInterface.removeColumn("order_items", "manufacturer_id");
    }
  }
};
