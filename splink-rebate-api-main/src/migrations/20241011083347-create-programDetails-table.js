"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("program_details", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      programId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "program_id"
      },
      tier: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "tier",
        defaultValue: 0,
        comment: "e.g., 1, 2, 3"
      },
      minPurchase: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "min_purchase",
        comment: "e.g., 0, 251, 751"
      },
      maxPurchase: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "max_purchase",
        comment: "e.g., 250, 750, NULL for highest tier"
      },
      rebateAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "rebate_amount",
        comment: "e.g., 0.25, 1.00, 1.50"
      },
      rebatePercentage: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "rebate_percentage",
        comment: "e.g., 2.00, 3.00, NULL if fixed amount"
      },
      rebateType: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: "rebate_type",
        comment: "eg., flat, percentage, per_unit"
      },
      rebateCalculation: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: "rebate_calculation"
      },
      requiredEssentialSkus: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "required_essential_skus"
      },
      requiredFlexSkus: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "required_flex_skus"
      },
      requiredCoreSkus: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "required_core_skus"
      },
      daysCriteria: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "days_criteria"
      },
      programLine: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "program_line"
      },
      programType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "program_type"
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
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

    await queryInterface.addIndex("program_details", ["program_id"], {
      name: "idx_program_details_program_id"
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "program_details",
      "idx_program_details_program_id"
    );
    await queryInterface.dropTable("program_details");
  }
};
