"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("compliance_transactions_history", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      programComplianceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "program_compliance_id"
      },
      transactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "transaction_id"
      },
      purchaseAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "purchase_amount"
      },
      caseQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "case_quantity"
      },
      transactionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "transaction_date"
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
        onUpdate: DataTypes.NOW,
        field: "updated_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });

    await queryInterface.addIndex(
      "compliance_transactions_history",
      ["program_compliance_id"],
      {
        name: "idx_compliance_transactions_program_compliance_id"
      }
    );

    await queryInterface.addIndex(
      "compliance_transactions_history",
      ["transaction_id"],
      {
        name: "idx_compliance_transactions_transaction_id"
      }
    );
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "compliance_transactions_history",
      "idx_compliance_transactions_program_compliance_id"
    );
    await queryInterface.removeIndex(
      "compliance_transactions_history",
      "idx_compliance_transactions_transaction_id"
    );
    await queryInterface.dropTable("compliance_transactions_history");
  }
};
