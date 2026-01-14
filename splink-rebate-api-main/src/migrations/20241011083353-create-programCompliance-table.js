"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("program_compliances", {
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
      programDetailId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "program_detail_id"
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "entity_id"
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "entity_type"
      },
      isQualified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "is_qualified"
      },
      totalPurchaseVolume: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "total_purchase_volume"
      },
      totalCasePurchases: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "total_case_purchases"
      },
      earnedRebate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "earned_rebate"
      },
      complianceDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "compliance_date"
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

    await queryInterface.addIndex("program_compliances", ["program_id"], {
      name: "idx_program_compliances_program_id"
    });

    await queryInterface.addIndex("program_compliances", ["entity_id"], {
      name: "idx_program_compliances_entity_id"
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "program_compliances",
      "idx_program_compliances_program_id"
    );
    await queryInterface.removeIndex(
      "program_compliances",
      "idx_program_compliances_entity_id"
    );
    await queryInterface.removeIndex(
      "program_compliances",
      "idx_program_compliances_current_tier_id"
    );
    await queryInterface.dropTable("program_compliances");
  }
};
