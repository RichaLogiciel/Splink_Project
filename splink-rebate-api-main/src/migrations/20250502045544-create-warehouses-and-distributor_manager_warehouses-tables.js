"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const warehouseTableName = "warehouses";
    const warehouseRelationTableName = "distributor_manager_warehouses";

    const tableExists = async (tableName) => {
      try {
        // Get the table description which includes column information
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isWarehouseExist = await tableExists(warehouseTableName);

    // Check if the table already exists
    if (!isWarehouseExist) {
      await queryInterface.createTable(warehouseTableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          field: "id"
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "name"
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
      console.error(`Table already exists: ${warehouseTableName}`);
    }

    const isExist = await tableExists(warehouseRelationTableName);

    if (!isExist) {
      await queryInterface.createTable(warehouseRelationTableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          field: "id"
        },
        warehouseId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "warehouse_id"
        },
        distributorId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "distributor_id"
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "role"
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
      console.error(`Table already exists: ${warehouseRelationTableName}`);
    }
  },

  async down(queryInterface) {
    const warehouseRelationTableName = "distributor_manager_warehouses";
    const warehouseTableName = "warehouses";

    const tableExists = async (tableName) => {
      try {
        // Get the table description which includes column information
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(warehouseRelationTableName);

    if (isExist) {
      await queryInterface.dropTable(warehouseRelationTableName);
    } else {
      console.error(
        `Table ${warehouseRelationTableName} could not be dropped as it does not exist`
      );
    }

    const isWarehouseExist = await tableExists(warehouseTableName);

    if (isWarehouseExist) {
      await queryInterface.dropTable(warehouseTableName);
    } else {
      console.error(
        `Table ${warehouseTableName} could not be dropped as it does not exist`
      );
    }
  }
};
