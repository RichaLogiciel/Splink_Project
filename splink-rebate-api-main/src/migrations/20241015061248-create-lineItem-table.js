"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("line_items", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      transactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "transaction_id"
      },
      productId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "product_id"
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "quantity"
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "unit_price"
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "total_price"
      },
      skusId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "skus_id"
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "currency"
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

    await queryInterface.addIndex("line_items", ["transaction_id"]);
    await queryInterface.addIndex("line_items", ["product_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("line_items");
  }
};
