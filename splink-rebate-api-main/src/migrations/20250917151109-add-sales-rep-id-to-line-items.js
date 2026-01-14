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

    // Add sales_rep_id column to line_items table if it doesn't exist
    const salesRepIdExistsInLineItems = await columnExists(
      "line_items",
      "sales_rep_id"
    );
    if (!salesRepIdExistsInLineItems) {
      await queryInterface.addColumn("line_items", "sales_rep_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });

      // Add index for better query performance
      await queryInterface.addIndex("line_items", ["sales_rep_id"], {
        name: "idx_line_items_sales_rep_id"
      });
    } else {
      console.log("sales_rep_id column already exists in line_items table");
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

    // Remove sales_rep_id column from line_items table if it exists
    const salesRepIdExistsInLineItems = await columnExists(
      "line_items",
      "sales_rep_id"
    );
    if (salesRepIdExistsInLineItems) {
      // Remove the index first
      await queryInterface.removeIndex(
        "line_items",
        "idx_line_items_sales_rep_id"
      );
      // Then remove the column
      await queryInterface.removeColumn("line_items", "sales_rep_id");
    }
  }
};
