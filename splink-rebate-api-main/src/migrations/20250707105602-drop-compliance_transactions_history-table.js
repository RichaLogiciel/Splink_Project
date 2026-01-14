"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "compliance_transactions_history";

    try {
      await queryInterface.describeTable(tableName);
      await queryInterface.removeIndex(
        tableName,
        "idx_compliance_transactions_program_compliance_id"
      );
      await queryInterface.removeIndex(
        tableName,
        "idx_compliance_transactions_transaction_id"
      );

      await queryInterface.dropTable(tableName);
    } catch (error) {
      // Table does not exist — skip drop
      console.log(`Table "${tableName}" does not exist. Skipping drop.`);
    }
  },

  async down(queryInterface) {
    const tableName = "compliance_transactions_history";
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
          type: DataTypes.DATEONLY,
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

      await queryInterface.addIndex(tableName, ["program_compliance_id"], {
        name: "idx_compliance_transactions_program_compliance_id"
      });

      await queryInterface.addIndex(tableName, ["transaction_id"], {
        name: "idx_compliance_transactions_transaction_id"
      });
    }
  }
};
