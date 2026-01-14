"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Check if adjusted_rebate column already exists
    const tableDescription = await queryInterface.describeTable(
      "sales_rep_store_earnings"
    );

    // Add adjusted_rebate column to sales_rep_store_earnings table (only if it doesn't exist)
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

      // Add comment to the column (only if column was created)
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN sales_rep_store_earnings.adjusted_rebate IS
        'Adjusted rebate amount after any modifications or corrections to the original earning'
      `);
    }
  },

  async down(queryInterface) {
    // Check if adjusted_rebate column exists before removing it
    const tableDescription = await queryInterface.describeTable(
      "sales_rep_store_earnings"
    );

    // Remove the adjusted_rebate column (only if it exists)
    if (tableDescription.adjusted_rebate) {
      await queryInterface.removeColumn(
        "sales_rep_store_earnings",
        "adjusted_rebate"
      );
    }
  }
};
