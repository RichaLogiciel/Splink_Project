"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "manager_sales_rep_mapping";

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
        salesRepId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "sales_rep_id"
        },
        salesManagerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "sales_manager_id"
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

      // Add indexes for better performance
      await queryInterface.addIndex(tableName, ["sales_rep_id"], {
        name: "idx_manager_sales_rep_mapping_sales_rep_id"
      });

      await queryInterface.addIndex(tableName, ["sales_manager_id"], {
        name: "idx_manager_sales_rep_mapping_sales_manager_id"
      });
    } else {
      console.error(`Table already exists: ${tableName}`);
    }
  },

  async down(queryInterface) {
    const tableName = "manager_sales_rep_mapping";

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
      // Remove indexes first
      await queryInterface.removeIndex(
        tableName,
        "idx_manager_sales_rep_mapping_sales_rep_id"
      );
      await queryInterface.removeIndex(
        tableName,
        "idx_manager_sales_rep_mapping_sales_manager_id"
      );

      // Drop the table
      await queryInterface.dropTable(tableName);
    } else {
      console.error(
        `Table ${tableName} could not be dropped as it does not exist`
      );
    }
  }
};
