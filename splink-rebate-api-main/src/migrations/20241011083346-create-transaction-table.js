"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("transactions", {
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
        type: DataTypes.DATE,
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

    await queryInterface.addIndex("transactions", ["seller_id"]);
    await queryInterface.addIndex("transactions", ["seller_type"]);
    await queryInterface.addIndex("transactions", ["buyer_id"]);
    await queryInterface.addIndex("transactions", ["buyer_type"]);
    await queryInterface.addIndex("transactions", ["transaction_date"]);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex("transactions", ["transaction_date"]);
    await queryInterface.removeIndex("transactions", ["buyer_type"]);
    await queryInterface.removeIndex("transactions", ["buyer_id"]);
    await queryInterface.removeIndex("transactions", ["seller_type"]);
    await queryInterface.removeIndex("transactions", ["seller_id"]);

    await queryInterface.dropTable("transactions");
  }
};
