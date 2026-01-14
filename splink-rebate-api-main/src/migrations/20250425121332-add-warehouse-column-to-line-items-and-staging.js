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

    // Add warehouse column to line_items table if it doesn't exist
    const warehouseExistsInLineItems = await columnExists(
      "line_items",
      "warehouse"
    );
    if (!warehouseExistsInLineItems) {
      console.log("Adding warehouse column to line_items table");
      await queryInterface.addColumn("line_items", "warehouse", {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } else {
      console.log("warehouse column already exists in line_items table");
    }

    // Add warehouse column to etl_csv_transactions_staging table if it doesn't exist
    const warehouseExistsInStaging = await columnExists(
      "etl_csv_transactions_staging",
      "warehouse"
    );
    if (!warehouseExistsInStaging) {
      console.log(
        "Adding warehouse column to etl_csv_transactions_staging table"
      );
      await queryInterface.addColumn(
        "etl_csv_transactions_staging",
        "warehouse",
        {
          type: Sequelize.TEXT,
          allowNull: true
        }
      );
    } else {
      console.log(
        "warehouse column already exists in etl_csv_transactions_staging table"
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

    // Remove warehouse column from line_items table if it exists
    const warehouseExistsInLineItems = await columnExists(
      "line_items",
      "warehouse"
    );
    if (warehouseExistsInLineItems) {
      console.log("Removing warehouse column from line_items table");
      await queryInterface.removeColumn("line_items", "warehouse");
    }

    // Remove warehouse column from etl_csv_transactions_staging table if it exists
    const warehouseExistsInStaging = await columnExists(
      "etl_csv_transactions_staging",
      "warehouse"
    );
    if (warehouseExistsInStaging) {
      console.log(
        "Removing warehouse column from etl_csv_transactions_staging table"
      );
      await queryInterface.removeColumn(
        "etl_csv_transactions_staging",
        "warehouse"
      );
    }
  }
};
