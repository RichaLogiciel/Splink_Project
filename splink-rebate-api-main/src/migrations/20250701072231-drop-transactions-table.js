"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "transactions";

    try {
      await queryInterface.describeTable(tableName);
      await queryInterface.removeIndex(tableName, ["transaction_date"]);
      await queryInterface.removeIndex(tableName, ["buyer_type"]);
      await queryInterface.removeIndex(tableName, ["buyer_id"]);
      await queryInterface.removeIndex(tableName, ["seller_type"]);
      await queryInterface.removeIndex(tableName, ["seller_id"]);

      await queryInterface.dropTable(tableName);
    } catch (error) {
      // Table does not exist — skip drop
      console.log(`Table "${tableName}" does not exist. Skipping drop.`);
    }
  },

  async down(queryInterface, Sequelize) {
    const tableName = "transactions";

    try {
      await queryInterface.describeTable(tableName);
      // Table exists — skip create
      console.log(`Table "${tableName}" already exists. Skipping create.`);
    } catch (error) {
      // Table does not exist — safe to create
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          field: "id"
        },
        sellerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "seller_id"
        },
        sellerType: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "seller_type"
        },
        buyerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "buyer_id"
        },
        buyerType: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "buyer_type"
        },
        totalAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          field: "total_amount"
        },
        transactionDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          field: "transaction_date"
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false
        },
        uuid: {
          type: DataTypes.STRING,
          allowNull: false
        },
        unitsPerUpc: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "units_per_upc"
        },
        upcType: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "upc_type"
        },
        totalUnits: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: "total_units"
        },
        invoiceReference: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "invoice_reference"
        },
        orderReference: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "order_reference"
        },
        deliveryReference: {
          type: DataTypes.STRING,
          allowNull: true,
          field: "delivery_reference"
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
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

      await queryInterface.addIndex(tableName, ["seller_id"]);
      await queryInterface.addIndex(tableName, ["seller_type"]);
      await queryInterface.addIndex(tableName, ["buyer_id"]);
      await queryInterface.addIndex(tableName, ["buyer_type"]);
      await queryInterface.addIndex(tableName, ["transaction_date"]);
    }
  }
};
