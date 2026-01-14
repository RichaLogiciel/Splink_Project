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

    // Add warehouse_id column to stores table if it doesn't exist
    const warehouseIdExistsInStores = await columnExists(
      "stores",
      "warehouse_id"
    );
    if (!warehouseIdExistsInStores) {
      await queryInterface.addColumn("stores", "warehouse_id", {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    } else {
      console.log("warehouse_id column already exists in stores table");
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

    // Remove warehouse_id column from stores table if it exists
    const warehouseIdExistsInStores = await columnExists(
      "stores",
      "warehouse_id"
    );
    if (warehouseIdExistsInStores) {
      await queryInterface.removeColumn("stores", "warehouse_id");
    }
  }
};
