"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Get existing columns
    const columns = await queryInterface.describeTable("programs");

    // Helper function to check if column exists with same definition
    const shouldUpdateColumn = (columnName, newDefinition) => {
      if (!columns[columnName]) return true;

      const existingColumn = columns[columnName];
      return (
        existingColumn.type !== newDefinition.type ||
        existingColumn.allowNull !== newDefinition.allowNull ||
        existingColumn.defaultValue !== newDefinition.defaultValue
      );
    };

    // approval_status
    const approvalStatusDef = {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "DRAFT",
      validate: {
        isIn: [["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]]
      }
    };
    if (shouldUpdateColumn("approval_status", approvalStatusDef)) {
      if (columns["approval_status"]) {
        await queryInterface.changeColumn(
          "programs",
          "approval_status",
          approvalStatusDef
        );
      } else {
        await queryInterface.addColumn(
          "programs",
          "approval_status",
          approvalStatusDef
        );
      }
    }

    // target_audience
    const targetAudienceDef = {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "BOTH",
      validate: {
        isIn: [["DISTRIBUTOR", "STORE", "BOTH"]]
      }
    };
    if (shouldUpdateColumn("target_audience", targetAudienceDef)) {
      if (columns["target_audience"]) {
        await queryInterface.changeColumn(
          "programs",
          "target_audience",
          targetAudienceDef
        );
      } else {
        await queryInterface.addColumn(
          "programs",
          "target_audience",
          targetAudienceDef
        );
      }
    }

    // visibility_scope
    const visibilityScopeDef = {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "ALL_DISTRIBUTORS",
      validate: {
        isIn: [
          [
            "SPECIFIC_DISTRIBUTORS",
            "SPECIFIC_STORES",
            "ALL_STORES_UNDER_DISTRIBUTOR",
            "ALL_DISTRIBUTORS"
          ]
        ]
      }
    };
    if (shouldUpdateColumn("visibility_scope", visibilityScopeDef)) {
      if (columns["visibility_scope"]) {
        await queryInterface.changeColumn(
          "programs",
          "visibility_scope",
          visibilityScopeDef
        );
      } else {
        await queryInterface.addColumn(
          "programs",
          "visibility_scope",
          visibilityScopeDef
        );
      }
    }

    // creator_type
    const creatorTypeDef = {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "MANUFACTURER",
      validate: {
        isIn: [["MANUFACTURER", "DISTRIBUTOR"]]
      }
    };
    if (shouldUpdateColumn("creator_type", creatorTypeDef)) {
      if (columns["creator_type"]) {
        await queryInterface.changeColumn(
          "programs",
          "creator_type",
          creatorTypeDef
        );
      } else {
        await queryInterface.addColumn(
          "programs",
          "creator_type",
          creatorTypeDef
        );
      }
    }

    // creator_id
    const creatorIdDef = {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    };
    if (shouldUpdateColumn("creator_id", creatorIdDef)) {
      if (columns["creator_id"]) {
        await queryInterface.changeColumn(
          "programs",
          "creator_id",
          creatorIdDef
        );
      } else {
        await queryInterface.addColumn("programs", "creator_id", creatorIdDef);
      }
    }

    // description
    const descriptionDef = {
      type: DataTypes.TEXT,
      allowNull: true
    };
    if (shouldUpdateColumn("description", descriptionDef)) {
      if (columns["description"]) {
        await queryInterface.changeColumn(
          "programs",
          "description",
          descriptionDef
        );
      } else {
        await queryInterface.addColumn(
          "programs",
          "description",
          descriptionDef
        );
      }
    }

    // min_purchase_amount
    const minPurchaseAmountDef = {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    };
    if (shouldUpdateColumn("min_purchase_amount", minPurchaseAmountDef)) {
      if (columns["min_purchase_amount"]) {
        await queryInterface.changeColumn(
          "programs",
          "min_purchase_amount",
          minPurchaseAmountDef
        );
      } else {
        await queryInterface.addColumn(
          "programs",
          "min_purchase_amount",
          minPurchaseAmountDef
        );
      }
    }

    // rebate_percentage
    const rebatePercentageDef = {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    };
    if (shouldUpdateColumn("rebate_percentage", rebatePercentageDef)) {
      if (columns["rebate_percentage"]) {
        await queryInterface.changeColumn(
          "programs",
          "rebate_percentage",
          rebatePercentageDef
        );
      } else {
        await queryInterface.addColumn(
          "programs",
          "rebate_percentage",
          rebatePercentageDef
        );
      }
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable("programs");

    const columnsToRemove = [
      "approval_status",
      "target_audience",
      "visibility_scope",
      "creator_type",
      "creator_id",
      "description",
      "min_purchase_amount",
      "rebate_percentage"
    ];

    for (const column of columnsToRemove) {
      if (columns[column]) {
        await queryInterface.removeColumn("programs", column);
      }
    }
  }
};
