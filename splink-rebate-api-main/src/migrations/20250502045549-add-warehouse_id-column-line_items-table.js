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

    // Add warehouse_id column to line_items table if it doesn't exist
    const warehouseIdExistsInLineItems = await columnExists(
      "line_items",
      "warehouse_id"
    );
    if (!warehouseIdExistsInLineItems) {
      await queryInterface.addColumn("line_items", "warehouse_id", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    } else {
      console.log("warehouse_id column already exists in line_items table");
    }
  },

  async down(queryInterface) {
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

    // Remove warehouse id column from line_items table if it exists
    const warehouseIdExistsInLineItems = await columnExists(
      "line_items",
      "warehouse_id"
    );
    if (warehouseIdExistsInLineItems) {
      await queryInterface.removeColumn("line_items", "warehouse_id");
    }
  }
};
