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

    // Add sales_rep_name column to etl_csv_transactions_staging table if it doesn't exist
    const salesRepNameExistsInStaging = await columnExists(
      "etl_csv_transactions_staging",
      "sales_rep_name"
    );
    if (!salesRepNameExistsInStaging) {
      await queryInterface.addColumn(
        "etl_csv_transactions_staging",
        "sales_rep_name",
        {
          type: Sequelize.STRING,
          allowNull: true
        }
      );

      console.log(
        "Added sales_rep_name column to etl_csv_transactions_staging table"
      );
    } else {
      console.log(
        "sales_rep_name column already exists in etl_csv_transactions_staging table"
      );
    }
  },

  async down(queryInterface, Sequelize) {
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

    // Remove sales_rep_name column from etl_csv_transactions_staging table if it exists
    const salesRepNameExistsInStaging = await columnExists(
      "etl_csv_transactions_staging",
      "sales_rep_name"
    );
    if (salesRepNameExistsInStaging) {
      await queryInterface.removeColumn(
        "etl_csv_transactions_staging",
        "sales_rep_name"
      );
      console.log(
        "Removed sales_rep_name column from etl_csv_transactions_staging table"
      );
    }
  }
};
