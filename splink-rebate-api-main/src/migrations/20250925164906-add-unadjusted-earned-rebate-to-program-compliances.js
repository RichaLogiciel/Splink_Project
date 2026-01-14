"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Check if unadjusted_earned_rebate column already exists
    const tableDescription = await queryInterface.describeTable(
      "program_compliances"
    );

    // Add unadjusted_earned_rebate column to program_compliances table (only if it doesn't exist)
    if (!tableDescription.unadjusted_earned_rebate) {
      await queryInterface.addColumn(
        "program_compliances",
        "unadjusted_earned_rebate",
        {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.0,
          comment:
            "Unadjusted earned rebate amount before any modifications or corrections"
        }
      );

      // Add comment to the column (only if column was created)
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN program_compliances.unadjusted_earned_rebate IS
        'Unadjusted earned rebate amount before any modifications or corrections to the original earned rebate'
      `);
    }
  },

  async down(queryInterface) {
    // Check if unadjusted_earned_rebate column exists before removing it
    const tableDescription = await queryInterface.describeTable(
      "program_compliances"
    );

    // Remove the unadjusted_earned_rebate column (only if it exists)
    if (tableDescription.unadjusted_earned_rebate) {
      await queryInterface.removeColumn(
        "program_compliances",
        "unadjusted_earned_rebate"
      );
    }
  }
};
