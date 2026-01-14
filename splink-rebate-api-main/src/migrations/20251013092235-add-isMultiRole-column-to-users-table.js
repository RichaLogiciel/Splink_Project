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

    // Add isMultiRole column to users table if it doesn't exist
    const isMultiRoleExists = await columnExists("users", "isMultiRole");
    if (!isMultiRoleExists) {
      console.log("Adding isMultiRole column to users table");
      await queryInterface.addColumn("users", "isMultiRole", {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        field: "is_multi_role"
      });
    } else {
      console.log("isMultiRole column already exists in users table");
    }

    // Add index on isMultiRole column if it doesn't exist
    try {
      const indexes = await queryInterface.showIndex("users");
      const isMultiRoleIndexExists = indexes.some((index) =>
        index.fields.some((field) => field.attribute === "isMultiRole")
      );

      if (!isMultiRoleIndexExists) {
        console.log("Adding index on isMultiRole column");
        await queryInterface.addIndex("users", ["isMultiRole"], {
          name: "idx_users_is_multi_role"
        });
      } else {
        console.log("Index on isMultiRole column already exists");
      }
    } catch (error) {
      console.error("Error adding index on isMultiRole column:", error);
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

    // Remove index on isMultiRole column if it exists
    try {
      const indexes = await queryInterface.showIndex("users");
      const isMultiRoleIndexExists = indexes.some((index) =>
        index.fields.some((field) => field.attribute === "isMultiRole")
      );

      if (isMultiRoleIndexExists) {
        console.log("Removing index on isMultiRole column");
        await queryInterface.removeIndex("users", "idx_users_is_multi_role");
      }
    } catch (error) {
      console.error("Error removing index on isMultiRole column:", error);
    }

    // Remove isMultiRole column from users table if it exists
    const isMultiRoleExists = await columnExists("users", "isMultiRole");
    if (isMultiRoleExists) {
      console.log("Removing isMultiRole column from users table");
      await queryInterface.removeColumn("users", "isMultiRole");
    }
  }
};
