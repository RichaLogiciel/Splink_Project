"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // First, check if adjusted_rebate column exists and drop it
    const tableDescription = await queryInterface.describeTable(
      "sales_rep_store_earnings"
    );

    if (tableDescription.adjusted_rebate) {
      await queryInterface.removeColumn(
        "sales_rep_store_earnings",
        "adjusted_rebate"
      );
    }

    // Add unadjusted_earning column to sales_rep_store_earnings table (only if it doesn't exist)
    if (!tableDescription.unadjusted_earning) {
      await queryInterface.addColumn(
        "sales_rep_store_earnings",
        "unadjusted_earning",
        {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
          comment:
            "Unadjusted earning amount before any modifications or corrections"
        }
      );
    }

    // Add comment to the column (only if column was created)
    if (!tableDescription.unadjusted_earning) {
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN sales_rep_store_earnings.unadjusted_earning IS
        'Unadjusted earning amount before any modifications or corrections to the original earning'
      `);
    }
  },

  async down(queryInterface) {
    // Check if unadjusted_earning column exists before removing it
    const tableDescription = await queryInterface.describeTable(
      "sales_rep_store_earnings"
    );

    // Remove the unadjusted_earning column (only if it exists)
    if (tableDescription.unadjusted_earning) {
      await queryInterface.removeColumn(
        "sales_rep_store_earnings",
        "unadjusted_earning"
      );
    }

    // Re-add the adjusted_rebate column (only if it doesn't exist)
    if (!tableDescription.adjusted_rebate) {
      await queryInterface.addColumn(
        "sales_rep_store_earnings",
        "adjusted_rebate",
        {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: null,
          comment:
            "Adjusted rebate amount after any modifications or corrections"
        }
      );
    }
  }
};
