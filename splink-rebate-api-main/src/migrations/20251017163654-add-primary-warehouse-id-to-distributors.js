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

    // Add primary_warehouse_id column to distributors table if it doesn't exist
    const primaryWarehouseIdExists = await columnExists(
      "distributors",
      "primaryWarehouseId"
    );
    if (!primaryWarehouseIdExists) {
      console.log("Adding primary_warehouse_id column to distributors table");
      await queryInterface.addColumn("distributors", "primaryWarehouseId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: "primary_warehouse_id",
        references: {
          model: "warehouses",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
    } else {
      console.log(
        "primary_warehouse_id column already exists in distributors table"
      );
    }

    // Add index on primary_warehouse_id column if it doesn't exist
    try {
      const indexes = await queryInterface.showIndex("distributors");
      const primaryWarehouseIdIndexExists = indexes.some((index) =>
        index.fields.some((field) => field.attribute === "primaryWarehouseId")
      );

      if (!primaryWarehouseIdIndexExists) {
        console.log("Adding index on primary_warehouse_id column");
        await queryInterface.addIndex("distributors", ["primaryWarehouseId"], {
          name: "idx_distributors_primary_warehouse_id"
        });
      } else {
        console.log("Index on primary_warehouse_id column already exists");
      }
    } catch (error) {
      console.error(
        "Error adding index on primary_warehouse_id column:",
        error
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

    // Remove index on primary_warehouse_id column if it exists
    try {
      const indexes = await queryInterface.showIndex("distributors");
      const primaryWarehouseIdIndexExists = indexes.some((index) =>
        index.fields.some((field) => field.attribute === "primaryWarehouseId")
      );

      if (primaryWarehouseIdIndexExists) {
        console.log("Removing index on primary_warehouse_id column");
        await queryInterface.removeIndex(
          "distributors",
          "idx_distributors_primary_warehouse_id"
        );
      }
    } catch (error) {
      console.error(
        "Error removing index on primary_warehouse_id column:",
        error
      );
    }

    // Remove primary_warehouse_id column from distributors table if it exists
    const primaryWarehouseIdExists = await columnExists(
      "distributors",
      "primaryWarehouseId"
    );
    if (primaryWarehouseIdExists) {
      console.log(
        "Removing primary_warehouse_id column from distributors table"
      );
      await queryInterface.removeColumn("distributors", "primaryWarehouseId");
    }
  }
};
