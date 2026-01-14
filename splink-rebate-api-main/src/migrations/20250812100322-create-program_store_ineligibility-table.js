"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "program_store_ineligibility";

    const tableExists = async (tableName) => {
      try {
        // Get the table description which includes column information
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (!isExist) {
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          field: "id"
        },
        programId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "program_id"
        },
        storeId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "store_id"
        },
        distributorId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "distributor_id"
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "created_at"
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "updated_at"
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "deleted_at"
        }
      });
    } else {
      console.error(`Table already exists: ${tableName}`);
    }
  },

  async down(queryInterface) {
    const tableName = "program_store_ineligibility";

    const tableExists = async (tableName) => {
      try {
        // Get the table description which includes column information
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (isExist) {
      // Drop the table
      await queryInterface.dropTable(tableName);
    } else {
      console.error(
        `Table ${tableName} could not be dropped as it does not exist`
      );
    }
  }
};
