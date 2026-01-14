"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("transactions_import_records", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      manufacturerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "manufacturer_id"
      },
      distributorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "distributor_id"
      },
      latestTransactionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "latest_transaction_date"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("transactions_import_records");
  }
};
