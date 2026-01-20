"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "warehouse_report_sent_orders";

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
        warehouseId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "warehouse_id"
        },
        reportType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: "report_type"
        },
        lastSentOrderId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "last_sent_order_id"
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

      // Add index on (warehouse_id, report_type) for fast lookups
      await queryInterface.addIndex(
        tableName,
        ["warehouse_id", "report_type"],
        {
          name: "idx_warehouse_report_sent_orders_warehouse_type"
        }
      );

      // Add partial unique index for idempotent upserts (ignores soft-deleted rows)
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX idx_warehouse_report_sent_orders_warehouse_type_unique
        ON ${tableName}(warehouse_id, report_type)
        WHERE deleted_at IS NULL;
      `);

      console.log(`Table ${tableName} created successfully`);
    } else {
      console.log(`Table ${tableName} already exists, skipping creation`);
    }
  },

  async down(queryInterface) {
    const tableName = "warehouse_report_sent_orders";

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
