"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "warehouse_report_email_recipients";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);

    if (!isTableExist) {
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          field: "id"
        },
        distributorId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "distributor_id"
        },
        warehouseId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "warehouse_id"
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: "email"
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

      // Add composite unique constraint on (warehouse_id, distributor_id, email)
      await queryInterface.addConstraint(tableName, {
        fields: ["warehouse_id", "distributor_id", "email"],
        type: "unique",
        name: "unique_warehouse_distributor_email"
      });

      // Add indexes for query performance
      await queryInterface.addIndex(tableName, ["warehouse_id"], {
        name: "idx_warehouse_report_email_recipients_warehouse_id"
      });

      await queryInterface.addIndex(tableName, ["distributor_id"], {
        name: "idx_warehouse_report_email_recipients_distributor_id"
      });
    } else {
      console.error(`Table already exists: ${tableName}`);
    }
  },

  async down(queryInterface) {
    const tableName = "warehouse_report_email_recipients";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);

    if (isTableExist) {
      await queryInterface.dropTable(tableName);
    } else {
      console.error(
        `Table ${tableName} could not be dropped as it does not exist`
      );
    }
  }
};
