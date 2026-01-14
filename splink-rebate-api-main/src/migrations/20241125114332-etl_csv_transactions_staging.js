"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("etl_csv_transactions_staging", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      transaction_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      interface_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      store_id: {
        type: DataTypes.STRING(30),
        allowNull: true
      },
      trading_partner_name: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      distributor: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      product_code: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      transaction_type: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      units: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: true
      },
      order_reference: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      delivery_reference: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      invoice_reference: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      manufacturer_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      seller_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      buyer_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      seller_type: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      buyer_type: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      is_enrichment_error: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      enrichment_status: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      import_file_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      processing_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "PENDING"
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex("etl_csv_transactions_staging", [
      "import_file_id"
    ]);
    await queryInterface.addIndex("etl_csv_transactions_staging", [
      "processing_status"
    ]);
    await queryInterface.addIndex("etl_csv_transactions_staging", [
      "transaction_date"
    ]);
    await queryInterface.addIndex("etl_csv_transactions_staging", ["store_id"]);
    await queryInterface.addIndex("etl_csv_transactions_staging", [
      "trading_partner_name"
    ]); // Fixed column name
    await queryInterface.addIndex("etl_csv_transactions_staging", [
      "product_code"
    ]);
    await queryInterface.addIndex("etl_csv_transactions_staging", [
      "seller_id"
    ]);
    await queryInterface.addIndex("etl_csv_transactions_staging", ["buyer_id"]);
    await queryInterface.addIndex("etl_csv_transactions_staging", [
      "is_enrichment_error"
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("etl_csv_transactions_staging");
  }
};
